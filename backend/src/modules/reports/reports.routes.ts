import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Dashboards
router.get('/dashboard/admin', authorize(Role.ADMIN, Role.HR), ReportsController.getAdminDashboard);
router.get('/dashboard/employee', ReportsController.getEmployeeDashboard);

// Reports
router.get('/payroll-summary', authorize(Role.ADMIN, Role.HR), ReportsController.getPayrollSummary);
router.get('/salary-register', authorize(Role.ADMIN, Role.HR), ReportsController.getSalaryRegister);
router.get('/department-cost', authorize(Role.ADMIN, Role.HR), ReportsController.getDepartmentCost);

export default router;
