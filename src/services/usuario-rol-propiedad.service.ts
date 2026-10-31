import { UsuarioRolPropiedad } from '../entities/UsuarioRolPropiedad';
import { User } from '../entities/User';
import { Rol } from '../entities/Rol';
import { Propiedad } from '../entities/Propiedad';
import { AmbitoRol } from '../entities/enums';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { AuthorizationContext, requirePermission, authorizedScope } from './authorization.service';
import { assignmentScope, requireGlobal, requireDelegableRole, revokeAssignment } from './assignment-authorization.helper';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';
import { DomainValidationError, AuthorizationError } from '../errors/domain.errors';

import { getUserById } from './user.service';

export interface CreateUsuarioRolPropiedadData {
  beginAt?: Date; endAt?: Date | null; usuarioId: EntityId; rolId: EntityId;
  propiedadId: EntityId;
}
export type UpdateUsuarioRolPropiedadData = Partial<CreateUsuarioRolPropiedadData>;
const filter = (ctx: AuthorizationContext) => { const scope = assignmentScope(ctx);
  return scope.global ? {} : { propiedad: { edificio: { id: { $in: scope.edificioIds } } } }; };
const target = (entity: UsuarioRolPropiedad) => ({ propiedadId: entity.propiedad.id, edificioId: entity.propiedad.edificio.id });
const populate = ["rol.permisos","propiedad.edificio"] as const;

export const getAllUsuariosRolesPropiedad = async (ctx: AuthorizationContext): Promise<UsuarioRolPropiedad[]> => {
  return getEntityManager().find(UsuarioRolPropiedad, filter(ctx), { populate: [...populate] });
};
export const getUsuarioRolPropiedadById = async (id: EntityId, ctx: AuthorizationContext): Promise<UsuarioRolPropiedad | null> => {
  return getEntityManager().findOne(UsuarioRolPropiedad, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate] });
};
export const createUsuarioRolPropiedad = async (data: CreateUsuarioRolPropiedadData, ctx: AuthorizationContext): Promise<UsuarioRolPropiedad> => {
  assignmentScope(ctx, A.ASIGNAR);
  const em = getEntityManager();
  const entity = new UsuarioRolPropiedad();
  const user = authorizedScope(ctx, S.ASIGNACIONES, A.ASIGNAR, AmbitoRol.GLOBAL).global
    ? await requireEntity(em, User, data.usuarioId, 'Usuario') : await getUserById(data.usuarioId, ctx);
  if (!user) throw new AuthorizationError('El usuario está fuera de su ámbito de gestión.');
  entity.usuario = user;
  const role = await em.findOne(Rol, { id: parseId(data.rolId) }, { populate: ['permisos'] });
  if (!role || role.ambito !== AmbitoRol.PROPIEDAD) throw new DomainValidationError('Rol inexistente o de ?mbito incompatible.');
  entity.rol = role;
  entity.propiedad = await requireEntity(em, Propiedad, data.propiedadId, 'Propiedad');
  await em.populate(entity.propiedad, ['edificio']);
  requireDelegableRole(ctx, role, target(entity));
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  await em.persistAndFlush(entity);
  return entity;
};
export const updateUsuarioRolPropiedad = async (id: EntityId, data: UpdateUsuarioRolPropiedadData, ctx: AuthorizationContext): Promise<UsuarioRolPropiedad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRolPropiedad, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate] });
  if (!entity) return null;
  requirePermission(ctx, S.ASIGNACIONES, A.REVOCAR, target(entity));
  // Una asignaci?n es hist?rica: cambios de usuario, rol o contexto requieren revocar y crear otra.
  if ((data.usuarioId !== undefined && parseId(data.usuarioId) !== entity.usuario.id)
      || (data.rolId !== undefined && parseId(data.rolId) !== entity.rol.id)
      || (data.propiedadId !== undefined && parseId(data.propiedadId) !== entity.propiedad.id)) {
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
export const deleteUsuarioRolPropiedad = async (id: EntityId, ctx: AuthorizationContext): Promise<UsuarioRolPropiedad | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(UsuarioRolPropiedad, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate] });
  if (!entity) return null;
  requirePermission(ctx, S.ASIGNACIONES, A.REVOCAR, target(entity));
  revokeAssignment(entity, ctx.now);
  await em.persistAndFlush(entity);
  return entity;
};
