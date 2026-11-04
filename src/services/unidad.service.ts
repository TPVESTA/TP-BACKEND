import { DomainValidationError } from '../errors/domain-validation.error';
import { Unidad } from '../entities/Unidad';
import { Propiedad } from '../entities/Propiedad';
import { AreaComun } from '../entities/AreaComun';
import * as propiedadService from './propiedad.service';
import * as areaComunService from './area-comun.service';
import { EntityId, getEntityManager, parseId } from './service.helper';
import { AuthorizationContext, hasPermission } from './authorization/authorization.service';
import { AccionPermiso, SeccionPermiso } from '../entities/Permiso';
import { AuthorizationError } from '../errors/authorization.error';
import { commonAreaWhere, propertyWhere } from './authorization/structure-authorization.helper';

// Unidad es abstracta: las altas siempre corresponden a un subtipo concreto.
export type CreateUnidadData =
  | ({ clase: 'propiedad' } & propiedadService.CreatePropiedadData)
  | ({ clase: 'area_comun' } & areaComunService.CreateAreaComunData);

export type UpdateUnidadData =
  | ({ clase: 'propiedad' } & propiedadService.UpdatePropiedadData)
  | ({ clase: 'area_comun' } & areaComunService.UpdateAreaComunData);

export const getAllUnidades = async (context: AuthorizationContext): Promise<Unidad[]> => {
  const em = getEntityManager();
  const canReadProperties = hasPermission(context, SeccionPermiso.PROPIEDADES, AccionPermiso.LEER);
  const canReadCommonAreas = hasPermission(context, SeccionPermiso.ESTRUCTURA, AccionPermiso.LEER);
  if (!canReadProperties && !canReadCommonAreas) throw new AuthorizationError('No tiene permiso para consultar unidades.');
  const properties = canReadProperties
    ? await em.find(Propiedad, propertyWhere<Propiedad>(context, AccionPermiso.LEER)) : [];
  const commonAreas = canReadCommonAreas
    ? await em.find(AreaComun, commonAreaWhere<AreaComun>(context, AccionPermiso.LEER)) : [];
  return [...properties, ...commonAreas];
};

export const getUnidadById = async (id: EntityId, context: AuthorizationContext): Promise<Unidad | null> => {
  const em = getEntityManager();
  const parsedId = parseId(id);
  const canReadProperties = hasPermission(context, SeccionPermiso.PROPIEDADES, AccionPermiso.LEER);
  const canReadCommonAreas = hasPermission(context, SeccionPermiso.ESTRUCTURA, AccionPermiso.LEER);
  if (!canReadProperties && !canReadCommonAreas) throw new AuthorizationError('No tiene permiso para consultar unidades.');
  const property = canReadProperties ? await em.findOne(Propiedad, {
    $and: [{ id: parsedId }, propertyWhere<Propiedad>(context, AccionPermiso.LEER)],
  }) : null;
  if (property) return property;
  return canReadCommonAreas ? em.findOne(AreaComun, {
    $and: [{ id: parsedId }, commonAreaWhere<AreaComun>(context, AccionPermiso.LEER)],
  }) : null;
};

export const createUnidad = async (data: CreateUnidadData, context: AuthorizationContext): Promise<Unidad> => {
  switch (data.clase) {
    case 'propiedad': return propiedadService.createPropiedad(data, context);
    case 'area_comun': return areaComunService.createAreaComun(data, context);
    default: throw new DomainValidationError('La clase debe ser propiedad o area_comun');
  }
};

export const updateUnidad = async (id: EntityId, data: UpdateUnidadData, context: AuthorizationContext): Promise<Unidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne<Unidad>('Unidad', {
    $and: [{ id: parseId(id) }, commonAreaWhere<Unidad>(context, AccionPermiso.EDITAR)],
  });
  if (!entity) return null;
  if (data.clase === 'propiedad' && entity instanceof Propiedad) {
    return propiedadService.updatePropiedad(id, data, context);
  }
  if (data.clase === 'area_comun' && entity instanceof AreaComun) {
    return areaComunService.updateAreaComun(id, data, context);
  }
  throw new DomainValidationError('No se puede cambiar la clase de una unidad existente');
};

export const deleteUnidad = async (id: EntityId, context: AuthorizationContext): Promise<Unidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne<Unidad>('Unidad', {
    $and: [{ id: parseId(id) }, commonAreaWhere<Unidad>(context, AccionPermiso.BORRAR)],
  });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};
