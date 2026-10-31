import { AmbitoRol } from '../entities/enums';
import { CodigoRol } from '../entities/Permiso';

/** Compatibilidad con el rol SysAdmin anterior a los codigos internos. */
export const isSystemAdminRole = (role: { ambito: AmbitoRol; codigo?: string | null; nombre?: string }): boolean =>
  role.ambito === AmbitoRol.GLOBAL && (
    role.codigo === CodigoRol.SUPERADMIN || role.codigo === 'SYSADMIN' ||
    (role.codigo == null && role.nombre?.trim().toLowerCase() === 'sysadmin')
  );
