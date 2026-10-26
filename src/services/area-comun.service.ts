import { AuthorizationContext } from './authorization.service';
import { AccionPermiso } from '../entities/Permiso';
import { commonAreaWhere, requireBuildingMutation } from './structure-authorization.helper';
import { AmbitoUnidad } from '../entities/AmbitoUnidad';
import { requireAmbitoUnidad } from './ambito-unidad.helper';
import { AreaComun } from '../entities/AreaComun';
import { Edificio } from '../entities/Edificio';
import { TipoUnidad } from '../entities/TipoUnidad';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateAreaComunData {
  nroUnidad: string;
  mtCuadrados: number;
  descripcion: string;
  capacidad?: number | null;
  edificioId: EntityId;
  tipoUnidadId: EntityId;
}

export type UpdateAreaComunData = Partial<CreateAreaComunData>;

export const getAllAreasComunes = async (context: AuthorizationContext): Promise<AreaComun[]> => {
  const scope = commonAreaWhere<AreaComun>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.find(AreaComun, scope);
};

export const getAreaComunById = async (id: EntityId, context: AuthorizationContext): Promise<AreaComun | null> => {
  const scope = commonAreaWhere<AreaComun>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.findOne(AreaComun, { $and: [{ id: parseId(id) }, scope] });
};

export const createAreaComun = async (data: CreateAreaComunData, context: AuthorizationContext): Promise<AreaComun> => {
  requireBuildingMutation(context, AccionPermiso.CREAR, parseId(data.edificioId));
  const em = getEntityManager();
  const entity = new AreaComun();
  entity.nroUnidad = data.nroUnidad;
  entity.mtCuadrados = data.mtCuadrados;
  entity.descripcion = data.descripcion;
  entity.capacidad = data.capacidad === 0 ? null : data.capacidad ?? null;
  entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  entity.tipoUnidad = await requireEntity(em, TipoUnidad, data.tipoUnidadId, 'TipoUnidad');
  requireAmbitoUnidad(entity.tipoUnidad, AmbitoUnidad.COMUN);
  await em.persistAndFlush(entity);
  return entity;
};

export const updateAreaComun = async (id: EntityId, data: UpdateAreaComunData, context: AuthorizationContext): Promise<AreaComun | null> => {
  const scope = commonAreaWhere<AreaComun>(context, AccionPermiso.EDITAR);
  const em = getEntityManager();
  const entity = await em.findOne(AreaComun, { $and: [{ id: parseId(id) }, scope] });
  if (!entity) return null;
  if (data.edificioId !== undefined) requireBuildingMutation(context, AccionPermiso.EDITAR, parseId(data.edificioId));
  if (data.nroUnidad !== undefined) entity.nroUnidad = data.nroUnidad;
  if (data.mtCuadrados !== undefined) entity.mtCuadrados = data.mtCuadrados;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.capacidad !== undefined) entity.capacidad = data.capacidad === 0 ? null : data.capacidad;
  if (data.edificioId !== undefined) entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  if (data.tipoUnidadId !== undefined) {
    entity.tipoUnidad = await requireEntity(em, TipoUnidad, data.tipoUnidadId, 'TipoUnidad');
    requireAmbitoUnidad(entity.tipoUnidad, AmbitoUnidad.COMUN);
  }
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteAreaComun = async (id: EntityId, context: AuthorizationContext): Promise<AreaComun | null> => {
  const scope = commonAreaWhere<AreaComun>(context, AccionPermiso.BORRAR);
  const em = getEntityManager();
  const entity = await em.findOne(AreaComun, { $and: [{ id: parseId(id) }, scope] });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

