import { Empleado } from '../entities/Empleado';
import { User } from '../entities/User';
import { Rol } from '../entities/Rol';
import { Administracion } from '../entities/Administracion';
import { AmbitoRol } from '../entities/AmbitoRol';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { AuthorizationContext, requirePermission } from './authorization/authorization.service';
import { assignmentScope, requireDelegableRole, revokeAssignment } from './authorization/assignment-authorization.helper';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';
import { DomainValidationError } from '../errors/domain-validation.error';
import { AuthorizationError } from '../errors/authorization.error';
import { getUserById } from './user.service';
import { authorizedScope } from './authorization/authorization.service';
import { findOrCreateOpenUsuarioRol } from './usuario-rol-link.helper';

export interface CreateEmpleadoData {
  beginAt?: Date; endAt?: Date | null; usuarioId: EntityId; rolId: EntityId;
  administracionId: EntityId;
}
export type UpdateEmpleadoData = Partial<CreateEmpleadoData>;
const filter = (ctx: AuthorizationContext) => { const scope = assignmentScope(ctx);
  return scope.global ? {} : { administracion: { id: { $in: scope.administracionIds } } }; };
const target = (entity: Empleado) => ({ administracionId: entity.administracion.id });
const populate = ["usuarioRol.usuario", "usuarioRol.rol.permisos", "administracion"] as const;

export const getAllEmpleados = async (ctx: AuthorizationContext, usuarioId?: EntityId): Promise<Empleado[]> => {
  const where = usuarioId === undefined ? filter(ctx) : { ...filter(ctx), usuarioRol: { usuario: parseId(usuarioId) } };
  return getEntityManager().find(Empleado, where, { populate: [...populate], filters: { softDelete: false } });
};
export const getEmpleadoById = async (id: EntityId, ctx: AuthorizationContext): Promise<Empleado | null> => {
  return getEntityManager().findOne(Empleado, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate], filters: { softDelete: false } });
};
export const createEmpleado = async (data: CreateEmpleadoData, ctx: AuthorizationContext): Promise<Empleado> => {
  assignmentScope(ctx, A.ASIGNAR);
  const em = getEntityManager();
  const entity = new Empleado();
  const user = authorizedScope(ctx, S.ASIGNACIONES, A.ASIGNAR, AmbitoRol.GLOBAL).global
    ? await requireEntity(em, User, data.usuarioId, 'Usuario') : await getUserById(data.usuarioId, ctx);
  if (!user) throw new AuthorizationError('El usuario está fuera de su ámbito de gestión.');
  const role = await em.findOne(Rol, { id: parseId(data.rolId) }, { populate: ['permisos'] });
  if (!role || role.ambito !== AmbitoRol.ADMINISTRACION) throw new DomainValidationError('Rol inexistente o de ?mbito incompatible.');
  entity.administracion = await requireEntity(em, Administracion, data.administracionId, 'Administracion');
  requireDelegableRole(ctx, role, target(entity));
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  entity.usuarioRol = await findOrCreateOpenUsuarioRol(em, user, role, entity.beginAt, ctx.now);
  await em.persistAndFlush(entity);
  return entity;
};
export const updateEmpleado = async (id: EntityId, data: UpdateEmpleadoData, ctx: AuthorizationContext): Promise<Empleado | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Empleado, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate], filters: { softDelete: false } });
  if (!entity) return null;
  requirePermission(ctx, S.ASIGNACIONES, A.REVOCAR, target(entity));
  // Una asignaci?n es hist?rica: cambios de usuario, rol o contexto requieren revocar y crear otra.
  if ((data.usuarioId !== undefined && parseId(data.usuarioId) !== entity.usuarioRol.usuario.id)
      || (data.rolId !== undefined && parseId(data.rolId) !== entity.usuarioRol.rol.id)
      || (data.administracionId !== undefined && parseId(data.administracionId) !== entity.administracion.id)) {
    throw new DomainValidationError('No se puede cambiar el usuario, rol o contexto de una asignaci?n; revoque y cree otra.');
  }
  // Extender/reabrir vigencia tambi?n concede acceso, por lo que exige permiso de asignaci?n.
  if (data.beginAt !== undefined || data.endAt === null || (data.endAt !== undefined && entity.endAt !== null && data.endAt > entity.endAt)) {
    requireDelegableRole(ctx, entity.usuarioRol.rol, target(entity));
  }
  if (data.beginAt !== undefined) entity.beginAt = data.beginAt;
  if (data.endAt !== undefined) entity.endAt = data.endAt;
  await em.persistAndFlush(entity);
  return entity;
};
export const deleteEmpleado = async (id: EntityId, ctx: AuthorizationContext): Promise<Empleado | null> => {
  const em = getEntityManager();
  const entity = await em.findOne(Empleado, { $and: [filter(ctx), { id: parseId(id) }] }, { populate: [...populate], filters: { softDelete: false } });
  if (!entity) return null;
  requirePermission(ctx, S.ASIGNACIONES, A.REVOCAR, target(entity));
  revokeAssignment(entity, ctx.now);
  await em.persistAndFlush(entity);
  return entity;
};
