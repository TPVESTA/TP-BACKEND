require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const express = require('express');
const { MikroORM } = require('@mikro-orm/core');
const config = require('../src/config/mikro-orm.config').default;
const manager = require('../src/database/DatabaseManager').default.getInstance();
const controller = require('../src/controllers/reservacion.controller');
const service = require('../src/services/reservacion.service');
const { Localidad } = require('../src/entities/Localidad');
const { Edificio } = require('../src/entities/Edificio');
const { TipoUnidad } = require('../src/entities/TipoUnidad');
const { AreaComun } = require('../src/entities/AreaComun');
const { User } = require('../src/entities/User');
const { Reservacion } = require('../src/entities/Reservacion');

// Requiere un servidor MySQL de pruebas. Crea y elimina únicamente una base
// con nombre aleatorio propio; nunca ejecuta DatabaseManager.initialize().
test('reservas exclusivas con transacciones y conexiones MySQL reales', {
  skip: process.env.RESERVAS_MYSQL_TEST !== '1', timeout: 60000,
}, async t => {
  const dbName = `reservas_test_${randomBytes(8).toString('hex')}`;
  const orm = await MikroORM.init({
    ...config, connect: false, debug: false, dbName,
    host: process.env.RESERVAS_TEST_DB_HOST || '127.0.0.1',
    port: Number(process.env.RESERVAS_TEST_DB_PORT || 3306),
    user: process.env.RESERVAS_TEST_DB_USER || 'root',
    password: process.env.RESERVAS_TEST_DB_PASSWORD || '',
    pool: { min: 0, max: 12 },
  });
  const originalORM = manager.getORM;
  let server;
  try {
    await orm.schema.ensureDatabase();
    await orm.schema.createSchema();
    manager.getORM = () => orm;
    const em = orm.em.fork();
    const localidad = Object.assign(new Localidad(), { nombre: 'Rosario', provincia: 'Santa Fe' });
    const edificio = Object.assign(new Edificio('30123456789', 'Pruebas', 'Calle 1'), { localidad });
    const tipoUnidad = Object.assign(new TipoUnidad(), { nombre: 'SUM', ambito: 'COMUN' });
    const areas = [1, 2].map(id => Object.assign(new AreaComun(), {
      nroUnidad: `SUM-${id}`, mtCuadrados: 50, descripcion: 'Espacio de pruebas', edificio, tipoUnidad,
    }));
    const users = [1, 2].map(id => Object.assign(new User('Usuario', 'Prueba', `test${id}@example.test`,
      new Date('2000-01-01'), 'unused-test-password', true), { cuil: `2012345678${id}` }));
    await em.persistAndFlush([...areas, ...users]);
    const context = userId => ({ usuarioId: userId, now: new Date('2099-10-01T12:00:00Z'), grants: [{
      rolId: 1, rolCodigo: null, ambito: 'GLOBAL', edificioIds: [], permisos: [{
        seccion: 'RESERVAS', crear: true, leer: true, editar: true, borrar: true, acciones: [],
      }],
    }] });
    const input = (day = '2099-10-06', area = areas[0]) => ({
      fechaReservacion: new Date(`${day}T15:00:00Z`), descripcion: 'Reserva de prueba', areaComunId: area.id,
    });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.authorization = context(users[Number(req.headers['x-test-user'] || 0)].id);
      if (req.body?.fechaReservacion) req.body.fechaReservacion = new Date(req.body.fechaReservacion);
      next();
    });
    app.post('/reservaciones', controller.createReservacion);
    app.put('/reservaciones/:id', controller.updateReservacion);
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/reservaciones`;
    const request = async (method, path, body, userIndex = 0) => {
      const response = await fetch(base + path, { method, headers: {
        'Content-Type': 'application/json', 'x-test-user': String(userIndex), Connection: 'close',
      }, body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    };
    const reset = () => orm.em.fork().nativeDelete(Reservacion, {});
    const count = () => orm.em.fork().count(Reservacion, { estado: 'Reservado', deletedAt: null });

    await t.test('diez altas simultáneas en un área vacía confirman una reserva y rechazan nueve con 409', async () => {
      const results = await Promise.all(Array.from({ length: 10 }, (_, i) => request('POST', '', input(), i % 2)));
      assert.deepEqual(results.map(r => r.status).sort(), [201, ...Array(9).fill(409)]);
      assert.equal(await count(), 1);
    });

    await t.test('dos reprogramaciones simultáneas al mismo día libre confirman solo una', async () => {
      await reset();
      const first = await service.createReservacion(input('2099-10-07'), context(users[0].id));
      const second = await service.createReservacion(input('2099-10-08'), context(users[1].id));
      const target = { fechaReservacion: input().fechaReservacion };
      const results = await Promise.all([
        request('PUT', `/${first.id}`, target), request('PUT', `/${second.id}`, target, 1),
      ]);
      assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
      assert.equal(await orm.em.fork().count(Reservacion, { fechaReservacion: target.fechaReservacion }), 1);
    });

    await t.test('alta y cambio de área simultáneos compiten por la misma disponibilidad', async () => {
      await reset();
      const existing = await service.createReservacion(input('2099-10-06', areas[1]), context(users[0].id));
      const [created, moved] = await Promise.all([
        request('POST', '', input(), 1), request('PUT', `/${existing.id}`, { areaComunId: areas[0].id }),
      ]);
      assert.ok((created.status === 201 && moved.status === 409) || (created.status === 409 && moved.status === 200),
        JSON.stringify({ created, moved }));
      assert.equal(await orm.em.fork().count(Reservacion, { areaComun: areas[0].id, estado: 'Reservado' }), 1);
    });

    await t.test('cancelar libera el día y un conflicto de edición conserva todos los datos originales', async () => {
      await reset();
      const first = await service.createReservacion(input(), context(users[0].id));
      const second = await service.createReservacion(input('2099-10-07'), context(users[1].id));
      const rejected = await request('PUT', `/${second.id}`, { fechaReservacion: input().fechaReservacion, descripcion: 'No guardar' }, 1);
      assert.equal(rejected.status, 409);
      const unchanged = await orm.em.fork().findOneOrFail(Reservacion, second.id);
      assert.equal(service.diaReservacion(unchanged.fechaReservacion), '2099-10-07');
      assert.equal(unchanged.descripcion, 'Reserva de prueba');
      assert.equal((await request('PUT', `/${first.id}`, { estado: 'Cancelado' })).status, 200);
      assert.equal((await request('POST', '', input(), 1)).status, 201);
    });
  } finally {
    if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    manager.getORM = originalORM;
    try { await orm.schema.dropDatabase(dbName); } finally { await orm.close(true); }
  }
});
