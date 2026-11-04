import { requireAuthorization } from '../middlewares/authorization-request.helper';
import { Request, Response } from 'express';
import * as service from '../services/rol.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError } from '../helpers/controller.helper';

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
