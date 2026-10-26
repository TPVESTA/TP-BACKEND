# Datos de prueba de Rosario

Con MySQL disponible y las variables `DB_*` configuradas en `.env`, ejecutar:

```bash
npm run seed
```

El comando prepara las tablas sin eliminar tablas ni columnas y carga datos ficticios:

- Rosario, Santa Fe, y la Administración Rosario Centro.
- 4 edificios: Parque Independencia, Costa del Paraná, Boulevard Oroño y Pichincha.
- 10 departamentos por edificio (40 en total), con copropiedad de 10% cada uno.
- 2 espacios comunes por edificio (8 en total): SUM y terraza con parrillero.
- 10 inquilinos distribuidos entre los edificios, con el rol `RESIDENTE`.
- 5 propietarios, cada uno vinculado a 8 departamentos.
- Un empleado administrativo y uno de mantenimiento en la administración que gestiona los 4 edificios.
- Un sysadmin con rol global `SUPERADMIN`.

Todas las cuentas nuevas tienen contraseña **`ROOT`**, guardada como hash bcrypt.

| Perfil | Email |
| --- | --- |
| Sysadmin | `sysadmin@rosario.example` |
| Administrativo | `administrativo@rosario.example` |
| Mantenimiento | `mantenimiento@rosario.example` |
| Inquilinos | `inquilino1@rosario.example` a `inquilino10@rosario.example` |
| Propietarios | `propietario1@rosario.example` a `propietario5@rosario.example` |

Se puede repetir el comando: reutiliza los registros y vínculos vigentes, conserva las contraseñas y los permisos existentes, y no borra datos. Si encuentra una cuenta deshabilitada o un registro eliminado que coincide con los del seed, falla sin reactivarlo. La carga de datos se realiza en una transacción; si falla, se revierte completa.

El login acepta `ROOT` para estas cuentas. El alta y los cambios de contraseña mediante la API conservan el mínimo de 6 caracteres.
