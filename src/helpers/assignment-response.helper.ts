// Las asignaciones identifican al usuario sin exponer sus datos personales,
// igual que reservas e incidencias, y devuelven el rol sin su matriz de permisos:
// esa matriz se consulta en /roles y repetirla en cada fila agranda la respuesta.
type Plain = Record<string, unknown>;

const isObject = (value: unknown): value is Plain => typeof value === 'object' && value !== null;

// Parte de la misma serialización que usa Express (toJSON de MikroORM) para no
// alterar el resto de la respuesta.
const toPlain = (entity: object): Plain => {
  const serializable = entity as { toJSON?: () => Plain };
  return typeof serializable.toJSON === 'function' ? serializable.toJSON() : { ...entity } as Plain;
};

const person = (user: unknown) => isObject(user) ? { id: user.id, nombre: user.nombre, apellido: user.apellido } : user;

const role = (rol: unknown) => {
  if (!isObject(rol)) return rol;
  const { permisos: _permisos, ...rest } = rol;
  return rest;
};

const withoutPersonalData = (link: Plain): Plain => ({
  ...link,
  ...('usuario' in link ? { usuario: person(link.usuario) } : {}),
  ...('rol' in link ? { rol: role(link.rol) } : {}),
});

/** Empleados, asignaciones de propiedad y asignaciones globales. */
export const serializeAssignment = (entity: object): Plain => {
  const plain = withoutPersonalData(toPlain(entity));
  return isObject(plain.usuarioRol) ? { ...plain, usuarioRol: withoutPersonalData(plain.usuarioRol) } : plain;
};
