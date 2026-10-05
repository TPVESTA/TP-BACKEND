import { AmbitoRol } from '../entities/AmbitoRol';
import { Rol } from '../entities/Rol';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { AuthorizationError } from '../errors/authorization.error';
import { AuthorizationContext, AuthorizationTarget, authorizedScope, hasPermission, requirePermission } from './authorization.service';
import { getDefaultRolePermissions } from './permission-seed.service';

export const assignmentScope = (ctx: AuthorizationContext, action: A = A.LEER) => {
  const scoped = { ...ctx, grants: ctx.grants.filter(grant => grant.ambito !== AmbitoRol.PROPIEDAD) };
  requirePermission(scoped, S.ASIGNACIONES, action);
  return authorizedScope(scoped, S.ASIGNACIONES, action);
};

export const requireGlobal = (ctx: AuthorizationContext, section: S, action: A): void => {
  if (!authorizedScope(ctx, section, action, AmbitoRol.GLOBAL).global) {
    throw new AuthorizationError('Esta operación requiere un permiso global.');
  }
};

export const grantedActions = (permission: { crear: boolean; leer: boolean; editar: boolean; borrar: boolean; acciones: A[] }): A[] => [
  ...(permission.crear ? [A.CREAR] : []), ...(permission.leer ? [A.LEER] : []),
  ...(permission.editar ? [A.EDITAR] : []), ...(permission.borrar ? [A.BORRAR] : []), ...permission.acciones,
];

// Administrar usuarios no concede la capacidad de otorgar permisos arbitrarios.
export const requireDelegableRole = (ctx: AuthorizationContext, role: Rol, target: AuthorizationTarget): void => {
  const delegation = { ...ctx, grants: ctx.grants.filter(grant => grant.ambito !== AmbitoRol.PROPIEDAD) };
  requirePermission(delegation, S.ASIGNACIONES, A.ASIGNAR, target);
  if (authorizedScope(ctx, S.ASIGNACIONES, A.ASIGNAR, AmbitoRol.GLOBAL).global) return;
  if (role.ambito === AmbitoRol.GLOBAL) throw new AuthorizationError('No puede asignar roles globales.');
  if (role.ambito === AmbitoRol.PROPIEDAD) {
    if (!['RESIDENTE', 'PROPIETARIO'].includes(role.codigo ?? '')) {
      throw new AuthorizationError('El rol de propiedad no está habilitado para delegación.');
    }
    const defaults = getDefaultRolePermissions(role.codigo!);
    for (const permission of role.permisos.getItems()) {
      const allowed = defaults.find(item => item.seccion === permission.seccion);
      if (grantedActions(permission).some(action => !allowed || !grantedActions(allowed).includes(action))) {
        throw new AuthorizationError('El rol contiene permisos que no puede delegar.');
      }
    }
    return;
  }
  for (const permission of role.permisos.getItems()) {
    for (const action of grantedActions(permission)) {
      if (!hasPermission(ctx, permission.seccion, action, target, AmbitoRol.ADMINISTRACION)) {
        throw new AuthorizationError('No puede delegar permisos superiores a los propios.');
      }
    }
  }
};

export const revokeAssignment = (entity: { beginAt: Date; endAt: Date | null }, now: Date): void => {
  const end = entity.beginAt > now ? entity.beginAt : now;
  if (entity.endAt === null || entity.endAt > end) entity.endAt = end;
};
