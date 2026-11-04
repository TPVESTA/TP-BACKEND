import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/tipo-unidad.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getTiposUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllTiposUnidad(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getTiposUnidad');
  }
};

export const getTipoUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getTipoUnidadById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Tipo de unidad no encontrado');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getTipoUnidad');
  }
};

export const createTipoUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createTipoUnidad(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Tipo de unidad creado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createTipoUnidad');
  }
};

export const updateTipoUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateTipoUnidad(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Tipo de unidad no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Tipo de unidad actualizado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateTipoUnidad');
  }
};

export const deleteTipoUnidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteTipoUnidad(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Tipo de unidad no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Tipo de unidad eliminado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteTipoUnidad');
  }
};

