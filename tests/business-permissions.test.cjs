require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const reservations = require('../src/services/reservacion.service');
const incidences = require('../src/services/incidencia.service');
const { Reservacion } = require('../src/entities/Reservacion');
const { Incidencia } = require('../src/entities/Incidencia');
const { AreaComun } = require('../src/entities/AreaComun');
const { Propiedad } = require('../src/entities/Propiedad');
const { User } = require('../src/entities/User');
const { AmbitoRol } = require('../src/entities/AmbitoRol');
const { EstadoReservacion } = require('../src/entities/EstadoReservacion');
const { EstadoIncidencia } = require('../src/entities/EstadoIncidencia');
const { AccionPermiso: A, SeccionPermiso: S } = require('../src/entities/Permiso');
const { createReservacionSchema, updateReservacionSchema, disponibilidadReservacionSchema } = require('../src/schemas/reservacion.schema');
const { createIncidenciaSchema, updateIncidenciaSchema } = require('../src/schemas/incidencia.schema');
const manager = require('../src/database/DatabaseManager').default.getInstance();
const now = new Date('2026-10-05T15:00:00Z');
const future = new Date('2026-10-06T15:00:00Z');
const permission = (seccion, crud = {}, acciones = []) => ({ seccion, crear: false, leer: false, editar: false, borrar: false, ...crud, acciones });
const grant = (ambito, permisos, options = {}) => ({ rolId: 1, rolCodigo: null, ambito, edificioIds: [10], permisos, ...options });
const resident = (...more) => ({ usuarioId: 1, now, grants: [grant(AmbitoRol.PROPIEDAD, [
  permission(S.RESERVAS, { crear: true, leer: true, editar: true }, [A.DISPONIBILIDAD]),
  permission(S.INCIDENCIAS, { crear: true, leer: true, editar: true }),
], { propiedadId: 100 }), ...more] });
const administrative = (state = true) => ({ usuarioId: 2, now, grants: [grant(AmbitoRol.ADMINISTRACION, [
  permission(S.RESERVAS, { leer: true, editar: true }),
  permission(S.INCIDENCIAS, { crear: true, leer: true, editar: true }, state ? [A.CAMBIAR_ESTADO] : []),
], { administracionId: 20 })] });
const maintenance = () => ({ usuarioId: 3, now, grants: [grant(AmbitoRol.ADMINISTRACION, [
  permission(S.RESERVAS, { leer: true }),
], { administracionId: 20 })] });
const area = (id = 200, edificioId = 10) => Object.assign(new AreaComun(), { id, edificio: { id: edificioId } });
const property = (id = 100, edificioId = 10) => Object.assign(new Propiedad(), { id, edificio: { id: edificioId } });
const reservation = (options = {}) => Object.assign(new Reservacion(), {
  id: 500, usuario: { id: 1, email: 'privado@example.test', cuil: '20123456789' },
  areaComun: area(), propiedadOrigen: property(), fechaReservacion: future, descripcion: 'Información privada', ...options,
});
const incidence = (options = {}) => Object.assign(new Incidencia(), {
  id: 600, usuario: { id: 1 }, unidad: area(), propiedadOrigen: property(), descripcion: 'Reporte inicial', ...options,
});

// Evalúa condiciones de consulta para comprobar que el servicio no depende de
// filtrar en memoria después de haber leído registros ajenos.
const scalar = value => value && typeof value === 'object' && !(value instanceof Date) && 'id' in value ? value.id : value;
const matches = (record, where) => Object.entries(where).every(([key, expected]) => {
  if (key === '$and') return expected.every(clause => matches(record, clause));
  if (key === '$or') return expected.some(clause => matches(record, clause));
  if (key === '$in') return expected.includes(scalar(record));
  if (key === '$ne') return scalar(record) !== expected;
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) return matches(record?.[key], expected);
  return scalar(record?.[key]) === expected;
});
async function withEM(records, run) {
  const original = manager.getORM;
  const queries = [], persisted = [];
  const em = {
    transactional: async callback => callback(em),
    find: async (entity, where) => { queries.push({ entity, where }); return (records.get(entity) ?? []).filter(item => matches(item, where)); },
    findOne: async (entity, where) => { queries.push({ entity, where }); return (records.get(entity) ?? []).find(item => matches(item, where)) ?? null; },
    persistAndFlush: async item => { persisted.push(item); },
    removeAndFlush: async () => { throw new Error('No debe usarse borrado físico'); },
    getReference: (entity, id) => ({ id }),
  };
  manager.getORM = () => ({ em: { fork: () => em } });
  try { await run({ queries, persisted }); } finally { manager.getORM = original; }
}

test('schemas toman autor de la sesión y preservan contexto en las actualizaciones', () => {
  const input = { descripcion: 'Reserva', fechaReservacion: future, areaComunId: 200 };
  assert.ifError(createReservacionSchema.validate(input).error);
  assert.ok(createReservacionSchema.validate({ ...input, usuarioId: 999 }).error);
  assert.ifError(createIncidenciaSchema.validate({ descripcion: 'Incidencia', unidadId: 200 }).error);
  assert.ok(createIncidenciaSchema.validate({ descripcion: 'Incidencia', unidadId: 200, usuarioId: 999 }).error);
  for (const field of ['usuarioId', 'propiedadId']) assert.ok(updateReservacionSchema.validate({ [field]: 1 }).error);
  for (const field of ['usuarioId', 'unidadId', 'propiedadId', 'closedAt']) assert.ok(updateIncidenciaSchema.validate({ [field]: 1 }).error);
  assert.ok(disponibilidadReservacionSchema.validate({}).error);
  assert.ifError(disponibilidadReservacionSchema.validate({ areaComunId: '200' }).error);
});

test('servicios niegan llamadas sin contexto', async () => {
  await withEM(new Map(), async ({ queries }) => {
    await assert.rejects(reservations.getAllReservaciones(), /contexto/);
    await assert.rejects(incidences.getAllIncidencias(), /contexto/);
    assert.equal(queries.length, 0);
  });
});

test('residente lista y busca solamente sus reservas del contexto vigente, incluyendo edificio', async () => {
  const mine = reservation();
  const data = [mine, reservation({ id: 501, usuario: { id: 2 } }),
    reservation({ id: 502, propiedadOrigen: property(101) }),
    reservation({ id: 503, propiedadOrigen: null }),
    reservation({ id: 504, areaComun: area(201, 11) })];
  await withEM(new Map([[Reservacion, data]]), async ({ queries }) => {
    assert.deepEqual(await reservations.getAllReservaciones(resident()), [mine]);
    assert.equal(await reservations.getReservacionById(501, resident()), null);
    assert.equal(await reservations.getReservacionById(503, resident()), null);
    const where = queries[0].where;
    assert.equal(where.$or[0].usuario, 1);
    assert.equal(where.$or[0].propiedadOrigen, 100);
    assert.deepEqual(where.$or[0].areaComun.edificio.$in, [10]);
  });
});

test('mantenimiento ve ocupación sin usuario ni descripción y administrativo ve solo su administración', async () => {
  const mine = reservation();
  await withEM(new Map([[Reservacion, [mine, reservation({ id: 501, areaComun: area(201, 11) })]]]), async () => {
    const result = await reservations.getAllReservaciones(maintenance());
    assert.deepEqual(result, [{ id: 500, fechaReservacion: future, estado: EstadoReservacion.RESERVADO, areaComunId: 200 }]);
    assert.equal(JSON.stringify(result).includes('privado@example'), false);
    assert.deepEqual(await reservations.getAllReservaciones(administrative()), [mine]);
    assert.equal(await reservations.getReservacionById(501, administrative()), null);
  });
});

test('disponibilidad revela ocupación ajena sin datos personales, omite canceladas y respeta edificio', async () => {
  const slot = reservation({ usuario: { id: 999 }, propiedadOrigen: property(101) });
  await withEM(new Map([
    [AreaComun, [area(), area(201, 11)]],
    [Reservacion, [slot, reservation({ id: 501, estado: EstadoReservacion.CANCELADO })]],
  ]), async ({ queries }) => {
    const result = await reservations.getDisponibilidadReservaciones(200, resident());
    assert.equal(result.length, 1);
    assert.deepEqual(Object.keys(result[0]).sort(), ['areaComunId', 'estado', 'fechaReservacion', 'id']);
    assert.equal(queries[1].where.areaComun, 200);
    await assert.rejects(reservations.getDisponibilidadReservaciones(201, resident()), /permiso/);
  });
});

test('crear reserva exige edificio permitido y fija usuario y propiedad; contexto ambiguo debe seleccionarse', async () => {
  const data = { fechaReservacion: future, descripcion: 'Reserva', areaComunId: 200 };
  const otherGrant = grant(AmbitoRol.PROPIEDAD, [permission(S.RESERVAS, { crear: true })], { propiedadId: 101 });
  await withEM(new Map([[AreaComun, [area(), area(201, 11)]], [User, [{ id: 1 }]]]), async ({ persisted }) => {
    const created = await reservations.createReservacion(data, resident());
    assert.equal(created.usuario.id, 1);
    assert.equal(created.propiedadOrigen.id, 100);
    await assert.rejects(reservations.createReservacion({ ...data, usuarioId: 999 }, resident()), /sesión/);
    await assert.rejects(reservations.createReservacion({ ...data, areaComunId: 201 }, resident()), /permiso/);
    await assert.rejects(reservations.createReservacion(data, resident(otherGrant)), /propiedadId/);
    const selected = await reservations.createReservacion({ ...data, propiedadId: 101 }, resident(otherGrant));
    assert.equal(selected.propiedadOrigen.id, 101);
    assert.equal(persisted.length, 2);
  });
});

test('reservas propias pueden cancelarse; administrativo puede editar otras y no moverlas fuera de su ámbito', async () => {
  const item = reservation();
  await withEM(new Map([[Reservacion, [item]], [AreaComun, [area(), area(201, 11)]]]), async ({ persisted }) => {
    assert.equal(await reservations.updateReservacion(500, { descripcion: 'Gestionada' }, administrative()), item);
    await assert.rejects(reservations.updateReservacion(500, { areaComunId: 201, descripcion: 'Cambio inseguro' }, administrative()), /edificio/);
    assert.equal(item.descripcion, 'Gestionada');
    assert.equal(item.areaComun.id, 200);
    await reservations.updateReservacion(500, { estado: EstadoReservacion.CANCELADO }, resident());
    await assert.rejects(reservations.updateReservacion(500, { descripcion: 'No permitido' }, resident()), /Reservado/);
    assert.equal(persisted.length, 2);
  });
});

test('incidencias personales no incluyen informes ajenos ni contextos finalizados; admin aplica edificio en SQL', async () => {
  const mine = incidence();
  const legacyPrivate = incidence({ id: 601, unidad: property(), propiedadOrigen: null });
  const records = [mine, legacyPrivate, incidence({ id: 602, usuario: { id: 99 } }),
    incidence({ id: 603, propiedadOrigen: null }), incidence({ id: 604, unidad: area(201, 11) })];
  await withEM(new Map([[Incidencia, records]]), async ({ queries }) => {
    assert.deepEqual(await incidences.getAllIncidencias(resident()), [mine, legacyPrivate]);
    assert.equal(await incidences.getIncidenciaById(602, resident()), null);
    assert.equal(await incidences.getIncidenciaById(603, resident()), null);
    assert.deepEqual(await incidences.getAllIncidencias(administrative()), records.slice(0, 4));
    assert.deepEqual(queries.at(-1).where.$or[0].unidad.edificio.$in, [10]);
  });
});

test('incidencias fijan autor y unidad de origen; personal solo reporta su propiedad o áreas comunes', async () => {
  const data = { descripcion: 'Reporte', unidadId: 200 };
  await withEM(new Map([['Unidad', [area(), property(), property(101), area(201, 11)]], [User, [{ id: 1 }]]]), async ({ persisted }) => {
    const created = await incidences.createIncidencia(data, resident());
    assert.equal(created.usuario.id, 1);
    assert.equal(created.propiedadOrigen.id, 100);
    const privateReport = await incidences.createIncidencia({ ...data, unidadId: 100 }, resident());
    assert.equal(privateReport.propiedadOrigen.id, 100);
    await assert.rejects(incidences.createIncidencia({ ...data, unidadId: 101 }, resident()), /propiedad/);
    await assert.rejects(incidences.createIncidencia({ ...data, unidadId: 201 }, resident()), /permiso/);
    await assert.rejects(incidences.createIncidencia({ ...data, usuarioId: 99 }, resident()), /sesión/);
    assert.equal(persisted.length, 2);
  });
});

test('residente edita descripción propia solo en Reportado; transiciones requieren permiso específico', async () => {
  const item = incidence();
  await withEM(new Map([[Incidencia, [item]]]), async ({ persisted }) => {
    await incidences.updateIncidencia(600, { descripcion: 'Detalle actualizado' }, resident());
    await assert.rejects(incidences.updateIncidencia(600, { estado: EstadoIncidencia.EN_REVISION }, resident()), /permiso/);
    await assert.rejects(incidences.updateIncidencia(600, { estado: EstadoIncidencia.EN_REVISION }, administrative(false)), /permiso/);
    await assert.rejects(incidences.updateIncidencia(600, { usuarioId: 99 }, administrative()), /autor/);
    await assert.rejects(incidences.updateIncidencia(600, { unidadId: 201 }, administrative()), /unidad/);
    await assert.rejects(incidences.updateIncidencia(600, { estado: EstadoIncidencia.FINALIZADO }, administrative()), /secuencia/);
    await incidences.updateIncidencia(600, { estado: EstadoIncidencia.EN_REVISION }, administrative());
    assert.equal(item.closedAt, null);
    await assert.rejects(incidences.updateIncidencia(600, { descripcion: 'Cambio tardío' }, resident()), /Reportado/);
    await incidences.updateIncidencia(600, { estado: EstadoIncidencia.FINALIZADO }, administrative());
    assert.equal(item.closedAt, now);
    assert.equal(item.descripcion, 'Detalle actualizado');
    assert.equal(item.usuario.id, 1);
    assert.equal(item.unidad.id, 200);
    assert.equal(persisted.length, 3);
  });
});

test('reservas e incidencias no tienen baja: no existe el servicio ni la ruta DELETE', () => {
  for (const [service, method, name] of [[reservations, 'deleteReservacion', 'reservacion'], [incidences, 'deleteIncidencia', 'incidencia']]) {
    assert.equal(method in service, false, method);
    assert.equal(method in require(`../src/controllers/${name}.controller`), false, method);
    const routes = require(`../src/routes/${name}.routes`).default;
    assert.equal(routes.stack.some(layer => layer.route?.methods?.delete), false, name);
  }
});

test('una incidencia abierta puede cancelarse; Finalizado y Cancelado son finales', async () => {
  const reported = incidence(), reviewing = incidence({ id: 601, estado: EstadoIncidencia.EN_REVISION });
  const closed = incidence({ id: 602, estado: EstadoIncidencia.FINALIZADO });
  await withEM(new Map([[Incidencia, [reported, reviewing, closed]]]), async () => {
    await assert.rejects(incidences.updateIncidencia(600, { estado: EstadoIncidencia.CANCELADO }, resident()), /permiso/);
    await incidences.updateIncidencia(600, { estado: EstadoIncidencia.CANCELADO }, administrative());
    assert.equal(reported.estado, EstadoIncidencia.CANCELADO);
    assert.equal(reported.closedAt, now);
    await incidences.updateIncidencia(601, { estado: EstadoIncidencia.CANCELADO }, administrative());
    assert.equal(reviewing.estado, EstadoIncidencia.CANCELADO);
    await assert.rejects(incidences.updateIncidencia(602, { estado: EstadoIncidencia.CANCELADO }, administrative()), /secuencia/);
    await assert.rejects(incidences.updateIncidencia(600, { estado: EstadoIncidencia.EN_REVISION }, administrative()), /secuencia/);
    assert.equal(closed.estado, EstadoIncidencia.FINALIZADO);
  });
});

test('todas las respuestas de reservas/incidencias proyectan autor sin datos sensibles ni relaciones anidadas', async () => {
  const reservationController = require('../src/controllers/reservacion.controller');
  const incidenceController = require('../src/controllers/incidencia.controller');
  const confidential = { id: 1, nombre: 'Ana', apellido: 'Pérez', email: 'private@example.test',
    cuil: 'SECRET_CUIL', fechaNacimiento: new Date('1990-01-01'), estado: true,
    password: 'SECRET_PASSWORD', roles: [{ usuario: { email: 'NESTED_SECRET' } }] };
  const booking = reservation({ usuario: confidential });
  const report = incidence({ usuario: confidential });
  booking.propiedadOrigen.usuariosRoles = [{ usuario: confidential }];
  booking.areaComun.reservaciones = [{ usuario: confidential }];
  report.unidad.incidencias = [{ usuario: confidential }];
  const response = () => ({ statusCode: 0, body: null,
    status(code) { this.statusCode = code; return this; }, json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; } });
  const checks = [
    [reservations, 'getAllReservaciones', reservationController.getReservaciones, [booking]],
    [reservations, 'getReservacionById', reservationController.getReservacion, booking],
    [reservations, 'createReservacion', reservationController.createReservacion, booking],
    [reservations, 'updateReservacion', reservationController.updateReservacion, booking],
    [incidences, 'getAllIncidencias', incidenceController.getIncidencias, [report]],
    [incidences, 'getIncidenciaById', incidenceController.getIncidencia, report],
    [incidences, 'createIncidencia', incidenceController.createIncidencia, report],
    [incidences, 'updateIncidencia', incidenceController.updateIncidencia, report],
  ];
  for (const [service, method, controller, result] of checks) {
    const original = service[method];
    service[method] = async () => result;
    try {
      const res = response();
      await controller({ params: { id: '500' }, body: {}, authorization: administrative() }, res);
      assert.equal(res.body.success, true, method);
      const item = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
      assert.deepEqual(item.usuario, { id: 1, nombre: 'Ana', apellido: 'Pérez' });
      for (const sensitive of ['email', 'cuil', 'password', 'fechaNacimiento', 'roles', 'usuariosRoles', 'NESTED_SECRET']) {
        assert.equal(JSON.stringify(res.body).includes(sensitive), false, method + ': ' + sensitive);
      }
    } finally { service[method] = original; }
  }
  const { serializeReservacion } = require('../src/helpers/business-response.helper');
  const minimal = { id: 500, fechaReservacion: future, estado: EstadoReservacion.RESERVADO, areaComunId: 200 };
  assert.equal(serializeReservacion(minimal), minimal);
});

test('propiedad de origen impide mover reserva a otro edificio incluso con gestión global', async () => {
  const item = reservation();
  const global = { usuarioId: 2, now, grants: [grant(AmbitoRol.GLOBAL, [permission(S.RESERVAS, { editar: true })], { edificioIds: [] })] };
  await withEM(new Map([[Reservacion, [item]], [AreaComun, [area(201, 11), area(202, 10)]]]), async ({ persisted }) => {
    await assert.rejects(reservations.updateReservacion(500, { areaComunId: 201 }, global), /mismo edificio/);
    assert.equal(item.areaComun.id, 200);
    assert.equal(item.propiedadOrigen.id, 100);
    await reservations.updateReservacion(500, { areaComunId: 202 }, administrative());
    assert.equal(item.areaComun.id, 202);
    assert.equal(item.propiedadOrigen.id, 100);
    assert.equal(persisted.length, 1);
  });
});
