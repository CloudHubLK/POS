const { spawn } = require('child_process');
const fs = require('fs');

const nodePaths = [
  'C:\\Users\\MK\\.gemini\\antigravity\\scratch\\POS\\node18\\node.exe',
  'node'
];

let nodeExecutable = 'node';
for (const p of nodePaths) {
  if (fs.existsSync(p)) {
    nodeExecutable = p;
    break;
  }
}

const child = spawn(nodeExecutable, [
  'C:\\Users\\MK\\AppData\\Roaming\\npm\\node_modules\\zcatalyst-cli\\lib\\bin\\catalyst.js',
  'deploy',
  '--help'
], {
  cwd: 'C:\\Users\\MK\\.gemini\\antigravity\\scratch\\POS',
  env: process.env
});

child.stdout.on('data', (data) => {
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
