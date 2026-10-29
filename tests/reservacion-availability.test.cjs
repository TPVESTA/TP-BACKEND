require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { IsolationLevel, LockMode } = require('@mikro-orm/core');
const service = require('../src/services/reservacion.service');
const controller = require('../src/controllers/reservacion.controller');
const { Reservacion } = require('../src/entities/Reservacion');
const { AreaComun } = require('../src/entities/AreaComun');
const { EstadoReservacion: E } = require('../src/entities/EstadoReservacion');
const { ConflictError } = require('../src/errors/conflict.error');
const manager = require('../src/database/DatabaseManager').default.getInstance();

const day = '2099-10-06';
const context = { usuarioId: 1, now: new Date('2099-10-01T15:00:00Z'), grants: [{
  rolId: 1, rolCodigo: null, ambito: 'GLOBAL', edificioIds: [], permisos: [{
    seccion: 'RESERVAS', crear: true, leer: true, editar: true, borrar: true, acciones: [],
  }],
}] };
const area = id => Object.assign(new AreaComun(), { id, edificio: { id: 10 } });
const booking = (options = {}) => Object.assign(new Reservacion(), {
  id: 500, areaComun: area(200), usuario: { id: 2 }, propiedadOrigen: null,
  descripcion: 'Reserva existente', fechaReservacion: new Date(`${day}T12:00:00-03:00`), ...options,
});
const input = (options = {}) => ({
  areaComunId: 200, descripcion: 'Nueva reserva', fechaReservacion: new Date(`${day}T20:00:00-03:00`), ...options,
});

const scalar = value => value && typeof value === 'object' && !(value instanceof Date) ? value.id : value;
function matches(row, where) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === '$and') return expected.every(part => matches(row, part));
    if (key === '$or') return expected.some(part => matches(row, part));
    const actual = scalar(row[key]);
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if ('$ne' in expected) return actual !== expected.$ne;
      if ('$gte' in expected) return actual >= expected.$gte && actual < expected.$lt;
    }
    return actual instanceof Date && expected instanceof Date ? actual.getTime() === expected.getTime() : actual === expected;
  });
}
async function withEM(bookings, run) {
  const original = manager.getORM;
  const queries = [], saved = [], transactions = [];
  let inTransaction = false;
  const em = {
    transactional: async (callback, options) => {
      transactions.push(options);
      inTransaction = true;
      try { return await callback(em); } finally { inTransaction = false; }
    },
    findOne: async (entity, where, options) => {
      assert.equal(inTransaction, true, 'La comprobación debe ejecutarse dentro de la transacción');
      queries.push({ entity, where, options });
      const records = entity === Reservacion ? bookings : entity === AreaComun ? [area(200), area(201)] : [{ id: 1 }];
      return records.find(row => matches(row, where)) ?? null;
    },
    persistAndFlush: async entity => { assert.equal(inTransaction, true); saved.push(entity); },
    getReference: (_entity, id) => ({ id }),
  };
  manager.getORM = () => ({ em: { fork: () => em } });
  try { await run({ queries, saved, transactions }); } finally { manager.getORM = original; }
}

test('rechaza reservas de otros usuarios en el mismo día aunque tengan distinta hora', async () => {
  await withEM([booking()], async ({ saved }) => {
    await assert.rejects(service.createReservacion(input(), context), ConflictError);
    assert.equal(saved.length, 0);
  });
});

test('usa medianoche de Buenos Aires: incluye 03:00Z y excluye 03:00Z del día siguiente', async () => {
  for (const [instant, occupied] of [
    ['2099-10-06T02:59:59.999Z', false],
    ['2099-10-06T03:00:00.000Z', true],
    ['2099-10-07T02:59:59.999Z', true],
    ['2099-10-07T03:00:00.000Z', false],
  ]) {
    await withEM([booking({ fechaReservacion: new Date(instant) })], async () => {
      const result = service.createReservacion(input(), context);
      if (occupied) await assert.rejects(result, ConflictError);
      else assert.ok(await result);
    });
  }
});

test('permite otro espacio, otro día, reservas canceladas, finalizadas y dadas de baja', async () => {
  for (const options of [
    { areaComun: area(201) },
    { fechaReservacion: new Date('2099-10-07T12:00:00-03:00') },
    { estado: E.CANCELADO }, { estado: E.FINALIZADO }, { deletedAt: context.now },
  ]) {
    await withEM([booking(options)], async ({ saved }) => {
      assert.ok(await service.createReservacion(input(), context));
      assert.equal(saved.length, 1);
    });
  }
});

test('excluye la propia reserva al editar y bloquea el área antes de consultar ocupación', async () => {
  const mine = booking();
  await withEM([mine], async ({ queries, transactions }) => {
    assert.equal(await service.updateReservacion(mine.id, { descripcion: 'Actualizada' }, context), mine);
    assert.equal(mine.descripcion, 'Actualizada');
    assert.equal(transactions[0].isolationLevel, IsolationLevel.READ_COMMITTED);
    assert.equal(queries[0].options.lockMode, LockMode.PESSIMISTIC_WRITE);
    const lockIndex = queries.findIndex(q => q.entity === AreaComun && q.options?.lockMode === LockMode.PESSIMISTIC_WRITE);
    const conflictIndex = queries.findIndex(q => q.entity === Reservacion && q.where.fechaReservacion);
    assert.ok(lockIndex >= 0 && conflictIndex > lockIndex);
  });
});

test('rechaza cambiar la fecha, el espacio o ambos si el destino está ocupado, sin mutar la reserva', async () => {
  for (const changes of [
    { fechaReservacion: new Date('2099-10-07T18:00:00-03:00') },
    { areaComunId: 201 },
    { areaComunId: 201, fechaReservacion: new Date('2099-10-07T18:00:00-03:00') },
  ]) {
    const mine = booking();
    const other = booking({ id: 501, areaComun: area(changes.areaComunId ?? 200),
      fechaReservacion: changes.fechaReservacion ?? mine.fechaReservacion });
    const original = { ...mine };
    await withEM([mine, other], async ({ saved }) => {
      await assert.rejects(service.updateReservacion(500, { ...changes, descripcion: 'No guardar' }, context), ConflictError);
      assert.deepEqual({ ...mine }, original);
      assert.equal(saved.length, 0);
    });
  }
});

test('permite reprogramar a un destino libre y cancelar aunque haya duplicados históricos', async () => {
  const mine = booking();
  await withEM([mine], async () => {
    await service.updateReservacion(500, { areaComunId: 201, fechaReservacion: new Date('2099-10-08T12:00:00-03:00') }, context);
    assert.equal(mine.areaComun.id, 201);
    assert.equal(service.diaReservacion(mine.fechaReservacion), '2099-10-08');
  });
  const duplicated = booking();
  await withEM([duplicated, booking({ id: 501 })], async () => {
    await service.updateReservacion(500, { estado: E.CANCELADO }, context);
    assert.equal(duplicated.estado, E.CANCELADO);
  });
});

test('el alta bloquea el área aun sin reservas existentes y responde 409 sin datos de terceros', async () => {
  await withEM([], async ({ queries, transactions }) => {
    await service.createReservacion(input(), context);
    assert.equal(queries[0].entity, AreaComun);
    assert.equal(queries[0].options.lockMode, LockMode.PESSIMISTIC_WRITE);
    assert.equal(transactions[0].isolationLevel, IsolationLevel.READ_COMMITTED);
  });
  await withEM([booking()], async () => {
    const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await controller.createReservacion({ body: input(), authorization: context }, response);
    assert.equal(response.code, 409);
    assert.equal(response.body.success, false);
    assert.match(response.body.error, /reservada/);
    assert.equal(JSON.stringify(response.body).includes('Reserva existente'), false);
  });
});
