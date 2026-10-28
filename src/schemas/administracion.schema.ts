import { createSchema, updateSchema, identificacionFiscalSchema, nombreSchema, emailSchema, textoCortoSchema, idSchema } from './common.schema';

const fields = {
  cuit: identificacionFiscalSchema,
  nombre: nombreSchema,
  email: emailSchema,
  direccion: textoCortoSchema,
  localidadId: idSchema
};

export const createAdministracionSchema = createSchema(fields);
export const updateAdministracionSchema = updateSchema(fields);

