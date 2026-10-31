require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AmbitoRol } = require('../src/entities/enums');
const { AccionPermiso: A, SeccionPermiso: S, CodigoRol } = require('../src/entities/Permiso');
const { Rol } = require('../src/entities/Rol');
const { RolPermiso } = require('../src/entities/RolPermiso');
const { User } = require('../src/entities/User');
const { UsuarioRol } = require('../src/entities/UsuarioRol');
const { UsuarioRolPropiedad } = require('../src/entities/UsuarioRolPropiedad');
const { Empleado } = require('../src/entities/Empleado');
const { AdminEdificio } = require('../src/entities/AdminEdificio');
const { authorizedScope, hasPermission, matchingGrants, requirePermission, loadAuthorizationContext, isActiveAssignment } = require('../src/services/authorization.service');
const { seedDefaultPermissions, getDefaultRolePermissions } = require('../src/services/permission-seed.service');

const permission = (seccion, flags = {}) => ({ seccion, crear: false, leer: false, editar: false, borrar: false, acciones: [], ...flags });
const grant = (ambito, flags = {}) => ({ rolId: 1, rolCodigo: null, ambito, edificioIds: [], permisos: [], ...flags });
const context = grants => ({ usuarioId: 7, now: new Date('2026-10-05T12:00:00Z'), grants });

test('los permisos ausentes, las secciones desconocidas y las acciones desconocidas se deniegan', () => {
  const ctx = context([grant(AmbitoRol.GLOBAL, { permisos: [permission(S.RESERVAS, { leer: true })] })]);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.LEER), true);
  for (const [section, action] of [[S.RESERVAS, A.CREAR], [S.USUARIOS, A.LEER], ['OTRA', A.LEER], [S.RESERVAS, 'TODO']]) {
    assert.equal(hasPermission(ctx, section, action), false);
  }
  assert.throws(() => requirePermission(ctx, S.USUARIOS, A.EDITAR), /No tiene permiso/);
  assert.equal(hasPermission(context([]), S.RESERVAS, A.LEER), false);
});

test('un rol de propiedad exige la propiedad exacta y comprueba el edificio cuando se indica', () => {
  const ctx = context([grant(AmbitoRol.PROPIEDAD, { propiedadId: 11, edificioIds: [100], permisos: [permission(S.INCIDENCIAS, { leer: true })] })]);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.LEER, { propiedadId: 11 }), true);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.LEER, { propiedadId: 12, edificioId: 100 }), false);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.LEER, { propiedadId: 11, edificioId: 101 }), false);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.LEER, { edificioId: 100 }), true);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.LEER, { edificioId: 101 }), false);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.LEER, { administracionId: 2 }), false);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.LEER, {}), false);
});

test('los permisos administrativos no cruzan administraciones ni edificios gestionados', () => {
  const ctx = context([grant(AmbitoRol.ADMINISTRACION, { administracionId: 2, edificioIds: [100], permisos: [permission(S.USUARIOS, { editar: true })] })]);
  assert.equal(hasPermission(ctx, S.USUARIOS, A.EDITAR, { administracionId: 2 }), true);
  assert.equal(hasPermission(ctx, S.USUARIOS, A.EDITAR, { administracionId: 3 }), false);
  assert.equal(hasPermission(ctx, S.USUARIOS, A.EDITAR, { edificioId: 100 }), true);
  assert.equal(hasPermission(ctx, S.USUARIOS, A.EDITAR, { edificioId: 101 }), false);
  assert.equal(hasPermission(ctx, S.USUARIOS, A.EDITAR, { administracionId: 2, edificioId: 101 }), false);
  assert.equal(hasPermission(ctx, S.USUARIOS, A.EDITAR, { administracionId: 3, edificioId: 100 }), false);
});

test('combinar roles conserva el alcance individual de cada permiso y permite filtrar por ambito', () => {
  const ctx = context([
    grant(AmbitoRol.PROPIEDAD, { propiedadId: 11, edificioIds: [100], permisos: [permission(S.RESERVAS, { crear: true, leer: true })] }),
    grant(AmbitoRol.PROPIEDAD, { propiedadId: 12, edificioIds: [101], permisos: [permission(S.RESERVAS, { leer: true })] }),
    grant(AmbitoRol.ADMINISTRACION, { administracionId: 2, edificioIds: [100, 102], permisos: [permission(S.RESERVAS, { leer: true, editar: true })] }),
  ]);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.CREAR, { edificioId: 101 }), false);
  assert.deepEqual(authorizedScope(ctx, S.RESERVAS, A.CREAR), { global: false, propiedadIds: [11], edificioIds: [100], administracionIds: [] });
  assert.deepEqual(authorizedScope(ctx, S.RESERVAS, A.LEER, AmbitoRol.ADMINISTRACION), { global: false, propiedadIds: [], edificioIds: [100, 102], administracionIds: [2] });
  assert.equal(matchingGrants(ctx, S.RESERVAS, A.LEER, { edificioId: 100 }).length, 2);
});

test('GLOBAL requiere permiso explicito y los objetivos invalidos no conceden acceso', () => {
  const ctx = context([grant(AmbitoRol.GLOBAL, { permisos: [permission(S.RESERVAS, { editar: true })] })]);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.EDITAR, { edificioId: 999 }), true);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.BORRAR, { edificioId: 999 }), false);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.EDITAR, { edificioId: -1 }), false);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.EDITAR, { edificioId: '1' }), false);
  assert.equal(authorizedScope(ctx, S.RESERVAS, A.EDITAR).global, true);
});

test('la vigencia incluye el inicio y excluye el instante de fin', () => {
  const now = new Date('2026-10-05T12:00:00Z');
  assert.equal(isActiveAssignment({ beginAt: now, endAt: null }, now), true);
  assert.equal(isActiveAssignment({ beginAt: new Date(now.getTime() - 1), endAt: now }, now), false);
  assert.equal(isActiveAssignment({ beginAt: new Date(now.getTime() + 1), endAt: null }, now), false);
  assert.equal(isActiveAssignment({ beginAt: now, endAt: new Date(now.getTime() + 1) }, now), true);
  assert.equal(isActiveAssignment({ beginAt: new Date('invalid'), endAt: null }, now), false);
});

test('SUPERADMIN tiene todas las acciones sin depender de su matriz ni del contexto seleccionado', () => {
  const ctx = context([grant(AmbitoRol.GLOBAL, { rolCodigo: CodigoRol.SUPERADMIN })]);
  for (const section of Object.values(S)) for (const action of Object.values(A)) {
    assert.equal(hasPermission(ctx, section, action, { edificioId: 999, propiedadId: 888, administracionId: 777 }), true);
    for (const scope of Object.values(AmbitoRol)) {
      assert.equal(authorizedScope(ctx, section, action, scope).global, true);
    }
  }
  assert.equal(hasPermission(ctx, 'OTRA', A.LEER), false);
  assert.equal(hasPermission(ctx, S.RESERVAS, 'TODO'), false);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.LEER, { edificioId: -1 }), false);
  assert.equal(hasPermission(context([grant(AmbitoRol.PROPIEDAD, { rolCodigo: CodigoRol.SUPERADMIN })]), S.ROLES, A.EDITAR), false);
});

function loaderFixture() {
  const past = new Date(Date.now() - 60_000);
  const future = new Date(Date.now() + 60_000);
  const propertyRole = { id: 1, codigo: CodigoRol.RESIDENTE, ambito: AmbitoRol.PROPIEDAD };
  const employeeRole = { id: 2, codigo: CodigoRol.MANTENIMIENTO, ambito: AmbitoRol.ADMINISTRACION };
  const building = { id: 100, deletedAt: null };
  const administration = { id: 2, deletedAt: null };
  const propertyAssignment = { beginAt: past, endAt: null, rol: propertyRole, propiedad: { id: 11, edificio: building } };
  const job = { beginAt: past, endAt: null, rol: employeeRole, administracion: administration };
  const management = { beginAt: past, endAt: null, administracion: administration, edificio: building };
  const permissions = [
    { rol: propertyRole, ...permission(S.RESERVAS, { crear: true }) },
    { rol: employeeRole, ...permission(S.INCIDENCIAS, { editar: true, acciones: [A.CAMBIAR_ESTADO] }) },
  ];
  const rows = new Map([
    [UsuarioRol, []], [UsuarioRolPropiedad, [propertyAssignment, { ...propertyAssignment, beginAt: future }]],
    [Empleado, [job]], [AdminEdificio, [management, { ...management, edificio: { id: 101 }, endAt: past }]],
    [RolPermiso, permissions],
  ]);
  const user = { id: 7, estado: true, deletedAt: null };
  const queries = [];
  const em = {
    findOne: async (entity, where) => { queries.push({ entity, where }); return entity === User ? user : null; },
    find: async (entity, where, options) => { queries.push({ entity, where, options }); return rows.get(entity) || []; },
  };
  return { em, rows, user, queries, propertyAssignment, job, management, building, administration, permissions };
}

test('el contexto carga permisos vigentes y no requiere un nombre literal de rol', async () => {
  const state = loaderFixture();
  state.propertyAssignment.rol.nombre = 'Nombre cambiado';
  const ctx = await loadAuthorizationContext(7, state.em);
  assert.equal(ctx.grants.length, 2);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.CREAR, { propiedadId: 11 }), true);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.CAMBIAR_ESTADO, { edificioId: 100 }), true);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.CAMBIAR_ESTADO, { edificioId: 101 }), false);
  for (const entity of [UsuarioRol, UsuarioRolPropiedad, Empleado]) {
    const query = state.queries.find(query => query.entity === entity);
    assert.equal(query.where.usuario, 7);
    assert.ok(query.where.beginAt.$lte instanceof Date);
    assert.ok(query.where.$or);
  }
});

test('revocar una asignacion, permiso o gestion de edificio tiene efecto en la siguiente carga', async () => {
  const state = loaderFixture();
  assert.equal(hasPermission(await loadAuthorizationContext(7, state.em), S.RESERVAS, A.CREAR, { propiedadId: 11 }), true);
  state.propertyAssignment.endAt = new Date(Date.now() - 1);
  state.management.endAt = new Date(Date.now() - 1);
  const afterMembershipRevocation = await loadAuthorizationContext(7, state.em);
  assert.equal(hasPermission(afterMembershipRevocation, S.RESERVAS, A.CREAR, { propiedadId: 11 }), false);
  assert.equal(hasPermission(afterMembershipRevocation, S.INCIDENCIAS, A.CAMBIAR_ESTADO, { edificioId: 100 }), false);
  state.propertyAssignment.endAt = null;
  state.permissions[0].crear = false;
  assert.equal(hasPermission(await loadAuthorizationContext(7, state.em), S.RESERVAS, A.CREAR, { propiedadId: 11 }), false);
});

test('usuarios inactivos y edificios o administraciones dados de baja no conservan acceso', async () => {
  const state = loaderFixture();
  state.user.estado = false;
  assert.deepEqual((await loadAuthorizationContext(7, state.em)).grants, []);
  state.user.estado = true;
  state.user.deletedAt = new Date();
  assert.deepEqual((await loadAuthorizationContext(7, state.em)).grants, []);
  state.user.deletedAt = null;
  state.building.deletedAt = new Date();
  let ctx = await loadAuthorizationContext(7, state.em);
  assert.equal(hasPermission(ctx, S.RESERVAS, A.CREAR), false);
  assert.equal(hasPermission(ctx, S.INCIDENCIAS, A.CAMBIAR_ESTADO, { edificioId: 100 }), false);
  state.administration.deletedAt = new Date();
  ctx = await loadAuthorizationContext(7, state.em);
  assert.deepEqual(ctx.grants, []);
});

test('SysAdmin global anterior recibe permisos completos y conserva la revocacion de su asignacion', async () => {
  for (const role of [
    { codigo: CodigoRol.SUPERADMIN, nombre: 'Nombre cambiado' },
    { codigo: 'SYSADMIN', nombre: 'Administrador del sistema' },
    { codigo: null, nombre: ' SysAdmin ' },
  ]) {
    const state = loaderFixture();
    const assignment = { beginAt: new Date(Date.now() - 60_000), endAt: null,
      rol: { id: 90, ambito: AmbitoRol.GLOBAL, ...role } };
    state.rows.set(UsuarioRol, [assignment]);
    const ctx = await loadAuthorizationContext(7, state.em);
    const admin = ctx.grants.find(item => item.rolId === 90);
    assert.equal(admin.rolCodigo, CodigoRol.SUPERADMIN);
    for (const section of Object.values(S)) for (const action of Object.values(A)) {
      assert.equal(hasPermission(context([admin]), section, action), true);
      assert.equal(require('../src/services/authorization.service').permissionAllows(
        admin.permisos.find(item => item.seccion === section), action), true);
    }
    assignment.endAt = new Date(Date.now() - 1);
    assert.equal((await loadAuthorizationContext(7, state.em)).grants.some(item => item.rolId === 90), false);
    assignment.endAt = null;
    state.user.estado = false;
    assert.deepEqual((await loadAuthorizationContext(7, state.em)).grants, []);
  }
});

test('un rol global comun no recibe privilegios de SysAdmin por su ambito', async () => {
  const state = loaderFixture();
  state.rows.set(UsuarioRol, [{ beginAt: new Date(Date.now() - 60_000), endAt: null,
    rol: { id: 90, codigo: null, nombre: 'Operador', ambito: AmbitoRol.GLOBAL } }]);
  assert.equal(hasPermission(await loadAuthorizationContext(7, state.em), S.ROLES, A.EDITAR), false);
});

function seedFixture() {
  const records = new Map([[Rol, []], [RolPermiso, []], [UsuarioRol, []], [User, []]]);
  let nextId = 1;
  const em = {
    findOne: async (entity, where) => (records.get(entity) || []).find(row => {
      if (where.codigo !== undefined) return row.codigo === where.codigo;
      if (where.email !== undefined) return row.email === where.email;
      if (where.seccion !== undefined) return row.rol.id === where.rol && row.seccion === where.seccion;
      if (where.usuario !== undefined) return row.usuario.id === where.usuario && row.rol.id === where.rol && isActiveAssignment(row, where.beginAt.$lte);
      return false;
    }) || null,
    persistAndFlush: async values => {
      for (const row of Array.isArray(values) ? values : [values]) {
        if (!row.id) row.id = nextId++;
        const bucket = records.get(row.constructor);
        if (!bucket.includes(row)) bucket.push(row);
      }
    },
  };
  return { records, em };
}

test('la matriz inicial conserva las diferencias entre roles y las operaciones especificas', () => {
  const resident = context([grant(AmbitoRol.PROPIEDAD, { permisos: getDefaultRolePermissions(CodigoRol.RESIDENTE) })]);
  const owner = context([grant(AmbitoRol.PROPIEDAD, { permisos: getDefaultRolePermissions(CodigoRol.PROPIETARIO) })]);
  const maintenance = context([grant(AmbitoRol.ADMINISTRACION, { permisos: getDefaultRolePermissions(CodigoRol.MANTENIMIENTO) })]);
  const administrative = context([grant(AmbitoRol.ADMINISTRACION, { permisos: getDefaultRolePermissions(CodigoRol.ADMINISTRATIVO) })]);
  assert.equal(hasPermission(resident, S.RESERVAS, A.DISPONIBILIDAD), true);
  assert.equal(hasPermission(resident, S.RESERVAS, A.BORRAR), false);
  assert.equal(hasPermission(owner, S.RESERVAS, A.LEER), false);
  assert.equal(hasPermission(owner, S.INCIDENCIAS, A.EDITAR), false);
  assert.equal(hasPermission(maintenance, S.INCIDENCIAS, A.CAMBIAR_ESTADO), true);
  assert.equal(hasPermission(maintenance, S.PROPIEDADES, A.LEER), false);
  assert.equal(hasPermission(maintenance, S.USUARIOS, A.LEER), false);
  assert.equal(hasPermission(administrative, S.EXPENSAS, A.EMITIR), true);
  assert.equal(hasPermission(administrative, S.USUARIOS, A.BORRAR), true);
  assert.equal(hasPermission(administrative, S.USUARIOS, A.DESHABILITAR), false);
  assert.equal(hasPermission(administrative, S.ROLES, A.EDITAR), false);
  assert.equal(hasPermission(administrative, S.ASIGNACIONES, A.ASIGNAR), true);
  const copy = getDefaultRolePermissions(CodigoRol.RESIDENTE);
  copy[0].acciones.length = 0;
  assert.ok(getDefaultRolePermissions(CodigoRol.RESIDENTE)[0].acciones.includes(A.DISPONIBILIDAD));
});

test('el seed no reconoce nombres arbitrarios y no repone permisos revocados al reiniciar', async () => {
  const state = seedFixture();
  const legacy = new Rol();
  Object.assign(legacy, { id: 900, nombre: 'Administrativo', ambito: AmbitoRol.ADMINISTRACION });
  state.records.get(Rol).push(legacy);
  await seedDefaultPermissions(state.em, '');
  assert.equal(state.records.get(Rol).length, 6);
  assert.equal(legacy.codigo, null);
  assert.equal(state.records.get(RolPermiso).some(row => row.rol === legacy), false);
  assert.equal(state.records.get(UsuarioRol).length, 0);
  const resident = state.records.get(Rol).find(row => row.codigo === CodigoRol.RESIDENTE);
  const removed = state.records.get(RolPermiso).find(row => row.rol === resident && row.seccion === S.RESERVAS);
  state.records.set(RolPermiso, state.records.get(RolPermiso).filter(row => row !== removed));
  const count = state.records.get(RolPermiso).length;
  await seedDefaultPermissions(state.em, '');
  assert.equal(state.records.get(RolPermiso).length, count);
  assert.equal(state.records.get(RolPermiso).some(row => row.rol === resident && row.seccion === S.RESERVAS), false);
});

test('SUPERADMIN requiere bootstrap explicito y la revocacion no se restaura por la variable persistente', async () => {
  const state = seedFixture();
  const user = new User();
  Object.assign(user, { id: 100, email: 'admin@example.com', estado: true });
  state.records.get(User).push(user);
  await seedDefaultPermissions(state.em, '');
  assert.equal(state.records.get(UsuarioRol).length, 0);
  await seedDefaultPermissions(state.em, 'admin@example.com');
  assert.equal(state.records.get(UsuarioRol).length, 1);
  const assignment = state.records.get(UsuarioRol)[0];
  assert.equal(assignment.rol.codigo, CodigoRol.SUPERADMIN);
  assignment.endAt = new Date(Date.now() - 1);
  await seedDefaultPermissions(state.em, 'admin@example.com');
  assert.equal(state.records.get(UsuarioRol).length, 1);
  assert.ok(assignment.endAt);
});

test('un bootstrap inexistente falla sin otorgar roles globales', async () => {
  const state = seedFixture();
  await assert.rejects(seedDefaultPermissions(state.em, 'missing@example.com'), /usuario existente y activo/);
  assert.equal(state.records.get(UsuarioRol).length, 0);
});
