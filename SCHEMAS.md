# Schemas de entrada

Cada entidad concreta tiene `create<Entidad>Schema` y `update<Entidad>Schema`
en `src/schemas`. `common.schema.ts` centraliza campos compartidos y
`idParamSchema`. `AmbitoRol` es un enum: sus valores se validan en Rol.

Los esquemas están agrupados por tema: `catalogos.schema.ts` (Localidad,
TipoUnidad y Rol), `estructura.schema.ts` (Administración y Edificio),
`unidad.schema.ts` (Unidad, Propiedad y Área común) y `asignaciones.schema.ts`
(Empleado, AdminEdificio, UsuarioRol y UsuarioRolPropiedad). Usuarios,
reservas e incidencias conservan su archivo específico. Los nombres de las
exportaciones `create<Entidad>Schema` y `update<Entidad>Schema` se mantienen.

Los schemas se conectan a las rutas con el middleware existente:

```ts
validate({ location: 'body', schema: createEdificioSchema })
validate({ location: 'params', schema: idParamSchema })
```

## Contratos

- Altas: campos obligatorios segun el servicio. `beginAt`, `endAt` y `closedAt`
  son opcionales; sus valores iniciales los establece la entidad.
- Actualizaciones: campos opcionales, pero se exige al menos un campo editable.
  No se agregan valores por defecto que sobrescriban datos existentes.
- El middleware actual elimina campos desconocidos. Una actualizacion que solo
  contiene campos desconocidos se rechaza despues de eliminarlos.
- IDs: enteros positivos seguros, admitidos como numero o cadena de digitos.
  Las cadenas se convierten a numero. No se admiten fracciones ni notacion
  exponencial textual.
- Fechas: formato ISO, convertido a `Date`. Solo `endAt` y `closedAt` admiten
  `null`. Nacimiento no puede estar en el futuro. Las reservas pueden expresar
  fechas pasadas: el modelo no define una prohibicion al respecto.
- Periodos: si ambas fechas llegan juntas, fin debe ser mayor o igual a inicio.
  Si falta una fecha, los hooks validan con el estado completo de la entidad.
- CUIL/CUIT: cadenas de 11 digitos sin guiones; no se verifica digito verificador.
- Nombres: entre 2 y 100 caracteres. Textos cortos: hasta 255. Se recortan
  espacios externos; descripciones no pueden estar vacias.
- Cantidades: numeros JSON no negativos; habitaciones y capacidad son enteros.
  Superficie admite dos decimales y copropiedad cuatro, entre 0 y 100.
  No se redondean silenciosamente entradas con mayor precision.
- Los estados de incidencia y reservacion siguen siendo texto libre no vacio.
  El estado de usuario exige un booleano JSON real.

## Usuarios y autenticacion

Se reemplaza `name` por los campos del servicio: `cuil`, `nombre`, `apellido`,
`email`, `fechaNacimiento`, `password` y `estado`, obligatorios para crear y
registrar. Actualizar admite cualquiera de ellos individualmente.

Login mantiene email y password. La politica existente de contrasenas de 6 a
18 caracteres se conserva; no se recortan espacios de la contrasena.
`user.schema.ts` reexporta `idParamSchema` para conservar las rutas existentes.

## Subtipos de Unidad

`createUnidadSchema` y `updateUnidadSchema` requieren `clase: 'propiedad'` o
`clase: 'area_comun'` y aplican las reglas del subtipo. Actualizar exige un campo
editable ademas de `clase`. Campos exclusivos del subtipo contrario se rechazan
incluso cuando el middleware elimina desconocidos.

La existencia de relaciones, emails duplicados, ambito de roles asignados y la
inmutabilidad del subtipo se siguen verificando en servicios y entidades.
Los schemas no implementan permisos ni autenticacion.

## Estado de integracion y pruebas

Las rutas actuales de usuarios y autenticacion ya importaban sus schemas y
utilizan automaticamente las correcciones. Los schemas de las entidades nuevas
estan conectados a sus rutas; ver `RUTAS.md`.

`npm test` incluye pruebas de campos obligatorios, actualizaciones parciales,
conversiones, periodos, subtipos, valores limite y uso con `validate`.
`npx tsc --noEmit --pretty false` comprueba los tipos. No se conecta a MySQL.
