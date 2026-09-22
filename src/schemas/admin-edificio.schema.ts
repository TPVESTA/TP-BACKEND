import { createSchema, updateSchema, idSchema, periodoFields, validatePeriodo } from './common.schema';

const fields = {
  ...periodoFields,
  administracionId: idSchema,
  edificioId: idSchema
};

export const createAdminEdificioSchema = createSchema(fields, ["administracionId","edificioId"]).custom(validatePeriodo);
export const updateAdminEdificioSchema = updateSchema(fields).custom(validatePeriodo);

