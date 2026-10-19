import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { sendSuccess, sendError } from '../../utils/response';

export class UsersController {
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, status, search, page, limit } = req.query;
      const result = await UsersService.listUsers({
        role: role ? String(role) : undefined,
        status: status ? String(status) : undefined,
        search: search ? String(search) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return sendSuccess(res, 'Users retrieved successfully.', result);
    } catch (error) {
      return next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.getUserById(String(req.params.id));
      return sendSuccess(res, 'User retrieved successfully.', user);
    } catch (error) {
      return next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, role, isActive } = req.body;
      const newUser = await UsersService.createUser(
        { name, email, password, role, isActive },
        req.user?.id
      );
      return sendSuccess(res, `Account for ${newUser.name} (${newUser.role}) created successfully.`, newUser, 201);
    } catch (error) {
      return next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthenticated', [], 401);
      const updated = await UsersService.updateUser(
        String(req.params.id),
        req.body,
        req.user.id
      );
      return sendSuccess(res, 'User updated successfully.', updated);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthenticated', [], 401);
      const result = await UsersService.deleteUser(String(req.params.id), req.user.id);
      return sendSuccess(res, result.message, result);
    } catch (error) {
      return next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      const result = await UsersService.resetPassword(String(req.params.id), password);
      return sendSuccess(res, result.message, result);
    } catch (error) {
      return next(error);
    }
  }
}
