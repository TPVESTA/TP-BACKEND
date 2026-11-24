import { Request, Response } from 'express';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';
import { ResponseHelper } from '../helpers/response.helper';
import { requireAuthorization } from '../middlewares/authorization-request.helper';
import * as service from '../services/notificacion.service';

export const getNotificaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = req.query as { edificioId?: number; gestion?: boolean };
    const result = await service.getAllNotificaciones(requireAuthorization(req), filters);
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getNotificaciones');
  }
};

export const createNotificacion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createNotificacion(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Notificación creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createNotificacion');
  }
};

export const updateNotificacion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateNotificacion(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) return ResponseHelper.notFound(res, 'Notificación no encontrada');
    ResponseHelper.success(res, result, 'Notificación actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateNotificacion');
  }
};

export const deleteNotificacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteNotificacion(String(req.params.id), requireAuthorization(req));
    if (!result) return ResponseHelper.notFound(res, 'Notificación no encontrada');
    ResponseHelper.success(res, { id: Number(req.params.id) }, 'Notificación eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteNotificacion');
  }
};
