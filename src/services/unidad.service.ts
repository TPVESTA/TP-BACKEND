import { DomainValidationError } from '../errors/domain-validation.error';
import { Unidad } from '../entities/Unidad';
import { Propiedad } from '../entities/Propiedad';
import { AreaComun } from '../entities/AreaComun';
import * as propiedadService from './propiedad.service';
import * as areaComunService from './area-comun.service';
import { EntityId, getEntityManager, parseId } from './service.helper';

// Unidad es abstracta: las altas siempre corresponden a un subtipo concreto.
export type CreateUnidadData =
  | ({ clase: 'propiedad' } & propiedadService.CreatePropiedadData)
  | ({ clase: 'area_comun' } & areaComunService.CreateAreaComunData);

export type UpdateUnidadData =
  | ({ clase: 'propiedad' } & propiedadService.UpdatePropiedadData)
  | ({ clase: 'area_comun' } & areaComunService.UpdateAreaComunData);

export const getAllUnidades = async (): Promise<Unidad[]> => {
  const em = getEntityManager();
  return em.find<Unidad>('Unidad', {});
};

export const getUnidadById = async (id: EntityId): Promise<Unidad | null> => {
  const em = getEntityManager();
  return em.findOne<Unidad>('Unidad', { id: parseId(id) });
};

export const createUnidad = async (data: CreateUnidadData): Promise<Unidad> => {
  switch (data.clase) {
    case 'propiedad': return propiedadService.createPropiedad(data);
    case 'area_comun': return areaComunService.createAreaComun(data);
    default: throw new DomainValidationError('La clase debe ser propiedad o area_comun');
  }
};

export const updateUnidad = async (id: EntityId, data: UpdateUnidadData): Promise<Unidad | null> => {
  const entity = await getUnidadById(id);
  if (!entity) return null;
  if (data.clase === 'propiedad' && entity instanceof Propiedad) {
    return propiedadService.updatePropiedad(id, data);
  }
  if (data.clase === 'area_comun' && entity instanceof AreaComun) {
    return areaComunService.updateAreaComun(id, data);
  }
  throw new DomainValidationError('No se puede cambiar la clase de una unidad existente');
};

export const deleteUnidad = async (id: EntityId): Promise<Unidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne<Unidad>('Unidad', { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};
