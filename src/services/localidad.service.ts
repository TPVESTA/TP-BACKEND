import { Localidad } from '../entities/Localidad';
import { EntityId, getEntityManager, parseId } from './service.helper';

export interface CreateLocalidadData {
  nombre: string;
  provincia: string;
}

export type UpdateLocalidadData = Partial<CreateLocalidadData>;

export const getAllLocalidades = async (): Promise<Localidad[]> => {
  const em = getEntityManager();
  return em.find(Localidad, {});
};

export const getLocalidadById = async (id: EntityId): Promise<Localidad | null> => {
  const em = getEntityManager();
  return em.findOne(Localidad, { id: parseId(id) });
};

export const createLocalidad = async (data: CreateLocalidadData): Promise<Localidad> => {
  const em = getEntityManager();
  const entity = new Localidad();
  entity.nombre = data.nombre;
  entity.provincia = data.provincia;
  await em.persistAndFlush(entity);
  return entity;
};

export const updateLocalidad = async (id: EntityId, data: UpdateLocalidadData): Promise<Localidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Localidad, { id: parseId(id) });
  if (!entity) return null;
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  if (data.provincia !== undefined) entity.provincia = data.provincia;
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteLocalidad = async (id: EntityId): Promise<Localidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Localidad, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

