require('ts-node/register');
require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MikroORM, EventType } = require('@mikro-orm/core');
const config = require('../src/config/mikro-orm.config').default;
const manager = require('../src/database/DatabaseManager').default.getInstance();
const { AmbitoRol } = require('../src/entities/AmbitoRol');
const { parseId } = require('../src/services/service.helper');
const specs = [
  {"file":"localidad","name":"Localidad","plural":"Localidades","fields":{"nombre":"string","provincia":"string"}},
  {"file":"tipo-unidad","name":"TipoUnidad","plural":"TiposUnidad","fields":{"nombre":"string","ambito":"AmbitoUnidad"}},
  {"file":"rol","name":"Rol","plural":"Roles","fields":{"descripcion":"string","ambito":"AmbitoRol"}},
  {"file":"administracion","name":"Administracion","plural":"Administraciones","fields":{"cuit":"string","nombre":"string","email":"string","direccion":"string"},"soft":true},
  {"file":"edificio","name":"Edificio","plural":"Edificios","fields":{"cuit":"string","nombre":"string","direccion":"string"},"rels":{"localidad":"Localidad"},"soft":true},
  {"file":"propiedad","name":"Propiedad","plural":"Propiedades","fields":{"nroUnidad":"string","mtCuadrados":"number","descripcion":"string","copropiedad":"number","habitaciones":"number"},"rels":{"edificio":"Edificio","tipoUnidad":"TipoUnidad"}},
  {"file":"area-comun","name":"AreaComun","plural":"AreasComunes","fields":{"nroUnidad":"string","mtCuadrados":"number","descripcion":"string","capacidad":"number"},"rels":{"edificio":"Edificio","tipoUnidad":"TipoUnidad"}},
  {"file":"empleado","name":"Empleado","plural":"Empleados","fields":{"beginAt?":"Date","endAt?":"Date | null"},"rels":{"usuario":"User","administracion":"Administracion","rol":"Rol"}},
  {"file":"admin-edificio","name":"AdminEdificio","plural":"AdminEdificios","fields":{"beginAt?":"Date","endAt?":"Date | null"},"rels":{"administracion":"Administracion","edificio":"Edificio"}},
  {"file":"usuario-rol-propiedad","name":"UsuarioRolPropiedad","plural":"UsuariosRolesPropiedad","fields":{"beginAt?":"Date","endAt?":"Date | null"},"rels":{"usuario":"User","rol":"Rol","propiedad":"Propiedad"}},
  {"file":"incidencia","name":"Incidencia","plural":"Incidencias","fields":{"descripcion":"string"},"rels":{"usuario":"User","unidad":"Unidad"}},
  {"file":"reservacion","name":"Reservacion","plural":"Reservaciones","fields":{"fechaReservacion":"Date","descripcion":"string"},"rels":{"usuario":"User","areaComun":"AreaComun"}},
];
let orm;
let originalGetORM;
let current;
before(async () => {
  orm = await MikroORM.init({ ...config, connect: false });
  originalGetORM = manager.getORM;
  manager.getORM = () => ({ em: { fork: () => current.em } });
});
after(async () => {
  manager.getORM = originalGetORM;
  if (orm) await orm.close();
});

// Doble de persistencia: las consultas no conectan a MySQL.
// Los hooks se ejecutan con los metadatos reales de MikroORM.
function setup() {
  const records = new Map();
  const saved = [];
  const removed = [];
  const queries = [];
  const key = (entity, id) => (typeof entity === 'string' ? entity : entity.name) + ':' + id;
  const em = {
    find: async (entity, where) => {
      queries.push({ entity, where });
      return [...records.entries()].filter(([k, value]) =>
        k.startsWith((typeof entity === 'string' ? entity : entity.name) + ':') && !value.deletedAt
      ).map(([, value]) => value);
    },
    findOne: async (entity, where, options) => {
      queries.push({ entity, where, options });
      const value = where.email !== undefined
        ? [...records.values()].find(v => v.email === where.email && (!where.id?.$ne || v.id !== where.id.$ne))
        : records.get(key(entity, where.id));
      return value && (!value.deletedAt || options?.filters?.softDelete === false) ? value : null;
    },
    persistAndFlush: async (entity) => {
      const meta = orm.getMetadata().get(entity.constructor.name);
      await orm.em.getEventManager().dispatchEvent(EventType.beforeCreate, { entity, em, meta }, meta);
      saved.push(entity);
    },
    removeAndFlush: async (entity) => { removed.push(entity); },
  };
  current = { em, records, saved, removed, queries,
    put(entity, id = 1) { entity.id = id; records.set(key(entity.constructor, id), entity); return entity; }
  };
  return current;
}
function fixture(spec, state) {
  const data = {};
  for (const [raw, type] of Object.entries(spec.fields)) {
    const field = raw.replace('?', '');
    data[field] = type === 'number' ? 10
      : type === 'AmbitoUnidad' ? 'PRIVADO' : type === 'AmbitoRol' ? AmbitoRol.ADMINISTRACION
      : type === 'Date' ? new Date(spec.name === 'Reservacion' ? '2099-01-01' : '2026-01-01')
      : type === 'Date | null' ? null : 'Prueba';
  }
  for (const [field, name] of Object.entries(spec.rels || {})) {
    const Entity = name === 'Unidad'
      ? require('../src/entities/Propiedad').Propiedad
      : require('../src/entities/' + name)[name];
    const related = state.put(new Entity());
    if (name === 'TipoUnidad') related.ambito = spec.name === 'AreaComun' ? 'COMUN' : 'PRIVADO';
    if (name === 'Rol') related.ambito = spec.name === 'Empleado' ? AmbitoRol.ADMINISTRACION : AmbitoRol.PROPIEDAD;
    if (name === 'Unidad') state.records.set('Unidad:1', related);
    data[field + 'Id'] = '1';
  }
  return data;
}

test('los IDs rechazan entradas ambiguas o fuera del rango seguro', () => {
  for (const id of ['1abc', '', ' ', '1.5', -1, 0, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => parseId(id), /entero positivo/);
  }
  assert.equal(parseId('12'), 12);
  assert.equal(parseId(12), 12);
});

for (const spec of specs) {
  const service = require('../src/services/' + spec.file + '.service');
  test(spec.name + ': CRUD, relaciones, lista blanca y actualizacion parcial', async () => {
    const state = setup();
    const data = fixture(spec, state);
    const entity = await service['create' + spec.name]({
      ...data, id: 999, deletedAt: new Date(), campoDesconocido: true,
    });
    assert.equal(entity.id, undefined);
    assert.equal(entity.campoDesconocido, undefined);
    if (spec.soft) assert.equal(entity.deletedAt, null);
    for (const [field, name] of Object.entries(spec.rels || {})) {
      assert.equal(entity[field], state.records.get(name + ':1'));
    }
    state.put(entity, 5);
    assert.equal(await service['get' + spec.name + 'ById']('5'), entity);
    assert.ok((await service['getAll' + spec.plural]()).includes(entity));
    const field = Object.keys(spec.fields)[0].replace('?', '');
    const original = entity[field];
    await service['update' + spec.name](5, { campoDesconocido: true, id: 1000 });
    assert.equal(entity[field], original);
    assert.equal(entity.id, 5);
    const replacement = original instanceof Date ? new Date(spec.name === 'Reservacion' ? '2099-12-01' : '2025-12-01') : typeof original === 'number' ? 20 : 'Modificado';
    await service['update' + spec.name](5, { [field]: replacement });
    assert.equal(entity[field], replacement);
    if ('endAt' in entity) {
      const dateField = 'endAt' in entity ? 'endAt' : 'closedAt';
      await service['update' + spec.name](5, { [dateField]: new Date('2026-02-01') });
      await service['update' + spec.name](5, { [dateField]: null });
      assert.equal(entity[dateField], null);
    }
    assert.equal(await service['get' + spec.name + 'ById'](404), null);
    assert.equal(await service['update' + spec.name](404, {}), null);
    assert.equal(await service['delete' + spec.name](404), null);
    assert.equal(await service['delete' + spec.name](5), entity);
    if (spec.soft) {
      assert.ok(entity.deletedAt instanceof Date);
      assert.equal(state.removed.length, 0);
      assert.equal(await service['get' + spec.name + 'ById'](5), null);
      assert.ok(!(await service['getAll' + spec.plural]()).includes(entity));
      const deletion = entity.deletedAt;
      await service['delete' + spec.name](5);
      assert.equal(entity.deletedAt, deletion);
    } else {
      assert.deepEqual(state.removed, [entity]);
    }
  });
  if (Object.keys(spec.rels || {}).length) {
    test(spec.name + ': rechaza cada relacion inexistente al crear y actualizar', async () => {
      for (const [field, name] of Object.entries(spec.rels)) {
        const state = setup();
        const data = fixture(spec, state);
        const entity = await service['create' + spec.name](data);
        state.put(entity, 5);
        const count = state.saved.length;
        await assert.rejects(service['create' + spec.name]({ ...data, [field + 'Id']: 404 }), /no encontrado/);
        await assert.rejects(service['update' + spec.name](5, { [field + 'Id']: 404 }), spec.name === 'Reservacion' && field === 'usuario' ? /cambiar el usuario/ : /no encontrado/);
        assert.equal(state.saved.length, count);
        if (['User', 'Edificio', 'Administracion'].includes(name)) {
          state.records.get(name + ':1').deletedAt = new Date();
          await assert.rejects(service['create' + spec.name](data), /no encontrado/);
        }
      }
    });
  }
}

test('los servicios mantienen las reglas de rol, periodos y copropiedad', async () => {
  for (const name of ['Empleado', 'UsuarioRolPropiedad', 'AdminEdificio', 'Propiedad']) {
    const spec = specs.find(s => s.name === name);
    const state = setup();
    const data = fixture(spec, state);
    const service = require('../src/services/' + spec.file + '.service');
    if (name === 'Propiedad') {
      await assert.rejects(service.createPropiedad({ ...data, copropiedad: 101 }), /porcentaje/);
    } else {
      await assert.rejects(service['create' + name]({ ...data, endAt: new Date('2025-01-01') }), /fecha de fin/);
      if (name !== 'AdminEdificio') {
        state.records.get('Rol:1').ambito = 'OTRO';
        await assert.rejects(service['create' + name](data), /ambito/);
      }
    }
    assert.equal(state.saved.length, 0);
  }
  const state = setup();
  const { Rol } = require('../src/entities/Rol');
  state.put(Object.assign(new Rol(), { ambito: AmbitoRol.PROPIEDAD }));
  await assert.rejects(require('../src/services/rol.service').updateRol(1, { ambito: AmbitoRol.ADMINISTRACION }), /no se puede cambiar/);
});

test('Unidad crea ambos subtipos y no permite cambiar de clase', async () => {
  const service = require('../src/services/unidad.service');
  for (const [name, clase] of [['Propiedad', 'propiedad'], ['AreaComun', 'area_comun']]) {
    const state = setup();
    const spec = specs.find(s => s.name === name);
    const entity = await service.createUnidad({ ...fixture(spec, state), clase });
    assert.equal(entity.constructor.name, name);
    state.put(entity, 5);
    state.records.set('Unidad:5', entity);
    assert.equal(await service.getUnidadById('5'), entity);
    assert.ok((await service.getAllUnidades()).includes(entity));
    await service.updateUnidad(5, { clase, descripcion: 'Nueva' });
    assert.equal(entity.descripcion, 'Nueva');
    await assert.rejects(service.updateUnidad(5, { clase: clase === 'propiedad' ? 'area_comun' : 'propiedad' }), /cambiar la clase/);
    assert.equal(await service.deleteUnidad(5), entity);
  }
  await assert.rejects(service.createUnidad({ clase: 'otra' }), /clase/);
  assert.equal(await service.updateUnidad(404, { clase: 'propiedad' }), null);
});

test('User conserva CUIL, hashea contrasenas y actualiza todos los campos editables', async () => {
  const state = setup();
  const service = require('../src/services/user.service');
  const { comparePassword } = require('../src/services/auth.service');
  const data = { cuil: '20123456789', nombre: 'Ana', apellido: 'Perez', email: 'ana@example.com',
    fechaNacimiento: new Date('2000-01-01'), password: 'clave123', estado: true };
  const entity = await service.createUser(data);
  state.put(entity);
  assert.equal(entity.cuil, data.cuil);
  assert.notEqual(entity.password, data.password);
  assert.ok(await comparePassword(data.password, entity.password));
  const birth = new Date('2001-01-01');
  await service.updateUser('1', { cuil: '20987654321', apellido: 'Gomez', fechaNacimiento: birth, estado: false });
  assert.equal(entity.cuil, '20987654321');
  assert.equal(entity.apellido, 'Gomez');
  assert.equal(entity.fechaNacimiento, birth);
  assert.equal(entity.estado, false);
  assert.equal(entity.nombre, 'Ana');
  await service.updateUser(1, { password: 'otraClave' });
  assert.ok(await comparePassword('otraClave', entity.password));
  await assert.rejects(service.createUser(data), /registrado/);
  await service.deleteUser(1);
  await assert.rejects(service.createUser(data), /usuario eliminado/);
  assert.equal(await service.getUserById(1), null);
});

test('los errores de integridad de la base no se silencian al eliminar', async () => {
  const state = setup();
  const { Localidad } = require('../src/entities/Localidad');
  state.put(new Localidad());
  state.em.removeAndFlush = async () => { throw new Error('Foreign key constraint'); };
  await assert.rejects(require('../src/services/localidad.service').deleteLocalidad(1), /Foreign key/);
});
