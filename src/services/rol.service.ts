import { DomainValidationError } from '../errors/domain-validation.error';
import { Rol } from '../entities/Rol';
import { AmbitoRol } from '../entities/AmbitoRol';
import { EntityId, getEntityManager, parseId } from './service.helper';

export interface CreateRolData {
  nombre: string;
  descripcion: string;
  ambito: AmbitoRol;
}

export type UpdateRolData = Partial<CreateRolData>;

export const getAllRoles = async (): Promise<Rol[]> => {
  const em = getEntityManager();
  return em.find(Rol, {});
};

export const getRolById = async (id: EntityId): Promise<Rol | null> => {
  const em = getEntityManager();
  return em.findOne(Rol, { id: parseId(id) });
};

export const createRol = async (data: CreateRolData): Promise<Rol> => {
  const em = getEntityManager();
  const entity = new Rol();
  entity.nombre = data.nombre;
  entity.descripcion = data.descripcion;
  entity.ambito = data.ambito;
  await em.persistAndFlush(entity);
  return entity;
};

export const updateRol = async (id: EntityId, data: UpdateRolData): Promise<Rol | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Rol, { id: parseId(id) });
  if (!entity) return null;
  if (data.ambito !== undefined && data.ambito !== entity.ambito) {
    throw new DomainValidationError('El ambito de un rol existente no se puede cambiar; cree otro rol.');
  }
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.ambito !== undefined) entity.ambito = data.ambito;
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteRol = async (id: EntityId): Promise<Rol | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Rol, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};

