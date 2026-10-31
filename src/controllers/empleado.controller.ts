import { requireAuthorization } from '../middlewares/auth.middleware';
import { Request, Response } from 'express';
import * as service from '../services/empleado.service';
import { ResponseHelper } from '../helpers/response.helper';
import { handleControllerError, requireObjectBody } from '../helpers/controller.helper';

// Los schemas de las rutas validan y convierten los campos antes del controlador.

export const getEmpleados = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getAllEmpleados(requireAuthorization(req));
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getEmpleados');
  }
};

export const getEmpleado = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.getEmpleadoById(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Empleado no encontrado');
      return;
    }
    ResponseHelper.success(res, result);
  } catch (error: unknown) {
    handleControllerError(res, error, 'getEmpleado');
  }
};

export const createEmpleado = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.createEmpleado(req.body, requireAuthorization(req));
    ResponseHelper.created(res, result, 'Empleado creado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'createEmpleado');
  }
};

export const updateEmpleado = async (req: Request, res: Response): Promise<void> => {
  try {
    requireObjectBody(req.body);
    const result = await service.updateEmpleado(String(req.params.id), req.body, requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Empleado no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Empleado actualizado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'updateEmpleado');
  }
};

export const deleteEmpleado = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await service.deleteEmpleado(String(req.params.id), requireAuthorization(req));
    if (!result) {
      ResponseHelper.notFound(res, 'Empleado no encontrado');
      return;
    }
    ResponseHelper.success(res, result, 'Empleado eliminado exitosamente');
  } catch (error: unknown) {
    handleControllerError(res, error, 'deleteEmpleado');
  }
};

