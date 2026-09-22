import { Edificio } from '../entities/Edificio';
import { Localidad } from '../entities/Localidad';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateEdificioData {
  cuit: string;
  nombre: string;
  direccion: string;
  localidadId: EntityId;
}

export type UpdateEdificioData = Partial<CreateEdificioData>;

export const getAllEdificios = async (): Promise<Edificio[]> => {
  const em = getEntityManager();
  return em.find(Edificio, {});
};

export const getEdificioById = async (id: EntityId): Promise<Edificio | null> => {
  const em = getEntityManager();
  return em.findOne(Edificio, { id: parseId(id) });
};

export const createEdificio = async (data: CreateEdificioData): Promise<Edificio> => {
  const em = getEntityManager();
  const entity = new Edificio(data.cuit, data.nombre, data.direccion);
  entity.cuit = data.cuit;
  entity.nombre = data.nombre;
  entity.direccion = data.direccion;
  entity.localidad = await requireEntity(em, Localidad, data.localidadId, 'Localidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateEdificio = async (id: EntityId, data: UpdateEdificioData): Promise<Edificio | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Edificio, { id: parseId(id) });
  if (!entity) return null;
  if (data.cuit !== undefined) entity.cuit = data.cuit;
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  if (data.direccion !== undefined) entity.direccion = data.direccion;
  if (data.localidadId !== undefined) entity.localidad = await requireEntity(em, Localidad, data.localidadId, 'Localidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteEdificio = async (id: EntityId): Promise<Edificio | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Edificio, { id: parseId(id) }, { filters: { softDelete: false } });
  if (!entity) return null;
  entity.deletedAt = entity.deletedAt ?? new Date();
  await em.persistAndFlush(entity);
  return entity;
};

