import { Request, Response } from 'express';
import * as service from '../services/user.service';
import { requireAuthorization } from '../services/authorization-request.helper';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError } from '../helpers/controller.helper';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try { ResponseHelper.success(res, await service.getAllUsers(requireAuthorization(req))); }
  catch (error) { handleControllerError(res, error, 'getUsers'); }
};
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await service.getUserById(String(req.params.id), requireAuthorization(req));
    if (!user) { ResponseHelper.notFound(res, 'Usuario no encontrado'); return; }
    ResponseHelper.success(res, user);
  } catch (error) { handleControllerError(res, error, 'getUser'); }
};
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try { ResponseHelper.created(res, await service.createUser(req.body, requireAuthorization(req)), 'Usuario creado'); }
  catch (error) { handleControllerError(res, error, 'createUser'); }
};
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await service.updateUser(String(req.params.id), req.body, requireAuthorization(req));
    if (!user) { ResponseHelper.notFound(res, 'Usuario no encontrado'); return; }
    ResponseHelper.success(res, user, 'Usuario actualizado');
  } catch (error) { handleControllerError(res, error, 'updateUser'); }
};
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await service.deleteUser(String(req.params.id), requireAuthorization(req));
    if (!user) { ResponseHelper.notFound(res, 'Usuario no encontrado'); return; }
    ResponseHelper.success(res, user, 'Cuenta dada de baja');
  } catch (error) { handleControllerError(res, error, 'deleteUser'); }
};
