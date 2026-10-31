import { createSchema, updateSchema, identificacionFiscalSchema, nombreSchema, emailSchema, textoCortoSchema, idSchema } from './common.schema';

const administracionFields = {
  cuit: identificacionFiscalSchema,
  nombre: nombreSchema,
  email: emailSchema,
  direccion: textoCortoSchema
};

export const createAdministracionSchema = createSchema(administracionFields);
export const updateAdministracionSchema = updateSchema(administracionFields);

const edificioFields = {
  cuit: identificacionFiscalSchema,
  nombre: nombreSchema,
  direccion: textoCortoSchema,
  localidadId: idSchema
};

export const createEdificioSchema = createSchema(edificioFields);
export const updateEdificioSchema = updateSchema(edificioFields);
