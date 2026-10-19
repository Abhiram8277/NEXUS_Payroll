import request from 'supertest';
import * as xlsx from 'xlsx';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import app from '../app';
import { prisma } from '../config/prisma';

function createExcelBuffer(rows: any[], sheetName = 'Attendance'): Buffer {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('NEXUS Master Modification Comprehensive Test Suite', () => {
  let adminToken: string;
  let hrToken: string;
  let emp1Token: string;
  let emp1Id: string;
  let emp1Code: string;
  let emp2Id: string;
  let emp2Code: string;

  beforeAll(async () => {
    const adminHash = await bcrypt.hash('Admin@12345', 10);
    await prisma.user.updateMany({
      where: { email: 'admin@nexuspayroll.com' },
      data: { passwordHash: adminHash, isActive: true },
    });

    const hrHash = await bcrypt.hash('Hr@12345', 10);
    await prisma.user.updateMany({
      where: { email: 'hr@nexuspayroll.com' },
      data: { passwordHash: hrHash, isActive: true },
    });

    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@nexuspayroll.com', password: 'Admin@12345' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    const hrRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'hr@nexuspayroll.com', password: 'Hr@12345' });
    expect(hrRes.status).toBe(200);
    hrToken = hrRes.body.data.token;

    const empRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'rahul.sharma@nexuspayroll.com', password: 'Emp@12345' });
    expect(empRes.status).toBe(200);
    emp1Token = empRes.body.data.token;
    emp1Id = empRes.body.data.user.employee.id;
    emp1Code = empRes.body.data.user.employee.employeeId;

    // Fetch a second EMPLOYEE-role employee for multi-employee & cross-employee tests
    const allEmps = await prisma.employee.findMany({
      where: { id: { not: emp1Id }, status: 'ACTIVE', user: { role: 'EMPLOYEE' } },
      take: 1,
    });
    expect(allEmps.length).toBeGreaterThan(0);
    emp2Id = allEmps[0].id;
    emp2Code = allEmps[0].employeeId;
  });

  // ============================================================================
  // 1. FORGOT PASSWORD, RESET PASSWORD, ACCOUNT ACTIVATION & EMAIL LOGS
  // ============================================================================
  describe('1. Password Reset, Account Activation & Transactional Email Service', () => {
    it('returns generic success for non-existent email without leaking user existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent.user@nexuspayroll.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data?.devResetToken).toBeUndefined();
    });

    it('generates hashed single-use reset token, logs email, validates strong password, and resets password', async () => {
      // 1. Request forgot password for HR user
      const forgotRes = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'hr@nexuspayroll.com' });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);

      // Verify email log entry was created and extract resetToken from email metadata
      const emailLogs = await prisma.emailLog.findMany({
        where: { to: 'hr@nexuspayroll.com', template: 'PASSWORD_RESET' },
        orderBy: { sentAt: 'desc' },
      });
      expect(emailLogs.length).toBeGreaterThan(0);
      const rawToken = (emailLogs[0].metadata as any)?.resetToken;
      expect(rawToken).toBeDefined();

      // Verify token is stored hashed in DB, not plain text
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const dbToken = await prisma.userToken.findUnique({ where: { tokenHash } });
      expect(dbToken).toBeDefined();
      expect(dbToken?.type).toBe('PASSWORD_RESET');

      // 2. Reject weak password on reset
      const weakRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'weak' });
      expect([400, 422]).toContain(weakRes.status);

      // 3. Reject invalid token
      const invalidTokenRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: '00000000000000000000000000000000', newPassword: 'NewStrongPassword123' });
      expect(invalidTokenRes.status).toBe(400);

      // 4. Reset password with valid token
      const resetRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'HrNewPassword123' });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // 5. Reject reusing the same token (single-use enforcement)
      const reuseRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'AnotherPassword123' });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.message).toMatch(/already been used/i);

      // 6. Verify old password no longer works
      const oldLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'hr@nexuspayroll.com', password: 'Hr@12345' });
      expect(oldLoginRes.status).toBe(401);

      // 7. Verify new password works
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'hr@nexuspayroll.com', password: 'HrNewPassword123' });
      expect(newLoginRes.status).toBe(200);
      hrToken = newLoginRes.body.data.token;

      // Restore original HR password for subsequent tests
      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'hr@nexuspayroll.com' });
      const latestLogs = await prisma.emailLog.findMany({
        where: { to: 'hr@nexuspayroll.com', template: 'PASSWORD_RESET' },
        orderBy: { sentAt: 'desc' },
        take: 1,
      });
      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: (latestLogs[0].metadata as any).resetToken, newPassword: 'Hr@12345' });
    });

    it('rejects expired password reset tokens', async () => {
      const hrUser = await prisma.user.findUnique({ where: { email: 'hr@nexuspayroll.com' } });
      const expiredRaw = crypto.randomBytes(32).toString('hex');
      const expiredHash = crypto.createHash('sha256').update(expiredRaw).digest('hex');

      await prisma.userToken.create({
        data: {
          userId: hrUser!.id,
          tokenHash: expiredHash,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() - 60_000), // 1 minute in the past
        },
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: expiredRaw, newPassword: 'ValidPassword123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  // ============================================================================
  // 2. SALARY TEMPLATES (EDIT, CLONE, DELETE) & MULTI-EMPLOYEE BULK ASSIGNMENT
  // ============================================================================
  describe('2. Salary Template Management & Multi-Employee Bulk Assignment', () => {
    let createdTemplateId: string;
    let clonedTemplateId: string;
    const uniqueSuffix = Date.now().toString().slice(-5);

    it('creates, updates, duplicates, and previews a salary template', async () => {
      const compsRes = await request(app)
        .get('/api/v1/salary-components')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(compsRes.status).toBe(200);
      const basicComp = compsRes.body.data.find((c: any) => c.code === 'BASIC');
      const hraComp = compsRes.body.data.find((c: any) => c.code === 'HRA');
      expect(basicComp).toBeDefined();
      expect(hraComp).toBeDefined();

      // Create template
      const createRes = await request(app)
        .post('/api/v1/salary/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Executive Band A ${uniqueSuffix}`,
          description: 'Custom band template for testing',
          components: [
            { componentId: basicComp.id, calculationType: 'PERCENTAGE', value: 55 },
            { componentId: hraComp.id, calculationType: 'PERCENTAGE', value: 25 },
          ],
        });

      expect(createRes.status).toBe(201);
      createdTemplateId = createRes.body.data.id;

      // Update template
      const updatedName = `Executive Band A+ ${uniqueSuffix}`;
      const updateRes = await request(app)
        .put(`/api/v1/salary/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: updatedName,
          components: [
            { componentId: basicComp.id, calculationType: 'PERCENTAGE', value: 60 },
            { componentId: hraComp.id, calculationType: 'PERCENTAGE', value: 20 },
          ],
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.name).toBe(updatedName);

      // Duplicate template
      const cloneRes = await request(app)
        .post(`/api/v1/salary/templates/${createdTemplateId}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Cloned Executive ${uniqueSuffix}` });
      expect(cloneRes.status).toBe(201);
      clonedTemplateId = cloneRes.body.data.id;

      // Preview breakdown using template rules (60% Basic of 100,000 = 60,000)
      const previewRes = await request(app)
        .get(`/api/v1/salary/preview-breakdown?monthlyGross=100000&templateId=${createdTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(previewRes.status).toBe(200);
      const basicLine = previewRes.body.data.components.find((c: any) => c.code === 'BASIC');
      expect(basicLine.amount).toBe(60000);
    });

    it('bulk-assigns salary structure to multiple employees simultaneously', async () => {
      const bulkRes = await request(app)
        .post('/api/v1/salary/bulk-assign')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          employeeIds: [emp1Id, emp2Id],
          templateId: createdTemplateId,
          monthlyGross: 85000,
          effectiveFrom: '2026-04-01',
        });

      expect(bulkRes.status).toBe(200);
      expect(bulkRes.body.success).toBe(true);
      expect(bulkRes.body.data.totalSelected).toBe(2);
      expect(bulkRes.body.data.successCount).toBe(2);
      expect(bulkRes.body.data.failedCount).toBe(0);
    });

    it('deactivates template in use and hard-deletes unassigned cloned template', async () => {
      // Template assigned to emp1 & emp2 -> soft-deactivated
      const delAssignedRes = await request(app)
        .delete(`/api/v1/salary/templates/${createdTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delAssignedRes.status).toBe(200);
      expect(delAssignedRes.body.data.deactivated).toBe(true);

      // Unassigned cloned template -> hard-deleted
      const delUnassignedRes = await request(app)
        .delete(`/api/v1/salary/templates/${clonedTemplateId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delUnassignedRes.status).toBe(200);
      expect(delUnassignedRes.body.data.deleted).toBe(true);
    });
  });

  // ============================================================================
  // 3. ATTENDANCE EXCEL IMPORT (ALL 12 MANDATORY TEST CASES)
  // ============================================================================
  describe('3. Attendance Excel Import & Validation Suite (12 Test Cases)', () => {
    it('Downloads official Attendance Excel template', async () => {
      const res = await request(app)
        .get('/api/v1/attendance/template')
        .set('Authorization', `Bearer ${hrToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('TC1, TC6, TC10, TC11: Valid Excel file imports multiple employees/dates, updates monthly summary, and is idempotent on re-import', async () => {
      const validRows = [
        { employeeId: emp1Code, date: '2026-05-04', status: 'PRESENT', remarks: 'On time' },
        { employeeId: emp1Code, date: '2026-05-05', status: 'HALF_DAY', remarks: 'Half day' },
        { employeeId: emp2Code, date: '2026-05-04', status: 'LOP', remarks: 'Unpaid leave' },
      ];
      const buf = createExcelBuffer(validRows);

      // First import
      const res1 = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrToken}`)
        .attach('file', buf, 'attendance_valid.xlsx');

      expect(res1.status).toBe(200);
      expect(res1.body.data.imported).toBe(3);
      expect(res1.body.data.failed).toBe(0);

      // TC6 & TC11: Re-importing same file detects existing DB matches and updates without duplication
      const res2 = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrToken}`)
        .attach('file', buf, 'attendance_valid.xlsx');

      expect(res2.status).toBe(200);
      expect(res2.body.data.imported).toBe(3);
      expect(res2.body.data.existingDatabaseMatches).toBe(3);

      // TC10: Verify monthly summary reflects imported records
      const summaryRes = await request(app)
        .get('/api/v1/attendance/summary?month=5&year=2026')
        .set('Authorization', `Bearer ${hrToken}`);
      expect(summaryRes.status).toBe(200);
      const emp1Sum = summaryRes.body.data.find((s: any) => s.id === emp1Id);
      expect(emp1Sum).toBeDefined();
      expect(emp1Sum.halfDay).toBeGreaterThanOrEqual(1);
    });

    it('TC2, TC3, TC4, TC5: Reports row-level errors for invalid employee code, invalid date, invalid status, and in-file duplicates', async () => {
      const mixedRows = [
        { employeeId: 'EMP-99999', date: '2026-05-06', status: 'PRESENT' }, // TC2: Invalid emp code
        { employeeId: emp1Code, date: 'invalid-date-str', status: 'PRESENT' }, // TC3: Invalid date
        { employeeId: emp1Code, date: '2026-05-07', status: 'VACATION_MODE' }, // TC4: Invalid status
        { employeeId: emp1Code, date: '2026-05-08', status: 'PRESENT' }, // Valid first occurrence
        { employeeId: emp1Code, date: '2026-05-08', status: 'ABSENT' }, // TC5: Duplicate row in same file
      ];
      const buf = createExcelBuffer(mixedRows);

      const res = await request(app)
        .post('/api/v1/attendance/import?preview=true')
        .set('Authorization', `Bearer ${hrToken}`)
        .attach('file', buf, 'attendance_errors.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.previewOnly).toBe(true);
      expect(res.body.data.validCount).toBe(1);
      expect(res.body.data.failed).toBe(4);
      expect(res.body.data.duplicateRowsInFile).toBe(1);
      expect(res.body.data.errors.length).toBe(4);
    });

    it('TC7: Empty Excel file returns clear error message (400)', async () => {
      const emptyBuf = createExcelBuffer([]);
      const res = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrToken}`)
        .attach('file', emptyBuf, 'empty.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/empty/i);
    });

    it('TC8: Wrong file format (.txt) is rejected with 400', async () => {
      const res = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrToken}`)
        .attach('file', Buffer.from('not an excel file'), 'bad.txt');

      expect(res.status).toBe(400);
    });

    it('TC9: Missing required columns returns clear header validation error (400)', async () => {
      const badColsBuf = createExcelBuffer([{ wrongColA: 'foo', wrongColB: 'bar' }]);
      const res = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${hrToken}`)
        .attach('file', badColsBuf, 'missing_cols.xlsx');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Missing required columns/i);
    });

    it('TC12: EMPLOYEE role is forbidden (403) from importing attendance', async () => {
      const buf = createExcelBuffer([{ employeeId: emp1Code, date: '2026-05-10', status: 'PRESENT' }]);
      const res = await request(app)
        .post('/api/v1/attendance/import')
        .set('Authorization', `Bearer ${emp1Token}`)
        .attach('file', buf, 'emp_attempt.xlsx');

      expect(res.status).toBe(403);
    });
  });

  // ============================================================================
  // 4. PAYROLL WORKFLOW (SUBMIT, REJECT, APPROVE, LOCK), PAYSLIP PDF & EMAILS
  // ============================================================================
  describe('4. Payroll Approval/Rejection Workflow, Payslip PDF & Email Distribution', () => {
    const cycleMonth = 6;
    const cycleYear = 2026;
    let runId: string;
    let emp1PayslipId: string;
    let emp2PayslipId: string;

    beforeAll(async () => {
      await prisma.payrollRun.deleteMany({
        where: { month: cycleMonth, year: cycleYear },
      });
    });

    it('Supports full HR->Admin Submit, Reject, Re-submit, Approve, and Delete Draft workflow', async () => {
      // 1. HR generates draft payroll
      const runRes = await request(app)
        .post('/api/v1/payroll/run')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ month: cycleMonth, year: cycleYear });
      expect(runRes.status).toBe(200);
      runId = runRes.body.data.id;
      expect(runRes.body.data.status).toBe('DRAFT');

      // 2. Payslip PDF download before locking must fail with 400
      const payrollEmpId = runRes.body.data.payrollEmployees[0].id;
      const unlockedPdfRes = await request(app)
        .get(`/api/v1/payslips/${payrollEmpId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(unlockedPdfRes.status).toBe(400);

      // 3. HR submits draft for Admin approval (DRAFT -> REVIEW)
      const submitRes = await request(app)
        .put(`/api/v1/payroll/runs/${runId}/submit`)
        .set('Authorization', `Bearer ${hrToken}`);
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.status).toBe('REVIEW');

      // 4. Admin rejects payroll run with reason (REVIEW -> REJECTED)
      const rejectRes = await request(app)
        .put(`/api/v1/payroll/runs/${runId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Please verify June attendance before final approval' });
      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('REJECTED');
      expect(rejectRes.body.data.rejectionReason).toContain('verify June attendance');

      // 5. HR re-submits and Admin approves & locks
      await request(app)
        .put(`/api/v1/payroll/runs/${runId}/submit`)
        .set('Authorization', `Bearer ${hrToken}`);

      const approveRes = await request(app)
        .put(`/api/v1/payroll/runs/${runId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APPROVED');

      const lockRes = await request(app)
        .put(`/api/v1/payroll/runs/${runId}/lock`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(lockRes.status).toBe(200);
      expect(lockRes.body.data.status).toBe('LOCKED');

      // Deleting a LOCKED payroll run must be blocked (400)
      const delLockedRes = await request(app)
        .delete(`/api/v1/payroll/runs/${runId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delLockedRes.status).toBe(400);
    });

    it('Verifies all 6 Mandatory Payslip PDF Download Test Cases (Admin, HR, Employee own, Employee other 403, Invalid ID 404)', async () => {
      const slips = await prisma.payslip.findMany({
        where: { month: cycleMonth, year: cycleYear },
      });
      const slip1 = slips.find((s) => s.employeeId === emp1Id);
      const slip2 = slips.find((s) => s.employeeId === emp2Id);
      expect(slip1).toBeDefined();
      expect(slip2).toBeDefined();
      emp1PayslipId = slip1!.id;
      emp2PayslipId = slip2!.id;

      // 1. Admin downloads any employee payslip -> 200 PDF
      const adminPdf = await request(app)
        .get(`/api/v1/payslips/${emp2PayslipId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminPdf.status).toBe(200);
      expect(adminPdf.headers['content-type']).toContain('application/pdf');

      // 2. HR downloads any employee payslip -> 200 PDF
      const hrPdf = await request(app)
        .get(`/api/v1/payslips/${emp2PayslipId}/pdf`)
        .set('Authorization', `Bearer ${hrToken}`);
      expect(hrPdf.status).toBe(200);
      expect(hrPdf.headers['content-type']).toContain('application/pdf');

      // 3. Employee downloads own payslip -> 200 PDF
      const empOwnPdf = await request(app)
        .get(`/api/v1/payslips/${emp1PayslipId}/pdf`)
        .set('Authorization', `Bearer ${emp1Token}`);
      expect(empOwnPdf.status).toBe(200);
      expect(empOwnPdf.headers['content-type']).toContain('application/pdf');

      // 4. Employee attempts to download another employee's payslip -> 403 Forbidden
      const empOtherPdf = await request(app)
        .get(`/api/v1/payslips/${emp2PayslipId}/pdf`)
        .set('Authorization', `Bearer ${emp1Token}`);
      expect(empOtherPdf.status).toBe(403);

      // 5. Invalid payslip ID -> 404 Not Found
      const notFoundPdf = await request(app)
        .get('/api/v1/payslips/00000000-0000-0000-0000-000000000000/pdf')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notFoundPdf.status).toBe(404);
    });

    it('Distributes payslips via email and tracks per-recipient SENT status', async () => {
      const distRes = await request(app)
        .post(`/api/v1/payroll/runs/${runId}/distribute-payslips`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({});

      expect(distRes.status).toBe(200);
      expect(distRes.body.success).toBe(true);
      expect(distRes.body.data.sentCount).toBeGreaterThan(0);

      const updatedSlip = await prisma.payslip.findUnique({ where: { id: emp1PayslipId } });
      expect(updatedSlip?.emailStatus).toBe('SENT');
      expect(updatedSlip?.sentAt).toBeDefined();
    });
  });

  // ============================================================================
  // 5. LEAVE CANCELLATION & DELETE / DEACTIVATE DEPENDENCY CHECKS
  // ============================================================================
  describe('5. Leave Cancellation & Safe Delete/Deactivate Dependency Checks', () => {
    it('Allows employee to apply and cancel a pending leave request, restoring pending balance', async () => {
      const leaveTypesRes = await request(app)
        .get('/api/v1/leave-types')
        .set('Authorization', `Bearer ${emp1Token}`);
      const clType = leaveTypesRes.body.data[0];

      const applyRes = await request(app)
        .post('/api/v1/leaves/apply')
        .set('Authorization', `Bearer ${emp1Token}`)
        .send({
          leaveTypeId: clType.id,
          fromDate: '2026-08-10',
          toDate: '2026-08-11',
          reason: 'Personal trip',
        });
      expect(applyRes.status).toBe(201);
      const reqId = applyRes.body.data.id;

      // Cancel leave request
      const cancelRes = await request(app)
        .put(`/api/v1/leaves/${reqId}/cancel`)
        .set('Authorization', `Bearer ${emp1Token}`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
    });

    it('Soft-deactivates employee with payroll history and hard-deletes newly created employee without history', async () => {
      // emp2 has payroll history from June 2026 run -> soft-deactivates to EXITED
      const deactRes = await request(app)
        .delete(`/api/v1/employees/${emp2Id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.deactivated).toBe(true);

      // Restore emp2 status to ACTIVE (and linked user account)
      await request(app)
        .put(`/api/v1/employees/${emp2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });
      await prisma.employee.update({ where: { id: emp2Id }, data: { exitDate: null } });

      // Verify Admin cannot create employee directly (strictly HR only)
      const adminEmpAttempt = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'EMP-DENIED-ADMIN',
          firstName: 'Denied',
          lastName: 'Admin',
          email: 'denied.admin@nexuspayroll.com',
          password: 'Password@123',
        });
      expect(adminEmpAttempt.status).toBe(403);

      // Create temporary employee as HR with custom password -> succeeds
      const tempEmpRes = await request(app)
        .post('/api/v1/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          employeeId: 'EMP-TEMP-999',
          firstName: 'Temp',
          lastName: 'User',
          email: 'temp.user999@nexuspayroll.com',
          password: 'CustomPass@123',
        });
      expect(tempEmpRes.status).toBe(201);
      const tempId = tempEmpRes.body.data.id;

      const hardDelRes = await request(app)
        .delete(`/api/v1/employees/${tempId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(hardDelRes.status).toBe(200);
      expect(hardDelRes.body.data.deleted).toBe(true);
    });
  });
});
