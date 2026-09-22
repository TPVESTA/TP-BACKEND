import { Router } from 'express';
import * as controller from '../controllers/empleado.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createEmpleadoSchema, updateEmpleadoSchema } from '../schemas/empleado.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getEmpleados);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getEmpleado
);
router.post('/',
  validate({ location: 'body', schema: createEmpleadoSchema }),
  controller.createEmpleado
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateEmpleadoSchema }),
  controller.updateEmpleado
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteEmpleado
);

export default router;
