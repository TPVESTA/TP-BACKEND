# Schemas de entrada

Cada entidad concreta tiene `create<Entidad>Schema` y `update<Entidad>Schema`
en `src/schemas`. `common.schema.ts` centraliza campos compartidos y
`idParamSchema`, ademas de `usuarioFilterQuerySchema` (filtro opcional
`?usuarioId=` de los listados de asignaciones). `AmbitoRol` es un enum. Los roles
no tienen schemas de entrada: la API solo los consulta.

Los schemas se conectan a las rutas con el middleware existente:

```ts
validate({ location: 'body', schema: createEdificioSchema })
validate({ location: 'params', schema: idParamSchema })
```

## Contratos

- Altas: campos obligatorios segun el servicio. `beginAt` y `endAt` son
  opcionales; sus valores iniciales los establece la entidad. En reservas e
  incidencias el autor (`usuarioId`) y el `estado` estan prohibidos: el autor
  sale de la sesion y el estado inicial es siempre Reservado o Reportado. La
  incidencia tampoco acepta `closedAt`, que se completa al finalizarla o cancelarla.
- Actualizaciones: campos opcionales, pero se exige al menos un campo editable.
  No se agregan valores por defecto que sobrescriban datos existentes.
- El middleware actual elimina campos desconocidos. Una actualizacion que solo
  contiene campos desconocidos se rechaza despues de eliminarlos.
- IDs: enteros positivos seguros, admitidos como numero o cadena de digitos.
  Las cadenas se convierten a numero. No se admiten fracciones ni notacion
  exponencial textual.
- Fechas: formato ISO, convertido a `Date`. Solo `endAt` admite `null`.
  Nacimiento no puede estar en el futuro. El schema de reservas acepta cualquier
  fecha valida; el servicio rechaza un dia de Buenos Aires que ya termino.
- Periodos: si ambas fechas llegan juntas, fin debe ser mayor o igual a inicio.
  Si falta una fecha, los hooks validan con el estado completo de la entidad.
- CUIL/CUIT: cadenas de 11 digitos sin guiones; no se verifica digito verificador.
- Nombres: entre 2 y 100 caracteres. Textos cortos: hasta 255. Se recortan
  espacios externos; descripciones no pueden estar vacias.
- Cantidades: numeros JSON no negativos; habitaciones y capacidad son enteros.
  Superficie admite dos decimales y copropiedad cuatro, entre 0 y 100.
  No se redondean silenciosamente entradas con mayor precision.
- Estados: al editar una incidencia, `estado` admite solo los valores de
  `EstadoIncidencia` (Reportado, En revision, Finalizado, Cancelado); la
  secuencia permitida la valida el servicio. Al editar una reserva, el unico
  `estado` aceptado es `Cancelado`. Una incidencia no puede cambiar su autor,
  unidad ni propiedad de origen, y una reserva no puede cambiar su autor ni su
  propiedad de origen. El estado de usuario exige un booleano JSON real.

## Usuarios y autenticacion

Los campos del usuario son `cuil`, `nombre`, `apellido`, `email`, `telefono`
(8 a 15 digitos sin espacios ni guiones), `fechaNacimiento`, `password` y
`estado`, obligatorios para registrar. El alta desde la gestion de usuarios
exige ademas `rolId`; `administracionId` o `propiedadId` indican el destino
segun el ambito del rol (lo verifica el servicio). Actualizar admite cualquiera
de los campos personales individualmente; el perfil propio (`PUT /auth/profile`)
no admite `estado` ni campos desconocidos.

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
estan conectados a sus rutas; ver `rutas.md`.

`npm test` incluye pruebas de campos obligatorios, actualizaciones parciales,
conversiones, periodos, subtipos, valores limite y uso con `validate`.
`npx tsc --noEmit --pretty false` comprueba los tipos. No se conecta a MySQL.
