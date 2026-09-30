const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectDir = path.join(__dirname, '..');
const certificate = path.join(projectDir, 'localhost.pem');
const privateKey = path.join(projectDir, 'localhost-key.pem');

for (const port of [3000, 3001]) {
  try {
    const processIds = execFileSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' }).trim();
    if (processIds) {
      throw new Error(`Port ${port} is already in use (PID ${processIds.replace(/\n/g, ', ')}). Stop that process before running npm run dev.`);
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (!fs.existsSync(certificate) || !fs.existsSync(privateKey)) {
  console.log('Creating a self-signed localhost certificate...');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '365',
    '-keyout', privateKey, '-out', certificate,
    '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ], { stdio: 'ignore' });
  fs.chmodSync(privateKey, 0o600);
}
