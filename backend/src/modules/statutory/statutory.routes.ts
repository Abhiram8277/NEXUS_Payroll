import { Router } from 'express';
import { StatutoryController } from './statutory.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', StatutoryController.getAll);
router.post('/', authorize(Role.ADMIN), StatutoryController.create);

export default router;
