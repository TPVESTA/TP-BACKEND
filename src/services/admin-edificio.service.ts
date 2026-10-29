import { AdminEdificio } from '../entities/AdminEdificio';
import { Administracion } from '../entities/Administracion';
import { Edificio } from '../entities/Edificio';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';
import { AuthorizationContext } from './authorization.service';
import { AccionPermiso } from '../entities/Permiso';
import { administrationBuildingWhere, requireGlobalStructure } from './structure-authorization.helper';

export interface CreateAdminEdificioData {
  beginAt?: Date;
  endAt?: Date | null;
  administracionId: EntityId;
  edificioId: EntityId;
}

export type UpdateAdminEdificioData = Partial<CreateAdminEdificioData>;

export const getAllAdminEdificios = async (context: AuthorizationContext): Promise<AdminEdificio[]> => {
  const em = getEntityManager();
  return em.find(AdminEdificio, administrationBuildingWhere<AdminEdificio>(context), { populate: ['administracion', 'edificio.localidad'] });
};

export const getAdminEdificioById = async (id: EntityId, context: AuthorizationContext): Promise<AdminEdificio | null> => {
  const em = getEntityManager();
  return em.findOne(AdminEdificio, { $and: [{ id: parseId(id) }, administrationBuildingWhere<AdminEdificio>(context)] }, { populate: ['administracion', 'edificio.localidad'] });
};

export const createAdminEdificio = async (data: CreateAdminEdificioData, context: AuthorizationContext): Promise<AdminEdificio> => {
  requireGlobalStructure(context, AccionPermiso.CREAR);
  const em = getEntityManager();
  const entity = new AdminEdificio();
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  entity.administracion = await requireEntity(em, Administracion, data.administracionId, 'Administracion');
  entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateAdminEdificio = async (id: EntityId, data: UpdateAdminEdificioData, context: AuthorizationContext): Promise<AdminEdificio | null> => {
  requireGlobalStructure(context, AccionPermiso.EDITAR);
  const em = getEntityManager();
  const entity = await em.findOne(AdminEdificio, { id: parseId(id) });
  if (!entity) return null;
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  if (data.administracionId !== undefined) entity.administracion = await requireEntity(em, Administracion, data.administracionId, 'Administracion');
  if (data.edificioId !== undefined) entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteAdminEdificio = async (id: EntityId, context: AuthorizationContext): Promise<AdminEdificio | null> => {
  requireGlobalStructure(context, AccionPermiso.BORRAR);
  const em = getEntityManager();
  const entity = await em.findOne(AdminEdificio, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};
