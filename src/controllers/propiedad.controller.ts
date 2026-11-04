import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/propiedad.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getPropiedades = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllPropiedades(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getPropiedades');
  }
};

export const getPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getPropiedadById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getPropiedad');
  }
};

export const createPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createPropiedad(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Propiedad creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createPropiedad');
  }
};

export const updatePropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updatePropiedad(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Propiedad actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updatePropiedad');
  }
};

export const deletePropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deletePropiedad(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Propiedad eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deletePropiedad');
  }
};

