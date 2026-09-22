import Joi from 'joi';
import { createSchema, updateSchema, enteroNoNegativoSchema, unidadFields } from './common.schema';

const fields = {
  ...unidadFields,
  copropiedad: Joi.number().min(0).max(100).precision(4).strict(),
  habitaciones: enteroNoNegativoSchema
};

export const createPropiedadSchema = createSchema(fields);
export const updatePropiedadSchema = updateSchema(fields);

