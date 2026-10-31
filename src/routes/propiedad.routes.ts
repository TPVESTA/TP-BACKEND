import { Router } from 'express';
import * as controller from '../controllers/propiedad.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createPropiedadSchema, updatePropiedadSchema } from '../schemas/unidad.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getPropiedades);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getPropiedad
);
router.post('/',
  validate({ location: 'body', schema: createPropiedadSchema }),
  controller.createPropiedad
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updatePropiedadSchema }),
  controller.updatePropiedad
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deletePropiedad
);

export default router;
