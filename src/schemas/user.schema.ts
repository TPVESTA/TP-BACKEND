import Joi from 'joi';
import {
  createSchema, updateSchema, nombreSchema, emailSchema,
  identificacionFiscalSchema, fechaSchema, idSchema
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

export const registerUserSchema = createSchema(fields);
export const createUserSchema = createSchema({ ...fields, administracionId: idSchema }, Object.keys(fields));
export const updateUserSchema = updateSchema(fields);
export const updateProfileSchema = updateSchema({ ...fields, estado: Joi.forbidden() });
export const userAdministrationParamsSchema = createSchema({ id: idSchema, administracionId: idSchema });
export const loginUserSchema = createSchema({
  email: emailSchema,
  password: passwordSchema
});

// Mantiene compatibles los imports de las rutas actuales.
export { idParamSchema } from './common.schema';
