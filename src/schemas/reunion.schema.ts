import Joi from 'joi';
import { createSchema, descripcionSchema, idSchema, textoCortoSchema, updateSchema } from './common.schema';

const fields = {
  asunto: textoCortoSchema,
  minuta: descripcionSchema,
  fecha: Joi.string().pattern(/^[1-9]\d{3}-\d{2}-\d{2}$/).custom((value: string, helpers) => {
    const fecha = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== value) {
      return helpers.error('any.invalid');
    }
    return value;
  }).messages({
    'string.pattern.base': '{#label} debe tener el formato YYYY-MM-DD',
    'any.invalid': '{#label} debe ser una fecha válida',
  }),
  hora: Joi.string().pattern(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
    .custom((value: string) => value.length === 5 ? `${value}:00` : value)
    .messages({ 'string.pattern.base': '{#label} debe ser una hora válida en formato HH:mm o HH:mm:ss' }),
  edificioId: idSchema,
};

export const createReunionSchema = createSchema(fields);
export const updateReunionSchema = updateSchema(fields);
