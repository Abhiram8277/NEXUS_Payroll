import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from both root and backend directories if present
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'nexus_super_secret_jwt_key_2026_enterprise_payroll',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  uploadDir: path.resolve(__dirname, '../../../uploads'),
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    service: process.env.SMTP_SERVICE || '',
    from:
      process.env.EMAIL_FROM ||
      (process.env.SMTP_USER
        ? `NEXUS Payroll <${process.env.SMTP_USER}>`
        : 'NEXUS Payroll <no-reply@nexuspayroll.in>'),
    webhookUrl: process.env.EMAIL_WEBHOOK_URL || '',
    apiKey: process.env.EMAIL_API_KEY || '',
  },
};
