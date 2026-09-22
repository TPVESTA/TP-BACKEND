import { Request, Response } from 'express';
import * as service from '../services/edificio.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getEdificios = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllEdificios();
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getEdificios');
  }
};

export const getEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getEdificioById(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Edificio no encontrado');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getEdificio');
  }
};

export const createEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createEdificio(req.body);
    ResponseHelper.created(res, result, 'Edificio creado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createEdificio');
  }
};

export const updateEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateEdificio(String(req.params.id), req.body);
    if (!result) {
      ResponseHelper.notFound(res, 'Edificio no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Edificio actualizado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateEdificio');
  }
};

export const deleteEdificio = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteEdificio(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Edificio no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Edificio eliminado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteEdificio');
  }
};

