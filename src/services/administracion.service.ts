import { Administracion } from '../entities/Administracion';
import { EntityId, getEntityManager, parseId } from './service.helper';

export interface CreateAdministracionData {
  cuit: string;
  nombre: string;
  email: string;
  direccion: string;
}

export type UpdateAdministracionData = Partial<CreateAdministracionData>;

export const getAllAdministraciones = async (): Promise<Administracion[]> => {
  const em = getEntityManager();
  return em.find(Administracion, {});
};

export const getAdministracionById = async (id: EntityId): Promise<Administracion | null> => {
  const em = getEntityManager();
  return em.findOne(Administracion, { id: parseId(id) });
};

export const createAdministracion = async (data: CreateAdministracionData): Promise<Administracion> => {
  const em = getEntityManager();
  const entity = new Administracion(data.cuit, data.nombre, data.email, data.direccion);
  entity.cuit = data.cuit;
  entity.nombre = data.nombre;
  entity.email = data.email;
  entity.direccion = data.direccion;
  await em.persistAndFlush(entity);
  return entity;
};

export const updateAdministracion = async (id: EntityId, data: UpdateAdministracionData): Promise<Administracion | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Administracion, { id: parseId(id) });
  if (!entity) return null;
  if (data.cuit !== undefined) entity.cuit = data.cuit;
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  if (data.email !== undefined) entity.email = data.email;
  if (data.direccion !== undefined) entity.direccion = data.direccion;
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteAdministracion = async (id: EntityId): Promise<Administracion | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Administracion, { id: parseId(id) }, { filters: { softDelete: false } });
  if (!entity) return null;
  entity.deletedAt = entity.deletedAt ?? new Date();
  await em.persistAndFlush(entity);
  return entity;
};

