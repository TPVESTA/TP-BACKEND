import express from 'express';
import userRoutes from './user.routes';
import authRoutes from './auth.routes';
import administracionRoutes from './administracion.routes';
import edificioRoutes from './edificio.routes';
import localidadRoutes from './localidad.routes';
import tipoUnidadRoutes from './tipo-unidad.routes';
import unidadRoutes from './unidad.routes';
import propiedadRoutes from './propiedad.routes';
import areaComunRoutes from './area-comun.routes';
import rolRoutes from './rol.routes';
import empleadoRoutes from './empleado.routes';
import adminEdificioRoutes from './admin-edificio.routes';
import usuarioRolPropiedadRoutes from './usuario-rol-propiedad.routes';
import incidenciaRoutes from './incidencia.routes';
import reservacionRoutes from './reservacion.routes';
import { authMiddleware } from '../middlewares/auth.middleware';

import usuarioRolRoutes from './usuario-rol.routes';

const router: express.Router = express.Router();

// Configurar todas las rutas de la aplicación
router.use('/auth', authRoutes);
// Montar todas las rutas de negocio después de esta protección.
router.use(authMiddleware);
router.use('/users', userRoutes);
router.use('/usuarios-roles', usuarioRolRoutes);
router.use('/administraciones', administracionRoutes);
router.use('/edificios', edificioRoutes);
router.use('/localidades', localidadRoutes);
router.use('/tipos-unidad', tipoUnidadRoutes);
router.use('/unidades', unidadRoutes);
router.use('/propiedades', propiedadRoutes);
router.use('/areas-comunes', areaComunRoutes);
router.use('/roles', rolRoutes);
router.use('/empleados', empleadoRoutes);
router.use('/admin-edificios', adminEdificioRoutes);
router.use('/usuarios-roles-propiedad', usuarioRolPropiedadRoutes);
router.use('/incidencias', incidenciaRoutes);
router.use('/reservaciones', reservacionRoutes);

export default router;
