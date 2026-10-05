import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { registerUserSchema, loginUserSchema, updateProfileSchema } from '../schemas/user.schema';
import { authorizationMiddleware } from '../middlewares/authorization.middleware';

const router: express.Router = express.Router();

// POST /auth/register - Registrar un nuevo usuario
router.post('/register', validate({ location: 'body', schema: registerUserSchema }), authController.register);

// POST /auth/login - Iniciar sesión
router.post('/login', validate({ location: 'body', schema: loginUserSchema }), authController.login);

// Solo login y registro son públicos dentro de este router.
router.use(authMiddleware);
router.use(authorizationMiddleware);

// GET /auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', authController.getProfile);
router.put('/profile', validate({ schema: updateProfileSchema, stripUnknown: false }), authController.updateProfile);
router.get('/permisos', authController.getPermissions);

// GET /auth/verify - Verificar si el token es válido (requiere autenticación)
router.get('/verify', authController.verifyToken);

export default router;
