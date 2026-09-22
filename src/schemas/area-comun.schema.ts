import { createSchema, updateSchema, enteroNoNegativoSchema, unidadFields } from './common.schema';

const fields = {
  ...unidadFields,
  capacidad: enteroNoNegativoSchema
};

export const createAreaComunSchema = createSchema(fields);
export const updateAreaComunSchema = updateSchema(fields);

