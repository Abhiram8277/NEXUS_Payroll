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
}
