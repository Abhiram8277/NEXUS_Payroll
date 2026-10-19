import { Router } from 'express';
import { EmployeesController } from './employees.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { documentUpload } from '../../middleware/upload.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/me', EmployeesController.getMyProfile);
router.get('/', authorize(Role.ADMIN, Role.HR), EmployeesController.list);
router.get('/:id', EmployeesController.getById); // Internal check for EMPLOYEE self
router.post('/', authorize(Role.HR), EmployeesController.create);
router.put('/:id', authorize(Role.ADMIN, Role.HR), EmployeesController.update);
router.delete('/:id', authorize(Role.ADMIN, Role.HR), EmployeesController.delete);
router.post(
  '/:id/documents',
  authorize(Role.ADMIN, Role.HR),
  documentUpload.single('file'),
  EmployeesController.uploadDocument
);
router.get('/documents/:docId/download', EmployeesController.downloadDocument);
router.delete('/documents/:docId', authorize(Role.ADMIN, Role.HR), EmployeesController.deleteDocument);

export default router;
