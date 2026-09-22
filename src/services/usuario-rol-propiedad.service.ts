import { UsuarioRolPropiedad } from '../entities/UsuarioRolPropiedad';
import { User } from '../entities/User';
import { Rol } from '../entities/Rol';
import { Propiedad } from '../entities/Propiedad';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateUsuarioRolPropiedadData {
  beginAt?: Date;
  endAt?: Date | null;
  usuarioId: EntityId;
  rolId: EntityId;
  propiedadId: EntityId;
}

export type UpdateUsuarioRolPropiedadData = Partial<CreateUsuarioRolPropiedadData>;

export const getAllUsuariosRolesPropiedad = async (): Promise<UsuarioRolPropiedad[]> => {
  const em = getEntityManager();
  return em.find(UsuarioRolPropiedad, {});
};

export const getUsuarioRolPropiedadById = async (id: EntityId): Promise<UsuarioRolPropiedad | null> => {
  const em = getEntityManager();
  return em.findOne(UsuarioRolPropiedad, { id: parseId(id) });
};

export const createUsuarioRolPropiedad = async (data: CreateUsuarioRolPropiedadData): Promise<UsuarioRolPropiedad> => {
  const em = getEntityManager();
  const entity = new UsuarioRolPropiedad();
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  entity.rol = await requireEntity(em, Rol, data.rolId, 'Rol');
  entity.propiedad = await requireEntity(em, Propiedad, data.propiedadId, 'Propiedad');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateUsuarioRolPropiedad = async (id: EntityId, data: UpdateUsuarioRolPropiedadData): Promise<UsuarioRolPropiedad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRolPropiedad, { id: parseId(id) });
  if (!entity) return null;
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  if (data.usuarioId !== undefined) entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  if (data.rolId !== undefined) entity.rol = await requireEntity(em, Rol, data.rolId, 'Rol');
  if (data.propiedadId !== undefined) entity.propiedad = await requireEntity(em, Propiedad, data.propiedadId, 'Propiedad');
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteUsuarioRolPropiedad = async (id: EntityId): Promise<UsuarioRolPropiedad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRolPropiedad, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

