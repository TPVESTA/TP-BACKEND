import { Request, Response } from 'express';
import * as service from '../services/reservacion.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getReservaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllReservaciones();
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getReservaciones');
  }
};

export const getReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getReservacionById(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Reservación no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getReservacion');
  }
};

export const createReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createReservacion(req.body);
    ResponseHelper.created(res, result, 'Reservación creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createReservacion');
  }
};

export const updateReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateReservacion(String(req.params.id), req.body);
    if (!result) {
      ResponseHelper.notFound(res, 'Reservación no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Reservación actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateReservacion');
  }
};

export const deleteReservacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteReservacion(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Reservación no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Reservación eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteReservacion');
  }
};

