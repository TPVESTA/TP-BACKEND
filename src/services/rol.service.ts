import { Rol } from '../entities/Rol';
import { AmbitoRol } from '../entities/AmbitoRol';
import { EntityId, getEntityManager, parseId } from './service.helper';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { AuthorizationContext, authorizedScope, requirePermission } from './authorization/authorization.service';

const roleFilter = (ctx: AuthorizationContext) => {
  if (authorizedScope(ctx, S.ROLES, A.LEER, AmbitoRol.GLOBAL).global) return {};
  requirePermission(ctx, S.ASIGNACIONES, A.LEER, undefined, AmbitoRol.ADMINISTRACION);
  return { ambito: { $in: [AmbitoRol.PROPIEDAD, AmbitoRol.ADMINISTRACION] } };
};

// Los roles son de solo lectura por la API: los canónicos y sus permisos iniciales
// los carga permission-seed.service.ts al arrancar (ver docs/autorizacion.md).
export const getAllRoles = async (ctx: AuthorizationContext): Promise<Rol[]> => {
  const em = getEntityManager();
  return em.find(Rol, roleFilter(ctx), { populate: ['permisos'] });
};

export const getRolById = async (id: EntityId, ctx: AuthorizationContext): Promise<Rol | null> => {
  const em = getEntityManager();
  return em.findOne(Rol, { $and: [roleFilter(ctx), { id: parseId(id) }] }, { populate: ['permisos'] });
};
