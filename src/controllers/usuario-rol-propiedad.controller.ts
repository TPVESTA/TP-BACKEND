import { Request, Response } from 'express';
import * as service from '../services/usuario-rol-propiedad.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getUsuariosRolesPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllUsuariosRolesPropiedad();
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUsuariosRolesPropiedad');
  }
};

export const getUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getUsuarioRolPropiedadById(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol a propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUsuarioRolPropiedad');
  }
};

export const createUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createUsuarioRolPropiedad(req.body);
    ResponseHelper.created(res, result, 'Asignación de rol a propiedad creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createUsuarioRolPropiedad');
  }
};

export const updateUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateUsuarioRolPropiedad(String(req.params.id), req.body);
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol a propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Asignación de rol a propiedad actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateUsuarioRolPropiedad');
  }
};

export const deleteUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteUsuarioRolPropiedad(String(req.params.id));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol a propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, result, 'Asignación de rol a propiedad eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteUsuarioRolPropiedad');
  }
};

