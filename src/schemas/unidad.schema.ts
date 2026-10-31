import Joi from 'joi';
import { createSchema, updateSchema, enteroNoNegativoSchema, unidadFields } from './common.schema';

const propiedadFields = {
  ...unidadFields,
  copropiedad: Joi.number().min(0).max(100).precision(4).strict(),
  habitaciones: enteroNoNegativoSchema
};

export const createPropiedadSchema = createSchema(propiedadFields);
export const updatePropiedadSchema = updateSchema(propiedadFields);

const areaComunFields = {
  ...unidadFields,
  capacidad: Joi.alternatives().try(
    enteroNoNegativoSchema,
    Joi.string().pattern(/^\s*$/).allow('')
  ).allow(null).custom(value => value === 0 || typeof value === 'string' ? null : value)
};

export const createAreaComunSchema = createSchema(areaComunFields, Object.keys(unidadFields));
export const updateAreaComunSchema = updateSchema(areaComunFields);

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
