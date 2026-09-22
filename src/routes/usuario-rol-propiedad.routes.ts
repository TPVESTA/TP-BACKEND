import { Router } from 'express';
import * as controller from '../controllers/usuario-rol-propiedad.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createUsuarioRolPropiedadSchema, updateUsuarioRolPropiedadSchema } from '../schemas/usuario-rol-propiedad.schema';

// La autenticación se aplica en routes/index.ts antes de montar este router.
const router: Router = Router();

router.get('/', controller.getUsuariosRolesPropiedad);
router.get('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.getUsuarioRolPropiedad
);
router.post('/',
  validate({ location: 'body', schema: createUsuarioRolPropiedadSchema }),
  controller.createUsuarioRolPropiedad
);
router.put('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  validate({ location: 'body', schema: updateUsuarioRolPropiedadSchema }),
  controller.updateUsuarioRolPropiedad
);
router.delete('/:id',
  validate({ location: 'params', schema: idParamSchema }),
  controller.deleteUsuarioRolPropiedad
);

export default router;
