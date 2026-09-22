import { Router } from 'express';
import * as controller from '../controllers/reservacion.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createReservacionSchema, updateReservacionSchema } from '../schemas/reservacion.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getReservaciones);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getReservacion
);
router.post('/',
  validate({ location: 'body', schema: createReservacionSchema }),
  controller.createReservacion
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateReservacionSchema }),
  controller.updateReservacion
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteReservacion
);

export default router;
