require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const routes = require('../src/routes').default;
const { errorMiddleware, notFoundMiddleware } = require('../src/middlewares/error.middleware');
const { generateToken } = require('../src/services/auth.service');
const { getDefaultRolePermissions } = require('../src/services/permission-seed.service');
const manager = require('../src/database/DatabaseManager').default.getInstance();

function matches(row, where) {
  return Object.entries(where).every(([field, value]) => {
    if (field === '$and') return value.every(part => matches(row, part));
    if (field === '$or') return value.some(part => matches(row, part));
    const actual = row[field];
    if (Array.isArray(actual)) return actual.some(item => matches(item, value));
    const comparable = actual && typeof actual === 'object' && !(actual instanceof Date) ? actual.id : actual;
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      if ('$in' in value) return value.$in.includes(comparable);
      if ('$ne' in value) return comparable !== value.$ne;
      if ('$lte' in value) return comparable <= value.$lte;
      if ('$gt' in value) return comparable > value.$gt;
      return actual !== null && actual !== undefined && matches(actual, value);
    }
    return comparable === value;
  });
}

function fixture() {
  const beginAt = new Date(Date.now() - 86400000);
  const pastEnd = new Date(Date.now() - 3600000);
  const user = (id, name) => ({
    id, nombre: name, apellido: 'Prueba', email: `usuario${id}@example.test`,
    cuil: '20123456789', fechaNacimiento: new Date('1990-01-01'),
    estado: true, deletedAt: null, password: 'stored-password',
  });
  const resident = user(1, 'Residente');
  const administrator = user(2, 'Administrativo');
  const sharedMember = user(3, 'Miembro compartido');
  const foreignMember = user(4, 'Miembro ajeno');
  const foreignWorker = user(5, 'Trabajador ajeno');
  const ownAdmin = { id: 30, nombre: 'Administracion propia', deletedAt: null };
  const foreignAdmin = { id: 40, nombre: 'Administracion ajena', deletedAt: null };
  const ownBuilding = { id: 10, nombre: 'Edificio propio', deletedAt: null };
  const foreignBuilding = { id: 20, nombre: 'Edificio ajeno', deletedAt: null };
  const ownProperty = { id: 100, edificio: ownBuilding };
  const foreignProperty = { id: 102, edificio: foreignBuilding };
  const roleDefinitions = [
    [11, 'RESIDENTE', 'PROPIEDAD'], [12, 'ADMINISTRATIVO', 'ADMINISTRACION'],
    [13, 'MANTENIMIENTO', 'ADMINISTRACION'], [14, 'SUPERADMIN', 'GLOBAL'],
    [15, 'PROPIETARIO', 'PROPIEDAD'],
  ];
  const roles = roleDefinitions.map(([id, codigo, ambito]) => {
    const permissions = getDefaultRolePermissions(codigo);
    return { id, codigo, ambito, descripcion: codigo, permisos: { getItems: () => permissions } };
  });
  const rows = {
    User: [resident, administrator, sharedMember, foreignMember, foreignWorker],
    Administracion: [ownAdmin, foreignAdmin], Edificio: [ownBuilding, foreignBuilding],
    Propiedad: [ownProperty, foreignProperty], Rol: roles,
    RolPermiso: roles.flatMap(role => getDefaultRolePermissions(role.codigo).map((permission, i) => ({
      id: role.id * 100 + i, rol: role, ...permission,
    }))),
    UsuarioRol: [],
    UsuarioRolPropiedad: [
      { id: 101, usuarioRol: { id: 1, usuario: resident, rol: roles[0], beginAt, endAt: null }, propiedad: ownProperty, beginAt, endAt: null },
      { id: 102, usuarioRol: { id: 2, usuario: foreignMember, rol: roles[4], beginAt, endAt: null }, propiedad: foreignProperty, beginAt, endAt: null },
    ],
    Empleado: [
      { id: 200, usuarioRol: { id: 3, usuario: administrator, rol: roles[1], beginAt, endAt: null }, administracion: ownAdmin, beginAt, endAt: null },
      { id: 201, usuarioRol: { id: 4, usuario: foreignWorker, rol: roles[2], beginAt, endAt: null }, administracion: foreignAdmin, beginAt, endAt: null },
      // Expired jobs and building management must not grant another context.
      { id: 202, usuarioRol: { id: 3, usuario: administrator, rol: roles[1], beginAt, endAt: null }, administracion: foreignAdmin, beginAt, endAt: pastEnd },
    ],
    AdminEdificio: [
      { id: 250, administracion: ownAdmin, edificio: ownBuilding, beginAt, endAt: null },
      { id: 251, administracion: foreignAdmin, edificio: foreignBuilding, beginAt, endAt: null },
      { id: 252, administracion: ownAdmin, edificio: foreignBuilding, beginAt, endAt: pastEnd },
    ],
  };
  Object.defineProperty(ownBuilding, 'administraciones', { value: [rows.AdminEdificio[0]] });
  Object.defineProperty(foreignBuilding, 'administraciones', { value: [rows.AdminEdificio[1], rows.AdminEdificio[2]] });
  return { rows };
}

async function withApp(run) {
  const originalORM = manager.getORM;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'permissions-routes-local-test-secret';
  const { rows } = fixture();
  const calls = [];
  const writes = [];
  let flushes = 0;
  const entityName = entity => typeof entity === 'string' ? entity : entity.name;
  const select = (entity, where, options) => {
    const name = entityName(entity);
    return (rows[name] ?? []).filter(row => matches(row, where) && (
      options?.filters?.softDelete === false || !['User', 'Administracion', 'Edificio'].includes(name) || row.deletedAt === null
    ));
  };
  const persist = entity => {
    for (const row of Array.isArray(entity) ? entity : [entity]) {
      writes.push({ name: entityName(row.constructor), row });
      const name = entityName(row.constructor);
      if (row.id === undefined) {
        row.id = 1000 + writes.length;
        (rows[name] ??= []).push(row);
      }
    }
  };
  const em = {
    find: async (entity, where, options) => {
      calls.push({ method: 'find', name: entityName(entity), where, options });
      return select(entity, where, options);
    },
    findOne: async (entity, where, options) => {
      calls.push({ method: 'findOne', name: entityName(entity), where, options });
      return select(entity, where, options)[0] ?? null;
    },
    populate: async entity => entity,
    persist, persistAndFlush: async entity => { persist(entity); flushes++; },
    flush: async () => { flushes++; },
    transactional: async callback => callback(em),
  };
  manager.getORM = () => ({ em: { fork: () => em } });
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    listening.on('error', reject);
  });
  const url = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (method, path, actor, body) => {
    const response = await fetch(url + path, {
      method, headers: {
        Connection: 'close',
        ...(actor === undefined ? {} : { Authorization: `Bearer ${typeof actor === 'number' ? generateToken(actor) : actor}` }),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  try { await run({ request, rows, calls, writes, flushes: () => flushes }); }
  finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    manager.getORM = originalORM;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
}

test('el registro publico crea una cuenta sin conceder roles ni acceso administrativo', async () => {
  await withApp(async ({ request, rows, writes }) => {
    assert.equal((await request('GET', '/users')).status, 401);
    const registration = await request('POST', '/auth/register', undefined, {
      cuil: '20123456789', nombre: 'Nueva', apellido: 'Cuenta', email: 'registro@example.test', telefono: '3415550001',
      fechaNacimiento: '1990-01-01', password: 'clave-segura', estado: true,
      rolId: 14, administracionId: 30, permisos: ['SUPERADMIN'],
    });
    assert.equal(registration.status, 201);
    assert.deepEqual(writes.map(item => item.name), ['User']);
    assert.equal(rows.UsuarioRol.length, 0);
    const token = registration.body.data.token;
    const effective = await request('GET', '/auth/permisos', token);
    assert.equal(effective.status, 200);
    assert.deepEqual(effective.body.data.contextos, []);
    assert.equal((await request('GET', '/users', token)).status, 403);
    assert.equal((await request('GET', '/auth/profile', token)).status, 200);
  });
});

test('un residente recibe 403 antes de consultas de gestion de usuarios, roles globales o mutaciones estructurales', async () => {
  await withApp(async ({ request, calls, writes }) => {
    const denied = [
      ['GET', '/users'], ['GET', '/usuarios-roles'],
      ['POST', '/usuarios-roles', { usuarioId: 1, rolId: 14 }],
      ['PUT', '/edificios/10', { nombre: 'Nuevo edificio' }],
      ['DELETE', '/propiedades/100'],
    ];
    for (const [method, path, body] of denied) {
      calls.length = 0;
      const result = await request(method, path, 1, body);
      assert.equal(result.status, 403, `${method} ${path}: ${JSON.stringify(result.body)}`);
      assert.equal(result.body.success, false);
      assert.equal(calls.filter(call => call.method === 'find' && call.name === 'User').length, 0);
      assert.equal(calls.filter(call => ['Edificio', 'Propiedad', 'Rol'].includes(call.name)).length, 0);
      // Authentication queries only this actor's assignments, never the global listing.
      assert.ok(calls.filter(call => call.name === 'UsuarioRol').every(call => call.where.usuario === 1));
    }
    assert.equal(writes.length, 0);
  });
});

test('los listados administrativos usan vinculos vigentes y no exponen usuarios, roles globales o edificios ajenos', async () => {
  await withApp(async ({ request, calls }) => {
    const users = await request('GET', '/users', 2);
    assert.equal(users.status, 200);
    assert.deepEqual(users.body.data.map(item => item.id).sort(), [1, 2]);
    assert.equal((await request('GET', '/users/4', 2)).status, 404);
    const userQueries = calls.filter(call => call.method === 'find' && call.name === 'User');
    assert.equal(userQueries.length, 1);
    assert.deepEqual(userQueries[0].where.id.$in.sort(), [1, 2]);
    const buildings = await request('GET', '/edificios', 2);
    assert.equal(buildings.status, 200);
    assert.deepEqual(buildings.body.data.map(item => item.id), [10]);
    const roles = await request('GET', '/roles', 2);
    assert.equal(roles.status, 200);
    assert.ok(roles.body.data.every(item => item.ambito !== 'GLOBAL'));
    assert.equal((await request('GET', '/roles/14', 2)).status, 404);
    const grants = await request('GET', '/auth/permisos', 2);
    assert.equal(grants.status, 200);
    assert.deepEqual(grants.body.data.contextos.map(item => item.administracionId), [30]);
    assert.deepEqual(grants.body.data.contextos[0].edificioIds, [10]);
  });
});

test('administrativos no pueden vincular cuentas ajenas, operar otra administracion ni deshabilitar o elevar permisos globales', async () => {
  await withApp(async ({ request, rows, writes, flushes }) => {
    const denied = [
      ['DELETE', '/users/1'], ['PUT', '/users/1', { estado: false }],
      ['PUT', '/users/1', { email: 'otro@example.test' }],
      ['POST', '/usuarios-roles', { usuarioId: 2, rolId: 14 }],
      ['POST', '/users', {
        cuil: '20123456789', nombre: 'Nueva', apellido: 'Cuenta', email: 'ajena@example.test', telefono: '3415550002',
        fechaNacimiento: '1990-01-01', password: 'clave-segura', estado: true, rolId: 13, administracionId: 40,
      }],
    ];
    for (const [method, path, body] of denied) {
      const result = await request(method, path, 2, body);
      assert.equal(result.status, 403, `${method} ${path}: ${JSON.stringify(result.body)}`);
    }
    assert.equal(writes.length, 0);
    assert.equal(flushes(), 0);
    assert.equal(rows.User.find(item => item.id === 1).estado, true);
    assert.equal((await request('PUT', '/users/3', 2, { estado: false })).status, 404);
  });
});

test('la gestion de asignaciones limita consultas, bajas y altas a la administracion autorizada', async () => {
  await withApp(async ({ request, calls, writes }) => {
    const ownJobs = await request('GET', '/empleados', 2);
    assert.equal(ownJobs.status, 200);
    assert.deepEqual(ownJobs.body.data.map(item => item.id), [200]);
    const listing = calls.find(call => call.method === 'find' && call.name === 'Empleado' && call.where.administracion?.id);
    assert.deepEqual(listing.where.administracion.id.$in, [30]);
    assert.equal((await request('GET', '/empleados/201', 2)).status, 404);
    assert.equal((await request('DELETE', '/empleados/201', 2)).status, 404);
    assert.equal((await request('GET', '/usuarios-roles-propiedad/102', 2)).status, 404);
    assert.equal((await request('DELETE', '/usuarios-roles-propiedad/102', 2)).status, 404);
    const foreignJob = await request('POST', '/empleados', 2, { usuarioId: 3, rolId: 13, administracionId: 40 });
    assert.equal(foreignJob.status, 403);
    const foreignProperty = await request('POST', '/usuarios-roles-propiedad', 2, { usuarioId: 3, rolId: 11, propiedadId: 102 });
    assert.equal(foreignProperty.status, 403);
    assert.equal(writes.length, 0);
  });
});

test('el alta de un empleado reutiliza el usuario_rol abierto del mismo usuario y rol', async () => {
  await withApp(async ({ request, rows }) => {
    const first = await request('POST', '/empleados', 2, { usuarioId: 1, rolId: 13, administracionId: 30 });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    const links = () => rows.UsuarioRol.filter(item => item.usuario?.id === 1 && item.rol?.id === 13);
    assert.equal(links().length, 1);
    assert.equal(links()[0].endAt, null);
    assert.equal(first.body.data.usuarioRol.rol.id, 13);
    const second = await request('POST', '/empleados', 2, { usuarioId: 1, rolId: 13, administracionId: 30, beginAt: '2020-01-01T00:00:00.000Z' });
    assert.equal(second.status, 201, JSON.stringify(second.body));
    assert.equal(links().length, 1);
    assert.equal(links()[0].beginAt.toISOString(), '2020-01-01T00:00:00.000Z');
    assert.equal(rows.Empleado.filter(item => item.usuarioRol === links()[0]).length, 2);
  });
});

test('asignar un rol no permite vincular indirectamente una cuenta ajena con la administracion propia', async () => {
  await withApp(async ({ request, writes }) => {
    const property = await request('POST', '/usuarios-roles-propiedad', 2, {
      usuarioId: 4, rolId: 11, propiedadId: 100,
    });
    assert.equal(property.status, 403, JSON.stringify(property.body));
    const employee = await request('POST', '/empleados', 2, {
      usuarioId: 4, rolId: 13, administracionId: 30,
    });
    assert.equal(employee.status, 403, JSON.stringify(employee.body));
    assert.equal(writes.length, 0);
    assert.equal((await request('GET', '/users/4', 2)).status, 404);
  });
});

test('el perfil personal no permite modificar estado ni asignaciones mediante campos adicionales', async () => {
  await withApp(async ({ request, rows, writes }) => {
    assert.equal((await request('PUT', '/auth/profile', 1, { estado: false })).status, 400);
    assert.equal((await request('PUT', '/auth/profile', 1, { nombre: 'Cambio', rolId: 14 })).status, 400);
    assert.equal(writes.length, 0);
    assert.equal(rows.User.find(item => item.id === 1).estado, true);
    const result = await request('PUT', '/auth/profile', 1, { nombre: 'Nombre nuevo' });
    assert.equal(result.status, 200);
    assert.equal(rows.User.find(item => item.id === 1).nombre, 'Nombre nuevo');
    assert.equal(writes.length, 1);
  });
});
