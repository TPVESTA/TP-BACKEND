require('ts-node/register');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../src/middlewares/validate');
const common = require('../src/schemas/common.schema');
const user = require('../src/schemas/user.schema');
const unidad = require('../src/schemas/unidad.schema');
const specs = [
  {
    "file": "localidad",
    "name": "Localidad",
    "fields": [
      "nombre",
      "provincia"
    ]
  },
  {
    "file": "tipo-unidad",
    "name": "TipoUnidad",
    "fields": [
      "nombre"
    ]
  },
  {
    "file": "administracion",
    "name": "Administracion",
    "fields": [
      "cuit",
      "nombre",
      "email",
      "direccion"
    ]
  },
  {
    "file": "edificio",
    "name": "Edificio",
    "fields": [
      "cuit",
      "nombre",
      "direccion",
      "localidadId"
    ]
  },
  {
    "file": "rol",
    "name": "Rol",
    "fields": [
      "nombre",
      "descripcion",
      "ambito"
    ]
  },
  {
    "file": "propiedad",
    "name": "Propiedad",
    "fields": [
      "copropiedad",
      "habitaciones"
    ],
    "kind": "unidad"
  },
  {
    "file": "area-comun",
    "name": "AreaComun",
    "fields": [
      "capacidad"
    ],
    "kind": "unidad"
  },
  {
    "file": "empleado",
    "name": "Empleado",
    "fields": [
      "usuarioId",
      "administracionId",
      "rolId"
    ],
    "kind": "periodo"
  },
  {
    "file": "admin-edificio",
    "name": "AdminEdificio",
    "fields": [
      "administracionId",
      "edificioId"
    ],
    "kind": "periodo"
  },
  {
    "file": "usuario-rol-propiedad",
    "name": "UsuarioRolPropiedad",
    "fields": [
      "usuarioId",
      "rolId",
      "propiedadId"
    ],
    "kind": "periodo"
  },
  {
    "file": "incidencia",
    "name": "Incidencia",
    "fields": [
      "estado",
      "descripcion",
      "closedAt",
      "usuarioId",
      "unidadId"
    ]
  },
  {
    "file": "reservacion",
    "name": "Reservacion",
    "fields": [
      "fechaReservacion",
      "estado",
      "descripcion",
      "usuarioId",
      "areaComunId"
    ]
  }
];
const options = { abortEarly: false, stripUnknown: true };
const samples = {
  nombre: 'Prueba', apellido: 'Perez', provincia: 'Santa Fe', direccion: 'Calle 123',
  email: 'ana@example.com', cuil: '20123456789', cuit: '30123456789',
  descripcion: 'Descripcion', ambito: 'ADMINISTRACION', estado: 'abierta',
  copropiedad: 12.3456, habitaciones: 0, capacidad: 0, nroUnidad: '2A', mtCuadrados: 65.25,
  beginAt: '2026-01-01T00:00:00Z', endAt: null, closedAt: null,
  fechaReservacion: '2026-02-01T15:30:00Z'
};
function dataFor(spec) {
  const fields = [...(spec.kind === 'unidad' ? ['nroUnidad','mtCuadrados','descripcion','edificioId','tipoUnidadId'] : []), ...spec.fields];
  return Object.fromEntries(fields.map(key => [key, key.endsWith('Id') ? '1' : samples[key]]));
}
for (const spec of specs) {
  const module = require('../src/schemas/' + spec.file + '.schema');
  const create = module['create' + spec.name + 'Schema'];
  const update = module['update' + spec.name + 'Schema'];
  test(spec.name + ': alta completa, campos obligatorios y conversiones', () => {
    const data = dataFor(spec);
    const result = create.validate(data, options);
    assert.ifError(result.error);
    for (const key of Object.keys(data)) {
      if (key.endsWith('Id')) assert.equal(result.value[key], 1);
      if (key === 'fechaReservacion') assert.ok(result.value[key] instanceof Date);
      if (key === 'closedAt') continue;
      const missing = { ...data };
      delete missing[key];
      assert.ok(create.validate(missing, options).error, key + ' debe ser obligatorio');
    }
    for (const body of [undefined, null, [], 'texto']) assert.ok(create.validate(body, options).error);
  });
  test(spec.name + ': actualizacion parcial sin valores por defecto ni campos desconocidos', () => {
    for (const [key, value] of Object.entries(dataFor(spec))) {
      const result = update.validate({ [key]: value }, options);
      assert.ifError(result.error);
      assert.deepEqual(Object.keys(result.value), [key]);
    }
    for (const body of [undefined, null, [], {}, { id: 100, createdAt: samples.beginAt, inventado: true }]) {
      assert.ok(update.validate(body, options).error);
    }
    const result = update.validate({ ...dataFor(spec), id: 100, deletedAt: samples.beginAt }, options);
    assert.ifError(result.error);
    assert.equal(result.value.id, undefined);
    assert.equal(result.value.deletedAt, undefined);
  });
  if (spec.kind === 'periodo') {
    test(spec.name + ': periodos abiertos, iguales, invertidos y parciales', () => {
      const base = dataFor(spec);
      const result = create.validate(base, options);
      assert.ifError(result.error);
      assert.equal(result.value.beginAt, undefined);
      assert.ifError(create.validate({ ...base, beginAt: samples.beginAt, endAt: samples.beginAt }, options).error);
      assert.ok(create.validate({ ...base, beginAt: '2026-02-01', endAt: '2026-01-01' }, options).error);
      assert.ok(update.validate({ beginAt: '2026-02-01', endAt: '2026-01-01' }, options).error);
      assert.ifError(update.validate({ endAt: null }, options).error);
      assert.ifError(update.validate({ endAt: '2026-01-01' }, options).error);
      assert.ok(update.validate({ beginAt: null }, options).error);
      assert.ok(update.validate({ endAt: 'no-es-fecha' }, options).error);
    });
  }
}
test('IDs solo aceptan enteros positivos seguros o digitos textuales', () => {
  for (const id of [0, -1, 1.2, true, null, '', '1x', '1e2', '1.0', ' 1 ', Number.MAX_SAFE_INTEGER + 1]) {
    assert.ok(common.idParamSchema.validate({ id }, options).error, String(id));
  }
  assert.deepEqual(common.idParamSchema.validate({ id: '12' }, options).value, { id: 12 });
  assert.ifError(common.idParamSchema.validate({ id: 12 }, options).error);
});
test('usuarios: contrato real, false, fecha, formato fiscal, email y contrasena', () => {
  const data = { cuil: samples.cuil, nombre: ' Ana ', apellido: 'Perez', email: samples.email,
    fechaNacimiento: '2000-01-01', password: ' clave123 ', estado: false };
  for (const schema of [user.createUserSchema, user.registerUserSchema]) {
    const result = schema.validate(data, options);
    assert.ifError(result.error);
    assert.equal(result.value.nombre, 'Ana');
    assert.equal(result.value.estado, false);
    assert.equal(result.value.password, ' clave123 ');
    assert.ok(result.value.fechaNacimiento instanceof Date);
    for (const key of Object.keys(data)) {
      const missing = { ...data }; delete missing[key];
      assert.ok(schema.validate(missing, options).error, key);
    }
  }
  assert.ifError(user.updateUserSchema.validate({ estado: false }, options).error);
  assert.ok(user.updateUserSchema.validate({ name: 'Ana' }, options).error);
  for (const patch of [{ estado: 'false' }, { cuil: '12' }, { cuil: 20123456789 },
    { email: 'no-email' }, { fechaNacimiento: '2999-01-01' }, { nombre: ' ' },
    { password: '123' }, { password: 'a'.repeat(19) }, {}]) {
    assert.ok(user.updateUserSchema.validate(patch, options).error, JSON.stringify(patch));
  }
  assert.ifError(user.loginUserSchema.validate({ email: samples.email, password: 'clave123' }, options).error);
  assert.ok(user.loginUserSchema.validate({ email: samples.email }, options).error);
});
test('unidades: seleccion de subtipo y al menos un cambio ademas de clase', () => {
  for (const [name, clase] of [['Propiedad', 'propiedad'], ['AreaComun', 'area_comun']]) {
    const spec = specs.find(s => s.name === name);
    const data = { ...dataFor(spec), clase };
    assert.ifError(unidad.createUnidadSchema.validate(data, options).error);
    assert.ifError(unidad.updateUnidadSchema.validate({ clase, descripcion: 'Nueva' }, options).error);
    assert.ok(unidad.updateUnidadSchema.validate({ clase }, options).error);
    assert.ok(unidad.updateUnidadSchema.validate({ clase, inventado: true }, options).error);
    assert.ok(unidad.createUnidadSchema.validate({ ...data, clase: 'otra' }, options).error);
    const wrong = clase === 'propiedad' ? { capacidad: 3 } : { habitaciones: 3 };
    assert.ok(unidad.createUnidadSchema.validate({ ...data, ...wrong }, options).error);
    assert.ok(unidad.updateUnidadSchema.validate({ clase, ...wrong }, options).error);
  }
  assert.ok(unidad.createUnidadSchema.validate(undefined, options).error);
  assert.ok(unidad.updateUnidadSchema.validate({ descripcion: 'Nueva' }, options).error);
});
test('numeros no se redondean ni aceptan negativos o fracciones en cantidades enteras', () => {
  const p = require('../src/schemas/propiedad.schema').updatePropiedadSchema;
  for (const patch of [{ copropiedad: -1 }, { copropiedad: 101 }, { copropiedad: 1.12345 },
    { habitaciones: 1.5 }, { mtCuadrados: 1.234 }, { mtCuadrados: -1 }, { mtCuadrados: Infinity }]) {
    assert.ok(p.validate(patch, options).error);
  }
  assert.ifError(p.validate({ copropiedad: 0, habitaciones: 0, mtCuadrados: 0 }, options).error);
  assert.ifError(p.validate({ copropiedad: 100 }, options).error);
  const rol = require('../src/schemas/rol.schema').createRolSchema;
  assert.ok(rol.validate({ nombre: 'Rol', descripcion: 'Desc', ambito: 'OTRO' }, options).error);
});
test('validate entrega al controlador fechas convertidas y todos los campos del usuario', async () => {
  const req = { body: { cuil: samples.cuil, nombre: 'Ana', apellido: 'Perez', email: samples.email,
    fechaNacimiento: '2000-01-01', password: 'clave123', estado: true, intruso: true } };
  let next = 0;
  const res = { status() { assert.fail('No debe rechazar'); } };
  await validate({ schema: user.registerUserSchema })(req, res, () => next++);
  assert.equal(next, 1);
  assert.ok(req.body.fechaNacimiento instanceof Date);
  assert.equal(req.body.cuil, samples.cuil);
  assert.equal(req.body.intruso, undefined);
});

