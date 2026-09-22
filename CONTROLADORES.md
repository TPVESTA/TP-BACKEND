# Controladores CRUD

Cada servicio nuevo tiene su controlador en `src/controllers`, con cinco
funciones: `get<Plural>`, `get<Entidad>`, `create<Entidad>`, `update<Entidad>`
y `delete<Entidad>`. Por ejemplo, `admin-edificio.controller.ts` exporta
`getAdminEdificios`, `getAdminEdificio`, `createAdminEdificio`,
`updateAdminEdificio` y `deleteAdminEdificio`.

Los controladores leen `req.params.id` y `req.body`, llaman al servicio y usan
`ResponseHelper` para responder. Las reglas del dominio y las operaciones de
persistencia permanecen en los servicios y entidades.

| Resultado | HTTP |
| --- | --- |
| Listar, consultar, actualizar o eliminar | 200 |
| Crear | 201 |
| Registro solicitado inexistente | 404 |
| Error de dominio, ID invalido o relacion inexistente | 400 |
| Conflicto de unicidad o clave foranea | 409 |
| Fallo inesperado | 500 |

Los listados incluyen `total`. Actualizar y eliminar devuelven el registro,
siguiendo la convencion del controlador de usuarios existente.

`DomainValidationError` distingue errores conocidos de entrada o negocio de
fallos internos. Los servicios y hooks mantienen sus mensajes y reglas; cambian
el tipo de error para que el controlador pueda clasificarlos sin comparar textos.
Los errores de base de datos e internos no exponen sus detalles en la respuesta.

## Integracion

Los controladores estan montados en las rutas documentadas en `RUTAS.md`.
Las rutas aplican autenticacion y schemas de Joi antes de los controladores.
Estos solo verifican que el body sea un objeto; no sustituyen la validacion de
campos requeridos, tipos, fechas ni permisos sobre los recursos.

En Unidad, el body debe incluir `clase: 'propiedad'` o `clase: 'area_comun'`
tanto para crear como para actualizar, segun el contrato del servicio.
Las fechas JSON se convierten mediante los schemas antes del servicio.

Todas las rutas de negocio exigen un usuario activo autenticado; ver `MIDDLEWARES.md`.

## Pruebas

`npm test` incluye pruebas de los cinco handlers de cada controlador nuevo:
delegacion, codigos HTTP, respuestas unicas, registros inexistentes, cuerpos
invalidos, errores de dominio, conflictos y ocultacion de errores internos.
Se sustituyen los servicios en las pruebas de controladores: no se abre un
servidor HTTP ni se conecta a MySQL. `npx tsc --noEmit --pretty false` verifica
los tipos de todo el proyecto.
