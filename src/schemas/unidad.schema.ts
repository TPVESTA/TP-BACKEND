import Joi from 'joi';
import { createPropiedadSchema, updatePropiedadSchema } from './propiedad.schema';
import { createAreaComunSchema, updateAreaComunSchema } from './area-comun.schema';

// Los campos del otro subtipo se rechazan incluso con stripUnknown.
export const createUnidadSchema = Joi.alternatives().try(
  createPropiedadSchema.keys({
    clase: Joi.string().valid('propiedad').required(),
    capacidad: Joi.forbidden()
  }),
  createAreaComunSchema.keys({
    clase: Joi.string().valid('area_comun').required(),
    copropiedad: Joi.forbidden(),
    habitaciones: Joi.forbidden()
  })
).required();

export const updateUnidadSchema = Joi.alternatives().try(
  updatePropiedadSchema.keys({
    clase: Joi.string().valid('propiedad').required(),
    capacidad: Joi.forbidden()
  }).min(2),
  updateAreaComunSchema.keys({
    clase: Joi.string().valid('area_comun').required(),
    copropiedad: Joi.forbidden(),
    habitaciones: Joi.forbidden()
  }).min(2)
).required();

