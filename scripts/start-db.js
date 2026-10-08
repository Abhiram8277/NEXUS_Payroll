const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 5432;
const DB_DIR = path.resolve(__dirname, '../pgdata');
const SERVER_SCRIPT = path.resolve(__dirname, '../node_modules/@electric-sql/pglite-socket/dist/scripts/server.cjs');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true); // Port is in use
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  const isRunning = await checkPort(PORT);
  if (isRunning) {
    console.log(`[NEXUS DB] PostgreSQL is already active on port ${PORT}.`);
    // Keep alive if ran as standing task
    setInterval(() => {}, 1000 * 60 * 60);
    return;
  }

  console.log(`[NEXUS DB] Starting PostgreSQL server on port ${PORT} using data directory: ${DB_DIR}...`);
  const child = spawn(process.execPath, [SERVER_SCRIPT, '-d', DB_DIR, '-p', String(PORT), '-h', '127.0.0.1', '-m', '100'], {
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error('[NEXUS DB] Failed to start PostgreSQL server:', err);
    process.exit(1);
  });

  child.on('exit', (code) => {
    console.log(`[NEXUS DB] PostgreSQL server exited with code ${code}`);
    process.exit(code || 0);
  });
}

main();
