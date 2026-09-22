import { createSchema, updateSchema, idSchema, periodoFields, validatePeriodo } from './common.schema';

const fields = {
  ...periodoFields,
  usuarioId: idSchema,
  rolId: idSchema,
  propiedadId: idSchema
};

export const createUsuarioRolPropiedadSchema = createSchema(fields, ["usuarioId","rolId","propiedadId"]).custom(validatePeriodo);
export const updateUsuarioRolPropiedadSchema = updateSchema(fields).custom(validatePeriodo);

