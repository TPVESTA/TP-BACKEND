import Joi from 'joi';
import { EstadoReservacion } from '../entities/EstadoReservacion';
import { createSchema, updateSchema, fechaSchema, descripcionSchema, idSchema } from './common.schema';

const fields = {
  fechaReservacion: fechaSchema,
  descripcion: descripcionSchema,
  areaComunId: idSchema,
  propiedadId: idSchema
};

export const createReservacionSchema = createSchema({ ...fields, usuarioId: Joi.forbidden(), estado: Joi.forbidden() }, ['fechaReservacion', 'descripcion', 'areaComunId']);
export const updateReservacionSchema = updateSchema({
  ...fields,
  usuarioId: Joi.forbidden(),
  propiedadId: Joi.forbidden(),
  estado: Joi.string().valid(EstadoReservacion.CANCELADO),
});

export const disponibilidadReservacionSchema = Joi.object({ areaComunId: idSchema.required() }).required();
