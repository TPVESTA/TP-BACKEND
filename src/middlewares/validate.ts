import { Request, Response, NextFunction } from 'express';
import Joi, { Schema } from 'joi';

type Location = 'body' | 'params' | 'query';
interface ValidateOptions {
  location?: Location;
  schema: Schema;
  abortEarly?: boolean;
  stripUnknown?: boolean;
}

export function validate({ location = 'body', schema, abortEarly = false, stripUnknown = true }: ValidateOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const value = await schema.validateAsync(req[location], { abortEarly, stripUnknown });
      // Express 5 expone query como getter sin setter. Se guarda el resultado
      // validado en una propiedad propia para que los handlers reciban conversiones.
      if (location === 'query') {
        Object.defineProperty(req, 'query', {
          value, writable: true, enumerable: true, configurable: true
        });
      } else {
        req[location] = value;
      }
    } catch (error: unknown) {
      if (!Joi.isError(error)) {
        next(error);
        return;
      }
      const details = error.details.map(detail => detail.message.replace(/"/g, ''));
      res.status(400).json({
        success: false, error: details[0] || 'Datos inválidos', errors: details
      });
      return;
    }
    next();
  };
}
