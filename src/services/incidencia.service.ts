import { Incidencia } from '../entities/Incidencia';
import { User } from '../entities/User';
import { Unidad } from '../entities/Unidad';
import { EstadoIncidencia } from '../entities/EstadoIncidencia';
import { Empleado } from '../entities/Empleado';
import { AmbitoRol } from '../entities/AmbitoRol';
import { AuthorizationError } from '../errors/authorization.error';
import { DomainValidationError } from '../errors/domain-validation.error';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateIncidenciaData {
  descripcion: string;
  usuarioId: EntityId;
  unidadId: EntityId;
}

export type UpdateIncidenciaData = Partial<CreateIncidenciaData> & { estado?: EstadoIncidencia };

export const getAllIncidencias = async (): Promise<Incidencia[]> => {
  const em = getEntityManager();
  return em.find(Incidencia, {});
};

export const getIncidenciaById = async (id: EntityId): Promise<Incidencia | null> => {
  const em = getEntityManager();
  return em.findOne(Incidencia, { id: parseId(id) });
};

export const createIncidencia = async (data: CreateIncidenciaData): Promise<Incidencia> => {
  if ('estado' in data || 'closedAt' in data) {
    throw new DomainValidationError('El estado inicial y la fecha de cierre se establecen automáticamente.');
  }
  const em = getEntityManager();
  const entity = new Incidencia();
  entity.descripcion = data.descripcion;
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  entity.unidad = await requireEntity<Unidad>(em, 'Unidad', data.unidadId, 'Unidad');
  await em.persistAndFlush(entity);
  return entity;
};

export const updateIncidencia = async (id: EntityId, data: UpdateIncidenciaData, actorId?: EntityId): Promise<Incidencia | null> => {
  if ('closedAt' in data) {
    throw new DomainValidationError('La fecha de cierre se establece automáticamente al finalizar.');
  }
  const em = getEntityManager();
  const entity = await em.findOne(Incidencia, { id: parseId(id) });
  if (!entity) return null;
  if (data.estado !== undefined) {
    if (actorId === undefined) {
      throw new AuthorizationError('Solo un empleado con rol vigente puede modificar el estado.');
    }
    const now = new Date();
    const empleado = await em.findOne(Empleado, {
      usuario: parseId(actorId),
      rol: { nombre: 'empleado', ambito: AmbitoRol.ADMINISTRACION },
      beginAt: { $lte: now },
      $or: [{ endAt: null }, { endAt: { $gt: now } }],
    });
    if (!empleado) {
      throw new AuthorizationError('Solo un empleado con rol vigente puede modificar el estado.');
    }
    const siguiente = entity.estado === EstadoIncidencia.REPORTADO
      ? EstadoIncidencia.EN_REVISION
      : entity.estado === EstadoIncidencia.EN_REVISION ? EstadoIncidencia.FINALIZADO : undefined;
    if (data.estado !== siguiente) {
      throw new DomainValidationError('La secuencia permitida es Reportado → En revisión → Finalizado.');
    }
    entity.estado = data.estado;
    if (data.estado === EstadoIncidencia.FINALIZADO) entity.closedAt = now;
  }
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.usuarioId !== undefined) entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  if (data.unidadId !== undefined) entity.unidad = await requireEntity<Unidad>(em, 'Unidad', data.unidadId, 'Unidad');
  entity.updatedAt = new Date();
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteIncidencia = async (id: EntityId): Promise<Incidencia | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Incidencia, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};
