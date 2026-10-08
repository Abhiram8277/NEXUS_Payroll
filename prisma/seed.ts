import { PrismaClient, Role, EmploymentStatus, TaxRegime, ComponentType, CalculationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NEXUS database...');

  // 1. Company Profile
  const company = await prisma.company.upsert({
    where: { id: 'nexus-corp-001' },
    update: {},
    create: {
      id: 'nexus-corp-001',
      name: 'NEXUS Technologies Pvt Ltd',
      tagline: 'Payroll, without the paperwork.',
      address: 'Plot 42, Hitec City Phase 2, Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      pinCode: '500081',
      email: 'admin@nexuspayroll.com',
      phone: '+91 40 2345 6789',
      pan: 'AAACN1234F',
      tan: 'HYDN12345E',
      financialYear: '2026-2027',
      payrollFrequency: 'MONTHLY',
    },
  });

  // 2. Departments
  const deptEng = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: { name: 'Engineering', code: 'ENG', description: 'Software Development & Infrastructure' },
  });
  const deptHR = await prisma.department.upsert({
    where: { code: 'HR' },
    update: {},
    create: { name: 'Human Resources', code: 'HR', description: 'People Operations & Payroll' },
  });
  const deptFin = await prisma.department.upsert({
    where: { code: 'FIN' },
    update: {},
    create: { name: 'Finance & Accounts', code: 'FIN', description: 'Treasury & Corporate Tax' },
  });
  const deptOps = await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: { name: 'Operations', code: 'OPS', description: 'Customer Success & Logistics' },
  });

  // 3. Designations
  const desigSSE = await prisma.designation.upsert({
    where: { code: 'SSE' },
    update: {},
    create: { name: 'Senior Software Engineer', code: 'SSE', description: 'Full-stack engineering' },
  });
  const desigHRM = await prisma.designation.upsert({
    where: { code: 'HRM' },
    update: {},
    create: { name: 'HR Manager', code: 'HRM', description: 'People management & payroll ops' },
  });
  const desigDev = await prisma.designation.upsert({
    where: { code: 'SDE' },
    update: {},
    create: { name: 'Software Developer', code: 'SDE', description: 'Application developer' },
  });
  const desigQA = await prisma.designation.upsert({
    where: { code: 'QA' },
    update: {},
    create: { name: 'QA Engineer', code: 'QA', description: 'Test automation & quality' },
  });

  // 4. Locations
  const locHyd = await prisma.location.upsert({
    where: { id: 'loc-hyd' },
    update: {},
    create: {
      id: 'loc-hyd',
      name: 'Hyderabad Tech Campus',
      address: 'Hitec City Phase 2',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      pinCode: '500081',
    },
  });
  const locBlr = await prisma.location.upsert({
    where: { id: 'loc-blr' },
    update: {},
    create: {
      id: 'loc-blr',
      name: 'Bengaluru Innovation Center',
      address: 'Outer Ring Road, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      pinCode: '560103',
    },
  });

  // 5. Leave Types
  const leaveCL = await prisma.leaveType.upsert({
    where: { code: 'CL' },
    update: {},
    create: {
      name: 'Casual Leave',
      code: 'CL',
      annualAllocation: 12,
      carryForwardAllowed: false,
      maxCarryForward: 0,
      isPaid: true,
      requiresApproval: true,
    },
  });
  const leaveSL = await prisma.leaveType.upsert({
    where: { code: 'SL' },
    update: {},
    create: {
      name: 'Sick Leave',
      code: 'SL',
      annualAllocation: 10,
      carryForwardAllowed: false,
      maxCarryForward: 0,
      isPaid: true,
      requiresApproval: true,
    },
  });
  const leaveEL = await prisma.leaveType.upsert({
    where: { code: 'EL' },
    update: {},
    create: {
      name: 'Earned Leave',
      code: 'EL',
      annualAllocation: 15,
      carryForwardAllowed: true,
      maxCarryForward: 5,
      isPaid: true,
      requiresApproval: true,
    },
  });
  const leaveLOP = await prisma.leaveType.upsert({
    where: { code: 'LOP' },
    update: {},
    create: {
      name: 'Loss of Pay',
      code: 'LOP',
      annualAllocation: 0,
      carryForwardAllowed: false,
      maxCarryForward: 0,
      isPaid: false,
      requiresApproval: true,
    },
  });

  // 6. Salary Components
  const compBasic = await prisma.salaryComponent.upsert({
    where: { code: 'BASIC' },
    update: {},
    create: {
      name: 'Basic Salary',
      code: 'BASIC',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      value: 0,
      description: 'Core basic pay component',
    },
  });
  const compHRA = await prisma.salaryComponent.upsert({
    where: { code: 'HRA' },
    update: {},
    create: {
      name: 'House Rent Allowance',
      code: 'HRA',
      type: ComponentType.EARNING,
      calculationType: CalculationType.PERCENTAGE,
      value: 40,
      description: '40% of Basic Pay',
    },
  });
  const compSpecial = await prisma.salaryComponent.upsert({
    where: { code: 'SPL_ALLOW' },
    update: {},
    create: {
      name: 'Special Allowance',
      code: 'SPL_ALLOW',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      value: 0,
      description: 'Balancing monthly allowance',
    },
  });
  const compConveyance = await prisma.salaryComponent.upsert({
    where: { code: 'CONVEYANCE' },
    update: {},
    create: {
      name: 'Conveyance Allowance',
      code: 'CONVEYANCE',
      type: ComponentType.EARNING,
      calculationType: CalculationType.FIXED,
      value: 1600,
      description: 'Standard travel allowance',
    },
  });
  const compPF = await prisma.salaryComponent.upsert({
    where: { code: 'PF_EE' },
    update: {},
    create: {
      name: 'Provident Fund (Employee)',
      code: 'PF_EE',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.PERCENTAGE,
      value: 12,
      description: 'Statutory 12% PF deduction on Basic (capped at 1800)',
    },
  });
  const compPFER = await prisma.salaryComponent.upsert({
    where: { code: 'PF_ER' },
    update: {},
    create: {
      name: 'Provident Fund (Employer)',
      code: 'PF_ER',
      type: ComponentType.EMPLOYER_CONTRIBUTION,
      calculationType: CalculationType.PERCENTAGE,
      value: 12,
      description: 'Statutory 12% PF employer contribution',
    },
  });
  const compESI = await prisma.salaryComponent.upsert({
    where: { code: 'ESI_EE' },
    update: {},
    create: {
      name: 'ESI (Employee)',
      code: 'ESI_EE',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.PERCENTAGE,
      value: 0.75,
      description: '0.75% of Gross for eligible employees',
    },
  });
  const compPT = await prisma.salaryComponent.upsert({
    where: { code: 'PT' },
    update: {},
    create: {
      name: 'Professional Tax',
      code: 'PT',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.FIXED,
      value: 200,
      description: 'State statutory professional tax',
    },
  });
  const compTDS = await prisma.salaryComponent.upsert({
    where: { code: 'TDS' },
    update: {},
    create: {
      name: 'Income Tax (TDS)',
      code: 'TDS',
      type: ComponentType.DEDUCTION,
      calculationType: CalculationType.FIXED,
      value: 0,
      description: 'Monthly estimated income tax withholding',
    },
  });

  // 7. Statutory Configuration
  await prisma.statutoryConfig.createMany({
    data: [
      {
        configType: 'PF',
        rulesJson: {
          employeeRate: 12,
          employerRate: 12,
          wageCeiling: 15000,
          maxContribution: 1800,
          isWageCeilingStrict: false,
        },
        effectiveFrom: new Date('2026-04-01'),
      },
      {
        configType: 'ESI',
        rulesJson: {
          employeeRate: 0.75,
          employerRate: 3.25,
          wageCeiling: 21000,
        },
        effectiveFrom: new Date('2026-04-01'),
      },
      {
        configType: 'PROFESSIONAL_TAX',
        rulesJson: {
          state: 'Telangana',
          slabs: [
            { minGross: 0, maxGross: 15000, tax: 0 },
            { minGross: 15001, maxGross: 20000, tax: 150 },
            { minGross: 20001, maxGross: 999999999, tax: 200 },
          ],
        },
        effectiveFrom: new Date('2026-04-01'),
      },
      {
        configType: 'TDS',
        rulesJson: {
          standardDeduction: 75000,
          regime: 'NEW',
          slabs: [
            { minAnnual: 0, maxAnnual: 300000, rate: 0 },
            { minAnnual: 300001, maxAnnual: 700000, rate: 5 },
            { minAnnual: 700001, maxAnnual: 1000000, rate: 10 },
            { minAnnual: 1000001, maxAnnual: 1200000, rate: 15 },
            { minAnnual: 1200001, maxAnnual: 1500000, rate: 20 },
            { minAnnual: 1500001, maxAnnual: 999999999, rate: 30 },
          ],
        },
        effectiveFrom: new Date('2026-04-01'),
      },
    ],
    skipDuplicates: true,
  });

  // 8. Holidays
  await prisma.holiday.createMany({
    data: [
      { name: 'Republic Day', date: new Date('2026-01-26'), description: 'National Holiday' },
      { name: 'Holi', date: new Date('2026-03-04'), description: 'Festival of Colors' },
      { name: 'Independence Day', date: new Date('2026-08-15'), description: 'National Holiday' },
      { name: 'Gandhi Jayanti', date: new Date('2026-10-02'), description: 'National Holiday' },
      { name: 'Diwali', date: new Date('2026-11-08'), description: 'Festival of Lights' },
    ],
    skipDuplicates: true,
  });

  // 9. Users & Employees
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const hrPasswordHash = await bcrypt.hash('Hr@12345', 10);
  const empPasswordHash = await bcrypt.hash('Emp@12345', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nexuspayroll.com' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@nexuspayroll.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@nexuspayroll.com' },
    update: {},
    create: {
      name: 'Ananya Roy',
      email: 'hr@nexuspayroll.com',
      passwordHash: hrPasswordHash,
      role: Role.HR,
      isActive: true,
    },
  });

  // Admin employee record
  await prisma.employee.upsert({
    where: { employeeId: 'EMP-001' },
    update: {},
    create: {
      employeeId: 'EMP-001',
      userId: adminUser.id,
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@nexuspayroll.com',
      phone: '+91 9876543210',
      gender: 'Other',
      departmentId: deptOps.id,
      designationId: desigHRM.id,
      locationId: locHyd.id,
      status: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2024-01-01'),
      pan: 'ABCDE1234F',
      accountNumber: '112233445566',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank',
      accountHolderName: 'System Administrator',
    },
  });

  // HR employee record
  await prisma.employee.upsert({
    where: { employeeId: 'EMP-002' },
    update: {},
    create: {
      employeeId: 'EMP-002',
      userId: hrUser.id,
      firstName: 'Ananya',
      lastName: 'Roy',
      email: 'hr@nexuspayroll.com',
      phone: '+91 9876543211',
      gender: 'Female',
      departmentId: deptHR.id,
      designationId: desigHRM.id,
      locationId: locHyd.id,
      status: EmploymentStatus.ACTIVE,
      joiningDate: new Date('2024-03-01'),
      pan: 'ANROY1234K',
      accountNumber: '223344556677',
      ifsc: 'ICIC0000002',
      bankName: 'ICICI Bank',
      accountHolderName: 'Ananya Roy',
    },
  });

  // Regular Employees
  const empUsersData = [
    {
      id: 'EMP-101',
      email: 'rahul.sharma@nexuspayroll.com',
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '+91 9876500001',
      gender: 'Male',
      dept: deptEng.id,
      desig: desigSSE.id,
      monthlyGross: 75000,
      annualCtc: 900000,
      pan: 'BRKPS1234D',
      acc: '501002345678',
      ifsc: 'HDFC0000543',
      bank: 'HDFC Bank',
    },
    {
      id: 'EMP-102',
      email: 'priya.patel@nexuspayroll.com',
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '+91 9876500002',
      gender: 'Female',
      dept: deptEng.id,
      desig: desigDev.id,
      monthlyGross: 50000,
      annualCtc: 600000,
      pan: 'CPLPP5678M',
      acc: '002301567890',
      ifsc: 'SBIN0001234',
      bank: 'State Bank of India',
    },
    {
      id: 'EMP-103',
      email: 'amit.kumar@nexuspayroll.com',
      firstName: 'Amit',
      lastName: 'Kumar',
      phone: '+91 9876500003',
      gender: 'Male',
      dept: deptFin.id,
      desig: desigQA.id,
      monthlyGross: 40000,
      annualCtc: 480000,
      pan: 'DKPAK9012Z',
      acc: '334455667788',
      ifsc: 'KKBK0000123',
      bank: 'Kotak Mahindra Bank',
    },
  ];

  for (const empData of empUsersData) {
    const user = await prisma.user.upsert({
      where: { email: empData.email },
      update: {},
      create: {
        name: `${empData.firstName} ${empData.lastName}`,
        email: empData.email,
        passwordHash: empPasswordHash,
        role: Role.EMPLOYEE,
        isActive: true,
      },
    });

    const emp = await prisma.employee.upsert({
      where: { employeeId: empData.id },
      update: {},
      create: {
        employeeId: empData.id,
        userId: user.id,
        firstName: empData.firstName,
        lastName: empData.lastName,
        email: empData.email,
        phone: empData.phone,
        gender: empData.gender,
        departmentId: empData.dept,
        designationId: empData.desig,
        locationId: locHyd.id,
        status: EmploymentStatus.ACTIVE,
        joiningDate: new Date('2024-06-01'),
        pan: empData.pan,
        accountNumber: empData.acc,
        ifsc: empData.ifsc,
        bankName: empData.bank,
        accountHolderName: `${empData.firstName} ${empData.lastName}`,
        taxRegime: TaxRegime.NEW,
      },
    });

    // Salary Structure assignment
    const basic = Math.round(empData.monthlyGross * 0.5);
    const hra = Math.round(basic * 0.4);
    const special = empData.monthlyGross - basic - hra;

    await prisma.employeeSalary.upsert({
      where: { employeeId: emp.id },
      update: {},
      create: {
        employeeId: emp.id,
        monthlyGross: empData.monthlyGross,
        ctcAnnual: empData.annualCtc,
        componentsJson: [
          { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', amount: basic },
          { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', amount: hra },
          { code: 'SPL_ALLOW', name: 'Special Allowance', type: 'EARNING', amount: special },
          { code: 'PF_EE', name: 'Provident Fund (Employee)', type: 'DEDUCTION', amount: Math.min(1800, Math.round(basic * 0.12)) },
          { code: 'PT', name: 'Professional Tax', type: 'DEDUCTION', amount: 200 },
          { code: 'TDS', name: 'Income Tax (TDS)', type: 'DEDUCTION', amount: Math.round(empData.monthlyGross > 50000 ? 1500 : 0) },
        ],
        effectiveFrom: new Date('2026-04-01'),
      },
    });

    // Initial Leave Balances
    const currentYear = 2026;
    for (const lt of [leaveCL, leaveSL, leaveEL]) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: currentYear,
          allocated: lt.annualAllocation,
          used: 0,
          pending: 0,
          available: lt.annualAllocation,
        },
      });
    }
  }

  console.log('✅ NEXUS database seeded successfully with Admin, HR, Employees, Masters, Statutory configs, and Salary structures.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
