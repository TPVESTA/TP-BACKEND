import Joi from 'joi';
import { EstadoReservacion } from '../entities/EstadoReservacion';
import { createSchema, updateSchema, fechaSchema, descripcionSchema, idSchema } from './common.schema';

const fields = {
  fechaReservacion: fechaSchema,
  descripcion: descripcionSchema,
  usuarioId: idSchema,
  areaComunId: idSchema
};

export const createReservacionSchema = createSchema({ ...fields, estado: Joi.forbidden() }, Object.keys(fields));
export const updateReservacionSchema = updateSchema({
  ...fields,
  usuarioId: Joi.forbidden(),
  estado: Joi.string().valid(EstadoReservacion.CANCELADO),
});
