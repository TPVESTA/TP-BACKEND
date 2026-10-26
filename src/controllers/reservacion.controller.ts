import { Request, Response } from 'express';
import type {} from '../middlewares/auth.middleware';
import type {} from '../middlewares/authorization.middleware';
import * as service from '../services/reservacion.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';
import { requireAuthorization } from '../services/authorization-request.helper';
import { serializeReservacion } from '../helpers/business-response.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getReservaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllReservaciones(requireAuthorization(req));
    ResponseHelper.success(res, result.map(serializeReservacion));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getReservaciones');
  }
};

export const getReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getReservacionById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Reservación no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeReservacion(result));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getReservacion');
  }
};

export const createReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createReservacion(req.body, requireAuthorization(req));
    ResponseHelper.created(res, serializeReservacion(result), 'Reservación creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createReservacion');
  }
};

export const updateReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateReservacion(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Reservación no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeReservacion(result), 'Reservación actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateReservacion');
  }
};

export const deleteReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteReservacion(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Reservación no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeReservacion(result), 'Reservación eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteReservacion');
  }
};

export const getDisponibilidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getDisponibilidadReservaciones(String(req.query.areaComunId), requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getDisponibilidad');
  }
};
