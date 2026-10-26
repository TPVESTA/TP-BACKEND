import { Request, Response, NextFunction } from 'express';
import { AuthorizationContext, loadAuthorizationContext } from '../services/authorization.service';
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
    req.authorization = await loadAuthorizationContext(req.user.id);
    next();
  } catch (error) { next(error); }
};
