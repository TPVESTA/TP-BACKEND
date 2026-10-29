require('ts-node/register');
require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const auth = require('../src/services/auth.service');
const routes = require('../src/routes').default;
const { errorMiddleware, notFoundMiddleware } = require('../src/middlewares/error.middleware');
const specs = [["administracion","Administracion","Administraciones","administraciones"],["edificio","Edificio","Edificios","edificios"],["localidad","Localidad","Localidades","localidades"],["tipo-unidad","TipoUnidad","TiposUnidad","tipos-unidad"],["unidad","Unidad","Unidades","unidades"],["propiedad","Propiedad","Propiedades","propiedades"],["area-comun","AreaComun","AreasComunes","areas-comunes"],["empleado","Empleado","Empleados","empleados"],["admin-edificio","AdminEdificio","AdminEdificios","admin-edificios"],["usuario-rol-propiedad","UsuarioRolPropiedad","UsuariosRolesPropiedad","usuarios-roles-propiedad"],["incidencia","Incidencia","Incidencias","incidencias"],["reservacion","Reservacion","Reservaciones","reservaciones"]];
const unit = { nroUnidad: '2A', mtCuadrados: 65.25, descripcion: 'Unidad',
  edificioId: '1', tipoUnidadId: '2' };
const fixtures = {
  Administracion: { cuit: '30123456789', nombre: 'Admin', email: 'admin@example.com', direccion: 'Calle 1', localidadId: '1' },
  Edificio: { cuit: '30123456789', nombre: 'Edificio', direccion: 'Calle 1', localidadId: '1' },
  Localidad: { nombre: 'Rosario', provincia: 'Santa Fe' },
  TipoUnidad: { nombre: 'Departamento', ambito: 'PRIVADO' },
  Unidad: { ...unit, clase: 'propiedad', copropiedad: 10, habitaciones: 2 },
  Propiedad: { ...unit, copropiedad: 10, habitaciones: 2 },
  AreaComun: { ...unit, capacidad: 10 },
  Rol: { descripcion: 'Gestion', ambito: 'ADMINISTRACION' },
  Empleado: { usuarioId: '1', administracionId: '2', rolId: '3', beginAt: '2026-01-01' },
  AdminEdificio: { administracionId: '1', edificioId: '2', beginAt: '2026-01-01' },
  UsuarioRolPropiedad: { usuarioId: '1', rolId: '2', propiedadId: '3', endAt: null },
  Incidencia: { descripcion: 'Reparar', usuarioId: '1', unidadId: '2' },
  Reservacion: { fechaReservacion: '2099-10-01T12:00:00-03:00', descripcion: 'Reserva', usuarioId: '1', areaComunId: '2' }
};
let server, base, token, oldSecret, originalLookup;
const calls = [];
const originals = [];
before(async () => {
  oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'routes-test-secret';
  token = auth.generateToken(1);
  originalLookup = auth.getUserByIdForAuth;
  auth.getUserByIdForAuth = async () => ({ id: 1, nombre: 'Ana', apellido: 'Perez',
    email: 'ana@example.com', fechaNacimiento: new Date('2000-01-01'), estado: true, deletedAt: null });
  for (const [file, name, plural] of specs) {
    const service = require('../src/services/' + file + '.service');
    for (const method of ['getAll' + plural, 'get' + name + 'ById', 'create' + name, 'update' + name, 'delete' + name]) {
      originals.push([service, method, service[method]]);
      service[method] = async (...args) => {
        calls.push({ name, method, args });
        if (args[0] === '404') return null;
        const result = { id: 1, entity: name, operation: method };
        return method.startsWith('getAll') ? [result] : result;
      };
    }
  }
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});
after(async () => {
  for (const [service, method, original] of originals) service[method] = original;
  auth.getUserByIdForAuth = originalLookup;
  if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  if (server) await new Promise(resolve => server.close(resolve));
});
async function request(path, method = 'GET', body, authenticated = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (authenticated) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
for (const [file, name, plural, path] of specs) {
  const ops = [
    ['GET', '/' + path, 'getAll' + plural, undefined, 200],
    ['GET', '/' + path + '/1', 'get' + name + 'ById', undefined, 200],
    ['POST', '/' + path, 'create' + name, fixtures[name], 201],
    ['PUT', '/' + path + '/1', 'update' + name,
      name === 'Unidad' ? { clase: 'propiedad', descripcion: 'Nueva' }
        : { [Object.keys(fixtures[name])[0]]: Object.values(fixtures[name])[0] }, 200],
    ['DELETE', '/' + path + '/1', 'delete' + name, undefined, 200]
  ];
  test(path + ': los cinco endpoints llegan al servicio correcto con datos saneados', async () => {
    for (const [method, url, operation, body, status] of ops) {
      const result = await request(url, method, body ? { ...body, intruso: true } : body);
      assert.equal(result.status, status, JSON.stringify(result.body));
      const data = Array.isArray(result.body.data) ? result.body.data[0] : result.body.data;
      assert.equal(data.entity, name);
      assert.equal(data.operation, operation);
      const call = calls.at(-1);
      assert.equal(call.method, operation);
      if (url.endsWith('/1')) assert.equal(call.args[0], '1');
      if (body) {
        const passed = ['Incidencia', 'Reservacion'].includes(name) && method === 'PUT' ? call.args[1] : call.args.at(-1);
        assert.equal(passed.intruso, undefined);
        for (const key of Object.keys(body)) {
          if (key.endsWith('Id')) assert.equal(typeof passed[key], 'number');
          if (['beginAt', 'fechaReservacion'].includes(key)) assert.ok(passed[key] instanceof Date);
        }
      }
    }
  });
  test(path + ': todos los endpoints requieren autenticacion antes del servicio', async () => {
    const count = calls.length;
    for (const [method, url, , body] of ops) {
      assert.equal((await request(url, method, body, false)).status, 401);
    }
    assert.equal(calls.length, count);
  });
  test(path + ': rechaza ID, alta incompleta y actualizacion vacia antes del servicio', async () => {
    const count = calls.length;
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await request('/' + path + '/abc', method, method === 'PUT' ? fixtures[name] : undefined)).status, 400);
    }
    assert.equal((await request('/' + path, 'POST', {})).status, 400);
    assert.equal((await request('/' + path + '/1', 'PUT', {})).status, 400);
    assert.equal(calls.length, count);
  });
  test(path + ': IDs inexistentes devuelven 404', async () => {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const result = await request('/' + path + '/404', method, method === 'PUT' ? ops[3][3] : undefined);
      assert.equal(result.status, 404);
      assert.equal(result.body.success, false);
    }
  });
}
test('unidades admite area comun y rechaza campos del otro subtipo', async () => {
  assert.equal((await request('/unidades', 'POST', { ...fixtures.AreaComun, clase: 'area_comun' })).status, 201);
  const count = calls.length;
  assert.equal((await request('/unidades', 'POST', { ...fixtures.Unidad, capacidad: 5 })).status, 400);
  assert.equal(calls.length, count);
});

