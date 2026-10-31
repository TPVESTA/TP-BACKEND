import { DomainValidationError } from '../errors/domain.errors';
import { EntityManager, EntityName, FilterQuery } from '@mikro-orm/core';
import DatabaseManager from '../database/DatabaseManager';

export type EntityId = string | number;

export const getEntityManager = (): EntityManager =>
  DatabaseManager.getInstance().getORM().em.fork();

export const parseId = (id: EntityId): number => {
  const value = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new DomainValidationError('El ID debe ser un entero positivo');
  }
  return value;
};

// Carga la relación y respeta los filtros de baja lógica de la entidad.
export const requireEntity = async <T extends { id: number }>(
  em: EntityManager, entity: EntityName<T>, id: EntityId, label: string
): Promise<T> => {
  const result = await em.findOne(entity, { id: parseId(id) } as FilterQuery<T>);
  if (!result) throw new DomainValidationError(`${label} no encontrado/a`);
  return result;
};
