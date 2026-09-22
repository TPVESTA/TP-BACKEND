import Joi from 'joi';
import {
  createSchema, updateSchema, nombreSchema, emailSchema,
  identificacionFiscalSchema, fechaSchema
} from './common.schema';

// Se conserva la política de contraseñas existente, sin recortar espacios.
const passwordSchema = Joi.string().min(6).max(18);
const fields = {
  cuil: identificacionFiscalSchema,
  nombre: nombreSchema,
  apellido: nombreSchema,
  email: emailSchema,
  fechaNacimiento: fechaSchema.max('now'),
  password: passwordSchema,
  estado: Joi.boolean().strict()
};

export const createUserSchema = createSchema(fields);
export const registerUserSchema = createUserSchema;
export const updateUserSchema = updateSchema(fields);
export const loginUserSchema = createSchema({
  email: emailSchema,
  password: passwordSchema
});

// Mantiene compatibles los imports de las rutas actuales.
export { idParamSchema } from './common.schema';
