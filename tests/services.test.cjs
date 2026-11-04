require('ts-node/register');
require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MikroORM } = require('@mikro-orm/core');
const config = require('../src/config/mikro-orm.config').default;
const manager = require('../src/database/DatabaseManager').default.getInstance();
const { AmbitoRol } = require('../src/entities/AmbitoRol');
const { parseId, requireEntity } = require('../src/services/service.helper');

// Reglas del modelo y de los servicios que no cubren las suites de permisos.
// Los metadatos reales de MikroORM habilitan los hooks; no se conecta a MySQL.
let orm, originalGetORM, em;
before(async () => {
  orm = await MikroORM.init({ ...config, connect: false });
  originalGetORM = manager.getORM;
  manager.getORM = () => ({ em: { fork: () => em } });
});
after(async () => {
  manager.getORM = originalGetORM;
  if (orm) await orm.close();
});
const superadmin = { usuarioId: 1, now: new Date('2026-10-01T12:00:00Z'), grants: [
  { rolId: 1, rolCodigo: 'SUPERADMIN', ambito: AmbitoRol.GLOBAL, edificioIds: [], permisos: [] },
] };
const entity = (path, values) => Object.assign(new (require('../src/entities/' + path)[path])(), values);

test('los IDs rechazan entradas ambiguas o fuera del rango seguro', () => {
  for (const id of ['1abc', '', ' ', '1.5', -1, 0, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parseId(id), /entero positivo/);
  }
  assert.equal(parseId('12'), 12);
  assert.equal(parseId(12), 12);
});

test('una relacion inexistente se informa como error de dominio', async () => {
  const { Localidad } = require('../src/entities/Localidad');
  const found = entity('Localidad', { id: 3 });
  em = { findOne: async (_entity, where) => where.id === 3 ? found : null };
  assert.equal(await requireEntity(em, Localidad, '3', 'Localidad'), found);
  await assert.rejects(requireEntity(em, Localidad, 4, 'Localidad'), /Localidad no encontrado/);
});

test('la copropiedad es un porcentaje entre 0 y 100', () => {
  for (const copropiedad of [0, 12.3456, 100]) {
    assert.doesNotThrow(() => entity('Propiedad', { copropiedad }).validarCopropiedad());
  }
  for (const copropiedad of [-1, 100.01, NaN, Infinity]) {
    assert.throws(() => entity('Propiedad', { copropiedad }).validarCopropiedad(), /porcentaje/);
  }
});

test('los periodos no terminan antes de empezar y los roles respetan su ambito', async () => {
  const link = ambito => entity('UsuarioRol', { rol: entity('Rol', { ambito }), endAt: null });
  const cases = [
    ['UsuarioRol', {}],
    ['AdminEdificio', {}],
    ['Empleado', { usuarioRol: link(AmbitoRol.ADMINISTRACION) }],
    ['UsuarioRolPropiedad', { usuarioRol: link(AmbitoRol.PROPIEDAD) }],
  ];
  const beginAt = new Date('2026-02-01T00:00:00Z');
  for (const [path, values] of cases) {
    await entity(path, { ...values, beginAt, endAt: null }).validar();
    await entity(path, { ...values, beginAt, endAt: beginAt }).validar();
    await assert.rejects(async () => entity(path, { ...values, beginAt, endAt: new Date('2026-01-31T00:00:00Z') }).validar(),
      /fecha de fin/, path);
  }
  await assert.rejects(async () => entity('Empleado', { usuarioRol: link(AmbitoRol.PROPIEDAD), endAt: null }).validar(), /ADMINISTRACION/);
  await assert.rejects(async () => entity('UsuarioRolPropiedad', { usuarioRol: link(AmbitoRol.ADMINISTRACION), endAt: null }).validar(), /PROPIEDAD/);
});

test('una unidad no cambia de clase', async () => {
  const unidades = require('../src/services/unidad.service');
  em = { findOne: async () => entity('Propiedad', { id: 5 }) };
  await assert.rejects(unidades.updateUnidad(5, { clase: 'area_comun', capacidad: 3 }, superadmin), /cambiar la clase/);
  await assert.rejects(unidades.createUnidad({ clase: 'otra' }, superadmin), /clase/);
});

test('los listados de asignaciones filtran por usuario en la consulta', async () => {
  const queries = [];
  em = { find: async (_entity, where) => { queries.push(where); return []; } };
  const cases = [
    [require('../src/services/empleado.service').getAllEmpleados, { usuarioRol: { usuario: 7 } }],
    [require('../src/services/usuario-rol-propiedad.service').getAllUsuariosRolesPropiedad, { usuarioRol: { usuario: 7 } }],
    [require('../src/services/usuario-rol.service').getAllUsuariosRoles, { rol: { ambito: AmbitoRol.GLOBAL }, usuario: 7 }],
  ];
  for (const [list, expected] of cases) {
    await list(superadmin, '7');
    assert.deepEqual(queries.at(-1), expected);
    await list(superadmin);
    assert.equal(JSON.stringify(queries.at(-1)).includes('usuario"'), false, 'sin filtro no se restringe por usuario');
  }
  await assert.rejects(require('../src/services/empleado.service').getAllEmpleados(superadmin, 'abc'), /entero positivo/);
});

test('las contrasenas se guardan hasheadas al editar el perfil o la cuenta', async () => {
  const { User } = require('../src/entities/User');
  const { comparePassword } = require('../src/services/auth.service');
  const users = require('../src/services/user.service');
  const user = new User('Ana', 'Perez', 'ana@example.com', new Date('2000-01-01'), 'hash-anterior', true);
  user.id = 1;
  const lookups = [];
  em = { findOne: async (_entity, where) => { lookups.push(where); return user; }, persistAndFlush: async () => {} };
  await users.updateOwnProfile({ password: 'clave123', apellido: 'Gomez' }, 1);
  // El perfil propio solo edita la cuenta activa del token.
  assert.deepEqual(lookups[0], { id: 1, estado: true });
  assert.notEqual(user.password, 'clave123');
  assert.ok(await comparePassword('clave123', user.password));
  assert.equal(user.apellido, 'Gomez');
  await users.updateUser(1, { password: 'otraClave' }, superadmin);
  assert.ok(await comparePassword('otraClave', user.password));
  await assert.rejects(users.updateOwnProfile({ estado: false }, 1), /no permitido/);
});
