import { EntityManager, FilterQuery, LoadStrategy, LockMode } from '@mikro-orm/core';
import { AmbitoRol } from '../entities/AmbitoRol';
import { Edificio } from '../entities/Edificio';
import { Notificacion, PrioridadNotificacion } from '../entities/Notificacion';
import { CodigoRol } from '../entities/Permiso';
import { Rol } from '../entities/Rol';
import { AuthorizationError } from '../errors/authorization.error';
import { DomainValidationError } from '../errors/domain-validation.error';
import { AuthorizationContext } from './authorization/authorization.service';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateNotificacionData {
  titulo: string;
  descripcion: string;
  muestraDesde?: Date;
  muestraHasta: Date;
  prioridad: PrioridadNotificacion;
  edificioId: EntityId;
  rolIds: EntityId[];
}

export type UpdateNotificacionData = Partial<CreateNotificacionData>;

const requireAdministrativeBuildings = (context: AuthorizationContext, edificioId?: number): number[] => {
  const ids = [...new Set(context.grants
    .filter(grant => grant.ambito === AmbitoRol.ADMINISTRACION && grant.rolCodigo === CodigoRol.ADMINISTRATIVO)
    .flatMap(grant => grant.edificioIds))];
  if (ids.length === 0 || (edificioId !== undefined && !ids.includes(edificioId))) {
    throw new AuthorizationError('Se requiere un rol administrativo vigente para gestionar notificaciones del edificio.');
  }
  return ids;
};

const validateWindow = (desde: Date, hasta: Date): void => {
  if (!(desde instanceof Date) || !(hasta instanceof Date) || !(desde < hasta)) {
    throw new DomainValidationError('muestraHasta debe ser posterior a muestraDesde.');
  }
};

const loadRoles = async (em: EntityManager, rolIds: EntityId[]): Promise<Rol[]> => {
  const ids = rolIds.map(parseId);
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new DomainValidationError('Indique al menos un rol y evite repetir IDs.');
  }
  const roles = await em.find(Rol, { id: { $in: ids } });
  if (roles.length !== ids.length) throw new DomainValidationError('Uno o más roles no existen.');
  return roles;
};

const toResponse = (notificacion: Notificacion) => ({
  id: notificacion.id,
  titulo: notificacion.titulo,
  descripcion: notificacion.descripcion,
  muestraDesde: notificacion.muestraDesde,
  muestraHasta: notificacion.muestraHasta,
  prioridad: notificacion.prioridad,
  edificioId: notificacion.edificio.id,
  rolIds: notificacion.roles.getIdentifiers(),
});

export const getAllNotificaciones = async (
  context: AuthorizationContext, filters: { edificioId?: EntityId; gestion?: boolean },
) => {
  const edificioId = filters.edificioId === undefined ? undefined : parseId(filters.edificioId);
  const where: FilterQuery<Notificacion> = {
    edificio: edificioId === undefined ? { deletedAt: null } : { deletedAt: null, id: edificioId },
  };

  if (filters.gestion) {
    const ids = requireAdministrativeBuildings(context, edificioId);
    where.edificio = { deletedAt: null, id: { $in: edificioId === undefined ? ids : [edificioId] } };
  } else {
    const audience: FilterQuery<Notificacion>[] = [];
    for (const grant of context.grants) {
      const roles = { $some: { id: grant.rolId } };
      if (grant.ambito === AmbitoRol.GLOBAL) {
        audience.push({ roles });
      } else if (grant.edificioIds.length > 0) {
        audience.push({ edificio: { $in: grant.edificioIds }, roles });
      }
    }
    if (audience.length === 0) return [];
    where.$or = audience;
    where.muestraDesde = { $lte: context.now };
    where.muestraHasta = { $gt: context.now };
  }

  const items = await getEntityManager().find(Notificacion, where, {
    populate: ['roles'],
    strategy: LoadStrategy.SELECT_IN,
    orderBy: { muestraDesde: 'DESC', id: 'DESC' },
  });
  return items.map(toResponse);
};

export const createNotificacion = async (data: CreateNotificacionData, context: AuthorizationContext) => {
  const edificioId = parseId(data.edificioId);
  requireAdministrativeBuildings(context, edificioId);
  const muestraDesde = data.muestraDesde ?? context.now;
  validateWindow(muestraDesde, data.muestraHasta);

  const em = getEntityManager();
  const notificacion = new Notificacion();
  notificacion.edificio = await requireEntity(em, Edificio, edificioId, 'Edificio');
  notificacion.roles.set(await loadRoles(em, data.rolIds));
  notificacion.titulo = data.titulo;
  notificacion.descripcion = data.descripcion;
  notificacion.muestraDesde = muestraDesde;
  notificacion.muestraHasta = data.muestraHasta;
  notificacion.prioridad = data.prioridad;
  await em.persistAndFlush(notificacion);
  return toResponse(notificacion);
};

export const updateNotificacion = async (id: EntityId, data: UpdateNotificacionData, context: AuthorizationContext) => {
  const ids = requireAdministrativeBuildings(context);
  return getEntityManager().transactional(async em => {
    const notificacion = await em.findOne(Notificacion, {
      id: parseId(id), edificio: { id: { $in: ids }, deletedAt: null },
    }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!notificacion) return null;

    const muestraDesde = data.muestraDesde ?? notificacion.muestraDesde;
    const muestraHasta = data.muestraHasta ?? notificacion.muestraHasta;
    validateWindow(muestraDesde, muestraHasta);

    let edificio = notificacion.edificio;
    if (data.edificioId !== undefined) {
      const edificioId = parseId(data.edificioId);
      requireAdministrativeBuildings(context, edificioId);
      edificio = await requireEntity(em, Edificio, edificioId, 'Edificio');
    }
    const roles = data.rolIds === undefined ? undefined : await loadRoles(em, data.rolIds);
    await notificacion.roles.init();
    if (roles !== undefined) notificacion.roles.set(roles);
    notificacion.edificio = edificio;
    notificacion.titulo = data.titulo ?? notificacion.titulo;
    notificacion.descripcion = data.descripcion ?? notificacion.descripcion;
    notificacion.muestraDesde = muestraDesde;
    notificacion.muestraHasta = muestraHasta;
    notificacion.prioridad = data.prioridad ?? notificacion.prioridad;
    await em.flush();
    return toResponse(notificacion);
  });
};

export const deleteNotificacion = async (id: EntityId, context: AuthorizationContext): Promise<boolean> => {
  const ids = requireAdministrativeBuildings(context);
  return getEntityManager().transactional(async em => {
    const notificacion = await em.findOne(Notificacion, {
      id: parseId(id), edificio: { id: { $in: ids }, deletedAt: null },
    }, { lockMode: LockMode.PESSIMISTIC_WRITE });
    if (!notificacion) return false;
    await em.removeAndFlush(notificacion);
    return true;
  });
};
