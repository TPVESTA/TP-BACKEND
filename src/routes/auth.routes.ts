import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate';
import { registerUserSchema, loginUserSchema } from '../schemas/user.schema';

const router: express.Router = express.Router();

// POST /auth/register - Registrar un nuevo usuario
router.post('/register', validate({ location: 'body', schema: registerUserSchema }), authController.register);

// POST /auth/login - Iniciar sesión
router.post('/login', validate({ location: 'body', schema: loginUserSchema }), authController.login);

// Solo login y registro son públicos dentro de este router.
router.use(authMiddleware);

// GET /auth/profile - Obtener perfil del usuario autenticado
router.get('/profile', authController.getProfile);

// GET /auth/verify - Verificar si el token es válido (requiere autenticación)
router.get('/verify', authController.verifyToken);

export default router;
