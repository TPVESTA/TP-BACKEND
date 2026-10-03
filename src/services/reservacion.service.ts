import { Reservacion } from '../entities/Reservacion';
import { User } from '../entities/User';
import { AreaComun } from '../entities/AreaComun';
import { EstadoReservacion } from '../entities/EstadoReservacion';
import { DomainValidationError } from '../errors/domain-validation.error';
import { AuthorizationError } from '../errors/authorization.error';
import { EntityManager } from '@mikro-orm/core';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateReservacionData {
  fechaReservacion: Date;
  descripcion: string;
  usuarioId: EntityId;
  areaComunId: EntityId;
}

export type UpdateReservacionData = Partial<Omit<CreateReservacionData, 'usuarioId'>> & { estado?: EstadoReservacion.CANCELADO };

// Comparar días locales evita finalizar una reserva al llegar la medianoche UTC.
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const diaReservacion = (date: Date): string => {
  const parts = dayFormatter.formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const finalizarSiVencida = async (em: EntityManager, entity: Reservacion, now = new Date()): Promise<void> => {
  if (entity.estado === EstadoReservacion.RESERVADO && diaReservacion(entity.fechaReservacion) < diaReservacion(now)) {
    entity.estado = EstadoReservacion.FINALIZADO;
    entity.updatedAt = now;
    await em.persistAndFlush(entity);
  }
};

export const getAllReservaciones = async (): Promise<Reservacion[]> => {
  const em = getEntityManager();
  const entities = await em.find(Reservacion, {});
  for (const entity of entities) await finalizarSiVencida(em, entity);
  return entities;
};

export const getReservacionById = async (id: EntityId): Promise<Reservacion | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Reservacion, { id: parseId(id) });
  if (entity) await finalizarSiVencida(em, entity);
  return entity;
};

export const createReservacion = async (data: CreateReservacionData): Promise<Reservacion> => {
  if ('estado' in data) throw new DomainValidationError('La reserva comienza automáticamente en Reservado.');
  const em = getEntityManager();
  const entity = new Reservacion();
  entity.fechaReservacion = data.fechaReservacion;
  entity.descripcion = data.descripcion;
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'User');
  entity.areaComun = await requireEntity(em, AreaComun, data.areaComunId, 'AreaComun');
  if (diaReservacion(entity.fechaReservacion) < diaReservacion(new Date())) {
    throw new DomainValidationError('No se puede reservar un día que ya terminó.');
  }
  await em.persistAndFlush(entity);
  return entity;
};

export const updateReservacion = async (id: EntityId, data: UpdateReservacionData, actorId?: EntityId): Promise<Reservacion | null> => {
  if ('usuarioId' in data) throw new DomainValidationError('No se puede cambiar el usuario de la reserva.');
  const em = getEntityManager();
  const entity = await em.findOne(Reservacion, { id: parseId(id) });
  if (!entity) return null;
  if (actorId !== undefined && entity.usuario.id !== parseId(actorId)) {
    throw new AuthorizationError('Solo el usuario que realizó la reserva puede modificarla o cancelarla.');
  }
  await finalizarSiVencida(em, entity);
  if (entity.estado !== EstadoReservacion.RESERVADO) {
    throw new DomainValidationError('Solo se puede modificar o cancelar una reserva en estado Reservado.');
  }
  if (data.estado !== undefined) {
    if (actorId === undefined) throw new AuthorizationError('Se requiere el usuario autenticado para cancelar.');
    if (data.estado !== EstadoReservacion.CANCELADO) {
      throw new DomainValidationError('El único cambio manual de estado permitido es Cancelado.');
    }
  }
  if (data.fechaReservacion !== undefined && diaReservacion(data.fechaReservacion) < diaReservacion(new Date())) {
    throw new DomainValidationError('No se puede reservar un día que ya terminó.');
  }
  if (data.fechaReservacion !== undefined) entity.fechaReservacion = data.fechaReservacion;
  if (data.estado !== undefined) entity.estado = data.estado;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.areaComunId !== undefined) entity.areaComun = await requireEntity(em, AreaComun, data.areaComunId, 'AreaComun');
  entity.updatedAt = new Date();
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteReservacion = async (id: EntityId): Promise<Reservacion | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Reservacion, { id: parseId(id) });
  if (!entity) return null;
  await em.removeAndFlush(entity);
  return entity;
};
