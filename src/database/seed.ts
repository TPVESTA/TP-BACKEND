import 'dotenv/config';
import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import config from '../config/mikro-orm.config';
import { seedRosario } from './seeds/rosario.seed';

async function main(): Promise<void> {
  const orm = await MikroORM.init<MySqlDriver>(config);
  try {
    // Igual que al iniciar la API, prepara las tablas; no elimina tablas ni columnas.
    await orm.getSchemaGenerator().updateSchema({ safe: true, dropTables: false });
    const summary = await seedRosario(orm.em.fork());
    console.log('Seed Rosario completado:', summary);
    console.log('Los datos anteriores fueron reemplazados por el seed Rosario.');
    console.log('Todas las cuentas usan la contraseña ROOT123. Ver SEED.md para los emails.');
  } finally {
    await orm.close(true);
  }
}

main().catch((error: unknown) => {
  console.error('No se pudo completar el seed Rosario:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
