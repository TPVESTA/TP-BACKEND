import Joi from 'joi';
import { EstadoIncidencia } from '../entities/EstadoIncidencia';
import { createSchema, updateSchema, descripcionSchema, idSchema } from './common.schema';

const fields = {
  descripcion: descripcionSchema,
  unidadId: idSchema,
  propiedadId: idSchema
};

export const createIncidenciaSchema = createSchema({ ...fields, usuarioId: Joi.forbidden(), estado: Joi.forbidden(), closedAt: Joi.forbidden() }, ['descripcion', 'unidadId']);
export const updateIncidenciaSchema = updateSchema({
  descripcion: descripcionSchema,
  usuarioId: Joi.forbidden(),
  unidadId: Joi.forbidden(),
  propiedadId: Joi.forbidden(),
  closedAt: Joi.forbidden(),
  estado: Joi.string().valid(...Object.values(EstadoIncidencia)),
});
