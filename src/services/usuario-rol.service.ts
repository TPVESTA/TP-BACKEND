import { UsuarioRol } from '../entities/UsuarioRol';
import { User } from '../entities/User';
import { Rol } from '../entities/Rol';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateUsuarioRolData {
  beginAt?: Date;
  endAt?: Date | null;
  usuarioId: EntityId;
  rolId: EntityId;
}

export type UpdateUsuarioRolData = Partial<CreateUsuarioRolData>;

export const getAllUsuariosRoles = async (): Promise<UsuarioRol[]> => {
  const em = getEntityManager();
  return em.find(UsuarioRol, {});
};

export const getUsuarioRolById = async (id: EntityId): Promise<UsuarioRol | null> => {
  const em = getEntityManager();
  return em.findOne(UsuarioRol, { id: parseId(id) });
};

export const createUsuarioRol = async (data: CreateUsuarioRolData): Promise<UsuarioRol> => {
  const em = getEntityManager();
  const entity = new UsuarioRol();
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  entity.rol = await requireEntity(em, Rol, data.rolId, 'Rol');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateUsuarioRol = async (id: EntityId, data: UpdateUsuarioRolData): Promise<UsuarioRol | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRol, { id: parseId(id) });
  if (!entity) return null;
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  if (data.usuarioId !== undefined) entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  if (data.rolId !== undefined) entity.rol = await requireEntity(em, Rol, data.rolId, 'Rol');
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteUsuarioRol = async (id: EntityId): Promise<UsuarioRol | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRol, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

