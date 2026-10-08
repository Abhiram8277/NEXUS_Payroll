import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../config/prisma';
import { sendError } from '../utils/response';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string; // Employee record internal id if linked
  empCode?: string;     // Employee business ID e.g. EMP-101
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. No token provided.', [], 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Session expired. Please log in again.', [], 401);
      }
      return sendError(res, 'Invalid token provided.', [], 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User no longer exists.', [], 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is inactive. Please contact your administrator.', [], 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employee?.id,
      empCode: user.employee?.employeeId,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', [], 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        'Forbidden: You do not have permission to access this resource.',
        [],
        403
      );
    }

    return next();
  };
}
