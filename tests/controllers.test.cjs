require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DomainValidationError } = require('../src/errors/domain-validation.error');
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
// Reservas e incidencias no tienen baja y proyectan sus respuestas: se prueban en business-permissions.test.cjs.
// El middleware de autorización deja el contexto en el request; los controladores lo pasan al servicio.
const authorization = { usuarioId: 1, now: new Date('2026-10-01T12:00:00Z'), grants: [] };
const request = (params, body, query = {}) => ({ authorization, params, body, query });
// Los listados de asignaciones aceptan un filtro opcional por usuario (?usuarioId=).
const filteredLists = ['empleado', 'usuario-rol-propiedad'];
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
    ['get' + plural, 'getAll' + plural, filteredLists.includes(file) ? [authorization, undefined] : [authorization], 200],
    ['get' + name, 'get' + name + 'ById', ['42', authorization], 200],
    ['create' + name, 'create' + name, [{ nombre: 'Prueba', estado: false }, authorization], 201],
    ['update' + name, 'update' + name, ['42', { nombre: 'Prueba', estado: false }, authorization], 200],
    ['delete' + name, 'delete' + name, ['42', authorization], 200],
  ];
  test(name + ': delega los cinco metodos y responde JSON una sola vez', async () => {
    for (const [handler, method, args, status] of operations) {
      const data = handler === 'get' + plural ? [{ id: 42 }] : { id: 42 };
      await stub(service, method, async (...actual) => {
        assert.deepEqual(actual, args);
        return data;
      }, async () => {
        const res = response();
        await controller[handler](request({ id: '42' }, { nombre: 'Prueba', estado: false }), res);
        assert.equal(res.statusCode, status);
        assert.equal(res.body.success, true);
        // Las asignaciones devuelven una copia proyectada (ver assignment-response.helper).
        if (filteredLists.includes(file)) assert.deepEqual(res.body.data, data);
        else assert.equal(res.body.data, data);
        assert.equal(res.calls, 1);
        if (Array.isArray(data)) assert.equal(res.body.total, 1);
      });
    }
  });
  test(name + ': devuelve 404 al consultar, actualizar o borrar un registro inexistente', async () => {
    for (const [handler, method] of [operations[1], operations[3], operations[4]]) {
      await stub(service, method, async () => null, async () => {
        const res = response();
        await controller[handler](request({ id: '42' }, {}), res);
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
          await controller[handler](request({ id: '42' }, body), res);
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
          await controller[handler](request({ id: '42' }, {}), res);
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
          await controller[handler](request({ id: '42' }, {}), res);
          assert.equal(res.statusCode, 500);
          assert.equal(res.body.error, 'Error interno del servidor');
          assert.equal(res.calls, 1);
        });
      }
    }
  });
}

test('los listados de asignaciones pasan el filtro por usuario al servicio', async () => {
  for (const [file, plural] of [['empleado', 'Empleados'], ['usuario-rol-propiedad', 'UsuariosRolesPropiedad'], ['usuario-rol', 'UsuariosRoles']]) {
    const service = require('../src/services/' + file + '.service');
    const controller = require('../src/controllers/' + file + '.controller');
    await stub(service, 'getAll' + plural, async (...actual) => {
      assert.deepEqual(actual, [authorization, 7]);
      return [];
    }, async () => {
      const res = response();
      await controller['get' + plural](request({}, undefined, { usuarioId: 7 }), res);
      assert.equal(res.statusCode, 200, file);
    });
  }
});
test('las asignaciones no exponen datos personales ni la matriz de permisos del rol', async () => {
  const usuario = { id: 7, nombre: 'Ana', apellido: 'Pérez', cuil: '20123456789', email: 'ana@example.test',
    telefono: '3415550007', fechaNacimiento: '1990-01-01', estado: true, createdAt: 'x', updatedAt: 'x', deletedAt: null };
  const rol = { id: 3, codigo: 'RESIDENTE', descripcion: 'Residente', ambito: 'PROPIEDAD', permisos: [{ seccion: 'RESERVAS' }] };
  const usuarioRol = { id: 9, usuario, rol, beginAt: '2026-01-01', endAt: null };
  const records = {
    empleado: { id: 1, usuarioRol, administracion: { id: 50, nombre: 'Administración Centro' }, beginAt: '2026-01-01', endAt: null },
    'usuario-rol-propiedad': { id: 2, usuarioRol, propiedad: { id: 100, nroUnidad: '1A', edificio: { id: 10 } }, beginAt: '2026-01-01', endAt: null },
    'usuario-rol': { id: 9, usuario: 7, rol, beginAt: '2026-01-01', endAt: null },
  };
  for (const [file, name, plural] of [['empleado', 'Empleado', 'Empleados'], ['usuario-rol-propiedad', 'UsuarioRolPropiedad', 'UsuariosRolesPropiedad'], ['usuario-rol', 'UsuarioRol', 'UsuariosRoles']]) {
    const service = require('../src/services/' + file + '.service');
    const controller = require('../src/controllers/' + file + '.controller');
    const record = records[file];
    for (const [handler, method, list] of [['get' + plural, 'getAll' + plural, true], ['get' + name, 'get' + name + 'ById'],
      ['create' + name, 'create' + name], ['update' + name, 'update' + name], ['delete' + name, 'delete' + name]]) {
      await stub(service, method, async () => list ? [record] : record, async () => {
        const res = response();
        await controller[handler](request({ id: '1' }, { endAt: null }), res);
        const item = list ? res.body.data[0] : res.body.data;
        const link = item.usuarioRol ?? item;
        const text = JSON.stringify(res.body);
        for (const hidden of ['cuil', 'email', 'telefono', 'fechaNacimiento', 'permisos']) {
          assert.equal(text.includes(hidden), false, file + ' ' + handler + ': ' + hidden);
        }
        assert.deepEqual(link.rol, { id: 3, codigo: 'RESIDENTE', descripcion: 'Residente', ambito: 'PROPIEDAD' });
        if (file === 'usuario-rol') assert.equal(link.usuario, 7);
        else assert.deepEqual(link.usuario, { id: 7, nombre: 'Ana', apellido: 'Pérez' });
        assert.equal(item.beginAt, '2026-01-01');
        if (record.administracion) assert.deepEqual(item.administracion, record.administracion);
        if (record.propiedad) assert.deepEqual(item.propiedad, record.propiedad);
      });
    }
  }
  assert.equal(rol.permisos.length, 1, 'no modifica la entidad original');
});
test('un error de ID real del servicio llega al controlador como 400', async () => {
  const { parseId } = require('../src/services/service.helper');
  const service = require('../src/services/localidad.service');
  const controller = require('../src/controllers/localidad.controller');
  await stub(service, 'getLocalidadById', async id => parseId(id), async () => {
    const res = response();
    await controller.getLocalidad(request({ id: '12abc' }), res);
    assert.equal(res.statusCode, 400);
  });
});

