import { EntityManager, FilterQuery, IsolationLevel, LoadStrategy, LockMode } from '@mikro-orm/core';
import { Reservacion } from '../entities/Reservacion';
import { User } from '../entities/User';
import { AreaComun } from '../entities/AreaComun';
import { Propiedad } from '../entities/Propiedad';
import { AmbitoRol } from '../entities/AmbitoRol';
import { EstadoReservacion } from '../entities/EstadoReservacion';
import { AccionPermiso, SeccionPermiso } from '../entities/Permiso';
import { DomainValidationError } from '../errors/domain-validation.error';
import { AuthorizationError } from '../errors/authorization.error';
import { ConflictError } from '../errors/conflict.error';
import { AuthorizationContext, hasPermission, matchingGrants } from './authorization.service';
import { requireBusinessAuthorization, selectOriginProperty } from './business-authorization.helper';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateReservacionData {
  fechaReservacion: Date;
  descripcion: string;
  areaComunId: EntityId;
  propiedadId?: EntityId;
}
export type UpdateReservacionData = Partial<Omit<CreateReservacionData, 'propiedadId'>> & { estado?: EstadoReservacion.CANCELADO };
export interface ReservaOcupacion {
  id: number;
  fechaReservacion: Date;
  estado: EstadoReservacion;
  areaComunId: number;
}
export type ReservacionVisible = Reservacion | ReservaOcupacion;

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
});
export const diaReservacion = (date: Date): string => {
  const parts = dayFormatter.formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return part('year') + '-' + part('month') + '-' + part('day');
};

const lockAreaComun = async (em: EntityManager, id: EntityId): Promise<AreaComun> => {
  // Se bloquea una fila que existe incluso cuando todavía no hay reservas.
  // Todas las altas y reprogramaciones del área esperan hasta el commit.
  const area = await em.findOne(AreaComun, { id: parseId(id) }, {
    lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true,
  });
  if (!area) throw new DomainValidationError('AreaComun no encontrado/a');
  return area;
};

const requireAvailableDay = async (
  em: EntityManager, areaComunId: number, fecha: Date, excludeId?: number,
): Promise<void> => {
  // La reserva ocupa todo el día civil de Buenos Aires (UTC-03:00).
  const start = new Date(`${diaReservacion(fecha)}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const occupied = await em.findOne(Reservacion, {
    areaComun: areaComunId,
    estado: EstadoReservacion.RESERVADO,
    deletedAt: null,
    fechaReservacion: { $gte: start, $lt: end },
    ...(excludeId === undefined ? {} : { id: { $ne: excludeId } }),
  });
  if (occupied) throw new ConflictError('El área común ya está reservada para ese día. Elegí otra fecha o espacio.');
};

const finalizarSiVencida = async (em: EntityManager, entity: Reservacion, now: Date): Promise<void> => {
  if (entity.estado === EstadoReservacion.RESERVADO && diaReservacion(entity.fechaReservacion) < diaReservacion(now)) {
    entity.estado = EstadoReservacion.FINALIZADO;
    entity.updatedAt = now;
    await em.persistAndFlush(entity);
  }
};

// El filtro se aplica en SQL, también en búsquedas por ID.
const reservationScope = (context: AuthorizationContext, action: AccionPermiso): FilterQuery<Reservacion> => {
  requireBusinessAuthorization(context);
  const grants = matchingGrants(context, SeccionPermiso.RESERVAS, action);
  if (!grants.length) throw new AuthorizationError('No tiene permiso para esta operación sobre reservas.');
  if (grants.some(grant => grant.ambito === AmbitoRol.GLOBAL)) return { deletedAt: null };
  const clauses: FilterQuery<Reservacion>[] = [];
  for (const grant of grants) {
    if (!grant.edificioIds.length) continue;
    const building = { areaComun: { edificio: { $in: grant.edificioIds } } };
    if (grant.ambito === AmbitoRol.ADMINISTRACION) clauses.push(building);
    if (grant.ambito === AmbitoRol.PROPIEDAD && grant.propiedadId !== undefined) {
      clauses.push({ ...building, usuario: context.usuarioId, propiedadOrigen: grant.propiedadId });
    }
  }
  if (!clauses.length) throw new AuthorizationError('No tiene un ámbito vigente para esta operación.');
  return { deletedAt: null, $or: clauses };
};

const occupiedSlot = (entity: Reservacion): ReservaOcupacion => ({
  id: entity.id, fechaReservacion: entity.fechaReservacion, estado: entity.estado, areaComunId: entity.areaComun.id,
});

const visibleReservation = (entity: Reservacion, context: AuthorizationContext): ReservacionVisible => {
  const target = { edificioId: entity.areaComun.edificio.id };
  const canManage = matchingGrants(context, SeccionPermiso.RESERVAS, AccionPermiso.EDITAR, target)
    .some(grant => grant.ambito === AmbitoRol.GLOBAL || grant.ambito === AmbitoRol.ADMINISTRACION);
  const owns = entity.usuario.id === context.usuarioId && entity.propiedadOrigen !== null
    && hasPermission(context, SeccionPermiso.RESERVAS, AccionPermiso.LEER, { ...target, propiedadId: entity.propiedadOrigen.id }, AmbitoRol.PROPIEDAD);
  const globalRead = matchingGrants(context, SeccionPermiso.RESERVAS, AccionPermiso.LEER, target)
    .some(grant => grant.ambito === AmbitoRol.GLOBAL);
  return canManage || owns || globalRead ? entity : occupiedSlot(entity);
};

export const getAllReservaciones = async (context: AuthorizationContext): Promise<ReservacionVisible[]> => {
  const em = getEntityManager();
  const entities = await em.find(Reservacion, reservationScope(context, AccionPermiso.LEER), {
    populate: ['usuario', 'areaComun.edificio', 'propiedadOrigen'],
  });
  for (const entity of entities) await finalizarSiVencida(em, entity, context.now);
  return entities.map(entity => visibleReservation(entity, context));
};

export const getReservacionById = async (id: EntityId, context: AuthorizationContext): Promise<ReservacionVisible | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Reservacion, { $and: [{ id: parseId(id) }, reservationScope(context, AccionPermiso.LEER)] }, {
    populate: ['usuario', 'areaComun.edificio', 'propiedadOrigen'],
  });
  if (!entity) return null;
  await finalizarSiVencida(em, entity, context.now);
  return visibleReservation(entity, context);
};

export const getDisponibilidadReservaciones = async (areaComunId: EntityId, context: AuthorizationContext): Promise<ReservaOcupacion[]> => {
  requireBusinessAuthorization(context);
  const em = getEntityManager();
  const area = await requireEntity(em, AreaComun, areaComunId, 'AreaComun');
  if (!hasPermission(context, SeccionPermiso.RESERVAS, AccionPermiso.DISPONIBILIDAD, { edificioId: area.edificio.id })) {
    throw new AuthorizationError('No tiene permiso para consultar disponibilidad en este edificio.');
  }
  const entities = await em.find(Reservacion, { areaComun: area.id, deletedAt: null, estado: { $ne: EstadoReservacion.CANCELADO } }, {
    populate: ['areaComun'],
  });
  for (const entity of entities) await finalizarSiVencida(em, entity, context.now);
  return entities.map(occupiedSlot);
};

export const createReservacion = async (data: CreateReservacionData, context: AuthorizationContext): Promise<Reservacion> => {
  requireBusinessAuthorization(context);
  if ('usuarioId' in data) throw new DomainValidationError('El usuario de la reserva se toma de la sesión autenticada.');
  if ('estado' in data) throw new DomainValidationError('La reserva comienza automáticamente en Reservado.');
  // READ COMMITTED permite ver el último commit después de esperar el área.
  return getEntityManager().transactional(async em => {
    const area = await lockAreaComun(em, data.areaComunId);
    if (!hasPermission(context, SeccionPermiso.RESERVAS, AccionPermiso.CREAR, { edificioId: area.edificio.id })) {
      throw new AuthorizationError('No tiene permiso para reservar en este edificio.');
    }
    if (diaReservacion(data.fechaReservacion) < diaReservacion(context.now)) {
      throw new DomainValidationError('No se puede reservar un día que ya terminó.');
    }
    const globalCreate = matchingGrants(context, SeccionPermiso.RESERVAS, AccionPermiso.CREAR, { edificioId: area.edificio.id })
      .some(grant => grant.ambito === AmbitoRol.GLOBAL || grant.ambito === AmbitoRol.ADMINISTRACION);
    const origin = data.propiedadId !== undefined || !globalCreate
      ? selectOriginProperty(context, SeccionPermiso.RESERVAS, area.edificio.id, data.propiedadId) : null;
    await requireAvailableDay(em, area.id, data.fechaReservacion);
    const entity = new Reservacion();
    entity.fechaReservacion = data.fechaReservacion;
    entity.descripcion = data.descripcion;
    entity.usuario = await requireEntity(em, User, context.usuarioId, 'User');
    entity.areaComun = area;
    entity.propiedadOrigen = origin === null ? null : em.getReference(Propiedad, origin);
    await em.persistAndFlush(entity);
    return entity;
  }, { isolationLevel: IsolationLevel.READ_COMMITTED });
};

export const updateReservacion = async (id: EntityId, data: UpdateReservacionData, context: AuthorizationContext): Promise<Reservacion | null> => {
  requireBusinessAuthorization(context);
  if ('usuarioId' in data || 'propiedadId' in data) throw new DomainValidationError('No se puede cambiar el usuario ni la propiedad de origen de la reserva.');
  return getEntityManager().transactional(async em => {
    const entity = await em.findOne(Reservacion, { $and: [{ id: parseId(id) }, reservationScope(context, AccionPermiso.EDITAR)] }, {
      populate: ['usuario', 'areaComun.edificio', 'propiedadOrigen'],
      lockMode: LockMode.PESSIMISTIC_WRITE, refresh: true, strategy: LoadStrategy.SELECT_IN,
    });
    if (!entity) return null;
    await finalizarSiVencida(em, entity, context.now);
    if (entity.estado !== EstadoReservacion.RESERVADO) {
      throw new DomainValidationError('Solo se puede modificar o cancelar una reserva en estado Reservado.');
    }
    if (data.estado !== undefined && data.estado !== EstadoReservacion.CANCELADO) {
      throw new DomainValidationError('El único cambio manual de estado permitido es Cancelado.');
    }
    if (data.fechaReservacion !== undefined && diaReservacion(data.fechaReservacion) < diaReservacion(context.now)) {
      throw new DomainValidationError('No se puede reservar un día que ya terminó.');
    }
    let area: AreaComun | undefined;
    if (data.areaComunId !== undefined) {
      area = await requireEntity(em, AreaComun, data.areaComunId, 'AreaComun');
      if (entity.propiedadOrigen !== null && area.edificio.id !== entity.areaComun.edificio.id) {
        throw new DomainValidationError('Una reserva con propiedad de origen solo puede cambiar de área dentro del mismo edificio.');
      }
      const target = { edificioId: area.edificio.id };
      const management = matchingGrants(context, SeccionPermiso.RESERVAS, AccionPermiso.EDITAR, target)
        .some(grant => grant.ambito === AmbitoRol.GLOBAL || grant.ambito === AmbitoRol.ADMINISTRACION);
      const ownContext = entity.usuario.id === context.usuarioId && entity.propiedadOrigen !== null
        && hasPermission(context, SeccionPermiso.RESERVAS, AccionPermiso.EDITAR, { ...target, propiedadId: entity.propiedadOrigen.id });
      if (!management && !ownContext) throw new AuthorizationError('No puede mover la reserva a este edificio.');
    }
    if (data.estado !== EstadoReservacion.CANCELADO) {
      const targetArea = await lockAreaComun(em, area?.id ?? entity.areaComun.id);
      await requireAvailableDay(em, targetArea.id, data.fechaReservacion ?? entity.fechaReservacion, entity.id);
    }
    if (data.fechaReservacion !== undefined) entity.fechaReservacion = data.fechaReservacion;
    if (data.estado !== undefined) entity.estado = data.estado;
    if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
    if (area !== undefined) entity.areaComun = area;
    entity.updatedAt = context.now;
    await em.persistAndFlush(entity);
    return entity;
  }, { isolationLevel: IsolationLevel.READ_COMMITTED });
};

export const deleteReservacion = async (id: EntityId, context: AuthorizationContext): Promise<Reservacion | null> => {
  requireBusinessAuthorization(context);
  const em = getEntityManager();
  const entity = await em.findOne(Reservacion, { $and: [{ id: parseId(id) }, reservationScope(context, AccionPermiso.BORRAR)] });
  if (!entity) return null;
  entity.deletedAt = context.now;
  entity.updatedAt = context.now;
  await em.persistAndFlush(entity);
  return entity;
};
