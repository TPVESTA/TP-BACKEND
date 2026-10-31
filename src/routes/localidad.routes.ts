import { Router } from 'express';
import * as controller from '../controllers/localidad.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createLocalidadSchema, updateLocalidadSchema } from '../schemas/catalogos.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getLocalidades);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getLocalidad
);
router.post('/',
  validate({ location: 'body', schema: createLocalidadSchema }),
  controller.createLocalidad
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateLocalidadSchema }),
  controller.updateLocalidad
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteLocalidad
);

export default router;
