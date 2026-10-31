require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DomainValidationError } = require('../src/errors/domain.errors');
const { ForeignKeyConstraintViolationException, UniqueConstraintViolationException } = require('@mikro-orm/core');
const specs = [
  [
    "admin-edificio",
    "AdminEdificio",
    "AdminEdificios"
  ],
  [
    "administracion",
    "Administracion",
    "Administraciones"
  ],
  [
    "area-comun",
    "AreaComun",
    "AreasComunes"
  ],
  [
    "edificio",
    "Edificio",
    "Edificios"
  ],
  [
    "empleado",
    "Empleado",
    "Empleados"
  ],
  [
    "incidencia",
    "Incidencia",
    "Incidencias"
  ],
  [
    "localidad",
    "Localidad",
    "Localidades"
  ],
  [
    "propiedad",
    "Propiedad",
    "Propiedades"
  ],
  [
    "reservacion",
    "Reservacion",
    "Reservaciones"
  ],
  [
    "rol",
    "Rol",
    "Roles"
  ],
  [
    "tipo-unidad",
    "TipoUnidad",
    "TiposUnidad"
  ],
  [
    "unidad",
    "Unidad",
    "Unidades"
  ],
  [
    "usuario-rol-propiedad",
    "UsuarioRolPropiedad",
    "UsuariosRolesPropiedad"
  ]
];
function response() {
  return {
    statusCode: 200, body: undefined, calls: 0,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; this.calls++; return this; },
  };
}
async function stub(service, name, implementation, work) {
  const original = service[name];
  service[name] = implementation;
  try { await work(); } finally { service[name] = original; }
}

for (const [file, name, plural] of specs) {
  const service = require('../src/services/' + file + '.service');
  const controller = require('../src/controllers/' + file + '.controller');
  const operations = [
    ['get' + plural, 'getAll' + plural, [], 200],
    ['get' + name, 'get' + name + 'ById', ['42'], 200],
    ['create' + name, 'create' + name, [{ nombre: 'Prueba', estado: false }], 201],
    ['update' + name, 'update' + name, ['42', { nombre: 'Prueba', estado: false }], 200],
    ['delete' + name, 'delete' + name, ['42'], 200],
  ];
  test(name + ': delega los cinco metodos y responde JSON una sola vez', async () => {
    for (const [handler, method, args, status] of operations) {
      const data = handler === 'get' + plural ? [{ id: 42 }] : { id: 42 };
      await stub(service, method, async (...actual) => {
        assert.deepEqual(actual, args);
        return data;
      }, async () => {
        const res = response();
        await controller[handler]({ params: { id: '42' }, body: { nombre: 'Prueba', estado: false } }, res);
        assert.equal(res.statusCode, status);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data, data);
        assert.equal(res.calls, 1);
        if (Array.isArray(data)) assert.equal(res.body.total, 1);
      });
    }
  });
  test(name + ': devuelve 404 al consultar, actualizar o borrar un registro inexistente', async () => {
    for (const [handler, method] of [operations[1], operations[3], operations[4]]) {
      await stub(service, method, async () => null, async () => {
        const res = response();
        await controller[handler]({ params: { id: '42' }, body: {} }, res);
        assert.equal(res.statusCode, 404);
        assert.equal(res.body.success, false);
        assert.equal(res.calls, 1);
      });
    }
  });
  test(name + ': rechaza cuerpos ausentes, nulos, arrays y valores escalares antes del servicio', async () => {
    for (const [handler, method] of [operations[2], operations[3]]) {
      await stub(service, method, async () => assert.fail('No debe llamar al servicio'), async () => {
        for (const body of [undefined, null, [], 'texto', 3, false]) {
          const res = response();
          await controller[handler]({ params: { id: '42' }, body }, res);
          assert.equal(res.statusCode, 400);
          assert.equal(res.calls, 1);
        }
      });
    }
  });
  test(name + ': traduce errores de dominio y de integridad sin exponer SQL', async () => {
    for (const [handler, method] of operations) {
      for (const [error, status, message] of [
        [new DomainValidationError('El ID debe ser un entero positivo'), 400, 'El ID debe ser un entero positivo'],
        [new DomainValidationError('Localidad no encontrado/a'), 400, 'Localidad no encontrado/a'],
        [new UniqueConstraintViolationException(new Error('SQL privado')), 409],
        [new ForeignKeyConstraintViolationException(new Error('SQL privado')), 409],
      ]) {
        await stub(service, method, async () => { throw error; }, async () => {
          const res = response();
          await controller[handler]({ params: { id: '42' }, body: {} }, res);
          assert.equal(res.statusCode, status);
          assert.equal(res.body.success, false);
          assert.equal(res.calls, 1);
          if (message) assert.equal(res.body.error, message);
          assert.doesNotMatch(res.body.error, /SQL privado/);
        });
      }
    }
  });
  test(name + ': los fallos inesperados devuelven 500 sin revelar detalles', async (t) => {
    t.mock.method(console, 'error', () => {});
    for (const [handler, method] of operations) {
      for (const error of [new Error('credenciales privadas del servidor'), 'error no tipado']) {
        await stub(service, method, async () => { throw error; }, async () => {
          const res = response();
          await controller[handler]({ params: { id: '42' }, body: {} }, res);
          assert.equal(res.statusCode, 500);
          assert.equal(res.body.error, 'Error interno del servidor');
          assert.equal(res.calls, 1);
        });
      }
    }
  });
}

test('un error de ID real del servicio llega al controlador como 400', async () => {
  const { parseId } = require('../src/services/service.helper');
  const service = require('../src/services/localidad.service');
  const controller = require('../src/controllers/localidad.controller');
  await stub(service, 'getLocalidadById', async id => parseId(id), async () => {
    const res = response();
    await controller.getLocalidad({ params: { id: '12abc' } }, res);
    assert.equal(res.statusCode, 400);
  });
});

