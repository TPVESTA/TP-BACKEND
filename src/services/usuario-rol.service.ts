import { UsuarioRol } from '../entities/UsuarioRol';
import { User } from '../entities/User';
import { Rol } from '../entities/Rol';

import { AmbitoRol } from '../entities/AmbitoRol';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { AuthorizationContext, requirePermission } from './authorization.service';
import { assignmentScope, requireGlobal, requireDelegableRole, revokeAssignment } from './assignment-authorization.helper';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';
import { DomainValidationError } from '../errors/domain-validation.error';

export interface CreateUsuarioRolData {
  beginAt?: Date; endAt?: Date | null; usuarioId: EntityId; rolId: EntityId;
  
}
export type UpdateUsuarioRolData = Partial<CreateUsuarioRolData>;
const filter = (ctx: AuthorizationContext) => { requireGlobal(ctx, S.ASIGNACIONES, A.LEER);
  return {}; };
const target = (entity: UsuarioRol) => ({});
const populate = ["rol.permisos"] as const;

export const getAllUsuariosRoles = async (ctx: AuthorizationContext): Promise<UsuarioRol[]> => {
  return getEntityManager().find(UsuarioRol, filter(ctx), { populate: [...populate] });
};
export const getUsuarioRolById = async (id: EntityId, ctx: AuthorizationContext): Promise<UsuarioRol | null> => {
  return getEntityManager().findOne(UsuarioRol, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate] });
};
export const createUsuarioRol = async (data: CreateUsuarioRolData, ctx: AuthorizationContext): Promise<UsuarioRol> => {
  requireGlobal(ctx, S.ASIGNACIONES, A.ASIGNAR);
  const em = getEntityManager();
  const entity = new UsuarioRol();
  entity.usuario = await requireEntity(em, User, data.usuarioId, 'Usuario');
  const role = await em.findOne(Rol, { id: parseId(data.rolId) }, { populate: ['permisos'] });
  if (!role || role.ambito !== AmbitoRol.GLOBAL) throw new DomainValidationError('Rol inexistente o de ?mbito incompatible.');
  entity.rol = role;
  
  
  requireDelegableRole(ctx, role, target(entity));
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  await em.persistAndFlush(entity);
  return entity;
};
export const updateUsuarioRol = async (id: EntityId, data: UpdateUsuarioRolData, ctx: AuthorizationContext): Promise<UsuarioRol | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRol, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate] });
  if (!entity) return null;
  requireGlobal(ctx, S.ASIGNACIONES, A.REVOCAR);
  // Una asignaci?n es hist?rica: cambios de usuario, rol o contexto requieren revocar y crear otra.
  if ((data.usuarioId !== undefined && parseId(data.usuarioId) !== entity.usuario.id)
      || (data.rolId !== undefined && parseId(data.rolId) !== entity.rol.id)
      ) {
    throw new DomainValidationError('No se puede cambiar el usuario, rol o contexto de una asignaci?n; revoque y cree otra.');
  }
  // Extender/reabrir vigencia tambi?n concede acceso, por lo que exige permiso de asignaci?n.
  if (data.beginAt !== undefined || data.endAt === null || (data.endAt !== undefined && entity.endAt !== null && data.endAt > entity.endAt)) {
    requireDelegableRole(ctx, entity.rol, target(entity));
  }
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  await em.persistAndFlush(entity);
  return entity;
};
export const deleteUsuarioRol = async (id: EntityId, ctx: AuthorizationContext): Promise<UsuarioRol | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRol, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate] });
  if (!entity) return null;
  requireGlobal(ctx, S.ASIGNACIONES, A.REVOCAR);
  revokeAssignment(entity, ctx.now);
  await em.persistAndFlush(entity);
  return entity;
};
