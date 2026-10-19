import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { sendSuccess, sendError } from '../../utils/response';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  activateAccountSchema,
  changePasswordSchema,
} from './auth.validation';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated.identifier, validated.password);
      return sendSuccess(res, 'Login successful.', result);
    } catch (error) {
      return next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthenticated', [], 401);
      }
      const user = await AuthService.getMe(req.user.id);
      return sendSuccess(res, 'User profile retrieved.', user);
    } catch (error) {
      return next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await AuthService.forgotPassword(validated.email);
      return sendSuccess(res, result.message, result);
    } catch (error) {
      return next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await AuthService.resetPassword(
        validated.token,
        validated.newPassword,
        validated.email
      );
      return sendSuccess(res, result.message, result);
    } catch (error) {
      return next(error);
    }
  }

  static async activateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = activateAccountSchema.parse(req.body);
      const result = await AuthService.activateAccount(validated.token, validated.newPassword);
      return sendSuccess(res, result.message, result);
    } catch (error) {
      return next(error);
    }
  }

  static async sendInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.createAndSendActivationInvite(String(req.params.userId));
      return sendSuccess(res, 'Account activation invitation email sent.', result);
    } catch (error) {
      return next(error);
    }
  }

  static async listEmailLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await EmailService.listLogs(100);
      return sendSuccess(res, 'Email logs retrieved.', logs);
    } catch (error) {
      return next(error);
    }
  }

  static async getEmailStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await EmailService.verifyConnection();
      return sendSuccess(res, status.message, status);
    } catch (error) {
      return next(error);
    }
  }

  static async sendTestEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return sendError(res, 'A valid recipient email address is required.', [], 400);
      }
      const log = await EmailService.sendTestEmail(email.trim());
      if (log.status === 'FAILED') {
        return sendError(
          res,
          `Failed to deliver email: ${log.error || 'SMTP delivery error'}. Check server logs for details.`,
          [log.error || 'SMTP delivery error'],
          400
        );
      }
      return sendSuccess(res, `Test email dispatched to ${email}.`, log);
    } catch (error) {
      return next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthenticated', [], 401);
      const validated = changePasswordSchema.parse(req.body);
      const result = await AuthService.changePassword(
        req.user.id,
        validated.currentPassword,
        validated.newPassword
      );
      return sendSuccess(res, result.message, result);
    } catch (error) {
      return next(error);
    }
  }

  static async getSystemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await AuthService.getSystemStatus();
      return sendSuccess(res, 'System status retrieved.', status);
    } catch (error) {
      return next(error);
    }
  }

  static async setupAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.setupAdmin(req.body);
      return sendSuccess(res, 'Organization and administrator configured successfully!', result, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async resetDatabase(req: Request, res: Response, next: NextFunction) {
    try {
      const confirmPhrase = req.body.confirmation || req.body.confirm;
      const result = await AuthService.resetDatabase(confirmPhrase);
      return sendSuccess(res, result.message, result);
    } catch (error) {
      return next(error);
    }
  }
}

