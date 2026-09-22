import { Router } from 'express';
import * as controller from '../controllers/edificio.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createEdificioSchema, updateEdificioSchema } from '../schemas/edificio.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getEdificios);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getEdificio
);
router.post('/',
  validate({ location: 'body', schema: createEdificioSchema }),
  controller.createEdificio
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateEdificioSchema }),
  controller.updateEdificio
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteEdificio
);

export default router;
