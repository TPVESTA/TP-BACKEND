import { requireAuthorization } from '../middlewares/auth.middleware';
import { Request, Response } from 'express';
import * as service from '../services/rol.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllRoles(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getRoles');
  }
};

export const getRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getRolById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Rol no encontrado');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getRol');
  }
};

export const createRol = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createRol(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Rol creado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createRol');
  }
};

export const updateRol = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateRol(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Rol no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Rol actualizado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateRol');
  }
};

export const deleteRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteRol(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Rol no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Rol eliminado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteRol');
  }
};

export const replacePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = await service.replaceRolPermissions(String(req.params.id), req.body.permisos, requireAuthorization(req));
    if (!role) { ResponseHelper.notFound(res, 'Rol no encontrado'); return; }
    ResponseHelper.success(res, role, 'Permisos actualizados');
  } catch (error) { handleControllerError(res, error, 'replacePermissions'); }
};
