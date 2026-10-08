import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from './auth.validation';

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
      const result = await AuthService.resetPassword(validated.email, validated.newPassword);
      return sendSuccess(res, result.message, result);
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
