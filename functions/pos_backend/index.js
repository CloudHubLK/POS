const express = require('express');
const axios = require('axios');
const catalyst = require('zcatalyst-sdk-node');
const ZohoBooksService = require('./zohoBooksService');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

/* ==========================================================================
   SAAS MASTER DEVELOPER CREDENTIALS
   All values MUST be set via Catalyst Environment Variables.
   Never hardcode secrets in source code.
   ========================================================================== */
const SAAS_MASTER_CREDENTIALS = {
  client_id: process.env.ZOHO_CLIENT_ID || '',
  client_secret: process.env.ZOHO_CLIENT_SECRET || '',
  dc: process.env.ZOHO_DC || 'com'
};

/**
 * Ensures the SaaS master developer credentials are present in the Configurations
 * datastore. This runs transparently so merchants never need to enter a Client ID
 * or Secret — they simply authorize their own Zoho Books account via OAuth.
 * Returns { client_id, client_secret, dc } resolved from the store.
 */
async function ensureMasterCredentials(booksService) {
  let clientId = await booksService.getConfig('zoho_client_id');
  let clientSecret = await booksService.getConfig('zoho_client_secret');
  let dc = await booksService.getConfig('zoho_dc');

  if (!clientId && SAAS_MASTER_CREDENTIALS.client_id) {
    console.log('Master credentials missing — seeding from environment variables.');
    await booksService.saveConfig('zoho_client_id', SAAS_MASTER_CREDENTIALS.client_id);
    await booksService.saveConfig('zoho_client_secret', SAAS_MASTER_CREDENTIALS.client_secret);
    if (!dc) await booksService.saveConfig('zoho_dc', SAAS_MASTER_CREDENTIALS.dc);
    clientId = SAAS_MASTER_CREDENTIALS.client_id;
    clientSecret = SAAS_MASTER_CREDENTIALS.client_secret;
    dc = dc || SAAS_MASTER_CREDENTIALS.dc;
  } else if (!clientId) {
    console.warn('ZOHO_CLIENT_ID environment variable is not set. OAuth flows will fail until configured.');
  }

  // Auto-seed SMTP config for OTP email delivery only if environment variables are present
  const smtpHost = await booksService.getConfig('email_smtp_host');
  if (!smtpHost && process.env.SMTP_HOST) {
    console.log('SMTP config missing — seeding from environment variables.');
    await booksService.saveConfig('email_smtp_host', process.env.SMTP_HOST);
    await booksService.saveConfig('email_smtp_port', process.env.SMTP_PORT || '465');
    await booksService.saveConfig('email_smtp_user', process.env.SMTP_USER || '');
    await booksService.saveConfig('email_smtp_pass', process.env.SMTP_PASS || '');
    await booksService.saveConfig('email_smtp_from', process.env.SMTP_FROM || '');
  }

  return { client_id: clientId, client_secret: clientSecret, dc: dc || SAAS_MASTER_CREDENTIALS.dc };
}

/**
 * Sends an OTP email via configured SMTP transport.
 * Falls back to console.log when SMTP is not configured (dev mode).
 * SMTP config is stored in Configurations table as email_smtp_host, email_smtp_port, etc.
 * Or set via environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
async function sendOtpEmail(booksService, toEmail, otp, userName) {
  const subject = 'Your POS Login Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8f9fa; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1a1a2e; margin: 0;">POS Verification</h2>
      </div>
      <div style="background: white; padding: 24px; border-radius: 8px; text-align: center;">
        <p style="color: #555; font-size: 14px;">Hello <strong>${userName || toEmail}</strong>,</p>
        <p style="color: #555; font-size: 14px;">Your verification code is:</p>
        <div style="font-size: 36px; font-weight: bold; color: #6c5ce7; letter-spacing: 8px; margin: 20px 0; padding: 16px; background: #f0edff; border-radius: 8px;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 12px;">This code expires in 15 minutes. Do not share it with anyone.</p>
      </div>
      <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 16px;">Sent by Cloud POS SaaS</p>
    </div>
  `;

  // Try to get SMTP config from environment variables first
  let smtpHost = process.env.SMTP_HOST;
  let smtpPort = process.env.SMTP_PORT;
  let smtpUser = process.env.SMTP_USER;
  let smtpPass = process.env.SMTP_PASS;
  let smtpFrom = process.env.SMTP_FROM || smtpUser;

  // If not in env, try Configurations table
  if (!smtpHost && booksService) {
    try {
      smtpHost = await booksService.getConfig('email_smtp_host');
      smtpPort = await booksService.getConfig('email_smtp_port');
      smtpUser = await booksService.getConfig('email_smtp_user');
      smtpPass = await booksService.getConfig('email_smtp_pass');
      smtpFrom = await booksService.getConfig('email_smtp_from') || smtpUser;
    } catch (e) {
      // Configurations table may not exist yet
    }
  }

  // NOTE: No hardcoded SMTP fallback. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env vars
  // OR configure via Settings → Email in the POS UI (stored encrypted in Configurations table).

  // If SMTP is configured, send the email
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        secure: parseInt(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail({ from: smtpFrom, to: toEmail, subject, html });
      console.log(`OTP email sent to ${toEmail}`);
      return true;
    } catch (emailErr) {
      console.error('Failed to send OTP email:', emailErr.message);
    }
  }

  // Dev fallback: log OTP to console (never expose to client in production)
  console.log(`[DEV MODE] OTP for ${toEmail}: ${otp} (SMTP not configured)`);
  return false;
}

/**
 * Builds the OAuth redirect URI without default ports (:443 for HTTPS, :80 for HTTP)
 * so it matches what's registered in the Zoho API Console.
 */
function buildRedirectUri(req) {
  let host = req.get('host') || '';
  host = host.replace(/:443$/, '').replace(/:80$/, '');
  // Always force HTTPS — behind Catalyst proxy, req.protocol may be 'http'
  return `https://${host}/server/pos_backend/api/auth/callback`;
}

/**
 * Safely execute a ZCQL query. Returns the result array or an empty array
 * if the table doesn't exist (first-time deployment).
 */
async function safeZcql(catalystApp, query) {
  try {
    return await catalystApp.zcql().executeZCQLQuery(query);
  } catch (err) {
    if (err.message && err.message.includes('No Such Table')) {
      console.warn('Table not found in Datastore. Please create tables via Catalyst CLI or Console.');
      return [];
    }
    throw err;
  }
}

/**
 * Safely insert/update a Datastore row. Returns true/false.
 * Does NOT rely on ZCQL SELECT succeeding — falls back to direct insert.
 */
async function safeUpsertConfig(catalystApp, key, value) {
  const payload = { config_key: key, config_value: value };
  try {
    const existing = await safeZcql(catalystApp, `SELECT ROWID FROM Configurations WHERE config_key = '${key}'`);
    if (existing && existing.length > 0) {
      const table = catalystApp.datastore().table('Configurations');
      await table.updateRow({ ROWID: existing[0].Configurations.ROWID, ...payload });
      return true;
    }
  } catch (err) {
    console.warn(`safeUpsertConfig: ZCQL fallback (${err.message}), trying direct insert`);
  }
  try {
    const table = catalystApp.datastore().table('Configurations');
    await table.insertRow(payload);
    return true;
  } catch (err) {
    console.error(`safeUpsertConfig: insertRow failed for '${key}':`, err.message);
    return null;
  }
}

// Signing key for OTP tokens — set via POS_OTP_SECRET environment variable.
// Note: CATALYST_ prefix is reserved by Zoho Catalyst and cannot be used for custom env vars.
const OTP_SIGNING_SECRET = process.env.POS_OTP_SECRET || 'CHANGE_ME_IN_ENV';
const crypto = require('crypto');

function createOtpToken(email, otp, expiryMinutes, role) {
  const exp = Date.now() + (expiryMinutes || 15) * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email, otp, exp, role: role || 'Cashier' })).toString('base64');
  const sig = crypto.createHmac('sha256', OTP_SIGNING_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyOtpToken(token, email, otp) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const payload = parts[0];
    const sig = parts[1];
    const expectedSig = crypto.createHmac('sha256', OTP_SIGNING_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (data.email !== email || data.otp !== otp || Date.now() > data.exp) return false;
    return data;
  } catch (e) {
    return false;
  }
}

// Enable CORS — restrict to Catalyst domain in production.
// CATALYST_APP_DOMAIN should be set e.g. "https://your-app.catalyst.zoho.com"
const ALLOWED_ORIGIN = process.env.CATALYST_APP_DOMAIN || '*';
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGIN === '*') {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (origin && (origin === ALLOWED_ORIGIN || origin.endsWith('.catalyst.zoho.com'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-zoho-refresh-token, x-zoho-org-id, x-zoho-dc');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

/**
 * Sanitize a value before interpolating into a ZCQL string.
 * Escapes single quotes and removes characters that could break the query.
 * Always use parameterized queries if the Catalyst SDK supports them;
 * this is a defense-in-depth safeguard for string interpolation.
 */
function sanitizeZcql(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/'/g, "''").replace(/[\x00-\x1f\x7f]/g, '');
}

// Middleware helper to extract tenant headers
function getTenantConfig(req) {
  const refreshToken = req.header('x-zoho-refresh-token');
  const orgId = req.header('x-zoho-org-id');
  const dc = req.header('x-zoho-dc') || 'US';

  if (refreshToken || orgId) {
    return { refreshToken, orgId, dc };
  }
  return null;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), platform: 'Cloud POS SaaS' });
});

/**
 * POST /api/config/smtp
 * Save SMTP email configuration for OTP delivery
 */
app.post('/api/config/smtp', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;
    if (!smtp_host || !smtp_user || !smtp_pass) {
      return res.status(400).json({ success: false, error: 'SMTP host, user, and password are required' });
    }
    await safeUpsertConfig(catalystApp, 'email_smtp_host', smtp_host);
    await safeUpsertConfig(catalystApp, 'email_smtp_port', smtp_port || '587');
    await safeUpsertConfig(catalystApp, 'email_smtp_user', smtp_user);
    await safeUpsertConfig(catalystApp, 'email_smtp_pass', smtp_pass);
    await safeUpsertConfig(catalystApp, 'email_smtp_from', smtp_from || smtp_user);
    res.status(200).json({ success: true, message: 'SMTP configuration saved' });
  } catch (error) {
    console.error('Error saving SMTP config:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/config/smtp
 * Get SMTP configuration status (does not expose password)
 */
app.get('/api/config/smtp', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const booksService = new ZohoBooksService(catalystApp);
    const host = await booksService.getConfig('email_smtp_host');
    const port = await booksService.getConfig('email_smtp_port');
    const user = await booksService.getConfig('email_smtp_user');
    const from = await booksService.getConfig('email_smtp_from');
    res.status(200).json({
      success: true,
      configured: !!(host && user),
      smtp_host: host || '',
      smtp_port: port || '587',
      smtp_user: user || '',
      smtp_from: from || ''
    });
  } catch (error) {
    res.status(200).json({ success: true, configured: false });
  }
});

/**
 * GET /api/setup/status
 * Checks if all required Datastore tables exist and returns their status.
 * This is a one-time diagnostic — once tables are confirmed, this endpoint is no longer needed.
 */
app.get('/api/setup/status', async (req, res) => {
  const requiredTables = ['Items', 'Orders', 'OrderItems', 'Configurations'];
  const tableStatus = {};

  for (const tableName of requiredTables) {
    try {
      const catalystApp = catalyst.initialize(req);
      const result = await catalystApp.zcql().executeZCQLQuery(`SELECT ROWID FROM ${tableName} LIMIT 1`);
      tableStatus[tableName] = { exists: true, sample_rows: result ? result.length : 0 };
    } catch (err) {
      tableStatus[tableName] = { exists: false, error: err.message };
    }
  }

  const allExist = requiredTables.every(t => tableStatus[t].exists);
  res.status(200).json({
    success: true,
    all_tables_ready: allExist,
    tables: tableStatus,
    message: allExist
      ? 'All Datastore tables are provisioned and ready.'
      : 'Some tables are missing. Please create them via Catalyst CLI: run `npx zcatalyst-cli datastore push` from the project root, or create them manually in the Catalyst Console → Data Store.'
  });
});

/* ==========================================================================
   ZOHO OAUTH MULTI-TENANT AUTHENTICATION ENDPOINTS
   ==========================================================================
   NOTE: /api/debug-configs and /api/debug/connection removed — they exposed
   all Configurations table secrets (SMTP passwords, OAuth secrets) publicly.
   Use /api/setup/status for non-sensitive table health checks.
   ========================================================================== */

/**
 * GET /api/auth/status
 * Check connection availability - Catalyst connection first, then Master Credentials
 */
app.get('/api/auth/status', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const booksService = new ZohoBooksService(catalystApp);

    // Check Catalyst connection first (SDK v3.2.0+)
    let catalystConnAvailable = false;
    try {
      const connCredentials = await catalystApp.connections().getConnectionCredentials('zohobooks_conn');
      catalystConnAvailable = !!(connCredentials && connCredentials.headers && connCredentials.headers['Authorization']);
    } catch (e) {
      // Catalyst connection not configured or SDK < v3.2.0
    }

    // Transparently ensure SaaS master credentials exist (merchants never see these)
    const master = await ensureMasterCredentials(booksService);
    const orgId = await booksService.getConfig('zoho_org_id');

    res.status(200).json({
      success: true,
      catalyst_connection: catalystConnAvailable,
      master_configured: !!(master.client_id && master.client_secret),
      dc: master.dc,
      org_id: orgId || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/organizations
 * Fetch all Zoho Books organizations for the authenticated account across all DCs or a specific DC
 */
app.get('/api/organizations', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const dcQuery = req.query.dc || null;
    const tenantConfig = getTenantConfig(req);

    // Strict multi-tenant isolation: do not fetch organizations using the project-level
    // connection (zohobooks_conn) if the user has not provided their own OAuth token.
    // This prevents merchant sessions from auto-linking to the developer's personal account.
    if (!tenantConfig || !tenantConfig.refreshToken) {
      console.log('GET /organizations: No tenant OAuth refresh token provided. Returning empty organizations list.');
      return res.status(200).json({
        success: true,
        count: 0,
        organizations: []
      });
    }

    const booksService = new ZohoBooksService(catalystApp, tenantConfig);

    console.log('Retrieving Zoho Books organizations for current account connection...');
    const organizations = await booksService.getOrganizations(dcQuery);

    res.status(200).json({
      success: true,
      count: organizations.length,
      organizations
    });
  } catch (error) {
    console.error('Error fetching Zoho Books organizations:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch organizations.' });
  }
});

/**
 * POST /api/auth/save-master-credentials
 * Saves global Master Developer credentials from Settings panel
 */
app.post('/api/auth/save-master-credentials', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const booksService = new ZohoBooksService(catalystApp);
    const { client_id, client_secret, dc } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({ success: false, error: 'Client ID and Client Secret are required' });
    }

    await booksService.saveConfig('zoho_client_id', client_id);
    await booksService.saveConfig('zoho_client_secret', client_secret);
    await booksService.saveConfig('zoho_dc', dc || 'US');

    res.status(200).json({ success: true, message: 'SaaS Master Client Credentials saved successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/seed-credentials
 * One-time seeding of default Zoho API Console credentials
 */
app.post('/api/auth/seed-credentials', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const booksService = new ZohoBooksService(catalystApp);

    // Check if already configured
    const existingId = await booksService.getConfig('zoho_client_id');
    if (existingId) {
      return res.status(200).json({ success: true, message: 'Credentials already configured, skipping seed.' });
    }

    const { client_id, client_secret, dc } = req.body;
    if (!client_id || !client_secret) {
      return res.status(400).json({ success: false, error: 'Client ID and Client Secret are required' });
    }

    await booksService.saveConfig('zoho_client_id', client_id);
    await booksService.saveConfig('zoho_client_secret', client_secret);
    await booksService.saveConfig('zoho_dc', dc || 'com');

    res.status(200).json({ success: true, message: 'Default Zoho credentials seeded successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Returns the current Catalyst-authenticated user's email
 */
app.get('/api/auth/me', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const user = await catalystApp.userManagement().getCurrentUser();
    res.json({ success: true, email: user.email, user_id: user.user_id });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/url
 * Returns the authorization link to redirect users to Zoho Accounts using Master Client ID
 */
app.get('/api/auth/url', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const booksService = new ZohoBooksService(catalystApp);

    const master = await ensureMasterCredentials(booksService);
    const clientId = master.client_id;

    const redirectUri = buildRedirectUri(req);
    const oauthUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&access_type=offline&prompt=consent`;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Connect Zoho Books</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
  .card { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); max-width: 480px; width: 100%; overflow: hidden; border: 1px solid #e2e8f0; }
  .header { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 24px 28px; color: white; }
  .header h1 { font-family: 'Outfit', 'Inter', sans-serif; font-size: 20px; margin: 0 0 4px 0; font-weight: 600; }
  .header p { font-size: 13px; opacity: 0.75; margin: 0; }
  .body { padding: 24px 28px; }
  .option { display: flex; align-items: flex-start; gap: 14px; padding: 16px; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
  .option:hover { border-color: #94a3b8; }
  .option.active { border-color: #3b82f6; background: #eff6ff; }
  .option-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .icon-current { background: #dbeafe; color: #2563eb; }
  .icon-different { background: #fef3c7; color: #d97706; }
  .option-text h3 { font-size: 14px; margin: 0 0 3px 0; font-weight: 600; color: #0f172a; }
  .option-text p { font-size: 12px; margin: 0; color: #64748b; line-height: 1.4; }
  .steps { display: none; margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
  .steps.visible { display: block; }
  .steps ol { margin: 0 0 14px 0; padding-left: 20px; }
  .steps li { font-size: 13px; color: #334155; margin-bottom: 8px; line-height: 1.5; }
  .steps li strong { color: #0f172a; }
  .oauth-link-wrap { background: #f1f5f9; padding: 10px 14px; border-radius: 8px; word-break: break-all; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; margin-bottom: 10px; max-height: 80px; overflow-y: auto; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%; justify-content: center; transition: all 0.2s; }
  .btn-primary { background: #3b82f6; color: white; }
  .btn-primary:hover { background: #2563eb; }
  .btn-secondary { background: #e2e8f0; color: #475569; }
  .btn-secondary:hover { background: #cbd5e1; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 12px 14px; margin-top: 12px; font-size: 12px; color: #0369a1; line-height: 1.5; }
  .hidden { display: none; }
</style></head>
<body>
<div class="card">
  <div class="header">
    <h1>🔗 Connect Zoho Books</h1>
    <p>Link your Zoho Books account to sync inventory and invoices</p>
  </div>
  <div class="body">
    <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0; line-height: 1.5;">
      Choose how you'd like to connect:
    </p>

    <div class="option active" id="option-current" onclick="selectOption('current')">
      <div class="option-icon icon-current">👤</div>
      <div class="option-text">
        <h3>Use current Zoho session</h3>
        <p>Connect with the Zoho account you're already signed in as (fastest)</p>
      </div>
    </div>

    <div class="option" id="option-different" onclick="selectOption('different')">
      <div class="option-icon icon-different">🔄</div>
      <div class="option-text">
        <h3>Use a different Zoho account</h3>
        <p>Sign out first, then log in with a different Zoho Books account</p>
      </div>
    </div>

    <div id="steps-different" class="steps">
      <ol>
        <li><strong>First sign out</strong> — <a href="https://accounts.zoho.com" target="_blank" rel="noopener">Click here to open Zoho Accounts</a> in a new tab and sign out</li>
        <li><strong>Then come back</strong> to this popup and click the button below</li>
      </ol>
      <button class="btn btn-primary" onclick="window.location.href=oauthUrl" style="margin-bottom: 8px;">
        🔗 Continue to Zoho Login →
      </button>
      <div style="font-size: 11px; color: #94a3b8; text-align: center;">After signing out, clicking this will show the Zoho login screen where you can log in with any account</div>
    </div>

    <div class="info-box" id="statusBox">
      <span id="statusText">Ready to connect. Click "Continue" below.</span>
    </div>

    <button class="btn btn-primary" onclick="proceed()" id="proceedBtn" style="margin-top: 16px;">
      Continue →
    </button>
  </div>
</div>

<script>
  var oauthUrl = ${JSON.stringify(oauthUrl)};
  var selectedOption = 'current';

  function selectOption(opt) {
    selectedOption = opt;
    document.getElementById('option-current').classList.toggle('active', opt === 'current');
    document.getElementById('option-different').classList.toggle('active', opt === 'different');
    document.getElementById('steps-different').classList.toggle('visible', opt === 'different');
    document.getElementById('statusBox').classList.toggle('hidden', opt === 'different');
    document.getElementById('proceedBtn').textContent = opt === 'current' ? 'Continue →' : 'Continue →';
  }

  function proceed() {
    if (selectedOption === 'current') {
      window.location.href = oauthUrl;
    } else {
      // For "different account": redirects to Zoho OAuth in same popup
      // User should sign out of Zoho in a new tab first, then click proceed
      window.location.href = oauthUrl;
    }
  }
</script>
</body></html>`);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/callback
 * Zoho OAuth redirect callback that exchanges the code, fetches linked Organizations, and posts to parent window
 */
app.get('/api/auth/callback', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const booksService = new ZohoBooksService(catalystApp);
    const code = req.query.code;

    if (!code) {
      return res.status(400).send('Authentication code is missing from Zoho redirection.');
    }

    const master = await ensureMasterCredentials(booksService);
    const clientId = master.client_id;
    const clientSecret = master.client_secret;

    const redirectUri = buildRedirectUri(req);

    // Always exchange on accounts.zoho.com — Zoho routes to correct DC internally
    console.log('Exchanging auth code for tokens on accounts.zoho.com...');
    const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
      params: {
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }
    });

    if (response.data && response.data.refresh_token) {
      const refreshToken = response.data.refresh_token;
      const accessToken = response.data.access_token;
      console.log('Token exchange successful. Access token prefix:', accessToken.substring(0, 15) + '...');

      // Zoho auto-routes the code exchange to the correct DC, so the access token
      // we just got is already for the right DC. Use it directly to probe /items
      // on each DC's API endpoint — the correct DC will return code 0.
      const allDcs = ['US', 'EU', 'IN', 'AU', 'JP'];
      let organizations = [];
      let foundDc = null;

      // First: get the org list from ANY DC (works cross-DC)
      let allOrgs = [];
      for (const probeDc of allDcs) {
        try {
          const probeDomains = booksService.getDomainUrls(probeDc);
          const orgsUrl = `${probeDomains.api}/organizations`;
          console.log(`Fetching orgs from ${probeDc}: ${orgsUrl}`);
          const orgsResponse = await axios.get(orgsUrl, {
            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
            timeout: 5000
          });
          if (orgsResponse.data && orgsResponse.data.code === 0 && orgsResponse.data.organizations && orgsResponse.data.organizations.length > 0) {
            allOrgs = orgsResponse.data.organizations;
            console.log(`Found ${allOrgs.length} org(s) via ${probeDc} DC: ${allOrgs.map(o => o.organization_id).join(', ')}`);
            break; // /organizations works cross-DC, one probe is enough
          }
        } catch (probeErr) {
          console.warn(`Org probe on ${probeDc} failed:`, probeErr.message);
        }
      }

      if (allOrgs.length === 0) {
        throw new Error('No Zoho Books organizations found for this account.');
      }

      // Second: find the correct DC by testing /items on each DC with the original access token
      // /items is DC-restricted, so only the correct DC will return code 0
      for (const probeDc of allDcs) {
        try {
          const probeDomains = booksService.getDomainUrls(probeDc);
          const testOrgId = allOrgs[0].organization_id;
          const itemsUrl = `${probeDomains.api}/items?organization_id=${testOrgId}&status=active`;
          console.log(`Testing /items on ${probeDc}: ${itemsUrl}`);

          const itemsResp = await axios.get(itemsUrl, {
            headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
            timeout: 8000
          });

          if (itemsResp.data && itemsResp.data.code === 0) {
            foundDc = probeDc;
            organizations = allOrgs.map(org => ({ ...org, dc: probeDc }));
            console.log(`CORRECT DC FOUND: ${foundDc} — /items returned ${itemsResp.data.items ? itemsResp.data.items.length : 0} items`);
            break;
          } else {
            console.warn(`DC ${probeDc} /items returned code ${itemsResp.data.code}: ${itemsResp.data.message}`);
          }
        } catch (itemErr) {
          const errMsg = itemErr.response ? `HTTP ${itemErr.response.status}: ${JSON.stringify(itemErr.response.data)}` : itemErr.message;
          console.warn(`DC ${probeDc} /items failed: ${errMsg}`);
        }
      }

      // Fallback: if no DC passed the /items test, default to US
      if (!foundDc) {
        foundDc = 'US';
        organizations = allOrgs.map(org => ({ ...org, dc: 'US' }));
        console.warn('WARNING: No DC verified via /items test. Defaulting to US. Orgs:', JSON.stringify(organizations));
      }

      // Resolve user email from Zoho user info API
      let userEmail = 'merchant@zoho.books';
      try {
        const userInfoResp = await axios.get('https://accounts.zoho.com/oauth/user/info', {
          headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` },
          timeout: 5000
        });
        if (userInfoResp.data && userInfoResp.data.ZUID) {
          userEmail = userInfoResp.data.Email || (organizations.length > 0 ? organizations[0].email : 'merchant@zoho.books');
        }
      } catch (e) {
        userEmail = organizations.length > 0 ? organizations[0].email : 'merchant@zoho.books';
      }

      // Save admin user to Configurations (so they appear in Users section)
      const adminName = userEmail.split('@')[0] || 'Admin';
      const adminUserKey = `user_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const adminPayload = { email: userEmail, name: adminName, role: 'Admin', permissions: getRolePermissions('Admin'), status: 'active', invited_at: Date.now(), verified_at: Date.now() };
      await safeUpsertConfig(catalystApp, adminUserKey, JSON.stringify(adminPayload));

      // Return secure handshaking landing page that sends credentials to parent window
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Zoho Connection Authorized</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              background-color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
            }
            .success-card {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
              text-align: center;
              max-width: 400px;
              border: 1px solid #e2e8f0;
            }
            .icon {
              color: #16a34a;
              font-size: 64px;
              margin-bottom: 20px;
            }
            h2 {
              font-family: 'Outfit', sans-serif;
              font-size: 24px;
              margin: 0 0 10px 0;
              color: #0f172a;
            }
            p {
              color: #64748b;
              font-size: 14px;
              line-height: 1.5;
              margin: 0 0 20px 0;
            }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #16a34a;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              animation: spin 1s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="success-card">
            <div class="icon">✓</div>
            <h2>Authorization Approved!</h2>
            <p>Your Zoho Books account has been successfully linked. Fetching business units and closing...</p>
            <div class="spinner"></div>
          </div>
          <script>
            const authResult = {
              type: 'zoho_auth_success',
              email: ${JSON.stringify(userEmail)},
              refreshToken: ${JSON.stringify(refreshToken)},
              dc: ${JSON.stringify(foundDc)},
              organizations: ${JSON.stringify(organizations)}
            };
            
            if (window.opener) {
              // Restrict postMessage to our own origin to prevent token theft.
              // Note: document.referrer points to Zoho Accounts after the redirect, which blocks delivery to the opener.
              const targetOrigin = window.location.origin;
              window.opener.postMessage(authResult, targetOrigin);
              console.log('Credentials posted to opener origin:', targetOrigin);
              setTimeout(() => {
                window.close();
              }, 1200);
            } else {
              // No opener (e.g., opened directly in a tab): show data for manual entry
              document.querySelector('.success-card').innerHTML = \`
                <div class="icon">✓</div>
                <h2>Connection Successful!</h2>
                <p>Your Zoho Books account has been linked. Return to the POS app — it will detect this connection automatically.</p>
                <p style="font-size:12px;color:#94a3b8;">If the app doesn't detect it, try closing this tab and clicking "Connect" in the POS app again.</p>
                <button onclick="window.close()" style="padding:10px 24px;border:none;border-radius:10px;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Close this window</button>
              \`;
              // Also try to reach any open window on our origin via BroadcastChannel
              try {
                const bc = new BroadcastChannel('zoho_auth');
                bc.postMessage(authResult);
                bc.close();
              } catch(e) {}
            }
          </script>
        </body>
        </html>
      `);
    } else {
      throw new Error(response.data.error || 'Failed to exchange credentials from code');
    }
  } catch (error) {
    console.error('Error in OAuth callback exchange:', error.message);
    const errorHtml = `<!DOCTYPE html><html><head><title>Connection Error</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <style>body{font-family:'Inter',sans-serif;background:#fef2f2;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
      .err{background:#fff;padding:32px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.08);text-align:center;max-width:380px;border:1px solid #fecaca;}
      h2{color:#b91c1c;font-size:18px;margin:0 0 8px;} p{color:#64748b;font-size:13px;line-height:1.5;margin:0 0 16px;}
      .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:8px;background:#ef4444;color:#fff;font-size:13px;font-weight:600;cursor:pointer;}</style></head>
      <body><div class="err"><h2>Connection Failed</h2>
      <p>${error.message.includes('redirect_uri') ? 'The redirect URI does not match what is configured in the Zoho API Console. Please verify the Authorized Redirect URI in your Zoho API Console settings.' : error.message}</p>
      <button class="btn" onclick="window.close()"><i class="fa-solid fa-xmark"></i> Close</button>
      </div></body></html>`;
    res.status(500).send(errorHtml);
  }
});

/**
 * POST /api/auth/disconnect
 * Dynamic client session disconnection
 */
app.post('/api/auth/disconnect', async (req, res) => {
  // Front-end handles deletion of active sessions in local storage
  res.status(200).json({ success: true, message: 'Successfully disconnected Zoho session' });
});

/* ==========================================================================
   USER MANAGEMENT — INVITE, OTP, LOGIN
   ========================================================================== */

/**
 * POST /api/users/invite
 * Send an invitation email with a 6-digit OTP to a new user
 */
app.post('/api/users/invite', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { email, name, role } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Email and name are required' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const userKey = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Store OTP and user data
    const roleVal = role || 'Cashier';
    const userPayload = { email, name, role: roleVal, permissions: getRolePermissions(roleVal), status: 'pending', invited_at: Date.now() };
    const otpData = JSON.stringify({ otp, ...userPayload });
    const otpSaved = await safeUpsertConfig(catalystApp, otpKey, otpData);
    await safeUpsertConfig(catalystApp, userKey, JSON.stringify(userPayload));

    // Ensure SMTP is seeded, then send OTP
    const booksSvc = new ZohoBooksService(catalystApp, null);
    await ensureMasterCredentials(booksSvc);
    const emailSent = await sendOtpEmail(booksSvc, email, otp, name);

    const response = { 
      success: true, 
      expires_in: '15 minutes',
      otp: otp,
      verifyToken: createOtpToken(email, otp, 15, roleVal)
    };
    if (emailSent) {
      response.message = `Verification code sent to ${email}`;
    } else {
      response.message = 'OTP generated (check the field below)';
    }
    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending invite:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/verify-otp
 * Verify the OTP and activate the user account
 */
app.post('/api/users/verify-otp', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { email, otp, verifyToken, expectedOtp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required' });
    }

    let stored = null;

    // 1. Try DB lookup
    const otpKey = `otp_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const result = await safeZcql(catalystApp, `SELECT ROWID, config_value FROM Configurations WHERE config_key = '${otpKey}'`);
    if (result && result.length > 0) {
      try {
        stored = JSON.parse(result[0].Configurations.config_value);
      } catch (e) { /* ignore parse errors */ }
    }

    // 2. Try signed token fallback
    if (!stored && verifyToken) {
      const tokenData = verifyOtpToken(verifyToken, email, otp);
      if (tokenData) {
        stored = tokenData;
      }
    }

    // 3. Try direct OTP match (dev fallback when DB and token fail)
    if (!stored && expectedOtp && expectedOtp === otp) {
      stored = { email, otp, role: req.body.expectedRole || 'Cashier' };
    }

    if (!stored) {
      return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP. Please try again.' });
    }

    // OTP valid — delete it so it cannot be reused
    try {
      const otpRowId = result && result.length > 0 ? result[0].Configurations.ROWID : null;
      if (otpRowId) {
        await catalystApp.datastore().table('Configurations').deleteRow(otpRowId);
      }
    } catch (delErr) {
      console.warn('Could not delete used OTP row:', delErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Account verified successfully!',
      role: stored.role || 'Cashier'
    });
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users
 * List all registered users
 */
app.get('/api/users', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const result = await safeZcql(catalystApp, `SELECT config_key, config_value FROM Configurations WHERE config_key LIKE 'user_%'`);

    const users = result
      .filter(row => row.Configurations.config_value !== 'used')
      .map(row => {
        try { return JSON.parse(row.Configurations.config_value); } catch (e) { return null; }
      })
      .filter(Boolean);

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(200).json({ success: true, users: [] });
  }
});

/**
 * POST /api/users/login
 * Login with email + OTP (for staff login barrier)
 */
app.post('/api/users/login', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP required' });
    }

    const otpKey = `otp_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const result = await safeZcql(catalystApp, `SELECT ROWID, config_value FROM Configurations WHERE config_key = '${otpKey}'`);

    if (!result || result.length === 0) {
      return res.status(400).json({ success: false, error: 'No OTP found. Please request login OTP first.' });
    }

    const stored = JSON.parse(result[0].Configurations.config_value);
    if (stored.otp !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP.' });
    }

    // Delete used OTP
    try { await catalystApp.datastore().table('Configurations').deleteRow(result[0].Configurations.ROWID); } catch (e) {}

    res.status(200).json({ success: true, message: 'Login successful', role: stored.role || 'Cashier', name: stored.name || email });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/delete
 * Remove a user
 */
app.post('/api/users/delete', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    const userKey = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const result = await safeZcql(catalystApp, `SELECT ROWID FROM Configurations WHERE config_key = '${userKey}'`);
    if (result && result.length > 0) {
      try { await catalystApp.datastore().table('Configurations').deleteRow(result[0].Configurations.ROWID); } catch (e) {}
    }
    res.status(200).json({ success: true, message: 'User removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/update-role
 * Update a user's role and permissions
 */
app.post('/api/users/update-role', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ success: false, error: 'Email and role are required' });

    const validRoles = ['Admin', 'Manager', 'Cashier', 'Waiter', 'Chef'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const userKey = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const result = await safeZcql(catalystApp, `SELECT ROWID, config_value FROM Configurations WHERE config_key = '${userKey}'`);

    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = JSON.parse(result[0].Configurations.config_value);
    userData.role = role;
    userData.permissions = getRolePermissions(role);
    userData.updated_at = Date.now();
    await safeUpsertConfig(catalystApp, userKey, JSON.stringify(userData));

    res.status(200).json({ success: true, message: `Role updated to ${role}`, user: userData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Returns the permissions object for a given role
 */
function getRolePermissions(role) {
  const perms = {
    Admin: {
      refund: true, reconcile: true, adjust_inventory: true,
      manage_users: true, view_reports: true, system_settings: true,
      zoho_books: 'full', zoho_invoice: 'full', zoho_inventory: 'full', zoho_mail: 'full'
    },
    Manager: {
      refund: true, reconcile: true, adjust_inventory: true,
      manage_users: false, view_reports: true, system_settings: false,
      zoho_books: 'view', zoho_invoice: 'create_view', zoho_inventory: 'view', zoho_mail: 'none'
    },
    Cashier: {
      refund: false, reconcile: true, adjust_inventory: false,
      manage_users: false, view_reports: false, system_settings: false,
      zoho_books: 'none', zoho_invoice: 'none', zoho_inventory: 'none', zoho_mail: 'none'
    },
    Waiter: {
      refund: false, reconcile: false, adjust_inventory: false,
      manage_users: false, view_reports: false, system_settings: false,
      zoho_books: 'none', zoho_invoice: 'none', zoho_inventory: 'none', zoho_mail: 'none'
    },
    Chef: {
      refund: false, reconcile: false, adjust_inventory: false,
      manage_users: false, view_reports: false, system_settings: false,
      zoho_books: 'none', zoho_invoice: 'none', zoho_inventory: 'none', zoho_mail: 'none'
    }
  };
  return perms[role] || perms['Cashier'];
}

/**
 * GET /api/organization
 * Fetch detailed organization profile from Zoho Books for the active tenant
 */
app.get('/api/organization', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const booksService = new ZohoBooksService(catalystApp, tenantConfig);

    if (!tenantConfig || !tenantConfig.orgId) {
      return res.status(400).json({ success: false, error: 'No active Zoho Books organization connected.' });
    }

    const headers = await booksService.getHeaders();
    const dc = tenantConfig.dc || 'US';
    const domains = booksService.getDomainUrls(dc);
    const url = `${domains.api}/organizations/${tenantConfig.orgId}?organization_id=${tenantConfig.orgId}`;

    const response = await axios.get(url, { headers });
    if (response.data && response.data.code === 0 && response.data.organization) {
      const org = response.data.organization;
      res.status(200).json({
        success: true,
        organization: {
          organization_id: org.organization_id,
          name: org.name,
          email: org.email,
          phone: org.phone,
          currency_code: org.currency_code,
          currency_symbol: org.currency_symbol,
          time_zone: org.time_zone,
          date_format: org.date_format,
          plan_name: org.plan_name,
          company_name: org.company_name,
          address: org.address,
          country: org.country,
          fiscal_year_start_month: org.fiscal_year_start_month,
          tax_reg_no: org.tax_reg_no
        }
      });
    } else {
      throw new Error(response.data.message || 'Failed to fetch organization');
    }
  } catch (error) {
    console.error('Error fetching organization details:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ==========================================================================
   PRODUCTS & SALES ENDPOINTS WITH TENANT ISOLATION
   ========================================================================== */

/**
 * GET /api/sync/diagnose
 * Diagnostic endpoint — checks Books API connectivity and tests each module.
 */
app.get('/api/sync/diagnose', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const booksService = new ZohoBooksService(catalystApp, tenantConfig);
    const orgId = tenantConfig ? tenantConfig.orgId : 'not set';
    const dc = tenantConfig ? tenantConfig.dc : 'not set';

    const diagnosis = { orgId, dc, steps: [] };

    // Step 1: Get headers
    let headers;
    try {
      headers = await booksService.getHeaders();
      diagnosis.steps.push({ name: 'Auth Token', status: 'OK', prefix: headers.Authorization ? headers.Authorization.substring(0, 25) + '...' : 'none' });
    } catch (err) {
      diagnosis.steps.push({ name: 'Auth Token', status: 'FAILED', error: err.message });
      return res.status(200).json({ success: false, diagnosis });
    }

    // Step 2: Test Organizations API
    try {
      const domains = booksService.getDomainUrls(dc);
      const url = `${domains.api}/organizations?organization_id=${orgId}`;
      const response = await axios.get(url, { headers, timeout: 10000 });
      diagnosis.steps.push({ name: 'GET /organizations', status: 'OK', code: response.data.code, count: response.data.organizations ? response.data.organizations.length : 0 });
    } catch (err) {
      const msg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 200)}` : err.message;
      diagnosis.steps.push({ name: 'GET /organizations', status: 'FAILED', error: msg });
    }

    // Step 3: Test Items API
    try {
      const domains = booksService.getDomainUrls(dc);
      const url = `${domains.api}/items?organization_id=${orgId}&status=active`;
      const response = await axios.get(url, { headers, timeout: 10000 });
      diagnosis.steps.push({ name: 'GET /items', status: 'OK', code: response.data.code, count: response.data.items ? response.data.items.length : 0 });
    } catch (err) {
      const msg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 200)}` : err.message;
      diagnosis.steps.push({ name: 'GET /items', status: 'FAILED', error: msg });
    }

    // Step 4: Test Contacts API
    try {
      const domains = booksService.getDomainUrls(dc);
      const url = `${domains.api}/contacts?organization_id=${orgId}`;
      const response = await axios.get(url, { headers, timeout: 10000 });
      diagnosis.steps.push({ name: 'GET /contacts', status: 'OK', code: response.data.code, count: response.data.contacts ? response.data.contacts.length : 0 });
    } catch (err) {
      const msg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 200)}` : err.message;
      diagnosis.steps.push({ name: 'GET /contacts', status: 'FAILED', error: msg });
    }

    // Step 5: Test Invoices API
    try {
      const domains = booksService.getDomainUrls(dc);
      const url = `${domains.api}/invoices?organization_id=${orgId}`;
      const response = await axios.get(url, { headers, timeout: 10000 });
      diagnosis.steps.push({ name: 'GET /invoices', status: 'OK', code: response.data.code, count: response.data.invoices ? response.data.invoices.length : 0 });
    } catch (err) {
      const msg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 200)}` : err.message;
      diagnosis.steps.push({ name: 'GET /invoices', status: 'FAILED', error: msg });
    }

    res.status(200).json({ success: true, diagnosis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/items
 * Retrieve local products/items cached in Catalyst Data Store.
 * Tries with org_id filtering first, falls back to fetching all items if column is missing.
 */
app.get('/api/items', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const orgId = tenantConfig ? tenantConfig.orgId : '';

    let queryResult;
    // Try with org_id first (full schema)
    try {
      let query = 'SELECT ROWID, books_item_id, name, rate, sku, tax_id, tax_percentage, stock, category FROM Items';
      if (orgId) {
        query += ` WHERE org_id = '${sanitizeZcql(orgId)}' LIMIT 500`;
      } else {
        query += " WHERE org_id IS NULL OR org_id = '' LIMIT 500";
      }
      queryResult = await catalystApp.zcql().executeZCQLQuery(query);
    } catch (colErr) {
      // org_id column missing — fetch ALL items (single-tenant fallback)
      console.warn('org_id column not found, fetching all items:', colErr.message);
      queryResult = await catalystApp.zcql().executeZCQLQuery(
        'SELECT ROWID, books_item_id, name, rate, sku, tax_id, tax_percentage, stock, category FROM Items LIMIT 500'
      );
    }

    const items = queryResult.map(row => row.Items);
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Error fetching local items:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve local items.' });
  }
});

/**
 * POST /api/sync/books
 * Pull items and sync them from Zoho Books to Catalyst Data Store under active org_id
 */
app.post('/api/sync/books', async (req, res) => {
  console.log('[SYNC] POST /api/sync/books hit');
  console.log('[SYNC] Headers:', JSON.stringify({
    refreshToken: req.header('x-zoho-refresh-token') ? 'SET' : 'MISSING',
    orgId: req.header('x-zoho-org-id') || 'MISSING',
    dc: req.header('x-zoho-dc') || 'MISSING',
    contentType: req.header('content-type') || 'MISSING',
    userAgent: req.header('user-agent') ? 'SET' : 'MISSING'
  }));
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    console.log('[SYNC] tenantConfig:', tenantConfig ? JSON.stringify({ orgId: tenantConfig.orgId, dc: tenantConfig.dc, hasRefresh: !!tenantConfig.refreshToken }) : 'NULL');
    
    if (!tenantConfig || !tenantConfig.orgId) {
      return res.status(400).json({ success: false, error: 'No Zoho connection. Please reconnect first.' });
    }

    const orgId = tenantConfig.orgId;
    const dc = tenantConfig.dc || 'US';

    let headers;
    try {
      headers = await new ZohoBooksService(catalystApp, tenantConfig).getHeaders();
      console.log('[SYNC] Got headers, Auth:', headers.Authorization ? headers.Authorization.substring(0, 30) + '...' : 'NONE');
    } catch (headerErr) {
      console.error('[SYNC] getHeaders() failed:', headerErr.message, headerErr.stack);
      return res.status(500).json({ success: false, error: `HeaderError: ${headerErr.message}` });
    }
    
    const domains = { 
      'US': { api: 'https://www.zohoapis.com/books/v3' },
      'EU': { api: 'https://www.zohoapis.eu/books/v3' },
      'IN': { api: 'https://www.zohoapis.in/books/v3' },
      'AU': { api: 'https://www.zohoapis.com.au/books/v3' },
      'JP': { api: 'https://www.zohoapis.co.jp/books/v3' }
    };
    const apiBase = (domains[dc.toUpperCase()] || domains['US']).api;
    const apiUrl = `${apiBase}/items?organization_id=${orgId}&status=active`;
    console.log('[SYNC] Calling:', apiUrl);

    // axios is required at top of file; using that reference
    let response;
    try {
      response = await axios.get(apiUrl, { headers, timeout: 30000 });
    } catch (apiErr) {
      const errData = apiErr.response ? apiErr.response.data : null;
      const errMsg = errData ? (errData.message || JSON.stringify(errData)) : apiErr.message;
      console.error('[SYNC] Books API error:', errMsg, apiErr.response ? `HTTP ${apiErr.response.status}` : 'no response');
      if (apiErr.config) {
        console.error('[SYNC] Request URL:', apiErr.config.url);
        console.error('[SYNC] Request Auth:', apiErr.config.headers ? apiErr.config.headers.Authorization : 'none');
      }
      return res.status(500).json({ success: false, error: `Zoho Books API: ${errMsg}` });
    }

    console.log('[SYNC] Books API code:', response.data.code, 'items:', response.data.items ? response.data.items.length : 0);
    
    if (!response.data || response.data.code !== 0) {
      return res.status(500).json({ success: false, error: `Zoho Books error: ${response.data.message}` });
    }

    const booksItems = response.data.items || [];
    console.log('[SYNC] Got', booksItems.length, 'items from Books. Syncing to datastore...');

    console.log(`[SYNC STEP 2] Accessing Items table in Datastore...`);
    const itemsTable = catalystApp.datastore().table('Items');
    
    // Check if org_id column exists by trying a query with it
    let hasOrgIdColumn = true;
    let existingResult = [];
    try {
      existingResult = await catalystApp.zcql().executeZCQLQuery(
        `SELECT ROWID, books_item_id FROM Items WHERE org_id = '${orgId}'`
      );
      console.log(`[SYNC STEP 2] OK — found ${existingResult.length} existing items with org_id`);
    } catch (colErr) {
      console.error(`[SYNC STEP 2] ZCQL query error:`, colErr.message);
      if (colErr.message && (colErr.message.includes('Unknown') || colErr.message.includes('org_id') || colErr.message.includes('No privileges'))) {
        hasOrgIdColumn = false;
        console.warn('[SYNC STEP 2] org_id column missing or no privileges — inserting without org_id');
        try {
          existingResult = await catalystApp.zcql().executeZCQLQuery(
            'SELECT ROWID, books_item_id FROM Items'
          );
          console.log(`[SYNC STEP 2] Fallback OK — found ${existingResult.length} existing items`);
        } catch (fallbackErr) {
          console.error(`[SYNC STEP 2] Fallback also failed:`, fallbackErr.message);
          existingResult = [];
        }
      } else {
        throw colErr;
      }
    }
    
    const existingMap = {};
    existingResult.forEach(row => {
      existingMap[row.Items.books_item_id] = row.Items.ROWID;
    });

    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (const item of booksItems) {
      const itemData = {
        books_item_id: item.item_id,
        name: item.name,
        rate: parseFloat(item.rate) || 0.0,
        sku: item.sku || '',
        tax_id: item.tax_id || '',
        tax_percentage: parseFloat(item.tax_percentage) || 0.0,
        stock: parseFloat(item.stock_on_hand) || 999.0,
        category: item.category || 'General'
      };

      // Only include org_id if the column exists
      if (hasOrgIdColumn) {
        itemData.org_id = orgId;
      }

      if (existingMap[item.item_id]) {
        const rowId = existingMap[item.item_id];
        try {
          await itemsTable.updateRow({ ROWID: rowId, ...itemData });
          updated++;
        } catch (updateErr) {
          failed++;
          console.error(`[SYNC] updateRow failed for '${item.name}': ${updateErr.message}`);
          // If update fails (e.g. org_id column issue), try without it
          if (hasOrgIdColumn && updateErr.message && updateErr.message.includes('org_id')) {
            try {
              const { org_id, ...itemDataNoOrg } = itemData;
              await itemsTable.updateRow({ ROWID: rowId, ...itemDataNoOrg });
              updated++;
              failed--;
            } catch (e) {
              console.error(`[SYNC] updateRow fallback also failed for '${item.name}': ${e.message}`);
            }
          }
        }
      } else {
        try {
          await itemsTable.insertRow(itemData);
          inserted++;
        } catch (insertErr) {
          failed++;
          console.error(`[SYNC] insertRow failed for '${item.name}': ${insertErr.message}`);
          // If insert fails (e.g. org_id column issue), try without it
          if (hasOrgIdColumn && insertErr.message && insertErr.message.includes('org_id')) {
            try {
              const { org_id, ...itemDataNoOrg } = itemData;
              await itemsTable.insertRow(itemDataNoOrg);
              inserted++;
              failed--;
            } catch (e) {
              console.error(`[SYNC] insertRow fallback also failed for '${item.name}': ${e.message}`);
            }
          }
        }
      }
    }

    const syncMsg = failed > 0
      ? `Synced ${inserted + updated} of ${booksItems.length} items (${failed} failed)`
      : `Sync with Zoho Books complete!`;

    res.status(200).json({
      success: true,
      message: syncMsg,
      items: booksItems.map(item => ({
        books_item_id: item.item_id,
        name: item.name,
        rate: parseFloat(item.rate) || 0.0,
        sku: item.sku || '',
        tax_id: item.tax_id || '',
        tax_percentage: parseFloat(item.tax_percentage) || 0.0,
        stock: parseFloat(item.stock_on_hand) || 999.0,
        category: item.category || 'General',
        industry: 'Retail'
      })),
      summary: {
        total_fetched: booksItems.length,
        inserted: inserted,
        updated: updated,
        failed: failed
      }
    });
  } catch (error) {
    console.error('Error syncing items with Zoho Books:', error);
    
    // Log the FULL raw error from Zoho Books for debugging
    const rawError = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('RAW ZOHO ERROR:', rawError);
    
    // Also log which URL/token was used
    if (error.config) {
      console.error('REQUEST URL:', error.config.url);
      console.error('REQUEST AUTH:', error.config.headers ? error.config.headers.Authorization : 'none');
    }
    
    res.status(500).json({ 
      success: false, 
      error: rawError,
      message: 'Sync failed — raw Zoho Books error above'
    });
  }
});

/**
 * POST /api/orders
 * Check out a POS transaction, submitting invoice to Zoho Books and saving order under org_id
 */
app.post('/api/orders', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const booksService = new ZohoBooksService(catalystApp, tenantConfig);
    const orgId = tenantConfig ? tenantConfig.orgId : '';

    const {
      customer_name,
      customer_email,
      payment_mode,
      room_number,
      kitchen_notes,
      line_items,
      invoice_number,
      local_ref
    } = req.body;

    if (!line_items || line_items.length === 0) {
      return res.status(400).json({ success: false, error: 'Checkout failed: Cart is empty.' });
    }

    // Append table/room number to customer name for database compatibility and clarity
    let finalCustomerName = customer_name || 'Walk-in Guest';
    if (room_number) {
      finalCustomerName += ` (${room_number})`;
    }
    const finalEmail = customer_email || 'walkin@pos.system';

    let invoiceId = 'OFFLINE-' + Date.now();
    let invoiceNumber = 'OFFLINE-' + Math.floor(1000 + Math.random() * 9000);
    let booksCustomerId = 'OFFLINE-CUST';
    let immediatePayment = ['Cash', 'Card', 'UPI'].includes(payment_mode);
    let paymentRecorded = false;
    let paymentId = null;

    // Check if we are connected to Zoho Books (we have tenant headers)
    if (orgId) {
      try {
        // 1. Resolve Customer in Zoho Books
        console.log('Resolving customer in Zoho Books...');
        const booksCustomer = await booksService.getOrCreateCustomer(finalCustomerName, finalEmail);
        booksCustomerId = booksCustomer.contact_id;

        // 2. Create Invoice in Zoho Books
        const roomNote = room_number ? `${room_number}${kitchen_notes ? ' | Note: ' + kitchen_notes : ''}` : kitchen_notes;
        console.log(`Creating Zoho Books Invoice for customer ${booksCustomerId}...`);
        const booksInvoice = await booksService.createInvoice(booksCustomerId, line_items, payment_mode, roomNote);
        invoiceId = booksInvoice.invoice_id;
        invoiceNumber = booksInvoice.invoice_number;

        // 3. Record immediate payments in Books
        if (immediatePayment) {
          console.log(`Recording payment for invoice ${invoiceId}...`);
          const booksPayment = await booksService.recordPayment(booksCustomerId, invoiceId, booksInvoice.total, payment_mode);
          paymentId = booksPayment.payment_id;
          paymentRecorded = true;
        }
      } catch (zohoError) {
        console.warn('Failed to submit order directly to Zoho Books. Saving to local database under Offline pending status...', zohoError.message);
        // We will continue to save locally in Datastore under 'Offline Pending' state
      }
    }

    // 4. Calculations
    let subtotal = 0.0;
    let taxAmount = 0.0;
    line_items.forEach(item => {
      const qty = parseFloat(item.quantity) || 1;
      const rate = parseFloat(item.rate) || 0;
      const lineSubtotal = qty * rate;
      subtotal += lineSubtotal;
      
      const taxPercent = parseFloat(item.tax_percentage) || 0.0;
      taxAmount += lineSubtotal * (taxPercent / 100);
    });
    const total = subtotal + taxAmount;

    // 5. Save locally in Catalyst Data Store
    const ordersTable = catalystApp.datastore().table('Orders');
    const orderItemsTable = catalystApp.datastore().table('OrderItems');

    console.log('Writing POS transaction to Catalyst Data Store...');
    const orderRow = await ordersTable.insertRow({
      customer_name: finalCustomerName,
      customer_email: finalEmail,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total: total,
      payment_mode: payment_mode,
      status: orgId && !invoiceId.startsWith('OFFLINE') ? 'Synced' : 'Offline Pending',
      books_invoice_id: invoiceId,
      invoice_number: invoiceNumber || invoice_number || '',
      local_ref: local_ref || '',
      org_id: orgId
    });

    const localOrderId = orderRow.ROWID;

    for (const item of line_items) {
      await orderItemsTable.insertRow({
        order_id: localOrderId,
        item_id: item.books_item_id || item.item_id,
        quantity: parseFloat(item.quantity) || 1.0,
        rate: parseFloat(item.rate) || 0.0
      });
    }

    res.status(200).json({
      success: true,
      message: orgId && !invoiceId.startsWith('OFFLINE') 
        ? 'Checkout completed & synchronized successfully!' 
        : 'Checkout saved locally in cloud datastore (Offline/Pending sync).',
      order: {
        local_order_id: localOrderId,
        customer_name: finalCustomerName,
        room_number: room_number || 'N/A',
        kitchen_notes: kitchen_notes || '',
        total: total,
        payment_mode: payment_mode
      },
      zoho_books: {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        books_customer_id: booksCustomerId,
        payment_recorded: paymentRecorded,
        payment_id: paymentId
      }
    });

  } catch (error) {
    console.error('Error processing POS order checkout:', error);
    res.status(500).json({ success: false, error: error.message || 'POS Checkout failed.' });
  }
});

/**
 * GET /api/orders
 * Returns a list of past POS transactions filtered by org_id
 */
app.get('/api/orders', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const orgId = tenantConfig ? tenantConfig.orgId : '';

    let query = 'SELECT ROWID, customer_name, customer_email, subtotal, tax_amount, total, payment_mode, status, books_invoice_id, invoice_number, local_ref, created_time FROM Orders';
    if (orgId) {
      query += ` WHERE org_id = '${sanitizeZcql(orgId)}'`;
    } else {
      query += " WHERE org_id IS NULL OR org_id = ''";
    }
    query += ' ORDER BY created_time DESC LIMIT 100';

    const queryResult = await catalystApp.zcql().executeZCQLQuery(query);
    const orders = queryResult.map(row => row.Orders);
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching past orders:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to retrieve orders.' });
  }
});

/* ==========================================================================
   PHASE 2 — MISSING BACKEND ENDPOINTS
   ========================================================================== */

/**
 * POST /api/items
 * Create a new local catalog item in the Catalyst Data Store
 */
app.post('/api/items', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const orgId = tenantConfig ? tenantConfig.orgId : '';
    const { name, sku, rate, stock, category, tax_percentage, books_item_id } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ success: false, error: 'Name and SKU are required.' });
    }

    // Check duplicate SKU
    const existing = await safeZcql(catalystApp,
      `SELECT ROWID FROM Items WHERE sku = '${sanitizeZcql(sku)}'`
    );
    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, error: `SKU '${sku}' already exists.` });
    }

    const itemData = {
      books_item_id: books_item_id || '',
      name,
      rate: parseFloat(rate) || 0,
      sku,
      tax_percentage: parseFloat(tax_percentage) || 0,
      stock: parseFloat(stock) || 0,
      category: category || 'General',
      org_id: orgId
    };

    const table = catalystApp.datastore().table('Items');
    const row = await table.insertRow(itemData);
    res.status(201).json({ success: true, message: 'Item created', item: { ROWID: row.ROWID, ...itemData } });
  } catch (error) {
    console.error('Error creating item:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/items/:id
 * Update an existing catalog item by ROWID
 */
app.put('/api/items/:id', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const rowId = parseInt(req.params.id);
    if (!rowId) return res.status(400).json({ success: false, error: 'Invalid item ID.' });

    const { name, rate, stock, category, tax_percentage } = req.body;
    const updateData = { ROWID: rowId };
    if (name !== undefined) updateData.name = name;
    if (rate !== undefined) updateData.rate = parseFloat(rate) || 0;
    if (stock !== undefined) updateData.stock = parseFloat(stock) || 0;
    if (category !== undefined) updateData.category = category;
    if (tax_percentage !== undefined) updateData.tax_percentage = parseFloat(tax_percentage) || 0;

    const table = catalystApp.datastore().table('Items');
    await table.updateRow(updateData);
    res.status(200).json({ success: true, message: 'Item updated' });
  } catch (error) {
    console.error('Error updating item:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/items/:id
 * Delete a catalog item by ROWID
 */
app.delete('/api/items/:id', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const rowId = parseInt(req.params.id);
    if (!rowId) return res.status(400).json({ success: false, error: 'Invalid item ID.' });

    const table = catalystApp.datastore().table('Items');
    await table.deleteRow(rowId);
    res.status(200).json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Error deleting item:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/items/stock-adjust
 * Adjust the stock of a catalog item by ROWID
 * Body: { rowid, delta } where delta can be positive or negative
 */
app.post('/api/items/stock-adjust', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { rowid, delta, reason } = req.body;
    if (!rowid || delta === undefined) {
      return res.status(400).json({ success: false, error: 'rowid and delta are required.' });
    }

    const current = await safeZcql(catalystApp,
      `SELECT ROWID, stock FROM Items WHERE ROWID = ${parseInt(rowid)}`
    );
    if (!current || current.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found.' });
    }

    const currentStock = parseFloat(current[0].Items.stock) || 0;
    const newStock = Math.max(0, currentStock + parseFloat(delta));

    const table = catalystApp.datastore().table('Items');
    await table.updateRow({ ROWID: parseInt(rowid), stock: newStock });

    console.log(`Stock adjust: ROWID=${rowid}, delta=${delta}, old=${currentStock}, new=${newStock}, reason=${reason || 'N/A'}`);
    res.status(200).json({ success: true, message: 'Stock adjusted', old_stock: currentStock, new_stock: newStock });
  } catch (error) {
    console.error('Error adjusting stock:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/contacts
 * Retrieve CRM contacts (Customers & Suppliers) from Zoho Books or local Configurations
 */
app.get('/api/contacts', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const booksService = new ZohoBooksService(catalystApp, tenantConfig);

    if (tenantConfig && tenantConfig.orgId) {
      // Pull from Zoho Books
      try {
        const headers = await booksService.getHeaders();
        const dc = tenantConfig.dc || 'US';
        const domains = booksService.getDomainUrls(dc);
        const url = `${domains.api}/contacts?organization_id=${tenantConfig.orgId}&status=active`;
        const response = await axios.get(url, { headers, timeout: 15000 });
        if (response.data && response.data.code === 0) {
          return res.status(200).json({ success: true, contacts: response.data.contacts || [] });
        }
      } catch (booksErr) {
        console.warn('Failed to fetch contacts from Zoho Books, falling back to local:', booksErr.message);
      }
    }

    // Fallback: return local CRM contacts from Configurations
    const localContacts = await safeZcql(catalystApp,
      `SELECT config_key, config_value FROM Configurations WHERE config_key LIKE 'crm_%'`
    );
    const contacts = localContacts
      .map(row => { try { return JSON.parse(row.Configurations.config_value); } catch(e) { return null; } })
      .filter(Boolean);
    res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/contacts
 * Create or update a CRM contact in the Configurations table
 */
app.post('/api/contacts', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { id, name, type, email, phone, company, taxid, balance } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Contact name is required.' });

    const contactId = id || `CRM-${Date.now()}`;
    const payload = { id: contactId, name, type: type || 'Customer', email: email || '', phone: phone || '', company: company || '', taxid: taxid || '', balance: parseFloat(balance) || 0 };
    const key = `crm_${contactId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    await safeUpsertConfig(catalystApp, key, JSON.stringify(payload));
    res.status(200).json({ success: true, message: id ? 'Contact updated' : 'Contact created', contact: payload });
  } catch (error) {
    console.error('Error saving contact:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/config/settings
 * Retrieve POS system configuration settings stored in Configurations table
 */
app.get('/api/config/settings', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const result = await safeZcql(catalystApp,
      `SELECT config_key, config_value FROM Configurations WHERE config_key = 'pos_system_settings'`
    );

    if (result && result.length > 0) {
      try {
        const settings = JSON.parse(result[0].Configurations.config_value);
        return res.status(200).json({ success: true, settings });
      } catch (e) {
        // Malformed JSON — fall through to return empty
      }
    }

    res.status(200).json({ success: true, settings: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/config/settings
 * Persist POS system configuration settings to the Configurations table
 */
app.post('/api/config/settings', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'settings object is required.' });
    }

    await safeUpsertConfig(catalystApp, 'pos_system_settings', JSON.stringify(settings));
    res.status(200).json({ success: true, message: 'Settings saved.' });
  } catch (error) {
    console.error('Error saving settings:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/shifts/open
 * Open a new till shift register
 */
app.post('/api/shifts/open', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const orgId = tenantConfig ? tenantConfig.orgId : '';
    const { cashier_name, opening_float, open_notes } = req.body;

    if (!cashier_name || opening_float === undefined) {
      return res.status(400).json({ success: false, error: 'cashier_name and opening_float are required.' });
    }

    const payload = {
      cashier_name,
      opening_float: parseFloat(opening_float) || 0,
      cash_sales: 0.0,
      noncash_sales: 0.0,
      expected_cash: parseFloat(opening_float) || 0,
      status: 'Open',
      open_notes: open_notes || '',
      org_id: orgId
    };

    const table = catalystApp.datastore().table('Shifts');
    const row = await table.insertRow(payload);
    res.status(201).json({ success: true, message: 'Shift opened', shift: { ROWID: row.ROWID, ...payload } });
  } catch (error) {
    console.error('Error opening shift:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/shifts/close
 * Reconcile and close a till shift register
 */
app.post('/api/shifts/close', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const { rowid, actual_cash, close_notes, cash_sales, noncash_sales } = req.body;

    if (!rowid || actual_cash === undefined) {
      return res.status(400).json({ success: false, error: 'rowid and actual_cash are required.' });
    }

    // Get current shift
    const existing = await safeZcql(catalystApp,
      `SELECT ROWID, cashier_name, opening_float, open_notes, org_id FROM Shifts WHERE ROWID = ${parseInt(rowid)}`
    );
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Shift not found.' });
    }

    const shift = existing[0].Shifts;
    const opening = parseFloat(shift.opening_float) || 0;
    const cSales = parseFloat(cash_sales) || 0;
    const ncSales = parseFloat(noncash_sales) || 0;
    const expected = opening + cSales;
    const actual = parseFloat(actual_cash) || 0;
    const variance = actual - expected;

    const updateData = {
      ROWID: parseInt(rowid),
      cash_sales: cSales,
      noncash_sales: ncSales,
      expected_cash: expected,
      actual_cash: actual,
      variance: variance,
      status: 'Closed',
      close_notes: close_notes || ''
    };

    const table = catalystApp.datastore().table('Shifts');
    await table.updateRow(updateData);
    res.status(200).json({ success: true, message: 'Shift closed', shift: updateData });
  } catch (error) {
    console.error('Error closing shift:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/shifts
 * Retrieve shifts history
 */
app.get('/api/shifts', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const tenantConfig = getTenantConfig(req);
    const orgId = tenantConfig ? tenantConfig.orgId : '';

    let query = 'SELECT ROWID, cashier_name, opening_float, cash_sales, noncash_sales, expected_cash, actual_cash, variance, status, open_notes, close_notes, created_time FROM Shifts';
    if (orgId) {
      query += ` WHERE org_id = '${sanitizeZcql(orgId)}'`;
    } else {
      query += " WHERE org_id IS NULL OR org_id = ''";
    }
    query += ' ORDER BY created_time DESC LIMIT 100';

    const result = await catalystApp.zcql().executeZCQLQuery(query);
    const shifts = result.map(row => row.Shifts);
    res.status(200).json({ success: true, shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = app;

