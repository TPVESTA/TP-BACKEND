import { requireAuthorization } from '../middlewares/auth.middleware';
import { Request, Response } from 'express';
import * as service from '../services/area-comun.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getAreasComunes = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllAreasComunes(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getAreasComunes');
  }
};

export const getAreaComun = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAreaComunById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Área común no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getAreaComun');
  }
};

export const createAreaComun = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createAreaComun(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Área común creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createAreaComun');
  }
};

export const updateAreaComun = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateAreaComun(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Área común no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Área común actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateAreaComun');
  }
};

export const deleteAreaComun = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteAreaComun(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Área común no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Área común eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteAreaComun');
  }
};

