const { spawn } = require('child_process');
const fs = require('fs');

console.log("Starting Catalyst Deploy Runner...");

const nodePaths = [
  'C:\\Users\\MK\\.gemini\\antigravity\\scratch\\POS\\node18\\node.exe',
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
  'C:\\Users\\MK\\.gemini\\antigravity\\scratch\\POS\\run_catalyst.js',
  'deploy'
], {
  cwd: 'C:\\Users\\MK\\.gemini\\antigravity\\scratch\\POS',
  env: process.env
});

child.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Look for prompts
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

// Fallback: send y after 8 seconds in case the prompt was printed differently
setTimeout(() => {
  console.log("[Runner] Sending fallback 'y'...");
  try {
    child.stdin.write('y\r\n');
  } catch (e) {
    // Ignore
  }
}, 8000);
