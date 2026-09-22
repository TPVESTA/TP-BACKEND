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
const PORT = 3000;

// Función para inicializar la aplicación
const initializeApp = async (): Promise<void> => {
  try {
    // Inicializar la base de datos
    const orm = await dbManager.initialize();
    
    // El contexto debe registrarse antes de las rutas.
    app.use((req: Request, res: Response, next: NextFunction) => {
      RequestContext.create(orm.em, next);
    });
    
    app.use('/api', routes);
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);
    
    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);
    process.exit(1);
  }
};

// Manejar el cierre graceful de la aplicación
process.on('SIGINT', async () => {
  console.log('Cerrando la aplicación...');
  await dbManager.close();
  process.exit(0);
});

// Inicializar la aplicación
initializeApp();

export default app;
