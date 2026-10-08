export type Role = 'ADMIN' | 'HR' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
    designation?: { name: string };
    status: string;
  };
}

export interface Company {
  id: string;
  name: string;
  tagline?: string;
  logo?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  email?: string;
  phone?: string;
  pan?: string;
  tan?: string;
  financialYear?: string;
  payrollFrequency?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  _count?: { employees: number };
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  _count?: { employees: number };
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  city: string;
  state: string;
  country: string;
  pinCode?: string;
  isActive: boolean;
  _count?: { employees: number };
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  annualAllocation: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  isPaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
  value: number;
  description?: string;
  isActive: boolean;
}

export interface SalaryTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  components: Array<{
    id: string;
    componentId: string;
    calculationType: 'FIXED' | 'PERCENTAGE' | 'FORMULA';
    value: number;
    formula?: string;
    component: SalaryComponent;
  }>;
  _count?: { employeeSalaries: number };
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: string;
  address?: string;
  pan?: string;
  aadhaar?: string;
  uan?: string;
  esiNumber?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  accountHolderName?: string;
  departmentId?: string;
  department?: Department;
  designationId?: string;
  designation?: Designation;
  locationId?: string;
  location?: Location;
  managerId?: string;
  manager?: { id: string; employeeId: string; firstName: string; lastName: string };
  joiningDate: string;
  exitDate?: string;
  status: 'ONBOARDING' | 'ACTIVE' | 'EXITED';
  taxRegime: 'OLD' | 'NEW';
  salary?: {
    id: string;
    monthlyGross: number;
    ctcAnnual: number;
    componentsJson: Array<{
      code: string;
      name: string;
      type: string;
      amount: number;
    }>;
  };
  documents?: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  }>;
  leaveBalances?: Array<{
    id: string;
    leaveTypeId: string;
    allocated: number;
    used: number;
    pending: number;
    available: number;
    leaveType: LeaveType;
  }>;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LOP';
  remarks?: string;
}

export interface MonthlyAttendanceSummary {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  totalDays: number;
  present: number;
  absent: number;
  halfDay: number;
  lop: number;
  effectivePresent: number;
  totalLop: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
  };
  leaveTypeId: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'APPLIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  location?: Location;
}

export interface StatutoryConfig {
  id: string;
  configType: 'PF' | 'ESI' | 'PROFESSIONAL_TAX' | 'TDS';
  rulesJson: any;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'LOCKED';
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalEmployerCost: number;
  totalNet: number;
  preparedById?: string;
  preparedAt?: string;
  approvedById?: string;
  approvedAt?: string;
  lockedById?: string;
  lockedAt?: string;
  createdAt: string;
  payrollEmployees?: Array<{
    id: string;
    employeeId: string;
    employee: {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      department?: { name: string };
      designation?: { name: string };
    };
    workingDays: number;
    presentDays: number;
    lopDays: number;
    grossEarnings: number;
    totalDeductions: number;
    employerContributions: number;
    netSalary: number;
    components: Array<{
      name: string;
      code: string;
      type: string;
      amount: number;
      calculationNote?: string;
    }>;
  }>;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payslipNumber: string;
  month: number;
  year: number;
  netSalary: number;
  generatedAt: string;
  employee?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
    designation?: { name: string };
  };
  payrollEmployee?: {
    grossEarnings: number;
    totalDeductions: number;
    netSalary: number;
    presentDays: number;
    lopDays: number;
    components?: any[];
  };
}
