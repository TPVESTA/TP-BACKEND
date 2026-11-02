import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserByIdForAuth } from '../services/auth.service';
import { AuthenticationError } from '../errors/authentication.error';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        nombre: string;
        apellido: string;
        email: string;
        telefono: string;
        fechaNacimiento: Date;
        estado: boolean;
      };
    }
  }
}

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
      email: user.email, telefono: user.telefono, fechaNacimiento: user.fechaNacimiento, estado: user.estado
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
