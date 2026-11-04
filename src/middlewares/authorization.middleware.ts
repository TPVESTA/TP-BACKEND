import { Request, Response, NextFunction } from 'express';
import { AuthorizationContext, loadAuthorizationContext } from '../services/authorization/authorization.service';
import { AuthenticationError } from '../errors/authentication.error';

declare global {
  namespace Express {
    interface Request { authorization?: AuthorizationContext; }
  }
}

export const authorizationMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  delete req.authorization;
  try {
    if (!req.user) throw new AuthenticationError('Usuario no autenticado');
    // authMiddleware ya cargó al usuario de esta petición y rechazó cuentas inexistentes, dadas de baja o inactivas.
    req.authorization = await loadAuthorizationContext(req.user.id, undefined, { userVerified: true });
    next();
  } catch (error) { next(error); }
};
