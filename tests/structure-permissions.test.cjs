require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AuthorizationError } = require('../src/errors/authorization.error');
const { getDefaultRolePermissions } = require('../src/services/authorization/permission-seed.service');
const manager = require('../src/database/DatabaseManager').default.getInstance();
const properties = require('../src/services/propiedad.service');
const commonAreas = require('../src/services/area-comun.service');
const buildings = require('../src/services/edificio.service');
const administrations = require('../src/services/administracion.service');
const managements = require('../src/services/admin-edificio.service');
const units = require('../src/services/unidad.service');
const localities = require('../src/services/localidad.service');
const unitTypes = require('../src/services/tipo-unidad.service');
const { Propiedad } = require('../src/entities/Propiedad');
const { AreaComun } = require('../src/entities/AreaComun');

function context(code, changes = {}) {
  const ambito = code === 'SUPERADMIN' ? 'GLOBAL'
    : ['RESIDENTE', 'PROPIETARIO'].includes(code) ? 'PROPIEDAD' : 'ADMINISTRACION';
  return {
    usuarioId: 1, now: new Date('2026-10-05T12:00:00Z'), grants: [{
      rolId: 1, rolCodigo: code, ambito,
      edificioIds: ambito === 'GLOBAL' ? [] : [10],
      ...(ambito === 'PROPIEDAD' ? { propiedadId: 100 } : {}),
      ...(ambito === 'ADMINISTRACION' ? { administracionId: 30 } : {}),
      permisos: getDefaultRolePermissions(code), ...changes,
    }],
  };
}

// Emulate query predicates, including relations; services must supply the scope to the DB.
function matches(row, where) {
  return Object.entries(where).every(([field, value]) => {
    if (field === '$and') return value.every(part => matches(row, part));
    if (field === '$or') return value.some(part => matches(row, part));
    const actual = row[field];
    const actualId = actual && typeof actual === 'object' ? actual.id : actual;
    if (value && typeof value === 'object') {
      if ('$in' in value) return value.$in.includes(actualId);
      return actual != null && matches(actual, value);
    }
    return actualId === value;
  });
}

async function withDatabase(run) {
  const original = manager.getORM;
  const edificio = { id: 10, nombre: 'Edificio propio', deletedAt: null };
  const otherBuilding = { id: 20, nombre: 'Edificio ajeno', deletedAt: null };
  const administracion = { id: 30, nombre: 'Administracion propia', deletedAt: null };
  const otherAdministration = { id: 40, nombre: 'Administracion ajena', deletedAt: null };
  const propiedad = Object.assign(new Propiedad(), { id: 100, nroUnidad: '1A', descripcion: 'Original', edificio });
  const vecino = Object.assign(new Propiedad(), { id: 101, edificio });
  const ajena = Object.assign(new Propiedad(), { id: 102, edificio: otherBuilding });
  const area = Object.assign(new AreaComun(), { id: 200, edificio });
  const otherArea = Object.assign(new AreaComun(), { id: 201, edificio: otherBuilding });
  const records = {
    Edificio: [edificio, otherBuilding], Administracion: [administracion, otherAdministration],
    Propiedad: [propiedad, vecino, ajena], AreaComun: [area, otherArea],
    Unidad: [propiedad, vecino, ajena, area, otherArea],
    AdminEdificio: [
      { id: 300, administracion, edificio },
      { id: 301, administracion: otherAdministration, edificio: otherBuilding },
      { id: 302, administracion: otherAdministration, edificio },
    ],
    Localidad: [{ id: 1, nombre: 'Santa Fe', provincia: 'Santa Fe' }],
    TipoUnidad: [{ id: 1, nombre: 'Departamento', ambito: 'PRIVADO' }, { id: 2, nombre: 'SUM', ambito: 'COMUN' }],
  };
  const calls = [];
  const writes = [];
  const em = {
    find: async (entity, where) => {
      const name = typeof entity === 'string' ? entity : entity.name;
      calls.push({ name, where });
      return records[name].filter(row => matches(row, where));
    },
    findOne: async (entity, where) => {
      const name = typeof entity === 'string' ? entity : entity.name;
      calls.push({ name, where });
      return records[name].find(row => matches(row, where)) ?? null;
    },
    persistAndFlush: async entity => writes.push(entity),
    removeAndFlush: async entity => writes.push(entity),
    count: async () => 0,
  };
  manager.getORM = () => ({ em: { fork: () => em } });
  try { await run({ records, calls, writes }); } finally { manager.getORM = original; }
}

test('residentes y propietarios consultan solo sus propiedades, edificio y areas comunes', async () => {
  await withDatabase(async ({ calls }) => {
    for (const code of ['RESIDENTE', 'PROPIETARIO']) {
      const ctx = context(code);
      assert.deepEqual((await properties.getAllPropiedades(ctx)).map(row => row.id), [100]);
      assert.equal(await properties.getPropiedadById(101, ctx), null);
      assert.equal(await properties.getPropiedadById(102, ctx), null);
      assert.deepEqual((await buildings.getAllEdificios(ctx)).map(row => row.id), [10]);
      assert.equal(await buildings.getEdificioById(20, ctx), null);
      assert.deepEqual((await commonAreas.getAllAreasComunes(ctx)).map(row => row.id), [200]);
      assert.equal(await commonAreas.getAreaComunById(201, ctx), null);
      assert.deepEqual((await units.getAllUnidades(ctx)).map(row => row.id), [100, 200]);
      assert.equal(await units.getUnidadById(101, ctx), null);
      await assert.rejects(administrations.getAllAdministraciones(ctx), AuthorizationError);
    }
    assert.ok(calls.every(call => Object.keys(call.where).length > 0), 'Scope belongs in every structural query');
  });
});

test('administrativos solo leen su administracion y estructuras de edificios gestionados', async () => {
  await withDatabase(async () => {
    const ctx = context('ADMINISTRATIVO');
    assert.deepEqual((await properties.getAllPropiedades(ctx)).map(row => row.id), [100, 101]);
    assert.equal(await properties.getPropiedadById(102, ctx), null);
    assert.deepEqual((await administrations.getAllAdministraciones(ctx)).map(row => row.id), [30]);
    assert.equal(await administrations.getAdministracionById(40, ctx), null);
    assert.deepEqual((await managements.getAllAdminEdificios(ctx)).map(row => row.id), [300]);
    assert.equal(await managements.getAdminEdificioById(302, ctx), null);
    assert.deepEqual((await units.getAllUnidades(ctx)).map(row => row.id), [100, 101, 200]);
  });
});

test('mantenimiento lee el contexto de trabajo sin obtener propiedades por /unidades', async () => {
  await withDatabase(async () => {
    const ctx = context('MANTENIMIENTO');
    assert.deepEqual((await buildings.getAllEdificios(ctx)).map(row => row.id), [10]);
    assert.deepEqual((await commonAreas.getAllAreasComunes(ctx)).map(row => row.id), [200]);
    await assert.rejects(properties.getAllPropiedades(ctx), AuthorizationError);
    await assert.rejects(properties.getPropiedadById(100, ctx), AuthorizationError);
    assert.deepEqual((await units.getAllUnidades(ctx)).map(row => row.id), [200]);
    assert.equal(await units.getUnidadById(100, ctx), null);
  });
});

test('los cuatro roles iniciales no pueden mutar estructura, catalogos ni relaciones de administracion', async () => {
  await withDatabase(async ({ writes }) => {
    for (const code of ['RESIDENTE', 'PROPIETARIO', 'MANTENIMIENTO', 'ADMINISTRATIVO']) {
      const ctx = context(code);
      for (const operation of [
        () => properties.createPropiedad({ edificioId: 10 }, ctx),
        () => properties.updatePropiedad(100, { descripcion: 'Nueva' }, ctx),
        () => properties.deletePropiedad(100, ctx),
        () => commonAreas.createAreaComun({ edificioId: 10 }, ctx),
        () => commonAreas.updateAreaComun(200, { descripcion: 'Nueva' }, ctx),
        () => commonAreas.deleteAreaComun(200, ctx),
        () => buildings.createEdificio({}, ctx),
        () => buildings.updateEdificio(10, { nombre: 'Nuevo' }, ctx),
        () => buildings.deleteEdificio(10, ctx),
        () => administrations.createAdministracion({}, ctx),
        () => administrations.updateAdministracion(30, { nombre: 'Nueva' }, ctx),
        () => administrations.deleteAdministracion(30, ctx),
        () => managements.createAdminEdificio({}, ctx),
        () => managements.updateAdminEdificio(300, { edificioId: 20 }, ctx),
        () => managements.deleteAdminEdificio(300, ctx),
        () => localities.createLocalidad({}, ctx),
        () => localities.updateLocalidad(1, { nombre: 'Nueva' }, ctx),
        () => localities.deleteLocalidad(1, ctx),
        () => unitTypes.createTipoUnidad({}, ctx),
        () => unitTypes.updateTipoUnidad(1, { nombre: 'Nuevo' }, ctx),
        () => unitTypes.deleteTipoUnidad(1, ctx),
        () => units.deleteUnidad(100, ctx),
      ]) await assert.rejects(operation(), AuthorizationError);
    }
    assert.equal(writes.length, 0);
  });
});

test('un permiso estructural explicito exige autorizacion tanto del origen como del edificio destino', async () => {
  await withDatabase(async ({ records, writes }) => {
    const ctx = context('ADMINISTRATIVO');
    const structure = ctx.grants[0].permisos.find(item => item.seccion === 'ESTRUCTURA');
    structure.crear = true;
    structure.editar = true;
    structure.borrar = true;
    await assert.rejects(properties.updatePropiedad(100, { edificioId: 20, descripcion: 'No guardar' }, ctx), AuthorizationError);
    await assert.rejects(commonAreas.updateAreaComun(200, { edificioId: 20, descripcion: 'No guardar' }, ctx), AuthorizationError);
    assert.equal(records.Propiedad[0].descripcion, 'Original');
    assert.equal(await properties.updatePropiedad(102, { edificioId: 10 }, ctx), null);
    assert.equal(await buildings.updateEdificio(20, { nombre: 'No guardar' }, ctx), null);
    await assert.rejects(properties.createPropiedad({ edificioId: 20 }, ctx), AuthorizationError);
    await assert.rejects(managements.updateAdminEdificio(300, { edificioId: 20 }, ctx), AuthorizationError);
    await assert.rejects(buildings.createEdificio({}, ctx), AuthorizationError);
    assert.equal(writes.length, 0);
    await properties.updatePropiedad(100, { descripcion: 'Autorizada', edificioId: 10 }, ctx);
    await commonAreas.updateAreaComun(200, { capacidad: 12, edificioId: 10 }, ctx);
    assert.equal(writes.length, 2);
    assert.equal(records.Propiedad[0].descripcion, 'Autorizada');
  });
});

test('los catalogos son consultables con permiso y sus mutaciones y relaciones globales requieren rol global', async () => {
  await withDatabase(async ({ writes }) => {
    assert.equal((await localities.getAllLocalidades(context('RESIDENTE'))).length, 1);
    assert.equal((await unitTypes.getAllTiposUnidad(context('MANTENIMIENTO'))).length, 2);
    const anonymous = { usuarioId: 1, now: new Date(), grants: [] };
    await assert.rejects(localities.getAllLocalidades(anonymous), AuthorizationError);
    const scoped = context('ADMINISTRATIVO');
    scoped.grants[0].permisos.find(item => item.seccion === 'CATALOGOS').editar = true;
    await assert.rejects(localities.updateLocalidad(1, { nombre: 'No guardar' }, scoped), AuthorizationError);
    const global = context('SUPERADMIN');
    assert.equal((await properties.getAllPropiedades(global)).length, 3);
    assert.equal((await buildings.getAllEdificios(global)).length, 2);
    await localities.updateLocalidad(1, { nombre: 'Actualizada' }, global);
    await unitTypes.createTipoUnidad({ nombre: 'Terraza', ambito: 'COMUN' }, global);
    await managements.createAdminEdificio({ administracionId: 40, edificioId: 20 }, global);
    await properties.createPropiedad({ edificioId: 20, tipoUnidadId: 1, nroUnidad: '2B', copropiedad: 5, habitaciones: 2, mtCuadrados: 80, descripcion: 'Alta' }, global);
    assert.equal(writes.length, 4);
  });
});
