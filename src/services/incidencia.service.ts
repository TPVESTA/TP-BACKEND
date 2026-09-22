import { Incidencia } from '../entities/Incidencia';
import { User } from '../entities/User';
import { Unidad } from '../entities/Unidad';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateIncidenciaData {
  estado: string;
  descripcion: string;
  closedAt?: Date | null;
  usuarioId: EntityId;
  unidadId: EntityId;
}

export type UpdateIncidenciaData = Partial<CreateIncidenciaData>;

export const getAllIncidencias = async (): Promise<Incidencia[]> => {
  const em = getEntityManager();
  return em.find(Incidencia, {});
};

export const getIncidenciaById = async (id: EntityId): Promise<Incidencia | null> => {
  const em = getEntityManager();
  return em.findOne(Incidencia, { id: parseId(id) });
};

export const createIncidencia = async (data: CreateIncidenciaData): Promise<Incidencia> => {
  const em = getEntityManager();
  const entity = new Incidencia();
  entity.estado = data.estado;
  entity.descripcion = data.descripcion;
  if (data.closedAt !== undefined) entity.closedAt = data.closedAt;
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  entity.unidad = await requireEntity<Unidad>(em, 'Unidad', data.unidadId, 'Unidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateIncidencia = async (id: EntityId, data: UpdateIncidenciaData): Promise<Incidencia | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Incidencia, { id: parseId(id) });
  if (!entity) return null;
  if (data.estado !== undefined) entity.estado = data.estado;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.closedAt !== undefined) entity.closedAt = data.closedAt;
  if (data.usuarioId !== undefined) entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  if (data.unidadId !== undefined) entity.unidad = await requireEntity<Unidad>(em, 'Unidad', data.unidadId, 'Unidad');
  entity.updatedAt = new Date();
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteIncidencia = async (id: EntityId): Promise<Incidencia | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Incidencia, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

