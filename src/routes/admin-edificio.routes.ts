import { Router } from 'express';
import * as controller from '../controllers/admin-edificio.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createAdminEdificioSchema, updateAdminEdificioSchema } from '../schemas/asignaciones.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getAdminEdificios);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getAdminEdificio
);
router.post('/',
  validate({ location: 'body', schema: createAdminEdificioSchema }),
  controller.createAdminEdificio
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateAdminEdificioSchema }),
  controller.updateAdminEdificio
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteAdminEdificio
);

export default router;
