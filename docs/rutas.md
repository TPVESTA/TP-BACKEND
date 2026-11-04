# Rutas de la API

Todas las rutas de negocio requieren `Authorization: Bearer <token>`.
El prefijo global es `/api`; el servidor actual escucha en el puerto 3000.

## Recursos CRUD

| Entidad | Ruta base |
| --- | --- |
| User | /api/users |
| Administracion | /api/administraciones |
| Edificio | /api/edificios |
| Localidad | /api/localidades |
| TipoUnidad | /api/tipos-unidad |
| Unidad | /api/unidades |
| Propiedad | /api/propiedades |
| AreaComun | /api/areas-comunes |
| Rol | /api/roles (solo lectura) |
| Empleado | /api/empleados |
| AdminEdificio | /api/admin-edificios |
| UsuarioRolPropiedad | /api/usuarios-roles-propiedad |
| UsuarioRol (roles globales) | /api/usuarios-roles |
| Incidencia | /api/incidencias |
| Reservacion | /api/reservaciones |

Cada recurso expone, con estas excepciones: `/api/roles` solo tiene los dos GET,
y reservas e incidencias no tienen DELETE.

| Metodo | Ruta | Resultado |
| --- | --- | --- |
| GET | ruta base | Lista (200), incluye total |
| GET | ruta base/:id | Registro (200) o 404 |
| POST | ruta base | Crea (201) |
| PUT | ruta base/:id | Actualiza campos enviados (200) o 404 |
| DELETE | ruta base/:id | Da de baja o finaliza y devuelve el registro (200) o 404 |

Rutas adicionales: `GET /api/reservaciones/disponibilidad?areaComunId=<id>`
(ocupacion sin datos personales; ver `autorizacion.md`). Cada operacion exige
ademas el permiso correspondiente en el ambito del registro: sin permiso
responde 403.

Se conserva PUT con actualizacion parcial, igual que usuarios. El body debe
incluir al menos un campo editable. No se agregaron endpoints PATCH.

Los routers individuales se montan en `routes/index.ts` despues de
`authMiddleware`; no deben montarse por separado sin esa proteccion.
Los IDs se validan antes del controlador. POST y PUT aplican los schemas
especificos de la entidad. Campos desconocidos se eliminan segun `validate`.

Los listados de asignaciones (`GET /api/empleados`, `/api/usuarios-roles-propiedad`
y `/api/usuarios-roles`) aceptan el filtro opcional `?usuarioId=<id>`. Se aplica
en la consulta, dentro del ambito autorizado; sin el filtro se listan todas las
asignaciones del ambito. Un `usuarioId` que no sea un entero positivo responde 400.

Todas las respuestas de esos tres recursos devuelven el usuario como
`{ id, nombre, apellido }`, sin CUIL, email, telefono ni fecha de nacimiento, y
el rol sin su lista de `permisos`; la matriz de permisos se consulta en
`GET /api/roles`. El resto de cada asignacion (fechas, administracion,
propiedad y edificio) se mantiene igual.

## Ejemplos

```http
POST /api/edificios
Authorization: Bearer <token>
Content-Type: application/json

{
  "cuit": "30123456789",
  "nombre": "Edificio Centro",
  "direccion": "San Martin 123",
  "localidadId": 1
}
```

```http
PUT /api/edificios/1
Authorization: Bearer <token>
Content-Type: application/json

{ "nombre": "Nuevo nombre" }
```

`/api/unidades` agrupa propiedades y areas comunes. Tanto POST como PUT
requieren `clase: "propiedad"` o `clase: "area_comun"`, ademas de los datos
del subtipo o del cambio. Tambien pueden usarse directamente
`/api/propiedades` y `/api/areas-comunes`, sin enviar clase.

DELETE conserva la semantica de los servicios: baja logica para User,
Administracion y Edificio; en empleados, usuarios-roles-propiedad y
usuarios-roles finaliza la vigencia (completa `endAt`) y conserva el historial;
eliminacion fisica para el resto. En admin-edificios, para cerrar un periodo
conservando el historial, usar PUT con `endAt`. Ver `servicios.md`.

## Autenticacion y errores

Login (`POST /api/auth/login`) y registro (`POST /api/auth/register`) son
publicos. `GET /api/auth/profile` y `GET /api/auth/verify` requieren token.
La ruta informativa `GET /` sigue publica.

Todas las respuestas que atiende el router de `/api`, incluidas las de error,
envian `Cache-Control: no-store, private`: dependen del usuario y contienen
datos personales, por lo que ni el navegador ni un proxy intermedio deben
guardarlas. Los errores de lectura del body (JSON invalido o demasiado grande)
se producen antes del router y no incluyen datos.

400 indica datos invalidos; 401 indica autenticacion ausente o invalida;
403 indica falta de permiso en el ambito solicitado; 404 indica registro o ruta
inexistente (o fuera del ambito del usuario); 409 indica conflicto de
integridad o un dia ya reservado; 500 indica fallo interno. Una URL desconocida
bajo /api sin token recibe 401 antes de llegar al manejador de rutas inexistentes.

La autenticacion exige usuario activo. Cada peticion carga ademas los permisos
vigentes del usuario por rol, administracion o propiedad, y cada servicio los
aplica; ver `autorizacion.md`.

## Verificacion

Las altas y modificaciones de reservas verifican exclusividad por área común y
día de Buenos Aires. Un destino ocupado responde 409. Ver las reglas y pruebas
en [reservas.md](reservas.md).

`npx tsc --noEmit --pretty false` y `npm test`.
Las pruebas de rutas (`tests/routes.test.cjs`) usan Express, JWT, middlewares,
schemas y controladores reales, sustituyendo los servicios de datos y la carga
de permisos. Comprueban los 50 endpoints CRUD de estructura, catalogos y
asignaciones: autenticacion, conversiones, validacion, 404 y que el servicio
reciba el contexto de autorizacion, sin conectar a MySQL. Reservas e
incidencias se prueban en `business-permissions.test.cjs`, y los permisos
reales por ruta en `permissions-routes.test.cjs`.

