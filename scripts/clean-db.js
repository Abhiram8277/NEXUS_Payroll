const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/nexus_payroll?schema=public',
    },
  },
});

async function main() {
  console.log('----------------------------------------------------');
  console.log('NEXUS PAYROLL SYSTEM — CLEAN RESET UTILITY');
  console.log('Wiping all existing database records for clean setup...');
  console.log('----------------------------------------------------');

  await prisma.$transaction([
    prisma.payslip.deleteMany(),
    prisma.payrollEmployee.deleteMany(),
    prisma.payrollRun.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.leaveBalance.deleteMany(),
    prisma.employeeDocument.deleteMany(),
    prisma.employeeSalary.deleteMany(),
    prisma.salaryTemplateComponent.deleteMany(),
    prisma.salaryTemplate.deleteMany(),
    prisma.salaryComponent.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.department.deleteMany(),
    prisma.designation.deleteMany(),
    prisma.location.deleteMany(),
    prisma.leaveType.deleteMany(),
    prisma.holiday.deleteMany(),
    prisma.userToken.deleteMany(),
    prisma.emailLog.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  console.log('SUCCESS: All records deleted across all tables.');
  console.log('Database is 100% clean and ready for First-Time Administrator Setup!');
  console.log('Open http://localhost:5173 to create your own Master Admin account.');
}

main()
  .catch((e) => {
    console.error('Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
