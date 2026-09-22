import { Router } from 'express';
import * as controller from '../controllers/unidad.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createUnidadSchema, updateUnidadSchema } from '../schemas/unidad.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getUnidades);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getUnidad
);
router.post('/',
  validate({ location: 'body', schema: createUnidadSchema }),
  controller.createUnidad
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateUnidadSchema }),
  controller.updateUnidad
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteUnidad
);

export default router;
