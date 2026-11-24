import Joi from 'joi';
import { PrioridadNotificacion } from '../entities/Notificacion';
import { createSchema, descripcionSchema, fechaSchema, idSchema, textoCortoSchema, updateSchema } from './common.schema';

const fields = {
  titulo: textoCortoSchema,
  descripcion: descripcionSchema,
  muestraDesde: fechaSchema,
  muestraHasta: fechaSchema,
  prioridad: Joi.string().valid(...Object.values(PrioridadNotificacion)),
  edificioId: idSchema,
  rolIds: Joi.array().items(idSchema).min(1).unique(),
};

export const createNotificacionSchema = createSchema(fields, [
  'titulo', 'descripcion', 'muestraHasta', 'prioridad', 'edificioId', 'rolIds',
]);
export const updateNotificacionSchema = updateSchema(fields);
export const listNotificacionesSchema = Joi.object({
  edificioId: idSchema,
  gestion: Joi.boolean(),
});
