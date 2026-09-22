import { createSchema, updateSchema, nombreSchema, textoCortoSchema } from './common.schema';

const fields = {
  nombre: nombreSchema,
  provincia: textoCortoSchema
};

export const createLocalidadSchema = createSchema(fields);
export const updateLocalidadSchema = updateSchema(fields);

