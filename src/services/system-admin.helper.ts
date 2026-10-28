import { AmbitoRol } from '../entities/AmbitoRol';
import { CodigoRol } from '../entities/Permiso';

/** El acceso total se reconoce por el codigo interno, no por el texto visible. */
export const isSystemAdminRole = (role: { ambito: AmbitoRol; codigo?: string | null }): boolean =>
  role.ambito === AmbitoRol.GLOBAL && (role.codigo === CodigoRol.SUPERADMIN || role.codigo === 'SYSADMIN');
