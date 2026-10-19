import request from 'supertest';
import app from '../../app';
import { prisma } from '../../config/prisma';
import { EmailService } from './email.service';

describe('NEXUS Email Service & Diagnostics Suite', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Find an existing admin or create a temporary one for authenticated route test
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: 'email.test.admin@nexus.test',
          name: 'Email Test Admin',
          passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
          role: 'ADMIN',
          isActive: true,
        },
      });
    }

    const jwt = require('jsonwebtoken');
    const { config } = require('../../config');
    adminToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role, name: admin.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. EmailService.verifyConnection reports configuration status gracefully', async () => {
    const status = await EmailService.verifyConnection();
    expect(status).toBeDefined();
    expect(typeof status.configured).toBe('boolean');
    expect(typeof status.message).toBe('string');
  });

  test('2. EmailService.sendEmail saves to EmailLog in simulated mode when SMTP is unconfigured', async () => {
    const testRecipient = 'test.outbox@nexuspayroll.test';
    const log = await EmailService.sendEmail({
      to: testRecipient,
      subject: 'Unit Test Email Dispatch',
      template: 'TEST_DISPATCH',
      htmlBody: '<p>Unit test message content</p>',
      metadata: { testSuite: true, token: 'mock-token-xyz' },
    });

    expect(log).toBeDefined();
    expect(log.to).toBe(testRecipient);
    expect(log.status).toBe('SENT');
    expect(log.error).toBeNull();

    const dbLog = await prisma.emailLog.findUnique({ where: { id: log.id } });
    expect(dbLog).not.toBeNull();
    expect(dbLog?.template).toBe('TEST_DISPATCH');
  });

  test('3. EmailService.sendEmail flags invalid recipient as FAILED', async () => {
    const log = await EmailService.sendEmail({
      to: 'invalid-address.invalid',
      subject: 'Should Fail Delivery',
      template: 'TEST_FAIL',
      htmlBody: '<p>Content</p>',
    });

    expect(log.status).toBe('FAILED');
    expect(log.error).toContain('Invalid or unreachable recipient');
  });

  test('4. GET /api/v1/auth/email-status provides live status to administrators', async () => {
    const res = await request(app)
      .get('/api/v1/auth/email-status')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('configured');
    expect(res.body.data).toHaveProperty('message');
  });

  test('5. POST /api/v1/auth/test-email rejects invalid payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/test-email')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('6. POST /api/v1/auth/test-email dispatches test email successfully in simulated or SMTP mode', async () => {
    const res = await request(app)
      .post('/api/v1/auth/test-email')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'test.admin@nexuspayroll.in' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.to).toBe('test.admin@nexuspayroll.in');
    expect(res.body.data.template).toBe('TEST_EMAIL');
  });
});
