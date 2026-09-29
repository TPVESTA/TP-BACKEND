require('ts-node/register');
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTipoUnidadSchema, updateTipoUnidadSchema } = require('../src/schemas/tipo-unidad.schema');
const { TipoUnidad } = require('../src/entities/TipoUnidad');
const { requireAmbitoUnidad } = require('../src/services/ambito-unidad.helper');
const service = require('../src/services/tipo-unidad.service');
const manager = require('../src/database/DatabaseManager').default.getInstance();

test('alta exige PRIVADO o COMUN; no admite null ni valores desconocidos', () => {
  for (const ambito of ['PRIVADO', 'COMUN']) {
    assert.ifError(createTipoUnidadSchema.validate({ nombre: 'Unidad', ambito }).error);
    assert.ifError(updateTipoUnidadSchema.validate({ ambito }).error);
  }
  for (const ambito of [undefined, null, '', 'PUBLICO', 'privado']) {
    assert.ok(createTipoUnidadSchema.validate({ nombre: 'Unidad', ambito }).error);
  }
  assert.ok(updateTipoUnidadSchema.validate({ ambito: null }).error);
  assert.ifError(updateTipoUnidadSchema.validate({ nombre: 'Nuevo nombre' }).error);
});

test('rechaza tipos sin clasificar o incompatibles con la clase de unidad', () => {
  const tipo = new TipoUnidad();
  for (const expected of ['PRIVADO', 'COMUN']) {
    tipo.ambito = null;
    assert.throws(() => requireAmbitoUnidad(tipo, expected), /tipo de unidad/);
    tipo.ambito = expected;
    assert.doesNotThrow(() => requireAmbitoUnidad(tipo, expected));
    tipo.ambito = expected === 'PRIVADO' ? 'COMUN' : 'PRIVADO';
    assert.throws(() => requireAmbitoUnidad(tipo, expected), /tipo de unidad/);
  }
});

test('guarda el ámbito y evita reclasificar tipos utilizados por unidades incompatibles', async () => {
  const original = manager.getORM;
  const tipo = Object.assign(new TipoUnidad(), { id: 1, nombre: 'Departamento', ambito: null });
  let incompatibleCount = 0;
  let consultedClass;
  let saved;
  manager.getORM = () => ({ em: { fork: () => ({
    findOne: async () => tipo,
    count: async (entity, where) => { consultedClass = entity.name; assert.equal(where.tipoUnidad, 1); return incompatibleCount; },
    persistAndFlush: async entity => { saved = entity; },
  }) } });
  try {
    await service.createTipoUnidad({ nombre: 'SUM', ambito: 'COMUN' });
    assert.equal(saved.ambito, 'COMUN');
    await service.updateTipoUnidad(1, { ambito: 'PRIVADO' });
    assert.equal(tipo.ambito, 'PRIVADO');
    assert.equal(consultedClass, 'AreaComun');
    incompatibleCount = 1;
    await assert.rejects(service.updateTipoUnidad(1, { ambito: 'COMUN' }), /incompatible/);
    assert.equal(consultedClass, 'Propiedad');
    assert.equal(tipo.ambito, 'PRIVADO');
    await service.updateTipoUnidad(1, { nombre: 'Departamento actualizado' });
    assert.equal(tipo.nombre, 'Departamento actualizado');
  } finally { manager.getORM = original; }
});
