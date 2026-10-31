import { FilterQuery } from '@mikro-orm/core';
import { AmbitoRol } from '../entities/enums';
import { AccionPermiso, SeccionPermiso } from '../entities/Permiso';
import { AuthorizationError } from '../errors/domain.errors';
import {
  AuthorizationContext, authorizedScope, matchingGrants, requirePermission,
} from './authorization.service';

/** Structural writes cannot be granted through a resident's property assignment. */
const structureScope = (context: AuthorizationContext, action: AccionPermiso) => {
  const scope = authorizedScope(context, SeccionPermiso.ESTRUCTURA, action,
    action === AccionPermiso.LEER ? undefined : AmbitoRol.ADMINISTRACION);
  const global = authorizedScope(context, SeccionPermiso.ESTRUCTURA, action, AmbitoRol.GLOBAL).global;
  if (!global && scope.edificioIds.length === 0 && scope.administracionIds.length === 0) {
    throw new AuthorizationError('No tiene permiso para esta operación sobre la estructura.');
  }
  return { ...scope, global };
};

export const buildingWhere = <T>(context: AuthorizationContext, action: AccionPermiso): FilterQuery<T> => {
  const scope = structureScope(context, action);
  return (scope.global ? {} : { id: { $in: scope.edificioIds } }) as FilterQuery<T>;
};

export const commonAreaWhere = <T>(context: AuthorizationContext, action: AccionPermiso): FilterQuery<T> => {
  const scope = structureScope(context, action);
  return (scope.global ? {} : { edificio: { $in: scope.edificioIds } }) as FilterQuery<T>;
};

/** Private units require a separate read permission and retain property-level isolation. */
export const propertyWhere = <T>(context: AuthorizationContext, action: AccionPermiso): FilterQuery<T> => {
  if (action !== AccionPermiso.LEER) return commonAreaWhere<T>(context, action);
  requirePermission(context, SeccionPermiso.PROPIEDADES, action);
  const scope = authorizedScope(context, SeccionPermiso.PROPIEDADES, action);
  if (scope.global) return {} as FilterQuery<T>;
  const administrativeBuildings = matchingGrants(context, SeccionPermiso.PROPIEDADES, action,
    undefined, AmbitoRol.ADMINISTRACION).flatMap(grant => grant.edificioIds);
  return {
    $or: [
      { id: { $in: scope.propiedadIds } },
      { edificio: { $in: [...new Set(administrativeBuildings)] } },
    ],
  } as FilterQuery<T>;
};

export const administrationWhere = <T>(context: AuthorizationContext, action: AccionPermiso): FilterQuery<T> => {
  if (action !== AccionPermiso.LEER) {
    const scope = structureScope(context, action);
    return (scope.global ? {} : { id: { $in: scope.administracionIds } }) as FilterQuery<T>;
  }
  requirePermission(context, SeccionPermiso.ADMINISTRACIONES, action);
  const scope = authorizedScope(context, SeccionPermiso.ADMINISTRACIONES, action);
  return (scope.global ? {} : { id: { $in: scope.administracionIds } }) as FilterQuery<T>;
};

export const administrationBuildingWhere = <T>(context: AuthorizationContext): FilterQuery<T> => {
  requirePermission(context, SeccionPermiso.ADMINISTRACIONES, AccionPermiso.LEER);
  const scope = authorizedScope(context, SeccionPermiso.ADMINISTRACIONES, AccionPermiso.LEER);
  return (scope.global ? {} : { administracion: { $in: scope.administracionIds } }) as FilterQuery<T>;
};

/** Creating buildings or changing who administers them can expand access: global only. */
export const requireGlobalStructure = (context: AuthorizationContext, action: AccionPermiso): void => {
  requirePermission(context, SeccionPermiso.ESTRUCTURA, action, undefined, AmbitoRol.GLOBAL);
};

export const requireCatalogPermission = (context: AuthorizationContext, action: AccionPermiso): void => {
  requirePermission(context, SeccionPermiso.CATALOGOS, action,
    undefined, action === AccionPermiso.LEER ? undefined : AmbitoRol.GLOBAL);
};

/** Validate relation destinations before assigning them to a managed entity. */
export const requireBuildingMutation = (
  context: AuthorizationContext, action: AccionPermiso, edificioId: number,
): void => {
  const scope = structureScope(context, action);
  if (!scope.global && !scope.edificioIds.includes(edificioId)) {
    throw new AuthorizationError('El edificio está fuera de su ámbito autorizado.');
  }
};
