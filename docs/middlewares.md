# Middlewares

## Autenticacion

`authMiddleware` exige `Authorization: Bearer <token>`. Verifica firma HS256,
vencimiento y un `userId` numerico, entero y positivo. Carga al usuario en cada
peticion, exige que exista, no este eliminado y tenga `estado: true`.
Solo entonces guarda los datos publicos en `req.user` y ejecuta `next()`.

Login tambien rechaza usuarios desactivados. Desactivar o eliminar un usuario
impide usar sus tokens anteriores en las siguientes peticiones.

`authorizationMiddleware` se ejecuta despues y carga los permisos vigentes con
`loadAuthorizationContext(id, em, { userVerified: true })`: reutiliza la
verificacion que `authMiddleware` acaba de hacer y no vuelve a leer al usuario,
asi cada peticion protegida lo consulta una sola vez. Llamada sin esa opcion, la
funcion sigue leyendo al usuario y devuelve un contexto sin permisos si esta
inactivo o dado de baja.

En `routes/index.ts`, todas las rutas de negocio se montan despues de
`router.use(authMiddleware)`. Esto incluye ahora los GET de usuarios.
En el router de autenticacion, login y registro quedan antes del middleware;
profile (GET y PUT) y verify quedan despues. Esas tres rutas usan solo la
identidad de `req.user` y no cargan permisos: el perfil propio no requiere un
rol de negocio y `PUT /auth/profile` edita unicamente la cuenta del token.
`GET /auth/permisos` es la unica ruta de ese router que usa
`authorizationMiddleware`. La ruta informativa `/` sigue publica.

`req.user` y las respuestas de login y registro comparten la misma proyeccion
(`toPublicUser` en `auth.service.ts`): id, nombre, apellido, email, telefono,
fecha de nacimiento y estado; nunca la contrasena.

La autenticacion solo identifica al usuario. Los permisos por rol, edificio o
propiedad los carga `authorizationMiddleware` y los aplica cada servicio; ver
`autorizacion.md`.

## Validacion

`validate` aplica un schema a `body`, `params` o `query`, mantiene las
conversiones de Joi y elimina campos desconocidos por defecto. Devuelve 400
con `error` y `errors` ante datos invalidos. Fallos no pertenecientes a Joi se
envian al manejador global mediante `next(error)`.

Para `query` crea una propiedad propia con el valor validado: Express 5 utiliza
un getter sin setter. Esto conserva numeros y otros valores convertidos para
los controladores, sin `@ts-ignore`.

## Errores y orden

`errorMiddleware` responde JSON: 401 para AuthenticationError, 400 para reglas
de dominio o JSON mal formado, 409 para conflictos de integridad, 413 para
cuerpos demasiado grandes y 500 para errores inesperados. No devuelve detalles
internos al cliente. Errores de conexion o configuracion no se presentan como
credenciales incorrectas. Si ya se enviaron headers, delega en Express.

`notFoundMiddleware` responde 404 cuando ninguna ruta atendio la peticion.
Dentro de `/api`, una peticion sin token puede recibir 401 antes de llegar a
ese middleware, aunque su ruta no exista.

En `app.ts` el orden es: parseo JSON, logger, contexto de MikroORM, rutas API,
404 y manejador de errores. El contexto se registra antes de las rutas.

## Verificacion

`npx tsc --noEmit --pretty false` y `npm test`.
Las pruebas nuevas ejecutan Express en un puerto local temporal, con JWT y
bcrypt reales y acceso a datos simulado. Comprueban las rutas existentes,
tokens invalidos, usuarios desactivados, conversion de query, errores JSON,
limites de body y respuestas sin informacion interna. No conectan a MySQL.

Las rutas de todas las entidades estan montadas despues del middleware de
autenticacion y usan sus schemas; ver `rutas.md`.
