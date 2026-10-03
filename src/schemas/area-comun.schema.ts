import Joi from 'joi';
import { createSchema, updateSchema, enteroNoNegativoSchema, unidadFields } from './common.schema';

const fields = {
  ...unidadFields,
  capacidad: Joi.alternatives().try(
    enteroNoNegativoSchema,
    Joi.string().pattern(/^\s*$/).allow('')
  ).allow(null).custom(value => value === 0 || typeof value === 'string' ? null : value)
};

export const createAreaComunSchema = createSchema(fields, Object.keys(unidadFields));
export const updateAreaComunSchema = updateSchema(fields);
