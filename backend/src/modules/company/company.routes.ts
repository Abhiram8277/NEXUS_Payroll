import { Router } from 'express';
import { CompanyController } from './company.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, CompanyController.get);
router.put('/', authenticate, authorize(Role.ADMIN), CompanyController.update);

export default router;
