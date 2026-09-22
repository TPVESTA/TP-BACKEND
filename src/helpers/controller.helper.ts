import { Response } from 'express';
import { ForeignKeyConstraintViolationException, UniqueConstraintViolationException } from '@mikro-orm/core';
import { DomainValidationError } from '../errors/domain-validation.error';
import { ResponseHelper } from './response.helper';

// Solo comprueba la estructura; las reglas de cada campo corresponden a Joi.
export const requireObjectBody = (body: unknown): void => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new DomainValidationError('El cuerpo de la solicitud debe ser un objeto JSON');
  }
};

export const handleControllerError = (res: Response, error: unknown, operation: string): void => {
  if (error instanceof DomainValidationError) {
    ResponseHelper.badRequest(res, error.message);
    return;
  }
  if (error instanceof UniqueConstraintViolationException) {
    ResponseHelper.error(res, 'Ya existe un registro con esos datos únicos', 409);
    return;
  }
  if (error instanceof ForeignKeyConstraintViolationException) {
    ResponseHelper.error(res, 'La operación entra en conflicto con registros relacionados', 409);
    return;
  }
  console.error(`Error en ${operation}:`, error);
  ResponseHelper.error(res, 'Error interno del servidor');
};
