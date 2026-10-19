import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

// View users (Admin & HR)
router.get('/', authorize('ADMIN', 'HR'), UsersController.listUsers);
router.get('/:id', authorize('ADMIN', 'HR'), UsersController.getUserById);

// Manage staff users (Admin only)
router.post('/', authorize('ADMIN'), UsersController.createUser);
router.put('/:id', authorize('ADMIN'), UsersController.updateUser);
router.delete('/:id', authorize('ADMIN'), UsersController.deleteUser);
router.post('/:id/reset-password', authorize('ADMIN'), UsersController.resetPassword);

export default router;
