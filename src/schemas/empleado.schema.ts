import { createSchema, updateSchema, idSchema, periodoFields, validatePeriodo } from './common.schema';

const fields = {
  ...periodoFields,
  usuarioId: idSchema,
  administracionId: idSchema,
  rolId: idSchema
};

export const createEmpleadoSchema = createSchema(fields, ["usuarioId","administracionId","rolId"]).custom(validatePeriodo);
export const updateEmpleadoSchema = updateSchema(fields).custom(validatePeriodo);

