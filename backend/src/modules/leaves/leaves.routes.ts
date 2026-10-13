import { Router } from 'express';
import { LeavesController } from './leaves.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Employee portal self-service
router.get('/my-balances', LeavesController.getMyBalances);
router.post('/apply', LeavesController.apply);
router.put('/:id/cancel', LeavesController.cancel);
router.delete('/:id', LeavesController.cancel);

// List requests (Employee sees own, Admin/HR sees all/filtered)
router.get('/', LeavesController.list);

// Admin & HR approvals
router.put('/:id/status', authorize(Role.ADMIN, Role.HR), LeavesController.updateStatus);
router.get('/balances/:employeeId', LeavesController.getBalances);

export default router;
