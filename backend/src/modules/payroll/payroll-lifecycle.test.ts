import request from 'supertest';
import app from '../../app';

describe('NEXUS End-to-End Payroll Lifecycle Integration Test', () => {
  let adminToken: string;
  let hrToken: string;
  let employeeToken: string;
  let employeeId: string;
  let payrollRunId: string;
  let payslipId: string;

  const testYear = 2026;
  const testMonth = 3; // March 2026 (31 days)

  beforeAll(async () => {
    // 1. Authenticate Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@nexuspayroll.com', password: 'Admin@12345' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 2. Authenticate HR
    const hrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'hr@nexuspayroll.com', password: 'Hr@12345' });
    expect(hrRes.status).toBe(200);
    hrToken = hrRes.body.data.token;

    // 3. Authenticate Employee
    const empRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'rahul.sharma@nexuspayroll.com', password: 'Emp@12345' });
    expect(empRes.status).toBe(200);
    employeeToken = empRes.body.data.token;
    employeeId = empRes.body.data.user.employee.id;

    // Clean up test period for idempotent execution
    const { prisma } = await import('../../config/prisma');
    await prisma.payrollRun.deleteMany({
      where: { month: testMonth, year: testYear },
    });
  });

  it('Step 1: HR marks attendance with 2 days of LOP', async () => {
    const attendanceRecords = [
      {
        employeeId,
        date: `${testYear}-03-02`,
        status: 'PRESENT',
      },
      {
        employeeId,
        date: `${testYear}-03-03`,
        status: 'LOP',
        remarks: 'Unauthorized absence',
      },
      {
        employeeId,
        date: `${testYear}-03-04`,
        status: 'LOP',
        remarks: 'Personal leave without quota',
      },
    ];

    const res = await request(app)
      .post('/api/v1/attendance/mark')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ records: attendanceRecords });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Step 2: HR calculates payroll preview for the cycle', async () => {
    const res = await request(app)
      .get(`/api/v1/payroll/preview?month=${testMonth}&year=${testYear}`)
      .set('Authorization', `Bearer ${hrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toBeDefined();
    expect(res.body.data.items.length).toBeGreaterThan(0);

    // Verify employee record in preview has LOP days
    const empPreview = res.body.data.items.find(
      (item: any) => item.employeeId === employeeId
    );
    expect(empPreview).toBeDefined();
    expect(empPreview.lopDays).toBe(2);
    expect(empPreview.workingDays).toBe(31);
    expect(empPreview.presentDays).toBe(29);
    expect(Number(empPreview.netSalary)).toBeGreaterThan(0);
  });

  it('Step 3: HR runs payroll to generate DRAFT cycle', async () => {
    const res = await request(app)
      .post('/api/v1/payroll/run')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: testMonth, year: testYear });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('DRAFT');
    payrollRunId = res.body.data.id;
  });

  it('Step 4: HR cannot approve payroll (Role Guard: Admin only)', async () => {
    const res = await request(app)
      .put(`/api/v1/payroll/runs/${payrollRunId}/approve`)
      .set('Authorization', `Bearer ${hrToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('Step 5: Admin approves the payroll cycle', async () => {
    const res = await request(app)
      .put(`/api/v1/payroll/runs/${payrollRunId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
  });

  it('Step 6: Admin locks payroll, generating immutable records and official payslips', async () => {
    const res = await request(app)
      .put(`/api/v1/payroll/runs/${payrollRunId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('LOCKED');
    expect(res.body.data.lockedAt).toBeDefined();
  });

  it('Step 7: Immutability enforcement - Re-running locked payroll must be rejected', async () => {
    const res = await request(app)
      .post('/api/v1/payroll/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: testMonth, year: testYear });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/locked/i);
  });

  it('Step 8: Employee accesses generated payslips in self-service portal', async () => {
    const res = await request(app)
      .get('/api/v1/payslips')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const myPayslip = res.body.data.find(
      (ps: any) => ps.month === testMonth && ps.year === testYear
    );
    expect(myPayslip).toBeDefined();
    expect(myPayslip.payslipNumber).toMatch(/^NEXUS-2026-03-/);
    expect(Number(myPayslip.netSalary)).toBeGreaterThan(0);
    payslipId = myPayslip.id;
  });

  it('Step 9: Employee downloads official NEXUS Payslip PDF', async () => {
    const res = await request(app)
      .get(`/api/v1/payslips/${payslipId}/pdf`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.length).toBeGreaterThan(500); // Valid PDF binary bytes
  });

  it('Step 10: Reports reflect updated and locked payroll totals', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/payroll-summary?year=${testYear}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
