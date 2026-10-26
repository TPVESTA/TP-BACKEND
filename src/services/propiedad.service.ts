import { AuthorizationContext } from './authorization.service';
import { AccionPermiso } from '../entities/Permiso';
import { propertyWhere, requireBuildingMutation } from './structure-authorization.helper';
import { AmbitoUnidad } from '../entities/AmbitoUnidad';
import { requireAmbitoUnidad } from './ambito-unidad.helper';
import { Propiedad } from '../entities/Propiedad';
import { Edificio } from '../entities/Edificio';
import { TipoUnidad } from '../entities/TipoUnidad';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreatePropiedadData {
  nroUnidad: string;
  mtCuadrados: number;
  descripcion: string;
  copropiedad: number;
  habitaciones: number;
  edificioId: EntityId;
  tipoUnidadId: EntityId;
}

export type UpdatePropiedadData = Partial<CreatePropiedadData>;

export const getAllPropiedades = async (context: AuthorizationContext): Promise<Propiedad[]> => {
  const scope = propertyWhere<Propiedad>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.find(Propiedad, scope);
};

export const getPropiedadById = async (id: EntityId, context: AuthorizationContext): Promise<Propiedad | null> => {
  const scope = propertyWhere<Propiedad>(context, AccionPermiso.LEER);
  const em = getEntityManager();
  return em.findOne(Propiedad, { $and: [{ id: parseId(id) }, scope] });
};

export const createPropiedad = async (data: CreatePropiedadData, context: AuthorizationContext): Promise<Propiedad> => {
  requireBuildingMutation(context, AccionPermiso.CREAR, parseId(data.edificioId));
  const em = getEntityManager();
  const entity = new Propiedad();
  entity.nroUnidad = data.nroUnidad;
  entity.mtCuadrados = data.mtCuadrados;
  entity.descripcion = data.descripcion;
  entity.copropiedad = data.copropiedad;
  entity.habitaciones = data.habitaciones;
  entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  entity.tipoUnidad = await requireEntity(em, TipoUnidad, data.tipoUnidadId, 'TipoUnidad');
  requireAmbitoUnidad(entity.tipoUnidad, AmbitoUnidad.PRIVADO);
  await em.persistAndFlush(entity);
  return entity;
};

export const updatePropiedad = async (id: EntityId, data: UpdatePropiedadData, context: AuthorizationContext): Promise<Propiedad | null> => {
  const scope = propertyWhere<Propiedad>(context, AccionPermiso.EDITAR);
  const em = getEntityManager();
  const entity = await em.findOne(Propiedad, { $and: [{ id: parseId(id) }, scope] });
  if (!entity) return null;
  if (data.edificioId !== undefined) requireBuildingMutation(context, AccionPermiso.EDITAR, parseId(data.edificioId));
  if (data.nroUnidad !== undefined) entity.nroUnidad = data.nroUnidad;
  if (data.mtCuadrados !== undefined) entity.mtCuadrados = data.mtCuadrados;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.copropiedad !== undefined) entity.copropiedad = data.copropiedad;
  if (data.habitaciones !== undefined) entity.habitaciones = data.habitaciones;
  if (data.edificioId !== undefined) entity.edificio = await requireEntity(em, Edificio, data.edificioId, 'Edificio');
  if (data.tipoUnidadId !== undefined) {
    entity.tipoUnidad = await requireEntity(em, TipoUnidad, data.tipoUnidadId, 'TipoUnidad');
    requireAmbitoUnidad(entity.tipoUnidad, AmbitoUnidad.PRIVADO);
  }
  await em.persistAndFlush(entity);
  return entity;
};

export const deletePropiedad = async (id: EntityId, context: AuthorizationContext): Promise<Propiedad | null> => {
  const scope = propertyWhere<Propiedad>(context, AccionPermiso.BORRAR);
  const em = getEntityManager();
  const entity = await em.findOne(Propiedad, { $and: [{ id: parseId(id) }, scope] });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

