import { Router } from 'express';
import * as controller from '../controllers/administracion.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createAdministracionSchema, updateAdministracionSchema } from '../schemas/administracion.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getAdministraciones);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getAdministracion
);
router.post('/',
  validate({ location: 'body', schema: createAdministracionSchema }),
  controller.createAdministracion
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateAdministracionSchema }),
  controller.updateAdministracion
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteAdministracion
);

export default router;
