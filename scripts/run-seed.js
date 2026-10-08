const { spawn } = require('child_process');
const path = require('path');

const SEED_FILE = path.resolve(__dirname, '../prisma/seed.ts');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const child = spawn(npxCmd, ['tsx', SEED_FILE], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
