# Autenticación

La API usa JWT firmados con HS256. El token identifica al usuario (`userId`);
los permisos no viajan en el token: se cargan desde la base en cada petición
(ver [autorizacion.md](autorizacion.md)).

## Configuración

| Variable | Uso |
| --- | --- |
| `JWT_SECRET` | Clave de firma. Obligatoria: sin ella la API no emite ni verifica tokens. |
| `JWT_EXPIRES_IN` | Vencimiento del token (por defecto `1h`). |

## Endpoints

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Público | Crea una cuenta sin roles y devuelve `{ user, token }` |
| POST | `/api/auth/login` | Público | Devuelve `{ user, token }` si el email y la contraseña son válidos y la cuenta está activa |
| GET | `/api/auth/profile` | Token | Datos de la cuenta propia |
| PUT | `/api/auth/profile` | Token | Edita la cuenta propia (sin `estado` ni campos desconocidos) |
| GET | `/api/auth/permisos` | Token | Roles y permisos vigentes por contexto |
| GET | `/api/auth/verify` | Token | `{ valid: true, user }` |

Las rutas con token esperan el encabezado `Authorization: Bearer <token>`.
`user` es siempre la misma proyección: id, nombre, apellido, email, teléfono,
fecha de nacimiento y estado; nunca la contraseña.

## Reglas

- Las contraseñas tienen entre 6 y 18 caracteres, no se recortan y se guardan
  con bcrypt (12 rondas).
- Cada petición vuelve a leer al usuario: desactivar o dar de baja una cuenta
  invalida sus tokens anteriores en la siguiente petición.
- Un login fallido responde siempre "Credenciales inválidas", sin indicar si el
  email existe.
- El frontend guarda el token en `sessionStorage`: la sesión dura lo que dure la
  pestaña.

El detalle de los middlewares está en [middlewares.md](middlewares.md).
