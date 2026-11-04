# Controladores CRUD

Cada servicio tiene su controlador en `src/controllers`, con cinco funciones:
`get<Plural>`, `get<Entidad>`, `create<Entidad>`, `update<Entidad>` y
`delete<Entidad>`. Por ejemplo, `admin-edificio.controller.ts` exporta
`getAdminEdificios`, `getAdminEdificio`, `createAdminEdificio`,
`updateAdminEdificio` y `deleteAdminEdificio`. Reservas e incidencias no tienen
`delete<Entidad>`, y de roles solo se montan los dos GET (ver `rutas.md`).

Los controladores leen `req.params.id`, `req.body` y el contexto de autorizacion
(`req.authorization`), llaman al servicio y usan `ResponseHelper` para
responder. Las reglas del dominio, los permisos y las operaciones de
persistencia permanecen en los servicios y entidades.

| Resultado | HTTP |
| --- | --- |
| Listar, consultar, actualizar o eliminar | 200 |
| Crear | 201 |
| Registro solicitado inexistente o fuera del ambito | 404 |
| Error de dominio, ID invalido o relacion inexistente | 400 |
| Falta de permiso (`AuthorizationError`) | 403 |
| Conflicto de unicidad, clave foranea o dia ya reservado | 409 |
| Fallo inesperado | 500 |

Los listados incluyen `total`. Actualizar y eliminar devuelven el registro,
siguiendo la convencion del controlador de usuarios existente. Reservas,
incidencias y asignaciones (empleados, usuarios-roles-propiedad y usuarios-roles)
devuelven una proyeccion: el usuario como `{ id, nombre, apellido }` y, en las
asignaciones, el rol sin su lista de permisos.

`DomainValidationError` distingue errores conocidos de entrada o negocio de
fallos internos. Los servicios y hooks mantienen sus mensajes y reglas; cambian
el tipo de error para que el controlador pueda clasificarlos sin comparar textos.
Los errores de base de datos e internos no exponen sus detalles en la respuesta.

## Integracion

Los controladores estan montados en las rutas documentadas en `rutas.md`.
Las rutas aplican autenticacion y schemas de Joi antes de los controladores.
Estos solo verifican que el body sea un objeto; no sustituyen la validacion de
campos requeridos, tipos, fechas ni permisos sobre los recursos.

En Unidad, el body debe incluir `clase: 'propiedad'` o `clase: 'area_comun'`
tanto para crear como para actualizar, segun el contrato del servicio.
Las fechas JSON se convierten mediante los schemas antes del servicio.

Todas las rutas de negocio exigen un usuario activo autenticado; ver `middlewares.md`.

## Pruebas

`tests/controllers.test.cjs` prueba los cinco handlers de los 11 controladores
CRUD de estructura, catalogos y asignaciones: delegacion al servicio con el
contexto de autorizacion, codigos HTTP, respuestas unicas, registros
inexistentes, cuerpos invalidos, errores de dominio, conflictos, ocultacion de
errores internos y la proyeccion de las asignaciones. Los controladores de
reservas e incidencias se prueban en `business-permissions.test.cjs`.
Se sustituyen los servicios en las pruebas de controladores: no se abre un
servidor HTTP ni se conecta a MySQL. `npx tsc --noEmit --pretty false` verifica
los tipos de todo el proyecto.
