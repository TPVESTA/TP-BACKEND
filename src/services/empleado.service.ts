import { Empleado } from '../entities/Empleado';
import { User } from '../entities/User';
import { Administracion } from '../entities/Administracion';
import { Rol } from '../entities/Rol';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateEmpleadoData {
  beginAt?: Date;
  endAt?: Date | null;
  usuarioId: EntityId;
  administracionId: EntityId;
  rolId: EntityId;
}

export type UpdateEmpleadoData = Partial<CreateEmpleadoData>;

export const getAllEmpleados = async (): Promise<Empleado[]> => {
  const em = getEntityManager();
  return em.find(Empleado, {});
};

export const getEmpleadoById = async (id: EntityId): Promise<Empleado | null> => {
  const em = getEntityManager();
  return em.findOne(Empleado, { id: parseId(id) });
};

export const createEmpleado = async (data: CreateEmpleadoData): Promise<Empleado> => {
  const em = getEntityManager();
  const entity = new Empleado();
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  entity.administracion = await requireEntity(em, Administracion, data.administracionId, 'Administracion');
  entity.rol = await requireEntity(em, Rol, data.rolId, 'Rol');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateEmpleado = async (id: EntityId, data: UpdateEmpleadoData): Promise<Empleado | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Empleado, { id: parseId(id) });
  if (!entity) return null;
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  if (data.usuarioId !== undefined) entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  if (data.administracionId !== undefined) entity.administracion = await requireEntity(em, Administracion, data.administracionId, 'Administracion');
  if (data.rolId !== undefined) entity.rol = await requireEntity(em, Rol, data.rolId, 'Rol');
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteEmpleado = async (id: EntityId): Promise<Empleado | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Empleado, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

