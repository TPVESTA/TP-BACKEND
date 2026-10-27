import Joi from 'joi';

export const idSchema = Joi.alternatives().try(
  Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).strict(),
  Joi.string().pattern(/^\d+$/).custom((value: string, helpers) => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : helpers.error('any.invalid');
  })
).messages({ 'alternatives.match': 'El ID debe ser un entero positivo seguro' });

export const idParamSchema = Joi.object({ id: idSchema.required() }).required();
export const nombreSchema = Joi.string().trim().min(2).max(100);
// Nombres de persona: letras (con tildes y ñ), separadas por espacio, apóstrofo o guion.
export const nombrePersonaSchema = Joi.string().trim().min(2).max(100).pattern(/^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u).messages({
  'string.pattern.base': '{#label} solo puede contener letras, espacios, apóstrofos y guiones',
  'string.min': '{#label} debe tener al menos {#limit} caracteres',
  'string.max': '{#label} no puede superar {#limit} caracteres',
});
export const textoCortoSchema = Joi.string().trim().min(1).max(255);
export const descripcionSchema = Joi.string().trim().min(1);
export const emailSchema = Joi.string().trim().email({ tlds: { allow: false } }).max(255);
export const identificacionFiscalSchema = Joi.string().trim().pattern(/^\d{11}$/)
  .messages({ 'string.pattern.base': '{#label} debe contener 11 dígitos sin guiones' });
export const fechaSchema = Joi.date().iso();
export const enteroNoNegativoSchema = Joi.number().integer().min(0).max(2147483647).strict();

// Todos los campos indicados son obligatorios en el alta; los opcionales
// del servicio se excluyen de requiredFields.
export const createSchema = (fields: Joi.SchemaMap, requiredFields = Object.keys(fields)): Joi.ObjectSchema =>
  Joi.object(fields).fork(requiredFields, schema => schema.required()).required();

export const updateSchema = (fields: Joi.SchemaMap): Joi.ObjectSchema =>
  Joi.object(fields).min(1).required().messages({
    'object.min': 'Debe enviar al menos un campo editable'
  });

export const periodoFields = {
  beginAt: fechaSchema,
  endAt: fechaSchema.allow(null)
};

// En un PATCH/PUT parcial, la fecha omitida se conoce recién al cargar la entidad.
// Los hooks de persistencia completan esa comprobación.
export const validatePeriodo: Joi.CustomValidator = (value, helpers) => {
  if (value.beginAt && value.endAt && value.endAt < value.beginAt) {
    return helpers.message({ custom: 'La fecha de fin no puede ser anterior a la fecha de inicio' });
  }
  return value;
};

export const unidadFields = {
  nroUnidad: textoCortoSchema,
  mtCuadrados: Joi.number().min(0).max(9999999999.99).precision(2).strict(),
  descripcion: descripcionSchema,
  edificioId: idSchema,
  tipoUnidadId: idSchema
};

