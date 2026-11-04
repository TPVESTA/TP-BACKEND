import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../helpers/response.helper';
import * as authService from '../services/auth.service';
import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { updateOwnProfile } from '../services/user.service';
import { handleControllerError } from '../helpers/controller.helper';

// Controlador para registro de usuarios
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userData = req.body;
    const result = await authService.register(userData);
    
    ResponseHelper.created(res, result, 'Usuario registrado exitosamente');
  } catch (error) {
    next(error);
  }
};

// Controlador para inicio de sesión
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const loginData = req.body;
    const result = await authService.login(loginData);
    
    ResponseHelper.success(res, result, 'Inicio de sesión exitoso');
  } catch (error) {
    next(error);
  }
};

// authMiddleware deja la identidad en req.user; la comprobación protege si una ruta se montara sin él.

// Controlador para obtener perfil del usuario autenticado
export const getProfile = (req: Request, res: Response): void => {
  if (!req.user) { ResponseHelper.unauthorized(res, 'Usuario no autenticado'); return; }
  ResponseHelper.success(res, req.user, 'Perfil obtenido exitosamente');
};

// Controlador para verificar si el token es válido
export const verifyToken = (req: Request, res: Response): void => {
  if (!req.user) { ResponseHelper.unauthorized(res, 'Token inválido'); return; }
  ResponseHelper.success(res, { valid: true, user: req.user }, 'Token válido');
};

export const getPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const ctx = requireAuthorization(req);
    ResponseHelper.success(res, { usuarioId: ctx.usuarioId, contextos: ctx.grants });
  } catch (error) { handleControllerError(res, error, 'getPermissions'); }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { ResponseHelper.unauthorized(res, 'Usuario no autenticado'); return; }
    // Solo edita la cuenta del token; los campos permitidos los controla el servicio.
    const user = await updateOwnProfile(req.body, req.user.id);
    if (!user) { ResponseHelper.notFound(res, 'Usuario no encontrado'); return; }
    ResponseHelper.success(res, user, 'Perfil actualizado');
  } catch (error) { handleControllerError(res, error, 'updateProfile'); }
};
