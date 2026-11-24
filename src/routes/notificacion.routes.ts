import { Router } from 'express';
import * as controller from '../controllers/notificacion.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import {
  createNotificacionSchema, listNotificacionesSchema, updateNotificacionSchema,
} from '../schemas/notificacion.schema';

const router: Router = Router();
const validateId = validate({ location: 'params', schema: idParamSchema });

router.get('/', validate({ location: 'query', schema: listNotificacionesSchema }), controller.getNotificaciones);
router.post('/', validate({ schema: createNotificacionSchema }), controller.createNotificacion);
router.put('/:id', validateId, validate({ schema: updateNotificacionSchema }), controller.updateNotificacion);
router.delete('/:id', validateId, controller.deleteNotificacion);

export default router;
