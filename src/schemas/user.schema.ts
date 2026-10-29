import Joi from 'joi';
import {
  createSchema, updateSchema, nombrePersonaSchema, emailSchema,
  identificacionFiscalSchema, fechaSchema, idSchema
} from './common.schema';

// Se conserva la política de contraseñas existente, sin recortar espacios.
const passwordSchema = Joi.string().min(6).max(18);
const fields = {
  cuil: identificacionFiscalSchema,
  nombre: nombrePersonaSchema,
  apellido: nombrePersonaSchema,
  email: emailSchema,
  fechaNacimiento: fechaSchema.max('now'),
  password: passwordSchema,
  estado: Joi.boolean().strict()
};

export const registerUserSchema = createSchema(fields);
export const createUserSchema = createSchema({
  ...fields, rolId: idSchema, administracionId: idSchema, propiedadId: idSchema,
}, [...Object.keys(fields), 'rolId']);
export const updateUserSchema = updateSchema(fields);
export const updateProfileSchema = updateSchema({ ...fields, estado: Joi.forbidden() });
export const loginUserSchema = createSchema({
  email: emailSchema,
  password: passwordSchema
});

// Mantiene compatibles los imports de las rutas actuales.
export { idParamSchema } from './common.schema';
