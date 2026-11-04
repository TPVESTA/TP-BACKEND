import { Request, Response, NextFunction } from 'express';
import { verifyToken, getUserByIdForAuth, toPublicUser, type PublicUser } from '../services/auth.service';
import { AuthenticationError } from '../errors/authentication.error';

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
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
    req.user = toPublicUser(user);
  } catch (error: unknown) {
    next(error);
    return;
  }
  next();
};
