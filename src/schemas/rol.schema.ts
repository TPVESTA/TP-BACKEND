import Joi from 'joi';
import { AmbitoRol } from '../entities/AmbitoRol';
import { SeccionPermiso, AccionPermiso } from '../entities/Permiso';
import { createSchema, updateSchema, nombreSchema, textoCortoSchema } from './common.schema';

const fields = {
  nombre: nombreSchema,
  descripcion: textoCortoSchema,
  ambito: Joi.string().valid(...Object.values(AmbitoRol))
};

export const createRolSchema = createSchema(fields);
export const updateRolSchema = updateSchema(fields);

export const replacePermissionsSchema = createSchema({
  permisos: Joi.array().items(Joi.object({
    seccion: Joi.string().valid(...Object.values(SeccionPermiso)).required(),
    crear: Joi.boolean().strict().default(false), leer: Joi.boolean().strict().default(false),
    editar: Joi.boolean().strict().default(false), borrar: Joi.boolean().strict().default(false),
    acciones: Joi.array().items(Joi.string().valid(...Object.values(AccionPermiso).filter(action =>
      ![AccionPermiso.CREAR, AccionPermiso.LEER, AccionPermiso.EDITAR, AccionPermiso.BORRAR].includes(action)
    ))).unique().default([]),
  }).unknown(false)).unique('seccion').required(),
});
