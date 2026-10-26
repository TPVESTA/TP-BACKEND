import { AuthorizationContext } from './authorization.service';
import { AccionPermiso } from '../entities/Permiso';
import { buildingWhere, requireGlobalStructure } from './structure-authorization.helper';
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

export const getAllEdificios = async (context: AuthorizationContext): Promise<Edificio[]> => {
  const scope = buildingWhere<Edificio>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.find(Edificio, scope);
};

export const getEdificioById = async (id: EntityId, context: AuthorizationContext): Promise<Edificio | null> => {
  const scope = buildingWhere<Edificio>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.findOne(Edificio, { $and: [{ id: parseId(id) }, scope] });
};

export const createEdificio = async (data: CreateEdificioData, context: AuthorizationContext): Promise<Edificio> => {
  requireGlobalStructure(context, AccionPermiso.CREAR);
  const em = getEntityManager();
  const entity = new Edificio(data.cuit, data.nombre, data.direccion);
  entity.cuit = data.cuit;
  entity.nombre = data.nombre;
  entity.direccion = data.direccion;
  entity.localidad = await requireEntity(em, Localidad, data.localidadId, 'Localidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateEdificio = async (id: EntityId, data: UpdateEdificioData, context: AuthorizationContext): Promise<Edificio | null> => {
  const scope = buildingWhere<Edificio>(context, AccionPermiso.EDITAR);
  const em = getEntityManager();
  const entity = await em.findOne(Edificio, { $and: [{ id: parseId(id) }, scope] });
  if (!entity) return null;
  if (data.cuit !== undefined) entity.cuit = data.cuit;
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  if (data.direccion !== undefined) entity.direccion = data.direccion;
  if (data.localidadId !== undefined) entity.localidad = await requireEntity(em, Localidad, data.localidadId, 'Localidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteEdificio = async (id: EntityId, context: AuthorizationContext): Promise<Edificio | null> => {
  const scope = buildingWhere<Edificio>(context, AccionPermiso.BORRAR);
  const em = getEntityManager();
  const entity = await em.findOne(Edificio, { $and: [{ id: parseId(id) }, scope] }, { filters: { softDelete: false } });
  if (!entity) return null;
  entity.deletedAt = entity.deletedAt ?? new Date();
  await em.persistAndFlush(entity);
  return entity;
};

