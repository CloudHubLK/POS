const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Getting Catalyst CLI commands...");

const nodePaths = [
  path.join(__dirname, 'node18', 'node.exe'),
  'C:\\Program Files\\nodejs\\node.exe',
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
  path.join(__dirname, 'run_catalyst.js'),
  '--help'
], {
  cwd: __dirname,
  env: process.env
});

child.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
  process.exit(code);
});
