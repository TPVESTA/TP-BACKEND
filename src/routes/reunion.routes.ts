import { Router } from 'express';
import * as controller from '../controllers/reunion.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { createReunionSchema, updateReunionSchema } from '../schemas/reunion.schema';

const router: Router = Router();
const validateId = validate({ location: 'params', schema: idParamSchema });

router.get('/', controller.getReuniones);
router.get('/:id', validateId, controller.getReunion);
router.post('/', validate({ schema: createReunionSchema }), controller.createReunion);
router.put('/:id', validateId, validate({ schema: updateReunionSchema }), controller.updateReunion);
router.delete('/:id', validateId, controller.deleteReunion);

export default router;
