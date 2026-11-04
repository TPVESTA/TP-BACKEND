import dotenv from 'dotenv'
dotenv.config()

import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import { RequestContext } from '@mikro-orm/core';
import DatabaseManager from './database/DatabaseManager';
import routes from './routes';
import messages from './catalogs/messages.json';
import { errorMiddleware, notFoundMiddleware } from './middlewares/error.middleware';

const app: express.Application = express();
const dbManager = DatabaseManager.getInstance();
let ormPromise: ReturnType<typeof dbManager.initialize> | undefined;

const getORM = (): ReturnType<typeof dbManager.initialize> => {
  if (!ormPromise) {
    ormPromise = dbManager.initialize();
  }
  return ormPromise;
};

// Middleware de logger personalizado
const logger = (req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
};

// Middleware para parsear JSON
app.use(express.json());

// Middleware de logger
app.use(logger);

// Ruta de prueba en la raíz
app.get('/', (req: Request, res: Response) => {
  res.json(messages.welcomeMessage);
});
const PORT = Number(process.env.PORT) || 3000;

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  getORM()
    .then(orm => RequestContext.create(orm.em, next))
    .catch(next);
}, routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Manejar el cierre graceful de la aplicación
process.on('SIGINT', async () => {
  console.log('Cerrando la aplicación...');
  await dbManager.close();
  process.exit(0);
});

if (require.main === module) {
  getORM()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
      });
    })
    .catch(error => {
      console.error('Error al inicializar la aplicación:', error);
      process.exit(1);
    });
}

export default app;
