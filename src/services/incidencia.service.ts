import { FilterQuery } from '@mikro-orm/core';
import { Incidencia } from '../entities/Incidencia';
import { User } from '../entities/User';
import { Unidad } from '../entities/Unidad';
import { Propiedad } from '../entities/Propiedad';
import { AmbitoRol } from '../entities/AmbitoRol';
import { EstadoIncidencia } from '../entities/EstadoIncidencia';
import { AccionPermiso, SeccionPermiso } from '../entities/Permiso';
import { AuthorizationError } from '../errors/authorization.error';
import { DomainValidationError } from '../errors/domain-validation.error';
import { AuthorizationContext, matchingGrants } from './authorization.service';
import { requireBusinessAuthorization, selectOriginProperty } from './business-authorization.helper';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';

export interface CreateIncidenciaData {
  descripcion: string;
  unidadId: EntityId;
  propiedadId?: EntityId;
}
export interface UpdateIncidenciaData {
  descripcion?: string;
  estado?: EstadoIncidencia;
}

const incidenceScope = (context: AuthorizationContext, action: AccionPermiso): FilterQuery<Incidencia> => {
  requireBusinessAuthorization(context);
  const grants = matchingGrants(context, SeccionPermiso.INCIDENCIAS, action);
  if (!grants.length) throw new AuthorizationError('No tiene permiso para esta operación sobre incidencias.');
  if (grants.some(grant => grant.ambito === AmbitoRol.GLOBAL)) return {};
  const clauses: FilterQuery<Incidencia>[] = [];
  for (const grant of grants) {
    if (!grant.edificioIds.length) continue;
    const building = { unidad: { edificio: { $in: grant.edificioIds } } };
    if (grant.ambito === AmbitoRol.ADMINISTRACION) clauses.push(building);
    if (grant.ambito === AmbitoRol.PROPIEDAD && grant.propiedadId !== undefined) {
      clauses.push({ ...building, usuario: context.usuarioId, $or: [
        { propiedadOrigen: grant.propiedadId },
        // Las incidencias antiguas sobre una propiedad ya tienen un contexto inequívoco.
        { propiedadOrigen: null, unidad: grant.propiedadId },
      ] });
    }
  }
  if (!clauses.length) throw new AuthorizationError('No tiene un ámbito vigente para esta operación.');
  return { $or: clauses };
};

export const getAllIncidencias = async (context: AuthorizationContext): Promise<Incidencia[]> => {
  const em = getEntityManager();
  return em.find(Incidencia, incidenceScope(context, AccionPermiso.LEER), { populate: ['usuario', 'unidad.edificio', 'propiedadOrigen'] });
};

export const getIncidenciaById = async (id: EntityId, context: AuthorizationContext): Promise<Incidencia | null> => {
  const em = getEntityManager();
  return em.findOne(Incidencia, { $and: [{ id: parseId(id) }, incidenceScope(context, AccionPermiso.LEER)] }, {
    populate: ['usuario', 'unidad.edificio', 'propiedadOrigen'],
  });
};

export const createIncidencia = async (data: CreateIncidenciaData, context: AuthorizationContext): Promise<Incidencia> => {
  requireBusinessAuthorization(context);
  if ('usuarioId' in data) throw new DomainValidationError('El autor de la incidencia se toma de la sesión autenticada.');
  if ('estado' in data || 'closedAt' in data) {
    throw new DomainValidationError('El estado inicial y la fecha de cierre se establecen automáticamente.');
  }
  const em = getEntityManager();
  const unit = await requireEntity<Unidad>(em, 'Unidad', data.unidadId, 'Unidad');
  const buildingId = unit.edificio.id;
  const target = { edificioId: buildingId, ...(unit instanceof Propiedad ? { propiedadId: unit.id } : {}) };
  const management = matchingGrants(context, SeccionPermiso.INCIDENCIAS, AccionPermiso.CREAR, target)
    .some(grant => grant.ambito === AmbitoRol.GLOBAL || grant.ambito === AmbitoRol.ADMINISTRACION);
  let origin: number | null = unit instanceof Propiedad ? unit.id : null;
  if (data.propiedadId !== undefined || !management) {
    const requested = unit instanceof Propiedad ? unit.id : data.propiedadId;
    if (unit instanceof Propiedad && data.propiedadId !== undefined && parseId(data.propiedadId) !== unit.id) {
      throw new DomainValidationError('La propiedad de origen debe coincidir con la unidad privada reportada.');
    }
    origin = selectOriginProperty(context, SeccionPermiso.INCIDENCIAS, buildingId, requested);
  }
  if (!management && origin === null) throw new AuthorizationError('No tiene permiso para reportar en esta unidad.');
  const entity = new Incidencia();
  entity.descripcion = data.descripcion;
  entity.usuario = await requireEntity(em, User, context.usuarioId, 'User');
  entity.unidad = unit;
  entity.propiedadOrigen = origin === null ? null : em.getReference(Propiedad, origin);
  await em.persistAndFlush(entity);
  return entity;
};

export const updateIncidencia = async (id: EntityId, data: UpdateIncidenciaData, context: AuthorizationContext): Promise<Incidencia | null> => {
  requireBusinessAuthorization(context);
  if ('usuarioId' in data || 'unidadId' in data || 'propiedadId' in data) {
    throw new DomainValidationError('No se puede cambiar el autor, la unidad ni la propiedad de origen de una incidencia.');
  }
  if ('closedAt' in data) throw new DomainValidationError('La fecha de cierre se establece automáticamente al finalizar.');
  const em = getEntityManager();
  const entity = await em.findOne(Incidencia, { $and: [{ id: parseId(id) }, incidenceScope(context, AccionPermiso.EDITAR)] }, {
    populate: ['usuario', 'unidad.edificio', 'propiedadOrigen'],
  });
  if (!entity) return null;
  const target = { edificioId: entity.unidad.edificio.id };
  const management = matchingGrants(context, SeccionPermiso.INCIDENCIAS, AccionPermiso.EDITAR, target)
    .some(grant => grant.ambito === AmbitoRol.GLOBAL || grant.ambito === AmbitoRol.ADMINISTRACION);
  if (!management && entity.estado !== EstadoIncidencia.REPORTADO) {
    throw new DomainValidationError('Solo puede editar la descripción de sus incidencias en estado Reportado.');
  }
  if (data.estado !== undefined) {
    const stateGrants = matchingGrants(context, SeccionPermiso.INCIDENCIAS, AccionPermiso.CAMBIAR_ESTADO, target);
    if (!stateGrants.some(grant => grant.ambito === AmbitoRol.GLOBAL || grant.ambito === AmbitoRol.ADMINISTRACION)) {
      throw new AuthorizationError('No tiene permiso para cambiar el estado de esta incidencia.');
    }
    const next = entity.estado === EstadoIncidencia.REPORTADO
      ? EstadoIncidencia.EN_REVISION
      : entity.estado === EstadoIncidencia.EN_REVISION ? EstadoIncidencia.FINALIZADO : undefined;
    // Una incidencia abierta también puede cancelarse; Finalizado y Cancelado son estados finales.
    const cancel = data.estado === EstadoIncidencia.CANCELADO && next !== undefined;
    if (data.estado !== next && !cancel) {
      throw new DomainValidationError('La secuencia permitida es Reportado → En revisión → Finalizado; una incidencia abierta también puede pasar a Cancelado.');
    }
  }
  // Todas las validaciones preceden a la mutación de la entidad.
  if (data.estado !== undefined) {
    entity.estado = data.estado;
    if (data.estado === EstadoIncidencia.FINALIZADO || data.estado === EstadoIncidencia.CANCELADO) entity.closedAt = context.now;
  }
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  entity.updatedAt = context.now;
  await em.persistAndFlush(entity);
  return entity;
};
