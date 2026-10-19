import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().nullable().optional().or(z.literal('')),
  gender: z.string().nullable().optional().or(z.literal('')),
  dob: z.string().nullable().optional().or(z.literal('')),
  address: z.string().nullable().optional().or(z.literal('')),
  pan: z.string().nullable().optional().or(z.literal('')),
  aadhaar: z.string().nullable().optional().or(z.literal('')),
  uan: z.string().nullable().optional().or(z.literal('')),
  esiNumber: z.string().nullable().optional().or(z.literal('')),
  accountNumber: z.string().nullable().optional().or(z.literal('')),
  ifsc: z.string().nullable().optional().or(z.literal('')),
  bankName: z.string().nullable().optional().or(z.literal('')),
  accountHolderName: z.string().nullable().optional().or(z.literal('')),
  departmentId: z.string().nullable().optional().or(z.literal('')),
  designationId: z.string().nullable().optional().or(z.literal('')),
  locationId: z.string().nullable().optional().or(z.literal('')),
  managerId: z.string().nullable().optional().or(z.literal('')),
  joiningDate: z.string().nullable().optional().or(z.literal('')),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'EXITED']).default('ACTIVE'),
  taxRegime: z.enum(['OLD', 'NEW']).default('NEW'),
  createUserAccount: z.boolean().default(true),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional().or(z.literal('')),
  monthlyGross: z.any().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();
