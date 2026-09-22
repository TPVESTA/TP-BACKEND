import { createSchema, updateSchema, identificacionFiscalSchema, nombreSchema, emailSchema, textoCortoSchema } from './common.schema';

const fields = {
  cuit: identificacionFiscalSchema,
  nombre: nombreSchema,
  email: emailSchema,
  direccion: textoCortoSchema
};

export const createAdministracionSchema = createSchema(fields);
export const updateAdministracionSchema = updateSchema(fields);

