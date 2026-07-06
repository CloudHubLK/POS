// Mock TTY environment for zcatalyst-cli to bypass non-TTY stdin buffering hangs
process.stdin.isTTY = true;
if (process.stdout.isTTY === undefined) {
  process.stdout.isTTY = true;
}

// Ignore annoying Winston logging stream errors (like write after end) that crash the process
process.on('uncaughtException', (err) => {
  if (err && (err.code === 'ERR_STREAM_WRITE_AFTER_END' || (err.message && err.message.includes('write after end')))) {
    // Ignore winston log writing failures after stream has ended
    return;
  }
  console.error('Uncaught Exception:', err);
});

// Load zcatalyst-cli
require('C:\\Users\\MK\\AppData\\Roaming\\npm\\node_modules\\zcatalyst-cli\\lib\\bin\\catalyst.js');
