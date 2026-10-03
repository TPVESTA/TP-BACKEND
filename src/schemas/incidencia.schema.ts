import Joi from 'joi';
import { EstadoIncidencia } from '../entities/EstadoIncidencia';
import { createSchema, updateSchema, descripcionSchema, idSchema } from './common.schema';

const fields = {
  descripcion: descripcionSchema,
  usuarioId: idSchema,
  unidadId: idSchema
};

export const createIncidenciaSchema = createSchema({ ...fields, estado: Joi.forbidden(), closedAt: Joi.forbidden() }, Object.keys(fields));
export const updateIncidenciaSchema = updateSchema({
  ...fields,
  closedAt: Joi.forbidden(),
  estado: Joi.string().valid(...Object.values(EstadoIncidencia)),
});
