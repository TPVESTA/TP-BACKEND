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
| Rol | /api/roles |
| Empleado | /api/empleados |
| AdminEdificio | /api/admin-edificios |
| UsuarioRolPropiedad | /api/usuarios-roles-propiedad |
| Incidencia | /api/incidencias |
| Reservacion | /api/reservaciones |

Cada recurso expone:

| Metodo | Ruta | Resultado |
| --- | --- | --- |
| GET | ruta base | Lista (200), incluye total |
| GET | ruta base/:id | Registro (200) o 404 |
| POST | ruta base | Crea (201) |
| PUT | ruta base/:id | Actualiza campos enviados (200) o 404 |
| DELETE | ruta base/:id | Elimina y devuelve el registro (200) o 404 |

Se conserva PUT con actualizacion parcial, igual que usuarios. El body debe
incluir al menos un campo editable. No se agregaron endpoints PATCH.

Los routers individuales se montan en `routes/index.ts` despues de
`authMiddleware`; no deben montarse por separado sin esa proteccion.
Los IDs se validan antes del controlador. POST y PUT aplican los schemas
especificos de la entidad. Campos desconocidos se eliminan segun `validate`.

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
Administracion y Edificio; eliminacion fisica para el resto. Para cerrar un
periodo conservando historial, usar PUT con `endAt` en empleados,
admin-edificios o usuarios-roles-propiedad.

## Autenticacion y errores

Login (`POST /api/auth/login`) y registro (`POST /api/auth/register`) son
publicos. `GET /api/auth/profile` y `GET /api/auth/verify` requieren token.
La ruta informativa `GET /` sigue publica.

400 indica datos invalidos; 401 indica autenticacion ausente o invalida;
404 indica registro o ruta inexistente; 409 indica conflicto de integridad;
500 indica fallo interno. Una URL desconocida bajo /api sin token recibe 401
antes de llegar al manejador de rutas inexistentes.

La autenticacion exige usuario activo. Los permisos por rol, administracion
o propiedad aun no estan implementados: los CRUD estan disponibles para
cualquier usuario autenticado activo.

## Verificacion

`npx tsc --noEmit --pretty false` y `npm test`.
Las pruebas de rutas usan Express, JWT, middlewares, schemas y controladores
reales, sustituyendo los servicios de datos. Comprueban los 65 endpoints
nuevos, autenticacion, conversiones, validacion y 404, sin conectar a MySQL.

