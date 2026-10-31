import { DomainValidationError } from '../errors/domain.errors';
import { Rol } from '../entities/Rol';
import { AmbitoRol } from '../entities/enums';
import { EntityId, getEntityManager, parseId } from './service.helper';
import { RolPermiso } from '../entities/RolPermiso';
import { SeccionPermiso as S, AccionPermiso as A } from '../entities/Permiso';
import { AuthorizationContext, PermissionDescriptor, authorizedScope, requirePermission } from './authorization.service';
import { requireGlobal } from './assignment-authorization.helper';

const roleFilter = (ctx: AuthorizationContext) => {
  if (authorizedScope(ctx, S.ROLES, A.LEER, AmbitoRol.GLOBAL).global) return {};
  requirePermission(ctx, S.ASIGNACIONES, A.LEER, undefined, AmbitoRol.ADMINISTRACION);
  return { ambito: { $in: [AmbitoRol.PROPIEDAD, AmbitoRol.ADMINISTRACION] } };
};

export interface CreateRolData {
  nombre: string;
  descripcion: string;
  ambito: AmbitoRol;
}

export type UpdateRolData = Partial<CreateRolData>;

export const getAllRoles = async (ctx: AuthorizationContext): Promise<Rol[]> => {
  const em = getEntityManager();
  return em.find(Rol, roleFilter(ctx), { populate: ['permisos'] });
};

export const getRolById = async (id: EntityId, ctx: AuthorizationContext): Promise<Rol | null> => {
  const em = getEntityManager();
  return em.findOne(Rol, { $and: [roleFilter(ctx), { id: parseId(id) }] }, { populate: ['permisos'] });
};

export const createRol = async (data: CreateRolData, ctx: AuthorizationContext): Promise<Rol> => {
  requireGlobal(ctx, S.ROLES, A.CREAR);
  const em = getEntityManager();
  const entity = new Rol();
  entity.nombre = data.nombre;
  entity.descripcion = data.descripcion;
  entity.ambito = data.ambito;
  await em.persistAndFlush(entity);
  return entity;
};

export const updateRol = async (id: EntityId, data: UpdateRolData, ctx: AuthorizationContext): Promise<Rol | null> => {
  requireGlobal(ctx, S.ROLES, A.EDITAR);
  const em = getEntityManager();
  const entity = await em.findOne(Rol, { id: parseId(id) });
  if (!entity) return null;
  if (data.ambito !== undefined && data.ambito !== entity.ambito) {
    throw new DomainValidationError('El ambito de un rol existente no se puede cambiar; cree otro rol.');
  }
  if (data.nombre !== undefined) entity.nombre = data.nombre;
  if (data.descripcion !== undefined) entity.descripcion = data.descripcion;
  if (data.ambito !== undefined) entity.ambito = data.ambito;
  await em.persistAndFlush(entity);
  return entity;
};

export const deleteRol = async (id: EntityId, ctx: AuthorizationContext): Promise<Rol | null> => {
  requireGlobal(ctx, S.ROLES, A.BORRAR);
  const em = getEntityManager();
  const entity = await em.findOne(Rol, { id: parseId(id) });
  if (!entity) return null;
  if (entity.codigo) throw new DomainValidationError('Los roles iniciales no se eliminan; revoque sus asignaciones o permisos.');
  await em.removeAndFlush(entity);
  return entity;
};

export const replaceRolPermissions = async (id: EntityId, permissions: PermissionDescriptor[], ctx: AuthorizationContext): Promise<Rol | null> => {
  requireGlobal(ctx, S.ROLES, A.EDITAR);
  if (!Array.isArray(permissions)) throw new DomainValidationError('Debe indicar una lista de permisos.');
  if (new Set(permissions.map(item => item.seccion)).size !== permissions.length) {
    throw new DomainValidationError('Cada sección debe aparecer una sola vez.');
  }
  const special = Object.values(A).filter(action => ![A.CREAR, A.LEER, A.EDITAR, A.BORRAR].includes(action));
  for (const permission of permissions) {
    if (!Object.values(S).includes(permission.seccion) || !Array.isArray(permission.acciones)
      || permission.acciones.some(action => !special.includes(action))
      || [permission.crear, permission.leer, permission.editar, permission.borrar].some(value => typeof value !== 'boolean')) {
      throw new DomainValidationError('Configuración de permisos inválida.');
    }
  }
  return getEntityManager().transactional(async em => {
    const role = await em.findOne(Rol, { id: parseId(id) }, { populate: ['permisos'] });
    if (!role) return null;
    for (const old of role.permisos.getItems()) em.remove(old);
    role.permisos.removeAll();
    await em.flush();
    for (const permission of permissions) {
      const row = new RolPermiso();
      row.seccion = permission.seccion;
      row.crear = permission.crear; row.leer = permission.leer;
      row.editar = permission.editar; row.borrar = permission.borrar;
      row.acciones = [...new Set(permission.acciones)];
      row.rol = role;
      role.permisos.add(row);
      em.persist(row);
    }
    await em.flush();
    return role;
  });
};
