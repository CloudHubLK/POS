const http = require('http');

const ports = [3000, 3001, 8080, 8085, 8828, 8082, 8083, 8084, 8086];

function tryPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/server/pos_backend/api/debug-configs`, { timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ port, success: true, data: JSON.parse(data) });
        } else {
          resolve({ port, success: false, error: `Status ${res.statusCode}` });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ port, success: false, error: err.message });
    });
  });
}

async function run() {
  console.log("Scanning ports...");
  for (const port of ports) {
    console.log(`Checking port ${port}...`);
    const result = await tryPort(port);
    if (result.success) {
      console.log(`\nSUCCESS on port ${port}!`);
      console.log(JSON.stringify(result.data, null, 2));
      process.exit(0);
    } else {
      console.log(`Failed on port ${port}: ${result.error}`);
    }
  }
  console.log("\nAll ports scanned, none succeeded.");
}

run();
