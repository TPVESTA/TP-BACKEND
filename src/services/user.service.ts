import { EntityManager, FilterQuery } from '@mikro-orm/core';
import { User } from '../entities/User';
import { Administracion } from '../entities/Administracion';
import { Empleado } from '../entities/Empleado';
import { Propiedad } from '../entities/Propiedad';
import { Rol } from '../entities/Rol';
import { UsuarioRolPropiedad } from '../entities/UsuarioRolPropiedad';
import { AmbitoRol } from '../entities/AmbitoRol';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { DomainValidationError } from '../errors/domain-validation.error';
import { AuthorizationError } from '../errors/authorization.error';
import { hashPassword } from './auth.service';
import { EntityId, getEntityManager, parseId, requireEntity } from './service.helper';
import { AuthorizationContext, authorizedScope, requirePermission } from './authorization.service';
import { requireGlobal, requireDelegableRole } from './assignment-authorization.helper';
import { findOrCreateOpenUsuarioRol } from './usuario-rol-link.helper';

export interface CreateUserData {
  cuil: string; nombre: string; apellido: string; email: string;
  fechaNacimiento: Date; password: string; estado: boolean; rolId: EntityId;
  administracionId?: EntityId; propiedadId?: EntityId;
}
export type UpdateUserData = Partial<Omit<CreateUserData, 'administracionId' | 'rolId' | 'propiedadId'>>;

const userScope = (ctx: AuthorizationContext, action: A) => {
  const scoped = { ...ctx, grants: ctx.grants.filter(grant => grant.ambito !== AmbitoRol.PROPIEDAD) };
  requirePermission(scoped, S.USUARIOS, action);
  return authorizedScope(scoped, S.USUARIOS, action);
};

const userFilter = async (em: EntityManager, ctx: AuthorizationContext, action: A): Promise<FilterQuery<User>> => {
  const scope = userScope(ctx, action);
  if (scope.global) return {};
  const active = { beginAt: { $lte: ctx.now }, $or: [{ endAt: null }, { endAt: { $gt: ctx.now } }] };
  const [jobs, residents] = await Promise.all([
    em.find(Empleado, { administracion: { $in: scope.administracionIds }, ...active }, { populate: ['usuarioRol.usuario'] }),
    em.find(UsuarioRolPropiedad, {
      ...active,
      usuarioRol: { ...active, rol: { ambito: AmbitoRol.PROPIEDAD } },
      propiedad: { edificio: { administraciones: { ...active, administracion: { $in: scope.administracionIds } } } },
    }, { populate: ['usuarioRol.usuario'] }),
  ]);
  return { id: { $in: [...new Set([
    ...jobs.map(item => item.usuarioRol?.usuario?.id),
    ...residents.map(item => item.usuarioRol?.usuario?.id),
  ].filter((id): id is number => id != null))] } };
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
  if (!scope.global && data.estado !== true) throw new AuthorizationError('La deshabilitación de cuentas requiere un permiso global.');
  const em = getEntityManager();
  const role = await em.findOne(Rol, { id: parseId(data.rolId) }, { populate: ['permisos'] });
  if (!role) throw new DomainValidationError('Rol no encontrado');
  let administracion: Administracion | undefined;
  let propiedad: Propiedad | undefined;
  if (role.ambito === AmbitoRol.ADMINISTRACION) {
    if (data.administracionId === undefined) throw new DomainValidationError('Debe indicar administracionId.');
    administracion = await requireEntity(em, Administracion, data.administracionId, 'Administración');
    requireDelegableRole(ctx, role, { administracionId: administracion.id });
  } else if (role.ambito === AmbitoRol.PROPIEDAD) {
    if (data.propiedadId === undefined) throw new DomainValidationError('Debe indicar propiedadId.');
    const found = await em.findOne(Propiedad, { id: parseId(data.propiedadId) }, { populate: ['edificio'] });
    if (!found) throw new DomainValidationError('Propiedad no encontrada');
    propiedad = found;
    requireDelegableRole(ctx, role, { propiedadId: propiedad.id, edificioId: propiedad.edificio.id });
  } else if (role.ambito === AmbitoRol.GLOBAL) {
    requireDelegableRole(ctx, role, {});
  } else {
    throw new DomainValidationError('Ámbito de rol no admitido.');
  }
  return em.transactional(async em => {
    if (await em.findOne(User, { email: data.email }, { filters: { softDelete: false } })) throw new DomainValidationError('El email ya está registrado');
    const user = new User(data.nombre, data.apellido, data.email, data.fechaNacimiento, await hashPassword(data.password), data.estado);
    user.cuil = data.cuil;
    em.persist(user);
    const usuarioRol = await findOrCreateOpenUsuarioRol(em, user, role, ctx.now, ctx.now);
    if (administracion) {
      const job = new Empleado();
      job.usuarioRol = usuarioRol;
      job.administracion = administracion;
      job.beginAt = ctx.now;
      em.persist(job);
    }
    if (propiedad) {
      const assignment = new UsuarioRolPropiedad();
      assignment.usuarioRol = usuarioRol;
      assignment.propiedad = propiedad;
      assignment.beginAt = ctx.now;
      em.persist(assignment);
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
export const deleteUser = async (id: EntityId, ctx: AuthorizationContext): Promise<User | null> => {
  requireGlobal(ctx, S.USUARIOS, A.DESHABILITAR);
  const em = getEntityManager();
  const user = await em.findOne(User, { id: parseId(id) }, { filters: { softDelete: false } });
  if (!user) return null;
  user.deletedAt = user.deletedAt ?? ctx.now; user.estado = false; user.updatedAt = ctx.now;
  await em.persistAndFlush(user);
  return user;
};
