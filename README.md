# Vesta · API

API de Vesta, la aplicación de administración de consorcios. Gestiona
administraciones, edificios, unidades, usuarios y sus roles, reservas de áreas
comunes e incidencias, con permisos por propiedad, administración o globales.

Node.js + Express 5 + TypeScript, MikroORM 6 sobre MySQL, validación con Joi y
autenticación con JWT. El frontend está en `TP-FRONTEND/consorcioapp`.

## Puesta en marcha

1. Node.js 22 (ver `.nvmrc`) y un servidor MySQL.
2. `npm install` (el equipo también usa pnpm; hay lockfile para ambos).
3. Copiar `.env.template` a `.env` y completar la conexión (`DB_*`), `JWT_SECRET`
   y, si hace falta, `PORT` (por defecto 3000).
4. `npm run dev`: al arrancar, MikroORM actualiza el esquema de la base y se
   cargan los roles y permisos iniciales.
5. Opcional: `npm run seed` carga datos de prueba de Rosario y **reemplaza los
   datos existentes**; ver [docs/seed.md](docs/seed.md).

## Despliegue en Vercel

El backend exporta la aplicación Express para que Vercel la ejecute como una
Function; localmente, `npm run dev` y `npm start` siguen iniciando el servidor.
Configurar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y
`JWT_SECRET` en las variables de entorno del proyecto. La conexión a MySQL se
inicializa al atender la primera solicitud bajo `/api`, antes de despacharla a
las rutas.

## Scripts

| Script | Uso |
| --- | --- |
| `npm run dev` / `npm run dev:watch` | Levanta la API con ts-node (con recarga automática en `dev:watch`) |
| `npm run build` y `npm start` | Compila a `dist/` y ejecuta la versión compilada |
| `npm run seed` | Datos de prueba (reemplaza los existentes) |
| `npm test` | Pruebas sin MySQL; `npm run test:reservas:mysql` agrega la integración de reservas |

## Estructura

```
src/
├── app.ts            # Express, contexto de MikroORM y rutas bajo /api
├── routes/           # Rutas y validación (Joi) de cada recurso
├── controllers/      # Leen la petición y arman la respuesta HTTP
├── services/         # Reglas de negocio y persistencia, un servicio por entidad
│   └── authorization/  # Carga y reglas de permisos, roles iniciales
├── middlewares/      # Autenticación, autorización, validación y errores
├── schemas/          # Schemas de entrada (Joi)
├── entities/         # Entidades y reglas del modelo (MikroORM)
├── helpers/          # Respuestas HTTP y proyecciones de datos
├── database/         # Conexión, actualización de esquema y seed
└── config/ · errors/ · catalogs/
tests/                # node --test, sin MySQL salvo la integración de reservas
docs/                 # Documentación de la API
```

## Documentación

- [docs/rutas.md](docs/rutas.md): endpoints, métodos y códigos de estado.
- [docs/autenticacion.md](docs/autenticacion.md): login, token y perfil.
- [docs/autorizacion.md](docs/autorizacion.md): roles, permisos por contexto y puesta en marcha.
- [docs/reservas.md](docs/reservas.md): exclusividad por área y día, y concurrencia.
- [docs/servicios.md](docs/servicios.md), [docs/controladores.md](docs/controladores.md),
  [docs/schemas.md](docs/schemas.md) y [docs/middlewares.md](docs/middlewares.md): capas de la API.
- [docs/ambito-unidad.md](docs/ambito-unidad.md): tipos de unidad privados y comunes.
- [docs/seed.md](docs/seed.md): datos de prueba y cuentas.
