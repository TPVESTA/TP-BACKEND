import { Options } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { User } from '../entities/User';
import { Rol } from '../entities/Rol';
import { Administracion } from '../entities/Administracion';
import { Edificio } from '../entities/Edificio';

import { Localidad } from '../entities/Localidad';
import { TipoUnidad } from '../entities/TipoUnidad';
import { Unidad } from '../entities/Unidad';
import { Propiedad } from '../entities/Propiedad';
import { AreaComun } from '../entities/AreaComun';
import { Empleado } from '../entities/Empleado';
import { AdminEdificio } from '../entities/AdminEdificio';
import { UsuarioRolPropiedad } from '../entities/UsuarioRolPropiedad';
import { Incidencia } from '../entities/Incidencia';
import { Reservacion } from '../entities/Reservacion';

import { UsuarioRol } from '../entities/UsuarioRol';

const config: Options<MySqlDriver> = {
  driver: MySqlDriver,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  dbName: process.env.DB_NAME || 'api-express-db',
  charset: 'utf8mb4',
  debug: process.env.NODE_ENV !== 'production' && process.env.DB_DEBUG === 'true',
  allowGlobalContext: true,
  entities: [UsuarioRol, User, Rol, Administracion, Edificio, Localidad, TipoUnidad, Unidad, Propiedad, AreaComun, Empleado, AdminEdificio, UsuarioRolPropiedad, Incidencia, Reservacion],
  discovery: {
    warnWhenNoEntities: false,
  },
  migrations: {
    path: './src/migrations',
  },
};

export default config;
