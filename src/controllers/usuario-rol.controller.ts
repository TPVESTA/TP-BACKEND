import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/usuario-rol.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';
import { serializeAssignment } from '../helpers/assignment-response.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getUsuariosRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usuarioId } = req.query as { usuarioId?: number };
    const result = await service.getAllUsuariosRoles(requireAuthorization(req), usuarioId);
    ResponseHelper.success(res, result.map(serializeAssignment));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUsuariosRoles');
  }
};

export const getUsuarioRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getUsuarioRolById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol global no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeAssignment(result));
  } catch (error: unknown) {
    handleControllerError(res, error, 'getUsuarioRol');
  }
};

export const createUsuarioRol = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createUsuarioRol(req.body, requireAuthorization(req));
    ResponseHelper.created(res, serializeAssignment(result), 'Asignación de rol global creada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createUsuarioRol');
  }
};

export const updateUsuarioRol = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateUsuarioRol(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol global no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeAssignment(result), 'Asignación de rol global actualizada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateUsuarioRol');
  }
};

export const deleteUsuarioRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteUsuarioRol(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Asignación de rol global no encontrada');
      return;
    }
    ResponseHelper.success(res, serializeAssignment(result), 'Asignación de rol global eliminada exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteUsuarioRol');
  }
};

