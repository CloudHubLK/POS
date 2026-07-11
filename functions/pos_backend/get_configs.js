/**
 * Standalone config-status probe. Lists which configuration KEYS are set, but
 * NEVER prints their values — Configurations stores OAuth secrets, SMTP
 * passwords, and per-org refresh tokens, so dumping values would leak them.
 *
 * Run: node functions/pos_backend/get_configs.js  (local CLI only — not imported by the app)
 */
const catalyst = require('zcatalyst-sdk-node');

const SECRET_PATTERNS = [
  /secret/i,
  /password/i,
  /token/i,
  /smtp_pass/i,
  /refresh_token/i
];

async function listConfigKeys() {
  try {
    const app = catalyst.initialize();
    const query = "SELECT config_key FROM Configurations";
    const result = await app.zcql().executeZCQLQuery(query);
    const rows = result || [];
    console.log(`Configurations table — ${rows.length} key(s) present:`);
    for (const row of rows) {
      const key = row.Configurations && row.Configurations.config_key;
      if (!key) continue;
      const isSecret = SECRET_PATTERNS.some((re) => re.test(key));
      console.log(isSecret ? `  ${key}   = [HIDDEN — secret]` : `  ${key}`);
    }
  } catch (err) {
    console.error("Error fetching configuration keys:", err.message);
  }
}

listConfigKeys();
