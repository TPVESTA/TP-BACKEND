import { Router } from 'express';
import * as controller from '../controllers/incidencia.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createIncidenciaSchema, updateIncidenciaSchema } from '../schemas/incidencia.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getIncidencias);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getIncidencia
);
router.post('/',
  validate({ location: 'body', schema: createIncidenciaSchema }),
  controller.createIncidencia
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateIncidenciaSchema }),
  controller.updateIncidencia
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteIncidencia
);

export default router;
