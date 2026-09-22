import Joi from 'joi';
import { AmbitoRol } from '../entities/AmbitoRol';
import { createSchema, updateSchema, nombreSchema, textoCortoSchema } from './common.schema';

const fields = {
  nombre: nombreSchema,
  descripcion: textoCortoSchema,
  ambito: Joi.string().valid(...Object.values(AmbitoRol))
};

export const createRolSchema = createSchema(fields);
export const updateRolSchema = updateSchema(fields);

