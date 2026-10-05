import { EntityManager } from '@mikro-orm/core';
import { AdminEdificio } from '../entities/AdminEdificio';
import { AmbitoRol } from '../entities/AmbitoRol';
import { Empleado } from '../entities/Empleado';
import { AccionPermiso, SeccionPermiso } from '../entities/Permiso';
import { RolPermiso } from '../entities/RolPermiso';
import { User } from '../entities/User';
import { UsuarioRol } from '../entities/UsuarioRol';
import { UsuarioRolPropiedad } from '../entities/UsuarioRolPropiedad';
import { AuthorizationError } from '../errors/authorization.error';
import { EntityId, getEntityManager, parseId } from './service.helper';

export interface PermissionDescriptor {
  seccion: SeccionPermiso;
  crear: boolean;
  leer: boolean;
  editar: boolean;
  borrar: boolean;
  acciones: AccionPermiso[];
}

export interface AuthorizationTarget {
  propiedadId?: number;
  edificioId?: number;
  administracionId?: number;
}

export interface AuthorizationGrant {
  rolId: number;
  rolCodigo: string | null;
  ambito: AmbitoRol;
  propiedadId?: number;
  edificioIds: number[];
  administracionId?: number;
  permisos: PermissionDescriptor[];
}

/** Instantanea por peticion; no se guardan permisos dentro del JWT. */
export interface AuthorizationContext {
  usuarioId: number;
  now: Date;
  grants: AuthorizationGrant[];
}

export interface AuthorizedScope {
  global: boolean;
  propiedadIds: number[];
  edificioIds: number[];
  administracionIds: number[];
}

export const isActiveAssignment = (assignment: { beginAt: Date; endAt: Date | null }, now: Date): boolean =>
  assignment.beginAt instanceof Date && Number.isFinite(assignment.beginAt.getTime()) &&
  assignment.beginAt <= now && (assignment.endAt === null ||
    (assignment.endAt instanceof Date && Number.isFinite(assignment.endAt.getTime()) && assignment.endAt > now));

export const permissionAllows = (permission: PermissionDescriptor, action: AccionPermiso): boolean => {
  if (!Object.values(AccionPermiso).includes(action)) return false;
  switch (action) {
    case AccionPermiso.CREAR: return permission.crear === true;
    case AccionPermiso.LEER: return permission.leer === true;
    case AccionPermiso.EDITAR: return permission.editar === true;
    case AccionPermiso.BORRAR: return permission.borrar === true;
    default: return Array.isArray(permission.acciones) && permission.acciones.includes(action);
  }
};

const validTarget = (target: AuthorizationTarget): boolean => Object.values(target).every(value =>
  value === undefined || (Number.isSafeInteger(value) && value > 0));

const grantMatchesTarget = (grant: AuthorizationGrant, target?: AuthorizationTarget): boolean => {
  if (target !== undefined && !validTarget(target)) return false;
  if (grant.ambito === AmbitoRol.GLOBAL) return true;
  // Sin recurso concreto solo se verifica acceso general a la ruta.
  if (target === undefined) return true;
  if (grant.ambito === AmbitoRol.PROPIEDAD) {
    if (target.administracionId !== undefined) return false;
    if (target.propiedadId !== undefined) {
      return target.propiedadId === grant.propiedadId &&
        (target.edificioId === undefined || grant.edificioIds.includes(target.edificioId));
    }
    return target.edificioId !== undefined && grant.edificioIds.includes(target.edificioId);
  }
  if (grant.ambito === AmbitoRol.ADMINISTRACION) {
    if (target.administracionId !== undefined && target.administracionId !== grant.administracionId) return false;
    if (target.edificioId !== undefined) return grant.edificioIds.includes(target.edificioId);
    return target.administracionId !== undefined && target.administracionId === grant.administracionId;
  }
  return false;
};

export const matchingGrants = (
  context: AuthorizationContext, section: SeccionPermiso, action: AccionPermiso,
  target?: AuthorizationTarget, ambito?: AmbitoRol,
): AuthorizationGrant[] => {
  if (!Object.values(SeccionPermiso).includes(section) || !Object.values(AccionPermiso).includes(action)) return [];
  return context.grants.filter(grant =>
    (ambito === undefined || grant.ambito === ambito) && grantMatchesTarget(grant, target) &&
    grant.permisos.some(permission => permission.seccion === section && permissionAllows(permission, action)));
};

export const hasPermission = (
  context: AuthorizationContext, section: SeccionPermiso, action: AccionPermiso,
  target?: AuthorizationTarget, ambito?: AmbitoRol,
): boolean => matchingGrants(context, section, action, target, ambito).length > 0;

export const requirePermission = (
  context: AuthorizationContext, section: SeccionPermiso, action: AccionPermiso,
  target?: AuthorizationTarget, ambito?: AmbitoRol,
): void => {
  if (!hasPermission(context, section, action, target, ambito)) {
    throw new AuthorizationError('No tiene permiso para realizar esta operacion en el ambito solicitado.');
  }
};

export const authorizedScope = (
  context: AuthorizationContext, section: SeccionPermiso, action: AccionPermiso, ambito?: AmbitoRol,
): AuthorizedScope => {
  const grants = matchingGrants(context, section, action, undefined, ambito);
  return {
    global: grants.some(grant => grant.ambito === AmbitoRol.GLOBAL),
    propiedadIds: [...new Set(grants.flatMap(grant => grant.propiedadId === undefined ? [] : [grant.propiedadId]))],
    edificioIds: [...new Set(grants.flatMap(grant => grant.edificioIds))],
    administracionIds: [...new Set(grants.flatMap(grant => grant.administracionId === undefined ? [] : [grant.administracionId]))],
  };
};

export const loadAuthorizationContext = async (
  usuarioId: EntityId, em: EntityManager = getEntityManager(),
): Promise<AuthorizationContext> => {
  const id = parseId(usuarioId);
  const now = new Date();
  const context: AuthorizationContext = { usuarioId: id, now, grants: [] };
  const user = await em.findOne(User, { id });
  if (!user || user.estado !== true || user.deletedAt) return context;
  const vigencia = { beginAt: { $lte: now }, $or: [{ endAt: null }, { endAt: { $gt: now } }] };
  const [globales, propiedades, empleos] = await Promise.all([
    em.find(UsuarioRol, { usuario: id, rol: { ambito: AmbitoRol.GLOBAL }, ...vigencia }, { populate: ['rol'] }),
    em.find(UsuarioRolPropiedad, { usuario: id, rol: { ambito: AmbitoRol.PROPIEDAD }, ...vigencia }, { populate: ['rol', 'propiedad.edificio'] }),
    em.find(Empleado, { usuario: id, rol: { ambito: AmbitoRol.ADMINISTRACION }, ...vigencia }, { populate: ['rol', 'administracion'] }),
  ]);
  const activeGlobals = globales.filter(item => isActiveAssignment(item, now) && item.rol?.ambito === AmbitoRol.GLOBAL);
  const activeProperties = propiedades.filter(item => isActiveAssignment(item, now) && item.rol?.ambito === AmbitoRol.PROPIEDAD &&
    item.propiedad?.edificio && !item.propiedad.edificio.deletedAt);
  const activeJobs = empleos.filter(item => isActiveAssignment(item, now) && item.rol?.ambito === AmbitoRol.ADMINISTRACION &&
    item.administracion && !item.administracion.deletedAt);
  const roleIds = [...new Set([...activeGlobals, ...activeProperties, ...activeJobs].map(item => item.rol.id))];
  if (roleIds.length === 0) return context;
  const administrationIds = [...new Set(activeJobs.map(item => item.administracion.id))];
  const [permissions, managements] = await Promise.all([
    em.find(RolPermiso, { rol: { $in: roleIds } }),
    administrationIds.length === 0 ? Promise.resolve([] as AdminEdificio[]) :
      em.find(AdminEdificio, { administracion: { $in: administrationIds }, ...vigencia }, { populate: ['edificio', 'administracion'] }),
  ]);
  const permissionsFor = (rolId: number): PermissionDescriptor[] => permissions
    .filter(permission => permission.rol.id === rolId)
    .map(({ seccion, crear, leer, editar, borrar, acciones }) => ({ seccion, crear, leer, editar, borrar, acciones: [...acciones] }));
  for (const item of activeGlobals) context.grants.push({
    rolId: item.rol.id, rolCodigo: item.rol.codigo ?? null, ambito: AmbitoRol.GLOBAL,
    edificioIds: [], permisos: permissionsFor(item.rol.id),
  });
  for (const item of activeProperties) context.grants.push({
    rolId: item.rol.id, rolCodigo: item.rol.codigo ?? null, ambito: AmbitoRol.PROPIEDAD,
    propiedadId: item.propiedad.id, edificioIds: [item.propiedad.edificio.id], permisos: permissionsFor(item.rol.id),
  });
  for (const item of activeJobs) context.grants.push({
    rolId: item.rol.id, rolCodigo: item.rol.codigo ?? null, ambito: AmbitoRol.ADMINISTRACION,
    administracionId: item.administracion.id,
    edificioIds: [...new Set(managements.filter(management => isActiveAssignment(management, now) &&
      management.administracion?.id === item.administracion.id && !management.administracion.deletedAt &&
      management.edificio && !management.edificio.deletedAt).map(management => management.edificio.id))],
    permisos: permissionsFor(item.rol.id),
  });
  return context;
};
