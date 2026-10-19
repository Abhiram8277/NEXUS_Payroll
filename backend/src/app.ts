import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import companyRoutes from './modules/company/company.routes';
import mastersRoutes from './modules/masters/masters.routes';
import employeesRoutes from './modules/employees/employees.routes';
import salaryRoutes from './modules/salary/salary.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leavesRoutes from './modules/leaves/leaves.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import statutoryRoutes from './modules/statutory/statutory.routes';
import payslipsRoutes from './modules/payslips/payslips.routes';
import reportsRoutes from './modules/reports/reports.routes';
import usersRoutes from './modules/users/users.routes';

const app = express();

// Security & utility middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Static files for uploaded documents
app.use('/uploads', express.static(config.uploadDir));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NEXUS Payroll API',
    tagline: 'Payroll, without the paperwork.',
    timestamp: new Date().toISOString(),
  });
});

// API routes prefix /api/v1
const apiV1 = express.Router();
apiV1.use('/auth', authRoutes);
apiV1.use('/company', companyRoutes);
apiV1.use('/masters', mastersRoutes);
apiV1.use('/departments', (req, res, next) => {
  req.url = '/departments' + req.url;
  mastersRoutes(req, res, next);
});
apiV1.use('/designations', (req, res, next) => {
  req.url = '/designations' + req.url;
  mastersRoutes(req, res, next);
});
apiV1.use('/locations', (req, res, next) => {
  req.url = '/locations' + req.url;
  mastersRoutes(req, res, next);
});
apiV1.use('/leave-types', (req, res, next) => {
  req.url = '/leave-types' + req.url;
  mastersRoutes(req, res, next);
});
apiV1.use('/salary-components', (req, res, next) => {
  req.url = '/salary-components' + req.url;
  mastersRoutes(req, res, next);
});
apiV1.use('/holidays', (req, res, next) => {
  req.url = '/holidays' + req.url;
  mastersRoutes(req, res, next);
});
apiV1.use('/statutory', statutoryRoutes);
apiV1.use('/employees', employeesRoutes);
apiV1.use('/salary', salaryRoutes);
apiV1.use('/attendance', attendanceRoutes);
apiV1.use('/leaves', leavesRoutes);
apiV1.use('/payroll', payrollRoutes);
apiV1.use('/payslips', payslipsRoutes);
apiV1.use('/reports', reportsRoutes);
apiV1.use('/users', usersRoutes);

app.use('/api/v1', apiV1);

// Serve frontend build if dist directory exists
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const indexHtml = path.join(frontendDist, 'index.html');
if (require('fs').existsSync(indexHtml)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(indexHtml);
  });
}

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
