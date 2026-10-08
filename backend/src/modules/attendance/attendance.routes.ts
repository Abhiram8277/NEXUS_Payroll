import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { excelUpload } from '../../middleware/upload.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Employee portal self-service
router.get('/my-attendance', AttendanceController.getMyAttendance);

// Admin & HR management
router.post('/mark', authorize(Role.ADMIN, Role.HR), AttendanceController.mark);
router.get('/summary', authorize(Role.ADMIN, Role.HR), AttendanceController.getMonthlySummary);
router.post(
  '/import',
  authorize(Role.ADMIN, Role.HR),
  excelUpload.single('file'),
  AttendanceController.importBulk
);
router.get('/employee/:employeeId', AttendanceController.getEmployeeAttendance);

export default router;
