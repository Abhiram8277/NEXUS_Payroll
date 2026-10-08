import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(`🚀 NEXUS Payroll Platform Engine Active`);
  console.log(`"NEXUS — Payroll, without the paperwork."`);
  console.log(`📡 Listening on http://localhost:${config.port}`);
  console.log(`🔌 API Base: http://localhost:${config.port}/api/v1`);
  console.log(`==================================================`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully.');
  server.close(() => {
    process.exit(0);
  });
});
