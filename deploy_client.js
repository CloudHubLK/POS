const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Starting Catalyst Client Deployer...");

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

console.log(`[Runner] Selected node executable: ${nodeExecutable}`);

const child = spawn(nodeExecutable, [
  path.join(__dirname, 'run_catalyst.js'),
  'deploy',
  '--only',
  'client'
], {
  cwd: __dirname,
  env: process.env
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  if (output.includes('?') || output.includes('Do you want to deploy') || output.includes('components') || output.includes('Y/n')) {
    console.log("\n[Runner] Prompt detected! Sending 'y'...");
    try {
      child.stdin.write('y\r\n');
    } catch (e) {
      console.error("[Runner] Error writing to stdin:", e.message);
    }
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`[Runner] Process exited with code ${code}`);
  process.exit(code);
});

setTimeout(() => {
  console.log("[Runner] Sending fallback 'y'...");
  try {
    child.stdin.write('y\r\n');
  } catch (e) {
    // Ignore
  }
}, 5000);
