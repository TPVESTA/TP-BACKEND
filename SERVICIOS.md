# Servicios CRUD

Los servicios se encuentran en `src/services`. Cada entidad concreta expone
funciones `getAll...`, `get...ById`, `create...`, `update...` y `delete...`.
`AmbitoRol` es un enum, no una entidad persistente.

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
  Los controladores podran definir la representacion HTTP en el siguiente paso.

## Bajas y reglas

`User`, `Administracion` y `Edificio` usan `deletedAt`. Las demas entidades
usan eliminacion fisica mediante `removeAndFlush`; si una clave foranea impide
eliminar, el error se propaga. No se eliminan dependencias manualmente.

En `Empleado`, `AdminEdificio` y `UsuarioRolPropiedad`, cerrar un periodo
conservando el historial se hace con `update...({ endAt })`; `delete...` elimina
el registro. No se agregan restricciones de solapamiento que el modelo no define.

Las escrituras utilizan `persistAndFlush`, conservando los hooks de las
entidades para validar periodos, ambitos de roles y porcentaje de copropiedad.
El servicio de roles tambien rechaza cambiar el ambito antes de guardar.

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
});
```

## Usuarios e integracion pendiente

El servicio de usuarios incluye `cuil` en el alta y permite actualizar tambien
apellido, fecha de nacimiento y estado. Conserva el hash de contrasenas y el
control de emails duplicados, incluyendo usuarios eliminados. El registro en
`auth.service` tambien asigna CUIL; el controlador existente lo pasa al servicio.

Esta etapa no agrega endpoints. Los schemas HTTP ya se alinearon con `nombre`,
`apellido`, `cuil`, `fechaNacimiento` y `estado`; ver `SCHEMAS.md`. Los nuevos
servicios y controladores ya estan conectados mediante sus rutas; ver `RUTAS.md`.

## Verificacion

Ejecutar `npx tsc --noEmit --pretty false` y `npm test`.
`tests/services.test.cjs` comprueba contratos CRUD, relaciones inexistentes o
eliminadas, campos editables, subtipos, reglas del modelo y hash de contrasenas.
Utiliza metadatos y hooks reales de MikroORM con un doble de persistencia;
no comprueba SQL ejecutado contra MySQL ni modifica una base de datos.
