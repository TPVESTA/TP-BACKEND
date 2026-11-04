import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/unidad.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getUnidades = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllUnidades(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUnidades');
  }
};

export const getUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getUnidadById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Unidad no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUnidad');
  }
};

export const createUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createUnidad(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Unidad creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createUnidad');
  }
};

export const updateUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateUnidad(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Unidad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Unidad actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateUnidad');
  }
};

export const deleteUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteUnidad(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Unidad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Unidad eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteUnidad');
  }
};

