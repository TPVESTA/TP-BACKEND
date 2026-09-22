import { createSchema, updateSchema, nombreSchema } from './common.schema';

const fields = {
  nombre: nombreSchema
};

export const createTipoUnidadSchema = createSchema(fields);
export const updateTipoUnidadSchema = updateSchema(fields);

