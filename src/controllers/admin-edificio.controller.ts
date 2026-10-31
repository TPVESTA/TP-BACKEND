import { requireAuthorization } from '../middlewares/auth.middleware';
import { Request, Response } from 'express';
import * as service from '../services/admin-edificio.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getAdminEdificios = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllAdminEdificios(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getAdminEdificios');
  }
};

export const getAdminEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAdminEdificioById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de administración a edificio no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getAdminEdificio');
  }
};

export const createAdminEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createAdminEdificio(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Asignación de administración a edificio creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createAdminEdificio');
  }
};

export const updateAdminEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateAdminEdificio(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de administración a edificio no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Asignación de administración a edificio actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateAdminEdificio');
  }
};

export const deleteAdminEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteAdminEdificio(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de administración a edificio no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Asignación de administración a edificio eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteAdminEdificio');
  }
};

