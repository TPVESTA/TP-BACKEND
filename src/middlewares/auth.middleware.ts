import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserByIdForAuth } from '../services/auth.service';
import { AuthorizationContext, loadAuthorizationContext } from '../services/authorization.service';
import { AuthenticationError, AuthorizationError } from '../errors/domain.errors';

declare global {
  namespace Express {
    interface Request {
      authorization?: AuthorizationContext;
      user?: {
        id: number;
        nombre: string;
        apellido: string;
        email: string;
        fechaNacimiento: Date;
        estado: boolean;
      };
    }
  }
}

// 1. Autenticación: valida el token y carga la cuenta activa.
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  delete req.user;
  try {
    const header = req.headers.authorization;
    if (!header) throw new AuthenticationError('Token de acceso requerido');
    const match = /^Bearer[ \t]+(\S+)$/i.exec(header);
    if (!match) throw new AuthenticationError('Formato de token inválido. Use: Bearer <token>');
    const { userId } = verifyToken(match[1]);
    const user = await getUserByIdForAuth(userId);
    if (!user || user.deletedAt != null || !user.estado) {
      throw new AuthenticationError('Usuario inexistente o deshabilitado');
    }
    req.user = {
      id: user.id, nombre: user.nombre, apellido: user.apellido,
      email: user.email, fechaNacimiento: user.fechaNacimiento, estado: user.estado
    };
  } catch (error: unknown) {
    next(error);
    return;
  }
  next();
};

// Opcional significa que se permite omitir el token. Si se presenta, debe ser válido.
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.headers.authorization === undefined) {
    delete req.user;
    next();
    return;
  }
  await authMiddleware(req, res, next);
};

// 2. Autorización: carga roles y permisos vigentes para esta petición.
export const authorizationMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  delete req.authorization;
  try {
    if (!req.user) throw new AuthenticationError('Usuario no autenticado');
    req.authorization = await loadAuthorizationContext(req.user.id);
    next();
  } catch (error) { next(error); }
};

// Los controladores toman de aquí el contexto que pasan a los servicios.
export const requireAuthorization = (req: Request): AuthorizationContext => {
  if (!req.authorization) throw new AuthorizationError('Se requiere el contexto de autorización.');
  return req.authorization;
};
