import { Router } from 'express';
import { PayrollController } from './payroll.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Preview and preparation (HR and Admin)
router.get('/preview', authorize(Role.ADMIN, Role.HR), PayrollController.preview);
router.post('/run', authorize(Role.ADMIN, Role.HR), PayrollController.run);
router.get('/runs', authorize(Role.ADMIN, Role.HR), PayrollController.list);
router.get('/runs/:year/:month', authorize(Role.ADMIN, Role.HR), PayrollController.getByPeriod);

// HR/Admin workflow submission, distribution, and draft deletion
router.put('/runs/:id/submit', authorize(Role.ADMIN, Role.HR), PayrollController.submitForApproval);
router.post('/runs/:id/distribute-payslips', authorize(Role.ADMIN, Role.HR), PayrollController.distributePayslips);
router.delete('/runs/:id', authorize(Role.ADMIN, Role.HR), PayrollController.deleteRun);

// Approval, Rejection, and Locking (Admin only)
router.put('/runs/:id/approve', authorize(Role.ADMIN), PayrollController.approve);
router.put('/runs/:id/reject', authorize(Role.ADMIN), PayrollController.reject);
router.put('/runs/:id/lock', authorize(Role.ADMIN), PayrollController.lock);

export default router;
