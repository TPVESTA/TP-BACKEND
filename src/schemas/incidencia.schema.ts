import { createSchema, updateSchema, textoCortoSchema, descripcionSchema, fechaSchema, idSchema } from './common.schema';

const fields = {
  estado: textoCortoSchema,
  descripcion: descripcionSchema,
  closedAt: fechaSchema.allow(null),
  usuarioId: idSchema,
  unidadId: idSchema
};

export const createIncidenciaSchema = createSchema(fields, ["estado","descripcion","usuarioId","unidadId"]);
export const updateIncidenciaSchema = updateSchema(fields);

