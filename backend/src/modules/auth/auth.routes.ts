import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min window
  message: { success: false, message: 'Too many login attempts, please try again later.', errors: [] },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/system-status', AuthController.getSystemStatus);
router.post('/setup-admin', authLimiter, AuthController.setupAdmin);
router.post('/login', authLimiter, AuthController.login);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);
router.post('/activate-account', authLimiter, AuthController.activateAccount);
router.post('/reset-database', authLimiter, AuthController.resetDatabase);
router.get('/me', authenticate, AuthController.me);
router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/invite/:userId', authenticate, authorize('ADMIN', 'HR'), AuthController.sendInvite);
router.get('/email-logs', authenticate, authorize('ADMIN', 'HR'), AuthController.listEmailLogs);

export default router;

