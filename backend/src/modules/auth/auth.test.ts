import request from 'supertest';
import app from '../../app';

describe('NEXUS Auth & RBAC API Integration Tests', () => {
  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/employees');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('authenticates admin and returns valid JWT with role ADMIN', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin@nexuspayroll.com', password: 'Admin@12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('authenticates HR and returns valid JWT with role HR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'hr@nexuspayroll.com', password: 'Hr@12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('HR');
  });

  it('authenticates employee using either email or employee ID', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'rahul.sharma@nexuspayroll.com', password: 'Emp@12345' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('EMPLOYEE');
  });

  it('prevents employee from accessing Admin-only routes (403 Forbidden)', async () => {
    // 1. Login as employee
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'rahul.sharma@nexuspayroll.com', password: 'Emp@12345' });
    const empToken = loginRes.body.data.token;

    // 2. Try to access Admin employee list or company update
    const res = await request(app)
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Forbidden');
  });

  it('prevents HR from locking payroll (Admin-only action, 403 Forbidden)', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'hr@nexuspayroll.com', password: 'Hr@12345' });
    const hrToken = loginRes.body.data.token;

    const res = await request(app)
      .put('/api/v1/payroll/runs/mock-run-id/lock')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
