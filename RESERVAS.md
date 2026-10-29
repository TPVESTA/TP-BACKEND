# Reservas de áreas comunes

## Regla de negocio

Cada área común admite una sola reserva activa por día completo. El día se
interpreta en Buenos Aires (UTC-03:00): distintas horas del mismo día compiten
por el mismo espacio. Otra área u otro día son destinos independientes.

Solo ocupa disponibilidad una reserva en estado `Reservado` con `deletedAt`
nulo. Las reservas canceladas, finalizadas o dadas de baja no bloquean el día.
La cancelación libera la disponibilidad cuando se confirma la transacción.

La regla se verifica al crear y al editar, incluso al cambiar fecha y área a la
vez. Al editar se excluye la propia reserva. Una edición rechazada no guarda
parcialmente la fecha, el espacio ni la descripción.

## Respuesta ante ocupación

`POST /api/reservaciones` y `PUT /api/reservaciones/:id` responden HTTP **409**
si el destino está ocupado:

```json
{
  "success": false,
  "error": "El área común ya está reservada para ese día. Elegí otra fecha o espacio."
}
```

La respuesta no identifica al otro usuario ni expone su descripción. Se
conservan las comprobaciones de permisos, autor, propiedad de origen, fechas
pasadas y estados de la reserva.

## Solicitudes simultáneas

El servicio usa una transacción con aislamiento `READ COMMITTED` y bloqueo
pesimista de escritura (`SELECT ... FOR UPDATE`) sobre el área de destino.
Se bloquea el área aunque todavía no tenga reservas. El bloqueo se mantiene
durante la consulta de ocupación y el guardado, hasta confirmar o revertir la
transacción. La siguiente solicitud vuelve a consultar los datos confirmados.

Las modificaciones también bloquean la reserva antes de leer su estado para
evitar que dos ediciones trabajen con la misma versión anterior. Se usa la
[API de transacciones y bloqueos de MikroORM](https://mikro-orm.io/docs/transactions#pessimistic-locking).

Esta garantía corresponde a las escrituras realizadas mediante el servicio.
Las inserciones SQL manuales deben respetar la misma regla. No se eliminan ni
se corrigen automáticamente duplicados existentes.

## Pruebas

Pruebas de reglas y permisos, sin conexión a MySQL:

```sh
npm run test:reservas
npx tsc --noEmit
```

Cubren conflictos entre usuarios, límites del día local, cambios de fecha o
área, exclusión de la propia reserva, cancelaciones y respuesta HTTP 409.

La integración necesita un servidor **MySQL de pruebas con InnoDB** y un
usuario que pueda crear y eliminar bases. Crea una base propia con nombre
aleatorio `reservas_test_*` y la elimina al terminar; no utiliza la base de la
aplicación. No requiere iniciar `src/app.ts`.

Ejemplo en PowerShell, ajustando los valores a ese servidor:

```powershell
$env:RESERVAS_MYSQL_TEST = '1'
$env:RESERVAS_TEST_DB_HOST = '127.0.0.1'
$env:RESERVAS_TEST_DB_PORT = '3306'
$env:RESERVAS_TEST_DB_USER = 'usuario_de_pruebas'
$env:RESERVAS_TEST_DB_PASSWORD = 'clave_del_servidor_de_pruebas'
npm run test:reservas:mysql
```

Comprueba diez altas simultáneas, dos reprogramaciones al mismo destino, un
alta compitiendo con un cambio de área, rollback y cancelación. Sin
`RESERVAS_MYSQL_TEST=1` se omite esta integración en `npm test`.

## Verificación realizada el 28/10/2026

- TypeScript: `tsc --noEmit --pretty false`, sin errores.
- Reglas, permisos e integración en MySQL 9.7: 25 pruebas aprobadas, sin fallos
  (incluye el grupo de integración y sus cuatro escenarios).
- Suite general: 129 aprobadas, 122 fallidas y una integración omitida.
  Una copia temporal de control sin la corrección de reservas reprodujo las
  mismas 122 pruebas fallidas; no se agregaron fallos a esa lista. Esas pruebas
  antiguas requieren una actualización independiente.

La verificación se ejecutó con un servidor MySQL temporal en el puerto 33317,
sin usar la base de la aplicación. El servidor temporal se apagó al terminar.
