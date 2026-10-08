import { Router } from 'express';
import { PayslipsController } from './payslips.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', PayslipsController.list);
router.get('/:id', PayslipsController.getById);
router.get('/:id/pdf', PayslipsController.downloadPDF);

export default router;
