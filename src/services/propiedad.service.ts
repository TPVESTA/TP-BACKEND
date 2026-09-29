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

export const getAllPropiedades = async (): Promise<Propiedad[]> => {
  const em = getEntityManager();
  return em.find(Propiedad, {});
};

export const getPropiedadById = async (id: EntityId): Promise<Propiedad | null> => {
  const em = getEntityManager();
  return em.findOne(Propiedad, { id: parseId(id) });
};

export const createPropiedad = async (data: CreatePropiedadData): Promise<Propiedad> => {
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

export const updatePropiedad = async (id: EntityId, data: UpdatePropiedadData): Promise<Propiedad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Propiedad, { id: parseId(id) });
  if (!entity) return null;
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

export const deletePropiedad = async (id: EntityId): Promise<Propiedad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Propiedad, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

