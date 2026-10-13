import { z } from 'zod';

const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or Employee ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  email: z.string().email().optional(),
  newPassword: strongPasswordSchema,
});

export const activateAccountSchema = z.object({
  token: z.string().min(1, 'Activation token is required'),
  newPassword: strongPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: strongPasswordSchema,
});
