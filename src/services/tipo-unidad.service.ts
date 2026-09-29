import { TipoUnidad } from '../entities/TipoUnidad';
import { AmbitoUnidad } from '../entities/AmbitoUnidad';
import { Propiedad } from '../entities/Propiedad';
import { AreaComun } from '../entities/AreaComun';
import { DomainValidationError } from '../errors/domain-validation.error';
import { EntityId, getEntityManager, parseId } from './service.helper';

export interface CreateTipoUnidadData {
  nombre: string;
  ambito: AmbitoUnidad;
}

export type UpdateTipoUnidadData = Partial<CreateTipoUnidadData>;

export const getAllTiposUnidad = async (): Promise<TipoUnidad[]> => {
  const em = getEntityManager();
  return em.find(TipoUnidad, {});
};

export const getTipoUnidadById = async (id: EntityId): Promise<TipoUnidad | null> => {
  const em = getEntityManager();
  return em.findOne(TipoUnidad, { id: parseId(id) });
};

export const createTipoUnidad = async (data: CreateTipoUnidadData): Promise<TipoUnidad> => {
  const em = getEntityManager();
  const entity = new TipoUnidad();
  entity.nombre = data.nombre;
  entity.ambito = data.ambito;
  await em.persistAndFlush(entity);
  return entity;
};

export const updateTipoUnidad = async (id: EntityId, data: UpdateTipoUnidadData): Promise<TipoUnidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(TipoUnidad, { id: parseId(id) });
  if (!entity) return null;
  if (data.ambito !== undefined && data.ambito !== entity.ambito) {
    const incompatible = data.ambito === AmbitoUnidad.PRIVADO ? AreaComun : Propiedad;
    const count = await em.count(incompatible, { tipoUnidad: entity.id });
    if (count > 0) {
      throw new DomainValidationError('El ámbito elegido es incompatible con unidades que ya utilizan este tipo. Reasigne esas unidades antes de cambiarlo.');
    }
    entity.ambito = data.ambito;
  }
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteTipoUnidad = async (id: EntityId): Promise<TipoUnidad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(TipoUnidad, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};
