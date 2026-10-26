import { AuthorizationContext } from './authorization.service';
import { AccionPermiso } from '../entities/Permiso';
import { administrationWhere, requireGlobalStructure } from './structure-authorization.helper';
import { Administracion } from '../entities/Administracion';
import { EntityId, getEntityManager, parseId } from './service.helper';

export interface CreateAdministracionData {
  cuit: string;
  nombre: string;
  email: string;
  direccion: string;
}

export type UpdateAdministracionData = Partial<CreateAdministracionData>;

export const getAllAdministraciones = async (context: AuthorizationContext): Promise<Administracion[]> => {
  const scope = administrationWhere<Administracion>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.find(Administracion, scope);
};

export const getAdministracionById = async (id: EntityId, context: AuthorizationContext): Promise<Administracion | null> => {
  const scope = administrationWhere<Administracion>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.findOne(Administracion, { $and: [{ id: parseId(id) }, scope] });
};

export const createAdministracion = async (data: CreateAdministracionData, context: AuthorizationContext): Promise<Administracion> => {
  requireGlobalStructure(context, AccionPermiso.CREAR);
  const em = getEntityManager();
  const entity = new Administracion(data.cuit, data.nombre, data.email, data.direccion);
  entity.cuit = data.cuit;
  entity.nombre = data.nombre;
  entity.email = data.email;
  entity.direccion = data.direccion;
  await em.persistAndFlush(entity);
  return entity;
};

export const updateAdministracion = async (id: EntityId, data: UpdateAdministracionData, context: AuthorizationContext): Promise<Administracion | null> => {
  const scope = administrationWhere<Administracion>(context, AccionPermiso.EDITAR);
  const em = getEntityManager();
  const entity = await em.findOne(Administracion, { $and: [{ id: parseId(id) }, scope] });
  if (!entity) return null;
  if (data.cuit !== undefined) entity.cuit = data.cuit;
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  if (data.email !== undefined) entity.email = data.email;
  if (data.direccion !== undefined) entity.direccion = data.direccion;
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteAdministracion = async (id: EntityId, context: AuthorizationContext): Promise<Administracion | null> => {
  const scope = administrationWhere<Administracion>(context, AccionPermiso.BORRAR);
  const em = getEntityManager();
  const entity = await em.findOne(Administracion, { $and: [{ id: parseId(id) }, scope] }, { filters: { softDelete: false } });
  if (!entity) return null;
  entity.deletedAt = entity.deletedAt ?? new Date();
  await em.persistAndFlush(entity);
  return entity;
};

