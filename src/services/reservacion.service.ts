import { Reservacion } from '../entities/Reservacion';
import { User } from '../entities/User';
import { AreaComun } from '../entities/AreaComun';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateReservacionData {
  fechaReservacion: Date;
  estado: string;
  descripcion: string;
  usuarioId: EntityId;
  areaComunId: EntityId;
}

export type UpdateReservacionData = Partial<CreateReservacionData>;

export const getAllReservaciones = async (): Promise<Reservacion[]> => {
  const em = getEntityManager();
  return em.find(Reservacion, {});
};

export const getReservacionById = async (id: EntityId): Promise<Reservacion | null> => {
  const em = getEntityManager();
  return em.findOne(Reservacion, { id: parseId(id) });
};

export const createReservacion = async (data: CreateReservacionData): Promise<Reservacion> => {
  const em = getEntityManager();
  const entity = new Reservacion();
  entity.fechaReservacion = data.fechaReservacion;
  entity.estado = data.estado;
  entity.descripcion = data.descripcion;
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  entity.areaComun = await requireEntity(em, AreaComun, data.areaComunId, 'AreaComun');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateReservacion = async (id: EntityId, data: UpdateReservacionData): Promise<Reservacion | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Reservacion, { id: parseId(id) });
  if (!entity) return null;
  if (data.fechaReservacion !== undefined) entity.fechaReservacion = data.fechaReservacion;
  if (data.estado !== undefined) entity.estado = data.estado;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.usuarioId !== undefined) entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  if (data.areaComunId !== undefined) entity.areaComun = await requireEntity(em, AreaComun, data.areaComunId, 'AreaComun');
  entity.updatedAt = new Date();
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteReservacion = async (id: EntityId): Promise<Reservacion | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Reservacion, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

