import { Router } from 'express';
import * as controller from '../controllers/area-comun.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createAreaComunSchema, updateAreaComunSchema } from '../schemas/unidad.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getAreasComunes);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getAreaComun
);
router.post('/',
  validate({ location: 'body', schema: createAreaComunSchema }),
  controller.createAreaComun
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateAreaComunSchema }),
  controller.updateAreaComun
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteAreaComun
);

export default router;
