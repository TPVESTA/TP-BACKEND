# Servicios CRUD

Los servicios se encuentran en `src/services`, uno por entidad; la carga y las
reglas de permisos estan agrupadas en `src/services/authorization/`. Cada entidad concreta expone
funciones `getAll...`, `get...ById`, `create...`, `update...` y `delete...`;
reservas e incidencias no tienen `delete...` (no se dan de baja; ver
`autorizacion.md`). Todas reciben como ultimo argumento el contexto de
autorizacion de la peticion (`AuthorizationContext`), que define el ambito de
cada consulta. `AmbitoRol` es un enum, no una entidad persistente.

## Contratos

- Los tipos exportados `Create...Data` y `Update...Data` documentan los campos
  admitidos. Las actualizaciones son parciales: `undefined` conserva el valor
  existente; `null` permite vaciar fechas opcionales.
- Los IDs aceptan un numero entero positivo o su representacion textual.
- Las relaciones se reciben como `localidadId`, `usuarioId`, `rolId`, etc.
  Se cargan desde el mismo EntityManager usado para guardar y se comprueba su
  existencia respetando los filtros de baja logica.
- Las colecciones inversas se administran desde el servicio de la entidad que
  contiene la referencia. Por ejemplo, un empleado se vincula a una
  administracion mediante `createEmpleado`, no editando `empleados`.
- Buscar, actualizar o eliminar un ID inexistente devuelve `null`.
  Una relacion inexistente o una regla incumplida lanza un error.
- Los servicios asignan explicitamente los campos editables; no aceptan IDs,
  colecciones ni fechas de auditoria suministrados por el cliente.
- Las consultas devuelven entidades sin poblar automaticamente sus colecciones.
  La representacion HTTP la definen los controladores: reservas e incidencias
  (`business-response.helper.ts`) y asignaciones (`assignment-response.helper.ts`)
  proyectan al usuario sin datos personales.

## Bajas y reglas

`User`, `Administracion` y `Edificio` usan `deletedAt` (baja logica; dar de baja
un usuario tambien lo desactiva). Las asignaciones (`Empleado`,
`UsuarioRolPropiedad` y `UsuarioRol`) no se borran: `delete...` finaliza su
vigencia completando `endAt` y conserva el historial. Las demas entidades usan
eliminacion fisica mediante `removeAndFlush`; si una clave foranea impide
eliminar, el error se propaga. No se eliminan dependencias manualmente.
Reservas e incidencias no tienen baja.

En `AdminEdificio`, cerrar un periodo conservando el historial se hace con
`updateAdminEdificio({ endAt })`; `deleteAdminEdificio` elimina el registro.
No se agregan restricciones de solapamiento que el modelo no define.

Las escrituras utilizan `persistAndFlush`, conservando los hooks de las
entidades para validar periodos, ambitos de roles y porcentaje de copropiedad.
La entidad `Rol` rechaza cambiar el ambito o el codigo de un rol existente.

## Unidades

`Unidad` es abstracta. Su servicio consulta ambos subtipos y delega las altas
y actualizaciones a `Propiedad` o `AreaComun`. Requiere `clase: 'propiedad'`
o `clase: 'area_comun'` y no permite convertir una unidad existente a otro tipo.
Tambien se pueden usar directamente los servicios de los subtipos.

```ts
await createPropiedad({
  nroUnidad: '2A',
  mtCuadrados: 65,
  descripcion: 'Departamento',
  copropiedad: 5.25,
  habitaciones: 2,
  edificioId: 1,
  tipoUnidadId: 1,
}, context);
```

## Usuarios

El alta de usuarios (`createUser`) recibe los datos personales (`cuil`,
`nombre`, `apellido`, `email`, `telefono`, `fechaNacimiento`, `password`,
`estado`) y un `rolId` con su destino: `administracionId` para un rol de
administracion (crea el empleo) o `propiedadId` para un rol de propiedad (crea la
asignacion). Todo se guarda en una transaccion. Conserva el hash de contrasenas
y el control de emails duplicados, incluyendo usuarios eliminados.

`updateUser` edita los datos de una cuenta del ambito autorizado; cambiar email
o contrasena de otra cuenta exige permiso global, y cambiar `estado` el permiso
global de deshabilitacion. `updateOwnProfile(data, usuarioId)` edita la cuenta
propia con la lista de campos permitidos y nunca `estado`. El registro publico
(`auth.service`) crea una cuenta sin roles. Ver `schemas.md` y `rutas.md`.

## Roles

`GET /api/roles` y `GET /api/roles/:id` son las unicas rutas de roles: no hay
alta, edicion, baja ni cambio de la matriz de permisos por la API. Los roles
canonicos y sus permisos iniciales los carga `services/authorization/permission-seed.service.ts` al
arrancar (una sola vez por rol).

## Verificacion

Ejecutar `npx tsc --noEmit --pretty false` y `npm test`.
`tests/services.test.cjs` comprueba las reglas que no cubren las suites de
permisos: IDs, relaciones inexistentes, copropiedad, periodos y ambito de los
roles asignados, inmutabilidad de la clase de una unidad,
y hash de contrasenas. Los filtros por ambito y las reglas de reservas e
incidencias se prueban en `structure-permissions`, `assignments-permissions` y
`business-permissions`. Utiliza metadatos y hooks reales de MikroORM con un
doble de persistencia; no conecta a MySQL ni modifica una base de datos.
