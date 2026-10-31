require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AmbitoRol } = require('../src/entities/enums');
const { AccionPermiso: A, SeccionPermiso: S, CodigoRol } = require('../src/entities/Permiso');
const { UsuarioRolPropiedad } = require('../src/entities/UsuarioRolPropiedad');
const { Empleado } = require('../src/entities/Empleado');
const { UsuarioRol } = require('../src/entities/UsuarioRol');
const { requireDelegableRole, revokeAssignment, assignmentScope } = require('../src/services/assignment-authorization.helper');
const { hasPermission, isActiveAssignment } = require('../src/services/authorization.service');
const { getDefaultRolePermissions } = require('../src/services/permission-seed.service');
const propertyAssignments = require('../src/services/usuario-rol-propiedad.service');
const employeeAssignments = require('../src/services/empleado.service');
const globalAssignments = require('../src/services/usuario-rol.service');
const manager = require('../src/database/DatabaseManager').default.getInstance();

const now = new Date('2026-10-05T15:00:00Z');
const past = new Date('2026-10-04T15:00:00Z');
const future = new Date('2026-10-06T15:00:00Z');
const permission = (seccion, flags = {}) => ({ seccion, crear: false, leer: false, editar: false, borrar: false, acciones: [], ...flags });
const grant = (ambito, options = {}) => ({ rolId: 1, rolCodigo: null, ambito, edificioIds: [], permisos: [], ...options });
const ctx = grants => ({ usuarioId: 7, now, grants });
const administrative = () => ctx([grant(AmbitoRol.ADMINISTRACION, {
  rolCodigo: CodigoRol.ADMINISTRATIVO, administracionId: 20, edificioIds: [10],
  permisos: getDefaultRolePermissions(CodigoRol.ADMINISTRATIVO),
})]);
const global = () => ctx([grant(AmbitoRol.GLOBAL, {
  rolCodigo: CodigoRol.SUPERADMIN, permisos: getDefaultRolePermissions(CodigoRol.SUPERADMIN),
})]);
const role = (ambito, codigo, permissions = getDefaultRolePermissions(codigo)) => ({
  id: 50, codigo, ambito, permisos: { getItems: () => permissions },
});

test('administracion no puede delegar un rol GLOBAL aunque tenga ASIGNAR en su administracion', () => {
  assert.throws(() => requireDelegableRole(administrative(), role(AmbitoRol.GLOBAL, CodigoRol.SUPERADMIN), { administracionId: 20 }), /roles globales/);
  assert.doesNotThrow(() => requireDelegableRole(global(), role(AmbitoRol.GLOBAL, CodigoRol.SUPERADMIN), {}));
});

test('administracion solo puede delegar permisos administrativos que tiene en el contexto destino', () => {
  const actor = administrative();
  assert.doesNotThrow(() => requireDelegableRole(actor, role(AmbitoRol.ADMINISTRACION, CodigoRol.MANTENIMIENTO), { administracionId: 20 }));
  const superior = role(AmbitoRol.ADMINISTRACION, null, [permission(S.USUARIOS, { acciones: [A.DESHABILITAR] })]);
  assert.throws(() => requireDelegableRole(actor, superior, { administracionId: 20 }), /superiores a los propios/);
  const createReservations = role(AmbitoRol.ADMINISTRACION, null, [permission(S.RESERVAS, { crear: true })]);
  assert.throws(() => requireDelegableRole(actor, createReservations, { administracionId: 20 }), /superiores a los propios/);
  assert.throws(() => requireDelegableRole(actor, role(AmbitoRol.ADMINISTRACION, CodigoRol.MANTENIMIENTO), { administracionId: 21 }), /No tiene permiso/);
});

test('administrativo puede asignar Residente y Propietario dentro de su ambito sin heredar sus permisos', () => {
  const actor = administrative();
  assert.equal(hasPermission(actor, S.RESERVAS, A.CREAR, { edificioId: 10 }), false);
  for (const code of [CodigoRol.RESIDENTE, CodigoRol.PROPIETARIO]) {
    const destinationRole = role(AmbitoRol.PROPIEDAD, code);
    assert.doesNotThrow(() => requireDelegableRole(actor, destinationRole, { propiedadId: 100, edificioId: 10 }));
    assert.throws(() => requireDelegableRole(actor, destinationRole, { propiedadId: 101, edificioId: 11 }), /No tiene permiso/);
  }
});

test('un rol canonico de propiedad modificado no permite delegar acciones por encima de su matriz inicial', () => {
  const actions = getDefaultRolePermissions(CodigoRol.RESIDENTE);
  actions.find(permission => permission.seccion === S.RESERVAS).borrar = true;
  assert.throws(() => requireDelegableRole(administrative(), role(AmbitoRol.PROPIEDAD, CodigoRol.RESIDENTE, actions), { propiedadId: 100, edificioId: 10 }), /no puede delegar/);
  const ownerActions = getDefaultRolePermissions(CodigoRol.PROPIETARIO);
  ownerActions.find(permission => permission.seccion === S.INCIDENCIAS).acciones.push(A.CAMBIAR_ESTADO);
  assert.throws(() => requireDelegableRole(administrative(), role(AmbitoRol.PROPIEDAD, CodigoRol.PROPIETARIO, ownerActions), { propiedadId: 100, edificioId: 10 }), /no puede delegar/);
  assert.throws(() => requireDelegableRole(administrative(), role(AmbitoRol.PROPIEDAD, null, []), { propiedadId: 100, edificioId: 10 }), /no est.*habilitado/);
});

test('combinar ASIGNAR de propiedad con ASIGNAR administrativo ajeno no habilita delegacion en el edificio extranjero', () => {
  const actor = administrative();
  actor.grants.push(grant(AmbitoRol.PROPIEDAD, {
    rolId: 99, propiedadId: 101, edificioIds: [11],
    permisos: [permission(S.ASIGNACIONES, { leer: true, acciones: [A.ASIGNAR] })],
  }));
  assert.equal(hasPermission(actor, S.ASIGNACIONES, A.ASIGNAR, { propiedadId: 101, edificioId: 11 }), true);
  assert.deepEqual(assignmentScope(actor, A.ASIGNAR).edificioIds, [10]);
  assert.throws(() => requireDelegableRole(actor, role(AmbitoRol.PROPIEDAD, CodigoRol.RESIDENTE), { propiedadId: 101, edificioId: 11 }), /No tiene permiso/);
});

test('revocar una asignacion futura crea un intervalo vacio y mantiene una revocacion anterior', () => {
  const entity = { beginAt: future, endAt: null };
  revokeAssignment(entity, now);
  assert.equal(entity.endAt, entity.beginAt);
  assert.equal(isActiveAssignment(entity, now), false);
  assert.equal(isActiveAssignment(entity, future), false);
  assert.equal(isActiveAssignment(entity, new Date(future.getTime() + 1)), false);
  const expired = { beginAt: new Date('2026-10-01T15:00:00Z'), endAt: past };
  revokeAssignment(expired, now);
  assert.equal(expired.endAt, past);
});

const scalar = value => value && typeof value === 'object' && !(value instanceof Date) && 'id' in value ? value.id : value;
const matches = (record, where) => Object.entries(where).every(([key, expected]) => {
  if (key === '$and') return expected.every(clause => matches(record, clause));
  if (key === '$or') return expected.some(clause => matches(record, clause));
  if (key === '$in') return expected.includes(scalar(record));
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) return matches(record?.[key], expected);
  return scalar(record?.[key]) === expected;
});

async function withEM(entityClass, entity, run) {
  const original = manager.getORM;
  const saved = [], queries = [];
  const em = {
    findOne: async (candidate, where) => {
      queries.push({ entity: candidate, where });
      return candidate === entityClass && matches(entity, where) ? entity : null;
    },
    persistAndFlush: async record => { saved.push(record); },
  };
  manager.getORM = () => ({ em: { fork: () => em } });
  try { await run({ saved, queries }); }
  finally { manager.getORM = original; }
}

const assignmentSpecs = [
  { name: 'propiedad', Entity: UsuarioRolPropiedad, update: propertyAssignments.updateUsuarioRolPropiedad, actor: administrative,
    fixture: () => ({ propiedad: { id: 100, edificio: { id: 10 } }, rol: role(AmbitoRol.PROPIEDAD, CodigoRol.RESIDENTE) }),
    contextField: 'propiedadId' },
  { name: 'empleado', Entity: Empleado, update: employeeAssignments.updateEmpleado, actor: administrative,
    fixture: () => ({ administracion: { id: 20 }, rol: role(AmbitoRol.ADMINISTRACION, CodigoRol.MANTENIMIENTO) }),
    contextField: 'administracionId' },
  { name: 'global', Entity: UsuarioRol, update: globalAssignments.updateUsuarioRol, actor: global,
    fixture: () => ({ rol: role(AmbitoRol.GLOBAL, CodigoRol.SUPERADMIN) }) },
];

for (const spec of assignmentSpecs) {
  test(`asignacion ${spec.name}: actualizar no cambia usuario, rol ni contexto`, async () => {
    const entity = Object.assign(new spec.Entity(), { id: 200, usuario: { id: 8 }, beginAt: past, ...spec.fixture() });
    const forbiddenChanges = [{ usuarioId: 9 }, { rolId: 51 }];
    if (spec.contextField) forbiddenChanges.push({ [spec.contextField]: 999 });
    await withEM(spec.Entity, entity, async ({ saved }) => {
      for (const changes of forbiddenChanges) {
        await assert.rejects(spec.update(200, changes, spec.actor()), /No se puede cambiar/);
      }
      assert.equal(entity.usuario.id, 8);
      assert.equal(entity.rol.id, 50);
      assert.equal(entity.beginAt, past);
      assert.equal(entity.endAt, null);
      assert.equal(saved.length, 0);
    });
  });
}

test('revocar o actualizar asignaciones ajenas consulta unicamente el ambito permitido', async () => {
  const entity = Object.assign(new UsuarioRolPropiedad(), {
    id: 200, usuario: { id: 8 }, rol: role(AmbitoRol.PROPIEDAD, CodigoRol.RESIDENTE),
    propiedad: { id: 101, edificio: { id: 11 } }, beginAt: past,
  });
  await withEM(UsuarioRolPropiedad, entity, async ({ saved, queries }) => {
    assert.equal(await propertyAssignments.updateUsuarioRolPropiedad(200, { endAt: now }, administrative()), null);
    assert.equal(await propertyAssignments.deleteUsuarioRolPropiedad(200, administrative()), null);
    assert.equal(saved.length, 0);
    assert.ok(queries.every(query => query.where.$and[0].propiedad.edificio.id.$in.includes(10)));
    assert.ok(queries.every(query => !query.where.$and[0].propiedad.edificio.id.$in.includes(11)));
  });
});

test('reabrir una asignacion exige ASIGNAR y validar nuevamente los permisos delegables', async () => {
  const permissions = getDefaultRolePermissions(CodigoRol.RESIDENTE);
  permissions.find(permission => permission.seccion === S.RESERVAS).borrar = true;
  const entity = Object.assign(new UsuarioRolPropiedad(), {
    id: 200, usuario: { id: 8 }, rol: role(AmbitoRol.PROPIEDAD, CodigoRol.RESIDENTE, permissions),
    propiedad: { id: 100, edificio: { id: 10 } }, beginAt: past, endAt: now,
  });
  await withEM(UsuarioRolPropiedad, entity, async ({ saved }) => {
    await assert.rejects(propertyAssignments.updateUsuarioRolPropiedad(200, { endAt: null }, administrative()), /no puede delegar/);
    assert.equal(entity.endAt, now);
    assert.equal(saved.length, 0);
  });
});
