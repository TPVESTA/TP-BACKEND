import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/administracion.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getAdministraciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllAdministraciones(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getAdministraciones');
  }
};

export const getAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAdministracionById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Administración no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getAdministracion');
  }
};

export const createAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createAdministracion(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Administración creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createAdministracion');
  }
};

export const updateAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateAdministracion(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Administración no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Administración actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateAdministracion');
  }
};

export const deleteAdministracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteAdministracion(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Administración no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Administración eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteAdministracion');
  }
};

