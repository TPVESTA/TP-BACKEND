import { Request } from 'express';
import type {} from './authorization.middleware';
import { AuthorizationContext } from '../services/authorization/authorization.service';
import { AuthorizationError } from '../errors/authorization.error';

export const requireAuthorization = (req: Request): AuthorizationContext => {
  if (!req.authorization) throw new AuthorizationError('Se requiere el contexto de autorización.');
  return req.authorization;
};
