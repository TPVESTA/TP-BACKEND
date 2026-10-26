# Ámbito de los tipos de unidad

`TipoUnidad.ambito` admite `PRIVADO` y `COMUN`.

POST `/api/tipos-unidad` requiere `nombre` y `ambito`. PUT permite editar uno o ambos campos. GET incluye `ambito`.

```json
{ "nombre": "Departamento", "ambito": "PRIVADO" }
```

Las propiedades requieren tipos privados y las áreas comunes requieren tipos comunes al crear una unidad o cambiar su tipo. No se puede cambiar el ámbito de un tipo si ya está asociado a unidades incompatibles.

## Registros existentes

El backend actual actualiza el esquema con MikroORM al arrancar. Reiniciar el backend incorpora la columna enum nullable `tipo_unidad.ambito` sin asignar una clasificación arbitraria. Los tipos anteriores quedan con `null` y aparecen como **Sin clasificar** en el backoffice; deben editarse para clasificarlos. La API no acepta `null` en altas ni como nuevo valor de ámbito.

Si un tipo antiguo se utilizó tanto para propiedades como para áreas comunes, crear un tipo separado para cada ámbito y reasignar las unidades antes de clasificar el original. No se modifican automáticamente esos vínculos.

Para una base cuyo esquema se gestione manualmente, agregar la columna **solo si no existe**:

```sql
ALTER TABLE tipo_unidad ADD COLUMN ambito ENUM('PRIVADO', 'COMUN') NULL;
```

Prueba específica: `node --test tests/ambito-unidad.test.cjs`.
