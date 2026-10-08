import { Router } from 'express';
import { SalaryController } from './salary.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Employee portal access
router.get('/my-salary', SalaryController.getMySalary);

// Template management (Admin only, HR read)
router.get('/templates', authorize(Role.ADMIN, Role.HR), SalaryController.listTemplates);
router.get('/templates/:id', authorize(Role.ADMIN, Role.HR), SalaryController.getTemplate);
router.post('/templates', authorize(Role.ADMIN), SalaryController.createTemplate);
router.put('/templates/:id', authorize(Role.ADMIN), SalaryController.updateTemplate);

// Assignment
router.post('/assign', authorize(Role.ADMIN, Role.HR), SalaryController.assignSalary);
router.get('/employee/:employeeId', SalaryController.getEmployeeSalary);

export default router;
