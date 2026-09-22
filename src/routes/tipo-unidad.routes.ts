import { Router } from 'express';
import * as controller from '../controllers/tipo-unidad.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createTipoUnidadSchema, updateTipoUnidadSchema } from '../schemas/tipo-unidad.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getTiposUnidad);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getTipoUnidad
);
router.post('/',
  validate({ location: 'body', schema: createTipoUnidadSchema }),
  controller.createTipoUnidad
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateTipoUnidadSchema }),
  controller.updateTipoUnidad
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteTipoUnidad
);

export default router;
