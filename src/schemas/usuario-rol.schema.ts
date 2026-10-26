import { createSchema, updateSchema, idSchema, periodoFields, validatePeriodo } from './common.schema';

const fields = {
  ...periodoFields,
  usuarioId: idSchema,
  rolId: idSchema,
};

export const createUsuarioRolSchema = createSchema(fields, ["usuarioId","rolId"]).custom(validatePeriodo);
export const updateUsuarioRolSchema = updateSchema(fields).custom(validatePeriodo);

