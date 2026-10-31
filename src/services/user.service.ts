import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { User } from '../entities/User';
import { UsuarioAdministracion } from '../entities/UsuarioAdministracion';
import { Administracion } from '../entities/Administracion';
import { Empleado } from '../entities/Empleado';
import { AmbitoRol } from '../entities/enums';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { DomainValidationError, AuthorizationError } from '../errors/domain.errors';

import { hashPassword } from './auth.service';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';
import { AuthorizationContext, authorizedScope, requirePermission } from './authorization.service';
import { requireGlobal, revokeAssignment } from './assignment-authorization.helper';

export interface CreateUserData {
  cuil: string; nombre: string; apellido: string; email: string;
  fechaNacimiento: Date; password: string; estado: boolean; administracionId?: EntityId;
}
export type UpdateUserData = Partial<Omit<CreateUserData, 'administracionId'>>;

const userScope = (ctx: AuthorizationContext, action: A) => {
  const scoped = { ...ctx, grants: ctx.grants.filter(grant => grant.ambito !== AmbitoRol.PROPIEDAD) };
  requirePermission(scoped, S.USUARIOS, action);
  return authorizedScope(scoped, S.USUARIOS, action);
};

const userFilter = async (em: EntityManager, ctx: AuthorizationContext, action: A): Promise<FilterQuery<User>> => {
  const scope = userScope(ctx, action);
  if (scope.global) return {};
  const active = { beginAt: { $lte: ctx.now }, $or: [{ endAt: null }, { endAt: { $gt: ctx.now } }] };
  const [members, jobs] = await Promise.all([
    em.find(UsuarioAdministracion, { administracion: { $in: scope.administracionIds }, ...active }),
    em.find(Empleado, { administracion: { $in: scope.administracionIds }, ...active }),
  ]);
  return { id: { $in: [...new Set([...members, ...jobs].map(item => item.usuario.id))] } };
};

export const getAllUsers = async (ctx: AuthorizationContext): Promise<User[]> => {
  const em = getEntityManager();
  return em.find(User, await userFilter(em, ctx, A.LEER));
};
export const getUserById = async (id: EntityId, ctx: AuthorizationContext): Promise<User | null> => {
  const em = getEntityManager();
  return em.findOne(User, { $and: [await userFilter(em, ctx, A.LEER), { id: parseId(id) }] });
};
export const createUser = async (data: CreateUserData, ctx: AuthorizationContext): Promise<User> => {
  const scope = userScope(ctx, A.CREAR);
  if (!scope.global && data.administracionId === undefined) throw new DomainValidationError('Debe indicar administracionId.');
  if (!scope.global && data.estado !== true) throw new AuthorizationError('La deshabilitación de cuentas requiere un permiso global.');
  const adminId = data.administracionId === undefined ? undefined : parseId(data.administracionId);
  if (adminId !== undefined) requirePermission(ctx, S.USUARIOS, A.CREAR, { administracionId: adminId });
  return getEntityManager().transactional(async em => {
    if (await em.findOne(User, { email: data.email }, { filters: { softDelete: false } })) throw new DomainValidationError('El email ya está registrado');
    const user = new User(data.nombre, data.apellido, data.email, data.fechaNacimiento, await hashPassword(data.password), data.estado);
    user.cuil = data.cuil;
    em.persist(user);
    if (adminId !== undefined) {
      const member = new UsuarioAdministracion();
      member.usuario = user;
      member.administracion = await requireEntity(em, Administracion, adminId, 'Administración');
      member.beginAt = ctx.now;
      em.persist(member);
    }
    await em.flush();
    return user;
  });
};

const applyUpdate = async (em: EntityManager, user: User, data: UpdateUserData): Promise<User> => {
  if (data.email !== undefined) {
    const existing = await em.findOne(User, { email: data.email, id: { $ne: user.id } }, { filters: { softDelete: false } });
    if (existing) throw new DomainValidationError('El email ya está registrado');
    user.email = data.email;
  }
  for (const field of ['cuil', 'nombre', 'apellido', 'fechaNacimiento', 'estado'] as const) {
    if (data[field] !== undefined) Object.assign(user, { [field]: data[field] });
  }
  if (data.password !== undefined) user.password = await hashPassword(data.password);
  user.updatedAt = new Date();
  await em.persistAndFlush(user);
  return user;
};
export const updateUser = async (id: EntityId, data: UpdateUserData, ctx: AuthorizationContext): Promise<User | null> => {
  const em = getEntityManager();
  const user = await em.findOne(User, { $and: [await userFilter(em, ctx, A.EDITAR), { id: parseId(id) }] });
  if (!user) return null;
  // La identidad de la cuenta es compartida por todos sus contextos.
  if (data.email !== undefined || data.password !== undefined) requireGlobal(ctx, S.USUARIOS, A.EDITAR);
  if (data.estado !== undefined) requireGlobal(ctx, S.USUARIOS, A.DESHABILITAR);
  return applyUpdate(em, user, data);
};
export const updateOwnProfile = async (data: UpdateUserData, ctx: AuthorizationContext): Promise<User | null> => {
  const allowed = ['cuil', 'nombre', 'apellido', 'email', 'fechaNacimiento', 'password'];
  if (Object.keys(data).some(field => !allowed.includes(field))) throw new AuthorizationError('Campo no permitido en el perfil personal.');
  const em = getEntityManager();
  const user = await em.findOne(User, { id: ctx.usuarioId, estado: true });
  return user ? applyUpdate(em, user, data) : null;
};
export const linkUserAdministration = async (id: EntityId, administracionId: EntityId, ctx: AuthorizationContext): Promise<UsuarioAdministracion> => {
  // Vincular una cuenta ajena requiere gestión global; conocer un ID no amplía el ámbito.
  requireGlobal(ctx, S.USUARIOS, A.CREAR);
  return getEntityManager().transactional(async em => {
    const user = await requireEntity(em, User, id, 'Usuario');
    const admin = await requireEntity(em, Administracion, administracionId, 'Administración');
    const existing = await em.findOne(UsuarioAdministracion, {
      usuario: user.id, administracion: admin.id, beginAt: { $lte: ctx.now },
      $or: [{ endAt: null }, { endAt: { $gt: ctx.now } }],
    });
    if (existing) return existing;
    const member = new UsuarioAdministracion();
    member.usuario = user; member.administracion = admin; member.beginAt = ctx.now;
    await em.persistAndFlush(member);
    return member;
  });
};
export const deleteUser = async (id: EntityId, ctx: AuthorizationContext, administracionId?: EntityId): Promise<User | null> => {
  if (administracionId === undefined) {
    requireGlobal(ctx, S.USUARIOS, A.DESHABILITAR);
    const em = getEntityManager();
    const user = await em.findOne(User, { id: parseId(id) }, { filters: { softDelete: false } });
    if (!user) return null;
    user.deletedAt = user.deletedAt ?? ctx.now; user.estado = false; user.updatedAt = ctx.now;
    await em.persistAndFlush(user);
    return user;
  }
  const adminId = parseId(administracionId);
  requirePermission(ctx, S.USUARIOS, A.BORRAR, { administracionId: adminId });
  return getEntityManager().transactional(async em => {
    const user = await em.findOne(User, { id: parseId(id) });
    if (!user) return null;
    const pending = { $or: [{ endAt: null }, { endAt: { $gt: ctx.now } }] };
    const [members, jobs] = await Promise.all([
      em.find(UsuarioAdministracion, { usuario: user.id, administracion: adminId, ...pending }),
      em.find(Empleado, { usuario: user.id, administracion: adminId, ...pending }),
    ]);
    if (members.length === 0 && jobs.length === 0) return null;
    if (jobs.length) requirePermission(ctx, S.ASIGNACIONES, A.REVOCAR, { administracionId: adminId });
    for (const member of [...members, ...jobs]) revokeAssignment(member, ctx.now);
    await em.flush();
    return user;
  });
};
