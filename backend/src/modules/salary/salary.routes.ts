import { Router } from 'express';
import { SalaryController } from './salary.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Employee portal access
router.get('/my-salary', SalaryController.getMySalary);

// Template management
router.get('/templates', authorize(Role.ADMIN, Role.HR), SalaryController.listTemplates);
router.get('/templates/:id', authorize(Role.ADMIN, Role.HR), SalaryController.getTemplate);
router.post('/templates', authorize(Role.ADMIN, Role.HR), SalaryController.createTemplate);
router.put('/templates/:id', authorize(Role.ADMIN, Role.HR), SalaryController.updateTemplate);
router.post('/templates/:id/duplicate', authorize(Role.ADMIN, Role.HR), SalaryController.duplicateTemplate);
router.delete('/templates/:id', authorize(Role.ADMIN, Role.HR), SalaryController.deleteTemplate);

// Preview & Assignment
router.get('/preview-breakdown', authorize(Role.ADMIN, Role.HR), SalaryController.previewBreakdown);
router.get('/assignments', authorize(Role.ADMIN, Role.HR), SalaryController.listAssignments);
router.post('/assign', authorize(Role.ADMIN, Role.HR), SalaryController.assignSalary);
router.post('/bulk-assign', authorize(Role.ADMIN, Role.HR), SalaryController.bulkAssignSalary);
router.get('/employee/:employeeId', SalaryController.getEmployeeSalary);
router.delete('/employee/:employeeId', authorize(Role.ADMIN, Role.HR), SalaryController.deleteEmployeeSalary);

export default router;
