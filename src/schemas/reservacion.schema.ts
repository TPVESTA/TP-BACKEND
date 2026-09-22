import { createSchema, updateSchema, fechaSchema, textoCortoSchema, descripcionSchema, idSchema } from './common.schema';

const fields = {
  fechaReservacion: fechaSchema,
  estado: textoCortoSchema,
  descripcion: descripcionSchema,
  usuarioId: idSchema,
  areaComunId: idSchema
};

export const createReservacionSchema = createSchema(fields);
export const updateReservacionSchema = updateSchema(fields);

