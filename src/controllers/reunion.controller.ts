import { Request, Response } from 'express';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';
import { ResponseHelper } from '../helpers/response.helper';
import { requireAuthorization } from '../middlewares/authorization-request.helper';
import * as service from '../services/reunion.service';

export const getReuniones = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllReuniones(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getReuniones');
  }
};

export const getReunion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getReunionById(String(req.params.id), requireAuthorization(req));
    if (!result) return ResponseHelper.notFound(res, 'Reunión no encontrada');
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getReunion');
  }
};

export const createReunion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createReunion(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Reunión creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createReunion');
  }
};

export const updateReunion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateReunion(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) return ResponseHelper.notFound(res, 'Reunión no encontrada');
    ResponseHelper.success(res, result, 'Reunión actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateReunion');
  }
};

export const deleteReunion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteReunion(String(req.params.id), requireAuthorization(req));
    if (!result) return ResponseHelper.notFound(res, 'Reunión no encontrada');
    ResponseHelper.success(res, result, 'Reunión eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteReunion');
  }
};
