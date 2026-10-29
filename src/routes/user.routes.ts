import express from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { createUserSchema, updateUserSchema, idParamSchema } from '../schemas/user.schema';
// La autenticación se aplica en routes/index.ts.

const router: express.Router = express.Router();

// GET /users - Obtener todos los usuarios (requiere autenticación)
router.get('/', userController.getUsers);

// GET /users/:id - Obtener un usuario por ID (requiere autenticación)
router.get('/:id', validate({ location: 'params', schema: idParamSchema }), userController.getUser);

// POST /users - Crear un nuevo usuario (requiere autenticación)
router.post('/', validate({ location: 'body', schema: createUserSchema }), userController.createUser);

// PUT /users/:id - Actualizar un usuario existente (requiere autenticación)
router.put('/:id', validate({ location: 'params', schema: idParamSchema }), validate({ location: 'body', schema: updateUserSchema }), userController.updateUser);

// DELETE /users/:id - Eliminar un usuario (requiere autenticación)
router.delete('/:id', validate({ location: 'params', schema: idParamSchema }), userController.deleteUser);

export default router;
