# Roles y permisos por contexto

La autenticación identifica al usuario mediante el JWT existente (`userId`). Cada petición protegida carga sus asignaciones y permisos actuales desde la base. Quitar un permiso o finalizar una asignación surte efecto en la siguiente petición, sin emitir otro token.

Una asignación global está vigente cuando `beginAt <= ahora` y `endAt` es nulo o mayor que ahora. Un empleo o una asignación de propiedad concede acceso solo si ese período y el de su `usuario_rol` están vigentes a la vez. Los usuarios deshabilitados o dados de baja no pueden operar. Las administraciones y edificios dados de baja no conceden acceso contextual.

## Configuración inicial

`RolPermiso` tiene una fila única por `(rol, seccion)`, cuatro booleanos (`crear`, `leer`, `editar`, `borrar`) y una lista `acciones` para operaciones específicas. Una fila ausente o un booleano falso deniega acceso. Los códigos estables de los roles permiten cambiar su nombre sin cambiar su comportamiento.

| Rol | Reservas | Incidencias | Expensas | Usuarios |
|---|---|---|---|---|
| RESIDENTE | Crear, leer y editar propias; disponibilidad sin datos personales | Crear y leer propias; editar descripción en Reportado | Leer de su propiedad | Sin gestión |
| PROPIETARIO | Sin acceso | Crear y leer propias | Leer de su propiedad | Sin gestión |
| MANTENIMIENTO | Leer ocupación de edificios administrados | Crear, leer, editar y cambiar estado en edificios administrados | Sin acceso | Sin gestión |
| ADMINISTRATIVO | Leer, editar y cancelar en edificios administrados | Crear, leer, editar y cambiar estado en edificios administrados | CRUD y operaciones específicas | Crear, leer y editar cuentas con empleo o propiedad en su administración |

**Expensas todavía no tiene entidades, servicios ni rutas en este proyecto.** Sus permisos quedan configurados; emitir, anular, registrar pagos y las restricciones de borradores deberán aplicarse cuando se implemente ese módulo.

Los roles de propiedad también pueden consultar su propiedad, edificio, áreas comunes y catálogos. Mantenimiento consulta edificios y áreas comunes, sin acceso a propiedades privadas, incluso a través de `/unidades`. Administrativo consulta la estructura de sus edificios. Las mutaciones de estructura requieren permisos explícitos; los cuatro roles iniciales no los tienen.

`SUPERADMIN` es un rol GLOBAL para vincular administraciones con edificios, asignar roles y preparar los datos iniciales. Crear administraciones/edificios, editar catálogos y conceder roles globales requieren permisos globales. Desde el 28/10/2026 la API no crea, edita ni borra roles ni modifica su matriz de permisos: los roles canónicos y sus permisos iniciales los carga el arranque (`src/services/authorization/permission-seed.service.ts`).

Los permisos de varios roles se combinan solamente dentro de cada contexto. Un rol en la propiedad A no concede acceso a registros de B. Un empleo en una administración solamente abarca sus edificios con vínculo `AdminEdificio` vigente.

## Puesta en marcha y datos existentes

El arranque usa el mecanismo de actualización de esquema que ya tenía el proyecto. Agrega `rol_permiso`, los códigos y marcas de inicialización de `rol`, `propiedad_origen_id` en reservas e incidencias. Los valores iniciales de permisos se cargan una sola vez por rol; reiniciar no repone permisos quitados.

1. Si el usuario inicial todavía no existe, arrancar con `BOOTSTRAP_ADMIN_EMAIL` vacío y registrarlo mediante `/api/auth/register`. El registro público crea una cuenta sin roles ni permisos de negocio.
2. Configurar `BOOTSTRAP_ADMIN_EMAIL` con el email de una cuenta existente y activa, y reiniciar. Esa cuenta recibe SUPERADMIN una sola vez. Un email inexistente o inactivo hace fallar el arranque para evitar una inicialización incompleta.
3. Vaciar la variable después del bootstrap. Incluso si se deja configurada, no restaura una asignación global posteriormente revocada.
4. Con la cuenta global, consultar `/api/roles` y crear las asignaciones apropiadas mediante `/api/usuarios-roles-propiedad` y `/api/empleados`.

**Los roles anteriores sin código no reciben privilegios automáticamente por su nombre.** Conservan sus asignaciones históricas, pero hace falta cargar deliberadamente sus permisos en `rol_permiso` (la API no edita la matriz) o revocar esas asignaciones y crear otras hacia los roles iniciales. No se modifica `.env` ni se elige una cuenta privilegiada automáticamente.

Las reservas y las incidencias nuevas guardan la propiedad de origen. Si el usuario tiene más de una propiedad elegible en el edificio, debe enviar `propiedadId` al crear. Para incidencias sobre una unidad privada, el origen es esa misma propiedad. Las reservas con origen de propiedad no pueden trasladarse a otro edificio.

Las reservas antiguas y las incidencias antiguas sobre áreas comunes tienen origen nulo y no se muestran a roles de propiedad hasta vincularlas explícitamente a su propiedad de origen mediante una migración de datos revisada. La administración autorizada conserva acceso. Las incidencias antiguas sobre una unidad privada pueden resolver su contexto mediante esa unidad. No se infiere una propiedad histórica arbitraria.

## API

- `GET /api/auth/permisos`: devuelve los roles, ámbitos, IDs de contexto y permisos del usuario autenticado. El frontend puede combinar los permisos de los roles del contexto seleccionado; el backend vuelve a comprobar cada operación.
- `PUT /api/auth/profile`: permite editar campos personales propios, incluido email y contraseña; rechaza `estado` y campos desconocidos. No requiere un rol de negocio.
- `GET /api/roles` y `GET /api/roles/:id`: consultan los roles con su matriz de permisos. Son las únicas rutas de roles.
- `GET /api/reservaciones/disponibilidad?areaComunId=123`: devuelve ocupación sin autor ni descripción. Requiere el permiso específico de disponibilidad en el edificio.

Formato de los permisos de un rol, por sección (`/api/auth/permisos` los devuelve así en cada contexto; `/api/roles` agrega el `id` de cada fila de `rol_permiso`):

```json
{
  "permisos": [
    {
      "seccion": "RESERVAS",
      "crear": true,
      "leer": true,
      "editar": true,
      "borrar": false,
      "acciones": ["DISPONIBILIDAD"]
    }
  ]
}
```

Reservas e incidencias toman el autor de la sesión: `usuarioId` está prohibido en sus altas. Una incidencia conserva su autor y unidad. Cambiar su estado exige `CAMBIAR_ESTADO` y respeta Reportado → En revisión → Finalizado; mientras esté en Reportado o En revisión también puede pasar a Cancelado. Finalizado y Cancelado son estados finales y completan `closedAt`. Cada edición de una incidencia se hace en una transacción (`READ COMMITTED`) que primero bloquea solo su fila (`SELECT … FOR UPDATE`, sin joins) y después la relee con el ámbito del usuario: dos cambios simultáneos se ejecutan uno después del otro y el segundo se valida contra el estado que dejó el primero. Reservas e incidencias no tienen baja: no existen `DELETE /api/reservaciones/:id` ni `DELETE /api/incidencias/:id`. Cancelar una reserva usa su estado.

## Gestión de usuarios y asignaciones

El listado de usuarios del Administrativo reúne dos caminos vigentes: empleados de sus administraciones, y residentes o propietarios de edificios con `AdminEdificio` vigente. Crear un usuario exige un rol: un rol de administración crea el empleo y uno de propiedad crea la asignación sobre esa propiedad. No hay un vínculo de gestión aparte de esos dos caminos.

- `DELETE /api/users/:id`: da de baja la cuenta completa y requiere `USUARIOS.DESHABILITAR` global. El Administrativo inicial no lo tiene.

El Administrativo puede editar los datos personales permitidos de usuarios de su ámbito. Cambiar el email o contraseña de otra cuenta requiere edición global de usuarios; modificar `estado` requiere el permiso global de deshabilitación. La edición propia está disponible por `/auth/profile`.

Asignar/revocar roles requiere permisos independientes de gestionar usuarios. El Administrativo solamente delega los roles iniciales de propiedad dentro de sus edificios, sin superar su matriz inicial; los roles de administración no pueden contener permisos superiores a los propios en la administración destino. Asignar roles globales requiere gestión global.

Las asignaciones conservan su historia. `DELETE` finaliza su vigencia, incluso para asignaciones futuras, y no borra filas. Cambiar usuario, rol o contexto requiere revocar y crear otra asignación. Extender o reabrir vigencia exige permiso para asignar ese rol. Consultar, modificar o revocar una asignación requiere también permiso de lectura de asignaciones.

## Verificación

```powershell
npx tsc --noEmit
npm test
```

Las pruebas cubren vigencia, revocación, combinación de roles, aislamiento de ámbitos, delegación, filtros de consultas, restricciones de estados, proyección de datos personales, endpoints y bootstrap. Usan un EntityManager de prueba; los metadatos y las consultas SQL también pueden verificarse sin abrir una conexión. La actualización de una base MySQL con datos reales debe ejecutarse siguiendo los pasos de puesta en marcha.
