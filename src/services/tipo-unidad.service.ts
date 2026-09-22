import { TipoUnidad } from '../entities/TipoUnidad';
import { EntityId, getEntityManager, parseId } from './service.helper';

export interface CreateTipoUnidadData {
  nombre: string;
}

export type UpdateTipoUnidadData = Partial<CreateTipoUnidadData>;

export const getAllTiposUnidad = async (): Promise<TipoUnidad[]> => {
  const em = getEntityManager();
  return em.find(TipoUnidad, {});
};

export const getTipoUnidadById = async (id: EntityId): Promise<TipoUnidad | null> => {
  const em = getEntityManager();
  return em.findOne(TipoUnidad, { id: parseId(id) });
};

export const createTipoUnidad = async (data: CreateTipoUnidadData): Promise<TipoUnidad> => {
  const em = getEntityManager();
  const entity = new TipoUnidad();
  entity.nombre = data.nombre;
  await em.persistAndFlush(entity);
  return entity;
};

export const updateTipoUnidad = async (id: EntityId, data: UpdateTipoUnidadData): Promise<TipoUnidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(TipoUnidad, { id: parseId(id) });
  if (!entity) return null;
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteTipoUnidad = async (id: EntityId): Promise<TipoUnidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(TipoUnidad, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

