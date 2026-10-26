import { Router } from 'express';
import * as controller from '../controllers/usuario-rol.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createUsuarioRolSchema, updateUsuarioRolSchema } from '../schemas/usuario-rol.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getUsuariosRoles);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getUsuarioRol
);
router.post('/',
  validate({ location: 'body', schema: createUsuarioRolSchema }),
  controller.createUsuarioRol
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateUsuarioRolSchema }),
  controller.updateUsuarioRol
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteUsuarioRol
);

export default router;
