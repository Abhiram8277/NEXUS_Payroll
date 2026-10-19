import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import bcrypt from 'bcryptjs';

describe('NEXUS Dynamic Onboarding & Multi-Tier Role Creation Lifecycle', () => {
  let adminToken: string;
  let hrToken: string;
  let hrUserId: string;
  let createdEmployeeId: string;

  const testCompany = {
    companyName: 'Apex Innovations Pvt Ltd',
    companyTagline: 'Next-Gen Enterprise Solutions',
    adminName: 'Super Administrator',
    adminEmail: `superadmin_${Date.now()}@apexcorp.test`,
    adminPassword: 'MasterAdmin@2026',
    city: 'Hyderabad',
    state: 'Telangana',
  };

  const testHr = {
    name: 'Priya Sharma (HR Lead)',
    email: `priya.hr_${Date.now()}@apexcorp.test`,
    password: 'HrPassword@2026',
    role: 'HR' as const,
  };

  const testEmployee = {
    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName: 'Rohan',
    lastName: 'Verma',
    email: `rohan.verma_${Date.now()}@apexcorp.test`,
    phone: '9876543210',
    gender: 'Male',
    joiningDate: new Date().toISOString(),
    status: 'ACTIVE',
    taxRegime: 'NEW',
    monthlyGross: 60000,
    password: 'EmployeePortal@2026',
  };

  beforeAll(async () => {
    // Ensure we have a clean test admin if needed, or create one for testing
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!existingAdmin) {
      const hash = await bcrypt.hash(testCompany.adminPassword, 10);
      const user = await prisma.user.create({
        data: {
          name: testCompany.adminName,
          email: testCompany.adminEmail,
          passwordHash: hash,
          role: 'ADMIN',
          isActive: true,
        },
      });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testCompany.adminEmail, password: testCompany.adminPassword });
      adminToken = loginRes.body.data.token;
    } else {
      const tempPass = 'Admin@12345';
      const hash = await bcrypt.hash(tempPass, 10);
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { passwordHash: hash, isActive: true },
      });
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: existingAdmin.email, password: tempPass });
      adminToken = loginRes.body.data.token;
    }
  });

  it('1. GET /api/v1/auth/system-status reports current initialization state', async () => {
    const res = await request(app).get('/api/v1/auth/system-status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('hasAdmin');
    expect(res.body.data).toHaveProperty('isInitialized');
  });

  it('2. POST /api/v1/auth/setup-admin is guarded when an admin already exists', async () => {
    const res = await request(app)
      .post('/api/v1/auth/setup-admin')
      .send({
        companyName: 'Test Guard Co',
        adminName: 'Illegal Admin',
        adminEmail: 'illegal@test.com',
        adminPassword: 'Password@12345',
      });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Admin creates an HR account via POST /api/v1/users', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(testHr);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testHr.email.toLowerCase());
    expect(res.body.data.role).toBe('HR');
    expect(res.body.data).not.toHaveProperty('passwordHash');

    hrUserId = res.body.data.id;
  });

  it('4. Admin lists users and verifies the newly created HR user is present', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ role: 'HR' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const hrExists = res.body.data.items.some((u: any) => u.email === testHr.email.toLowerCase());
    expect(hrExists).toBe(true);
  });

  it('5. HR logs in with the newly created credentials and obtains JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: testHr.email, password: testHr.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('HR');
    expect(res.body.data).toHaveProperty('token');

    hrToken = res.body.data.token;
  });

  it('6. HR cannot access Admin-only staff user creation (RBAC guard)', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        name: 'Forbidden Staff',
        email: 'forbidden@test.com',
        password: 'Password@12345',
        role: 'HR',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('7. Admin cannot create employee directly via POST /api/v1/employees (strictly HR only)', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...testEmployee, employeeId: 'EMP-DENIED-ADMIN', email: 'denied.admin@apexcorp.test' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('8. HR creates a new employee dynamically via POST /api/v1/employees with custom password', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send(testEmployee);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employeeId).toBe(testEmployee.employeeId);
    expect(res.body.data.email).toBe(testEmployee.email.toLowerCase());

    createdEmployeeId = res.body.data.id;
  });

  it('9. The newly created employee can authenticate using their work email and custom password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: testEmployee.email, password: testEmployee.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('EMPLOYEE');
    expect(res.body.data.user.employee.employeeId).toBe(testEmployee.employeeId);
  });

  it('9. Admin can update and reset password for the HR account', async () => {
    // Reset password
    const newPass = 'UpdatedHrPass@999';
    const resetRes = await request(app)
      .post(`/api/v1/users/${hrUserId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: newPass });

    expect(resetRes.status).toBe(200);

    // Verify login with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: testHr.email, password: newPass });

    expect(loginRes.status).toBe(200);
  });

  it('10. Admin cannot delete their own account (Safety Guard)', async () => {
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    const myId = meRes.body.data.id;

    const delRes = await request(app)
      .delete(`/api/v1/users/${myId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(400);
    expect(delRes.body.message).toContain('cannot delete your own account');
  });
});
