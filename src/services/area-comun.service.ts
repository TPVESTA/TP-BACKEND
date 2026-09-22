import { AreaComun } from '../entities/AreaComun';
import { Edificio } from '../entities/Edificio';
import { TipoUnidad } from '../entities/TipoUnidad';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateAreaComunData {
  nroUnidad: string;
  mtCuadrados: number;
  descripcion: string;
  capacidad: number;
  edificioId: EntityId;
  tipoUnidadId: EntityId;
}

export type UpdateAreaComunData = Partial<CreateAreaComunData>;

export const getAllAreasComunes = async (): Promise<AreaComun[]> => {
  const em = getEntityManager();
  return em.find(AreaComun, {});
};

export const getAreaComunById = async (id: EntityId): Promise<AreaComun | null> => {
  const em = getEntityManager();
  return em.findOne(AreaComun, { id: parseId(id) });
};

export const createAreaComun = async (data: CreateAreaComunData): Promise<AreaComun> => {
  const em = getEntityManager();
  const entity = new AreaComun();
  entity.nroUnidad = data.nroUnidad;
  entity.mtCuadrados = data.mtCuadrados;
  entity.descripcion = data.descripcion;
  entity.capacidad = data.capacidad;
  entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  entity.tipoUnidad = await requireEntity(em, TipoUnidad, data.tipoUnidadId, 'TipoUnidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateAreaComun = async (id: EntityId, data: UpdateAreaComunData): Promise<AreaComun | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(AreaComun, { id: parseId(id) });
  if (!entity) return null;
  if (data.nroUnidad !== undefined) entity.nroUnidad = data.nroUnidad;
  if (data.mtCuadrados !== undefined) entity.mtCuadrados = data.mtCuadrados;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.capacidad !== undefined) entity.capacidad = data.capacidad;
  if (data.edificioId !== undefined) entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  if (data.tipoUnidadId !== undefined) entity.tipoUnidad = await requireEntity(em, TipoUnidad, data.tipoUnidadId, 'TipoUnidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteAreaComun = async (id: EntityId): Promise<AreaComun | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(AreaComun, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

