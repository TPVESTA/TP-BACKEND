import { EntityManager } from '@mikro-orm/core';
import { AmbitoRol } from '../entities/enums';
import { AccionPermiso as A, CodigoRol, SeccionPermiso as S } from '../entities/Permiso';
import { Rol } from '../entities/Rol';
import { RolPermiso } from '../entities/RolPermiso';
import { User } from '../entities/User';
import { UsuarioRol } from '../entities/UsuarioRol';
import { DomainValidationError } from '../errors/domain.errors';
import type { PermissionDescriptor } from './authorization.service';

const permission = (seccion: S, actions: A[]): PermissionDescriptor => ({
  seccion,
  crear: actions.includes(A.CREAR), leer: actions.includes(A.LEER),
  editar: actions.includes(A.EDITAR), borrar: actions.includes(A.BORRAR),
  acciones: actions.filter(action => ![A.CREAR, A.LEER, A.EDITAR, A.BORRAR].includes(action)),
});

const contextualReads = [permission(S.ESTRUCTURA, [A.LEER]), permission(S.CATALOGOS, [A.LEER])];

/** Solo se aplica en la primera inicializacion de cada rol canonico. */
export const DEFAULT_ROLE_PERMISSIONS: Record<CodigoRol, PermissionDescriptor[]> = {
  [CodigoRol.RESIDENTE]: [
    permission(S.RESERVAS, [A.CREAR, A.LEER, A.EDITAR, A.DISPONIBILIDAD]),
    permission(S.INCIDENCIAS, [A.CREAR, A.LEER, A.EDITAR]),
    permission(S.EXPENSAS, [A.LEER]),
    permission(S.PROPIEDADES, [A.LEER]), ...contextualReads,
  ],
  [CodigoRol.PROPIETARIO]: [
    permission(S.INCIDENCIAS, [A.CREAR, A.LEER]),
    permission(S.EXPENSAS, [A.LEER]),
    permission(S.PROPIEDADES, [A.LEER]), ...contextualReads,
  ],
  [CodigoRol.MANTENIMIENTO]: [
    permission(S.RESERVAS, [A.LEER]),
    permission(S.INCIDENCIAS, [A.CREAR, A.LEER, A.EDITAR, A.CAMBIAR_ESTADO]),
    permission(S.ADMINISTRACIONES, [A.LEER]), ...contextualReads,
  ],
  [CodigoRol.ADMINISTRATIVO]: [
    permission(S.RESERVAS, [A.LEER, A.EDITAR]),
    permission(S.INCIDENCIAS, [A.CREAR, A.LEER, A.EDITAR, A.CAMBIAR_ESTADO]),
    permission(S.EXPENSAS, [A.CREAR, A.LEER, A.EDITAR, A.BORRAR, A.EMITIR, A.ANULAR, A.REGISTRAR_PAGO]),
    permission(S.USUARIOS, [A.CREAR, A.LEER, A.EDITAR, A.BORRAR]),
    permission(S.ASIGNACIONES, [A.LEER, A.ASIGNAR, A.REVOCAR]),
    permission(S.PROPIEDADES, [A.LEER]),
    permission(S.ADMINISTRACIONES, [A.LEER]), ...contextualReads,
  ],
  [CodigoRol.SUPERADMIN]: Object.values(S).map(section => permission(section, Object.values(A))),
};

export const getDefaultRolePermissions = (codigo: string | null): PermissionDescriptor[] => {
  if (codigo === null || !Object.values(CodigoRol).includes(codigo as CodigoRol)) return [];
  return DEFAULT_ROLE_PERMISSIONS[codigo as CodigoRol].map(item => ({ ...item, acciones: [...item.acciones] }));
};

const roles = [
  { codigo: CodigoRol.RESIDENTE, nombre: 'Residente', ambito: AmbitoRol.PROPIEDAD },
  { codigo: CodigoRol.PROPIETARIO, nombre: 'Propietario', ambito: AmbitoRol.PROPIEDAD },
  { codigo: CodigoRol.MANTENIMIENTO, nombre: 'Mantenimiento', ambito: AmbitoRol.ADMINISTRACION },
  { codigo: CodigoRol.ADMINISTRATIVO, nombre: 'Administrativo', ambito: AmbitoRol.ADMINISTRACION },
  { codigo: CodigoRol.SUPERADMIN, nombre: 'Superadministrador', ambito: AmbitoRol.GLOBAL },
];

export const seedDefaultPermissions = async (
  em: EntityManager, bootstrapAdminEmail: string | undefined = process.env.BOOTSTRAP_ADMIN_EMAIL,
): Promise<void> => {
  const now = new Date();
  const seeded = new Map<CodigoRol, Rol>();
  for (const definition of roles) {
    const existing = await em.findOne(Rol, { codigo: definition.codigo });
    const rol = existing ?? new Rol();
    if (!existing) {
      rol.codigo = definition.codigo;
      rol.nombre = definition.nombre;
      rol.descripcion = `Rol inicial ${definition.nombre}`;
      rol.ambito = definition.ambito;
    } else if (rol.ambito !== definition.ambito) {
      throw new DomainValidationError(`El rol ${definition.codigo} tiene un ambito incompatible con su configuracion inicial.`);
    }
    seeded.set(definition.codigo, rol);
    if (rol.permisosInicializadosAt !== null) continue;
    const records: (Rol | RolPermiso)[] = [rol];
    for (const descriptor of getDefaultRolePermissions(definition.codigo)) {
      // Una fila configurada antes de la marca conserva sus valores.
      if (existing && await em.findOne(RolPermiso, { rol: rol.id, seccion: descriptor.seccion })) continue;
      const entity = new RolPermiso();
      entity.rol = rol;
      Object.assign(entity, descriptor);
      records.push(entity);
    }
    rol.permisosInicializadosAt = now;
    await em.persistAndFlush(records);
  }
  const email = bootstrapAdminEmail?.trim();
  const superadmin = seeded.get(CodigoRol.SUPERADMIN)!;
  if (!email || superadmin.bootstrapRealizadoAt !== null) return;
  const usuario = await em.findOne(User, { email });
  if (!usuario || usuario.estado !== true || usuario.deletedAt) {
    throw new DomainValidationError('BOOTSTRAP_ADMIN_EMAIL debe identificar un usuario existente y activo.');
  }
  const assignment = await em.findOne(UsuarioRol, {
    usuario: usuario.id, rol: superadmin.id, beginAt: { $lte: now },
    $or: [{ endAt: null }, { endAt: { $gt: now } }],
  });
  const records: (Rol | UsuarioRol)[] = [superadmin];
  if (!assignment) {
    const entity = new UsuarioRol();
    entity.usuario = usuario;
    entity.rol = superadmin;
    entity.beginAt = now;
    records.push(entity);
  }
  superadmin.bootstrapRealizadoAt = now;
  await em.persistAndFlush(records);
};
