import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/localidad.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getLocalidades = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllLocalidades(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getLocalidades');
  }
};

export const getLocalidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getLocalidadById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Localidad no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getLocalidad');
  }
};

export const createLocalidad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createLocalidad(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Localidad creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createLocalidad');
  }
};

export const updateLocalidad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateLocalidad(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Localidad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Localidad actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateLocalidad');
  }
};

export const deleteLocalidad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteLocalidad(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Localidad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Localidad eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteLocalidad');
  }
};

