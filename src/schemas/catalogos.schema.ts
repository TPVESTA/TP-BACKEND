import Joi from 'joi';
import { AmbitoRol, AmbitoUnidad } from '../entities/enums';
import { SeccionPermiso, AccionPermiso } from '../entities/Permiso';
import { createSchema, updateSchema, nombreSchema, textoCortoSchema } from './common.schema';

// Listado validado por la API; provincia sigue siendo un string en la base de datos.
export const provinciasArgentinas = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur',
  'Tucumán'
] as const;

const localidadFields = {
  nombre: nombreSchema,
  provincia: textoCortoSchema.valid(...provinciasArgentinas).messages({
    'any.only': 'La provincia debe ser una provincia argentina o Ciudad Autónoma de Buenos Aires'
  })
};

export const createLocalidadSchema = createSchema(localidadFields);
export const updateLocalidadSchema = updateSchema(localidadFields);

const tipoUnidadFields = {
  nombre: nombreSchema,
  ambito: Joi.string().valid(...Object.values(AmbitoUnidad))
};

export const createTipoUnidadSchema = createSchema(tipoUnidadFields);
export const updateTipoUnidadSchema = updateSchema(tipoUnidadFields);

const rolFields = {
  nombre: nombreSchema,
  descripcion: textoCortoSchema,
  ambito: Joi.string().valid(...Object.values(AmbitoRol))
};

export const createRolSchema = createSchema(rolFields);
export const updateRolSchema = updateSchema(rolFields);

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
