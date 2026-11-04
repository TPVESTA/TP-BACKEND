import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/usuario-rol-propiedad.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';
import { serializeAssignment } from '../helpers/assignment-response.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getUsuariosRolesPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usuarioId } = req.query as { usuarioId?: number };
    const result = await service.getAllUsuariosRolesPropiedad(requireAuthorization(req), usuarioId);
    ResponseHelper.success(res, result.map(serializeAssignment));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUsuariosRolesPropiedad');
  }
};

export const getUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getUsuarioRolPropiedadById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol a propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeAssignment(result));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUsuarioRolPropiedad');
  }
};

export const createUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createUsuarioRolPropiedad(req.body, requireAuthorization(req));
    ResponseHelper.created(res, serializeAssignment(result), 'Asignación de rol a propiedad creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createUsuarioRolPropiedad');
  }
};

export const updateUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateUsuarioRolPropiedad(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol a propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeAssignment(result), 'Asignación de rol a propiedad actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateUsuarioRolPropiedad');
  }
};

export const deleteUsuarioRolPropiedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteUsuarioRolPropiedad(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol a propiedad no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeAssignment(result), 'Asignación de rol a propiedad eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteUsuarioRolPropiedad');
  }
};

