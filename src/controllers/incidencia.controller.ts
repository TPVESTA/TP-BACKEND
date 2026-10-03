import { Request, Response } from 'express';
import type {} from '../middlewares/auth.middleware';
import * as service from '../services/incidencia.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getIncidencias = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllIncidencias();
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getIncidencias');
  }
};

export const getIncidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getIncidenciaById(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Incidencia no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getIncidencia');
  }
};

export const createIncidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createIncidencia(req.body);
    ResponseHelper.created(res, result, 'Incidencia creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createIncidencia');
  }
};

export const updateIncidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = req.user
      ? await service.updateIncidencia(String(req.params.id), req.body, req.user.id)
      : await service.updateIncidencia(String(req.params.id), req.body);
    if (!result) {
      ResponseHelper.notFound(res, 'Incidencia no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Incidencia actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateIncidencia');
  }
};

export const deleteIncidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteIncidencia(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Incidencia no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Incidencia eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteIncidencia');
  }
};
