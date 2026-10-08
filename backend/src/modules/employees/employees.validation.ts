import { z } from 'zod';

export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  gender: z.string().optional(),
  dob: z.string().optional(),
  address: z.string().optional(),
  pan: z.string().optional(),
  aadhaar: z.string().optional(),
  uan: z.string().optional(),
  esiNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  bankName: z.string().optional(),
  accountHolderName: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  locationId: z.string().optional(),
  managerId: z.string().optional(),
  joiningDate: z.string().optional(),
  status: z.enum(['ONBOARDING', 'ACTIVE', 'EXITED']).default('ACTIVE'),
  taxRegime: z.enum(['OLD', 'NEW']).default('NEW'),
  createUserAccount: z.boolean().default(true),
  password: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();
