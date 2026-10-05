import { Router } from 'express';
import * as controller from '../controllers/rol.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createRolSchema, updateRolSchema, replacePermissionsSchema } from '../schemas/rol.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getRoles);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getRol
);
router.post('/',
  validate({ location: 'body', schema: createRolSchema }),
  controller.createRol
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateRolSchema }),
  controller.updateRol
);
router.put('/:id/permisos',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: replacePermissionsSchema, stripUnknown: false }),
  controller.replacePermissions
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteRol
);

export default router;
