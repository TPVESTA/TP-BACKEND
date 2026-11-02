# Datos de prueba de Rosario

Con MySQL disponible y las variables `DB_*` configuradas en `.env`, ejecutar:

```bash
npm run seed
```

En PowerShell, si aparece que `npm.ps1` tiene la ejecución de scripts
deshabilitada, usar `npm.cmd run seed`. No hace falta modificar la política de
ejecución de Windows. Para iniciar la API en esa terminal, usar
`npm.cmd run dev:watch`.

El comando prepara las tablas sin eliminar tablas ni columnas, **borra todos los datos anteriores de la aplicación** y carga únicamente estos datos ficticios y sus roles y permisos iniciales:

- Rosario, Santa Fe, y la Administración Rosario Centro.
- 4 edificios: Parque Independencia, Centro, Boulevard Oroño y Pichincha.
- 10 departamentos por edificio (40 en total), con copropiedad de 10% cada uno.
- 2 espacios comunes por edificio (8 en total): SUM y terraza con parrillero.
- 10 inquilinos distribuidos entre los edificios, con el rol `RESIDENTE`.
- 5 propietarios, cada uno vinculado a 8 departamentos.
- Un empleado administrativo y uno de mantenimiento en la administración que gestiona los 4 edificios.
- Un sysadmin con rol global `SUPERADMIN`.

Todas las cuentas tienen contraseña **`ROOT123`**, guardada como hash bcrypt, y un teléfono ficticio de Rosario con el formato `341555XXXX` (10 dígitos, obligatorio en la columna `user.telefono`).

| Perfil | Email |
| --- | --- |
| Sysadmin | `sysadmin@rosario.example` |
| Administrativo | `administrativo@rosario.example` |
| Mantenimiento | `mantenimiento@rosario.example` |
| Inquilinos | `inquilino1@rosario.example` a `inquilino10@rosario.example` |
| Propietarios | `propietario1@rosario.example` a `propietario5@rosario.example` |

Cada ejecución reemplaza los datos, incluidos registros con baja lógica, cuentas deshabilitadas, reservas, incidencias y permisos personalizados. Las cuentas y sus contraseñas se crean nuevamente. La limpieza respeta las claves foráneas y se realiza en la misma transacción que la carga: si falla, se revierten ambas operaciones.

El login acepta `ROOT123` para estas cuentas. El alta y los cambios de contraseña mediante la API conservan el mínimo de 6 caracteres.
