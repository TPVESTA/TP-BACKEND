import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../errors/authentication.error';
import { handleControllerError } from '../helpers/controller.helper';
import { ResponseHelper } from '../helpers/response.helper';

export const notFoundMiddleware = (req: Request, res: Response): void => {
  ResponseHelper.notFound(res, 'Ruta no encontrada');
};

export const errorMiddleware = (error: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (error instanceof AuthenticationError) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    ResponseHelper.unauthorized(res, error.message);
    return;
  }
  if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      ResponseHelper.badRequest(res, 'El cuerpo contiene JSON inválido');
      return;
    }
    if (error.type === 'entity.too.large') {
      ResponseHelper.error(res, 'El cuerpo de la solicitud es demasiado grande', 413);
      return;
    }
  }
  handleControllerError(res, error, req.method + ' ' + req.path);
};
