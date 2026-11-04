import { Request, Response } from 'express';
import type {} from '../middlewares/auth.middleware';
import type {} from '../middlewares/authorization.middleware';
import * as service from '../services/incidencia.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';
import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { serializeIncidencia } from '../helpers/business-response.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getIncidencias = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllIncidencias(requireAuthorization(req));
    ResponseHelper.success(res, result.map(serializeIncidencia));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getIncidencias');
  }
};

export const getIncidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getIncidenciaById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Incidencia no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeIncidencia(result));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getIncidencia');
  }
};

export const createIncidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createIncidencia(req.body, requireAuthorization(req));
    ResponseHelper.created(res, serializeIncidencia(result), 'Incidencia creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createIncidencia');
  }
};

export const updateIncidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateIncidencia(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Incidencia no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeIncidencia(result), 'Incidencia actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateIncidencia');
  }
};
