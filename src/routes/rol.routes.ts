import { Router } from 'express';
import * as controller from '../controllers/rol.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getRoles);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getRol
);

export default router;
