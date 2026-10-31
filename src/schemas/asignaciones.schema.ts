import { createSchema, updateSchema, idSchema, periodoFields, validatePeriodo } from './common.schema';

const empleadoFields = {
  ...periodoFields,
  usuarioId: idSchema,
  administracionId: idSchema,
  rolId: idSchema
};

export const createEmpleadoSchema = createSchema(empleadoFields, ["usuarioId","administracionId","rolId"]).custom(validatePeriodo);
export const updateEmpleadoSchema = updateSchema(empleadoFields).custom(validatePeriodo);

const adminEdificioFields = {
  ...periodoFields,
  administracionId: idSchema,
  edificioId: idSchema
};

export const createAdminEdificioSchema = createSchema(adminEdificioFields, ["administracionId","edificioId"]).custom(validatePeriodo);
export const updateAdminEdificioSchema = updateSchema(adminEdificioFields).custom(validatePeriodo);

const usuarioRolFields = {
  ...periodoFields,
  usuarioId: idSchema,
  rolId: idSchema,
};

export const createUsuarioRolSchema = createSchema(usuarioRolFields, ["usuarioId","rolId"]).custom(validatePeriodo);
export const updateUsuarioRolSchema = updateSchema(usuarioRolFields).custom(validatePeriodo);

const usuarioRolPropiedadFields = {
  ...periodoFields,
  usuarioId: idSchema,
  rolId: idSchema,
  propiedadId: idSchema
};

export const createUsuarioRolPropiedadSchema = createSchema(usuarioRolPropiedadFields, ["usuarioId","rolId","propiedadId"]).custom(validatePeriodo);
export const updateUsuarioRolPropiedadSchema = updateSchema(usuarioRolPropiedadFields).custom(validatePeriodo);
