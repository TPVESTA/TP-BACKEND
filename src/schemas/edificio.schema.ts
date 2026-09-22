import { createSchema, updateSchema, identificacionFiscalSchema, nombreSchema, textoCortoSchema, idSchema } from './common.schema';

const fields = {
  cuit: identificacionFiscalSchema,
  nombre: nombreSchema,
  direccion: textoCortoSchema,
  localidadId: idSchema
};

export const createEdificioSchema = createSchema(fields);
export const updateEdificioSchema = updateSchema(fields);

