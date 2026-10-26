import { createSchema, updateSchema, nombreSchema } from './common.schema';
import Joi from 'joi';
import { AmbitoUnidad } from '../entities/AmbitoUnidad';

const fields = {
  nombre: nombreSchema,
  ambito: Joi.string().valid(...Object.values(AmbitoUnidad))
};

export const createTipoUnidadSchema = createSchema(fields);
export const updateTipoUnidadSchema = updateSchema(fields);
