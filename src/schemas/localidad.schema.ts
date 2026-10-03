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

const fields = {
  nombre: nombreSchema,
  provincia: textoCortoSchema.valid(...provinciasArgentinas).messages({
    'any.only': 'La provincia debe ser una provincia argentina o Ciudad Autónoma de Buenos Aires'
  })
};

export const createLocalidadSchema = createSchema(fields);
export const updateLocalidadSchema = updateSchema(fields);
