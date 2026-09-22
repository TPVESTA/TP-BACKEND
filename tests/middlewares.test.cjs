require('ts-node/register');
require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const auth = require('../src/services/auth.service');
const users = require('../src/services/user.service');
const manager = require('../src/database/DatabaseManager').default.getInstance();
const { authMiddleware, optionalAuthMiddleware } = require('../src/middlewares/auth.middleware');
const { validate } = require('../src/middlewares/validate');
const { errorMiddleware, notFoundMiddleware } = require('../src/middlewares/error.middleware');
const { idParamSchema } = require('../src/schemas/common.schema');
const routes = require('../src/routes').default;
let server, base, token, person, originalLookup, originalList, originalORM, previousSecret;
let lookup, listCalls = 0, lookupCalls = 0;
const secret = 'test-secret-only-for-middleware-tests';
before(async () => {
  previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  person = { id: 1, nombre: 'Ana', apellido: 'Perez', email: 'ana@example.com',
    fechaNacimiento: new Date('2000-01-01'), estado: true, deletedAt: null,
    password: await auth.hashPassword('clave123') };
  lookup = person;
  originalLookup = auth.getUserByIdForAuth;
  originalList = users.getAllUsers;
  originalORM = manager.getORM;
  auth.getUserByIdForAuth = async () => { lookupCalls++; if (lookup instanceof Error) throw lookup; return lookup; };
  users.getAllUsers = async () => { listCalls++; return []; };
  manager.getORM = () => ({ em: { fork: () => ({ findOne: async () => lookup }) } });
  token = auth.generateToken(1);
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.get('/query', validate({ location: 'query', schema: Joi.object({ page: Joi.number().integer().positive().required() }) }),
    (req, res) => res.json(req.query));
  app.get('/params/:id', validate({ location: 'params', schema: idParamSchema }), (req, res) => res.json(req.params));
  app.get('/optional', optionalAuthMiddleware, (req, res) => res.json({ user: req.user || null }));
  app.get('/validator-error', validate({ schema: { validateAsync: async () => { throw new Error('interno'); } } }), (req, res) => res.json({}));
  app.use('/api', routes);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  auth.getUserByIdForAuth = originalLookup;
  users.getAllUsers = originalList;
  manager.getORM = originalORM;
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
  if (server) await new Promise(resolve => server.close(resolve));
});
async function request(path, { bearer, body, method = 'GET', raw } = {}) {
  const headers = {};
  if (bearer !== undefined) headers.Authorization = bearer;
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
test('todas las operaciones de usuarios exigen token antes de validar o llamar al servicio', async () => {
  const beforeCalls = listCalls;
  for (const [method, path] of [['GET','/users'], ['GET','/users/1'], ['POST','/users'], ['PUT','/users/1'], ['DELETE','/users/1']]) {
    const result = await request('/api' + path, { method });
    assert.equal(result.status, 401);
    assert.equal(result.headers.get('www-authenticate'), 'Bearer');
  }
  assert.equal(listCalls, beforeCalls);
});
test('token valido carga el perfil sin password y autentica una sola vez', async () => {
  lookup = person;
  const count = lookupCalls;
  const result = await request('/api/users', { bearer: 'Bearer ' + token });
  assert.equal(result.status, 200);
  assert.equal(lookupCalls, count + 1);
  const profile = await request('/api/auth/profile', { bearer: 'bearer ' + token });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.data.id, 1);
  assert.equal(profile.body.data.password, undefined);
  assert.equal((await request('/api/auth/verify', { bearer: 'Bearer ' + token })).body.data.valid, true);
});
test('rechaza tokens vencidos, firmas ajenas, algoritmos distintos y claims invalidos', async () => {
  const sign = payload => jwt.sign(payload, secret, { expiresIn: '1h' });
  for (const invalid of [
    jwt.sign({ userId: 1 }, secret, { expiresIn: -1 }),
    jwt.sign({ userId: 1 }, 'otra-clave', { expiresIn: '1h' }),
    jwt.sign({ userId: 1 }, secret, { algorithm: 'HS384', expiresIn: '1h' }),
    jwt.sign({ userId: 1 }, secret),
    sign({}), sign({ userId: '1' }), sign({ userId: -1 }), sign({ userId: 1.5 }),
    sign({ userId: Number.MAX_SAFE_INTEGER + 1 }), 'basura'
  ]) {
    assert.equal((await request('/api/users', { bearer: 'Bearer ' + invalid })).status, 401);
  }
  for (const bearer of ['Basic abc', 'Bearer', 'Bearer a b']) {
    assert.equal((await request('/api/users', { bearer })).status, 401);
  }
});
test('baja logica, usuario inexistente y desactivacion invalidan el acceso con un token anterior', async () => {
  try {
    for (const value of [null, { ...person, estado: false }, { ...person, deletedAt: new Date() }]) {
      lookup = value;
      assert.equal((await request('/api/users', { bearer: 'Bearer ' + token })).status, 401);
    }
  } finally { lookup = person; }
});
test('login publico comprueba contraseña y estado; register publico llega a la validacion', async () => {
  const body = { email: person.email, password: 'clave123' };
  assert.equal((await request('/api/auth/login', { method: 'POST', body })).status, 200);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { ...body, password: 'incorrecta' } })).status, 401);
  try {
    lookup = { ...person, estado: false };
    assert.equal((await request('/api/auth/login', { method: 'POST', body })).status, 401);
  } finally { lookup = person; }
  assert.equal((await request('/api/auth/register', { method: 'POST', body: {} })).status, 400);
});
test('fallos internos de autenticacion o configuracion responden 500 sin revelar detalles', async t => {
  t.mock.method(console, 'error', () => {});
  try {
    lookup = new Error('SQL credenciales privadas');
    const result = await request('/api/users', { bearer: 'Bearer ' + token });
    assert.equal(result.status, 500);
    assert.equal(result.body.error, 'Error interno del servidor');
    lookup = person;
    delete process.env.JWT_SECRET;
    assert.equal((await request('/api/users', { bearer: 'Bearer ' + token })).status, 500);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: person.email, password: 'clave123' } })).status, 500);
  } finally { lookup = person; process.env.JWT_SECRET = secret; }
});
test('auth opcional admite ausencia, exige validez cuando hay token y no oculta errores', async () => {
  assert.equal((await request('/optional')).body.user, null);
  assert.equal((await request('/optional', { bearer: 'Bearer ' + token })).body.user.id, 1);
  assert.equal((await request('/optional', { bearer: 'Bearer roto' })).status, 401);
});
test('validate convierte params y query de Express 5, elimina desconocidos y responde 400', async () => {
  const query = await request('/query?page=2&extra=hola');
  assert.equal(query.status, 200);
  assert.deepEqual(query.body, { page: 2 });
  assert.deepEqual((await request('/params/12')).body, { id: 12 });
  assert.equal((await request('/params/12abc')).status, 400);
  assert.equal((await request('/query?page=no')).status, 400);
});
test('errores JSON, limite de body y rutas inexistentes mantienen formato JSON', async () => {
  const malformed = await request('/api/auth/login', { method: 'POST', raw: '{"email":' });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.success, false);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { data: 'x'.repeat(2000) } })).status, 413);
  assert.equal((await request('/no-existe')).status, 404);
  assert.equal((await request('/api/no-existe', { bearer: 'Bearer ' + token })).status, 404);
});
test('validate propaga errores no Joi al manejador global', async t => {
  t.mock.method(console, 'error', () => {});
  const result = await request('/validator-error');
  assert.equal(result.status, 500);
  assert.equal(result.body.error, 'Error interno del servidor');
});
test('manejador de errores delega si ya se enviaron headers', () => {
  const error = new Error('tarde');
  let forwarded;
  errorMiddleware(error, {}, { headersSent: true }, value => { forwarded = value; });
  assert.equal(forwarded, error);
});

