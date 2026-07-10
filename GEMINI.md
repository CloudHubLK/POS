# Aether POS  Build Brief (for Gemini CLI)

> Drop this file in your project root  Gemini CLI auto-loads any `GEMINI.md` it finds  or paste it as your first message in an interactive session. Written for `gemini-3.5-flash` with `thinking_level: high`. If the agent stalls trying to do everything in one pass, point it at one phase from Section 10 at a time instead of the whole brief.

## 0. Assumptions Made While Writing This Brief

Your source material didn't spell out everything, so judgment calls were made. Check these before running this:

1. **Product name**  used **"Aether POS"** (from the `aether_pos` name in your API Gateway). Your material also shows "CloudPOS" as the mail sender name and just "POS" as the Catalyst project name. Pick one and find/replace.
2. **Frontend framework**  not specified anywhere (Web Client Hosting just serves static files). React + Vite + Tailwind is specified below as a sane default; swap freely.
3. **Path prefix**  the API Gateway screenshots show `/serve/pos_backend/...` but the OAuth redirect URL is given as plain text as `/server/pos_backend/...`. Standardized on **`/server/`** below, since that matches Zoho Catalyst's normal function-URL convention and the explicit callback text. Confirm against your live gateway config before relying on it.
4. **HTTP methods on `pos_backend`**  the gateway screenshot shows only `GET` configured. A GET-only route can't create orders or close shifts. Confirm/change this route to accept all methods (or "ANY") in the API Gateway config.
5. **Two extra tables plus several `org_id` columns**, flagged `[NEW]` below, aren't in your existing schema but are required for the multi-tenant onboarding flow described (unique org per signup, master admin, per-industry setup). Without them, every organization would share one global pool of items, orders, and settings.
6. **The existing `zohobooks_conn` Connection is not multi-tenant.** Its JSON shows `"isUserAccess": false`, and the console shows "credentials of login user? No"  it's tied to one Zoho Books account (the connection creator's), shared at the project level. If every customer organization needs its *own* Books data, a second, per-organization OAuth flow is needed  see Section 9.

---

## 1. Mission

You're joining an existing Zoho Catalyst project (**project name: `POS`**, baas org id **`914406080`**). Its infrastructure  Data Store tables, Authentication, API Gateway, a Zoho Books Connection, a verified mail domain, and environment variables  is **already provisioned in the Catalyst console** (inventoried in Section 2). The job is **not** to reconfigure that infrastructure; it's to **write the application on top of it**:

- The business logic inside the `pos_backend` Advanced I/O function (Node.js).
- The web client single-page app that Web Client Hosting serves at `/app/*`.
- Any `[NEW]`-tagged schema additions this app needs that don't exist yet.

Work through the phases in Section 10 in order. Check items off Section 11 as they're completed. Where an assumption not covered here is unavoidable, note it in a code comment and keep moving rather than stopping to ask.

---

## 2. What's Already Provisioned (Zoho Catalyst console)

### 2.1 Project
- Project name: `POS`, baas org id `914406080`, environment shown: Development.
- Base domain: `https://pos-914406080.development.catalystserverless.com`

### 2.2 Data Store  5 existing tables

Every Catalyst table auto-adds `ROWID` (bigint, primary key), `CREATORID` (bigint), `CREATEDTIME` (datetime), `MODIFIEDTIME` (datetime)  not repeated below; only custom columns are listed.

**Orders**
| Column | Type | Notes |
|---|---|---|
| customer_name | text | |
| customer_email | text | |
| subtotal | double | |
| tax_amount | double | |
| total | double | |
| payment_mode | text | e.g. `cash`, `card`, `wallet` |
| status | text | e.g. `open`, `completed`, `refunded`, `void` |
| books_invoice_id | text | populated after Zoho Books sync |
| invoice_number | text | Books' own invoice number, populated after sync |
| local_ref | text | your own human-readable order number, generated at creation time, independent of Books |

**OrderItems**
| Column | Type | Notes |
|---|---|---|
| order_id | text |  Orders.ROWID |
| item_id | text |  Items.ROWID |
| quantity | double | |
| rate | double | **snapshot the price here at sale time**  don't recompute from live Items later |

**Items**
| Column | Type | Notes |
|---|---|---|
| books_item_id | text | Zoho Books item id  sync key |
| name | text | |
| rate | double | |
| sku | text | |
| tax_id | text | |
| tax_percentage | double | |
| stock | double | |
| category | text | |

**Shifts**
| Column | Type | Notes |
|---|---|---|
| cashier_name | text | |
| opening_float | double | starting cash in the drawer |
| cash_sales | double | running total of cash payments during the shift |
| noncash_sales | double | running total of card/wallet payments during the shift |
| expected_cash | double | = opening_float + cash_sales |
| actual_cash | double | counted by the cashier at close |
| variance | double | = actual_cash  expected_cash |
| status | text | `open` / `closed` |
| open_notes | text | |
| close_notes | text | |
| org_id | text | *(already present here  the only table where it is!)* |

**Configurations**
| Column | Type | Notes |
|---|---|---|
| config_key | text | |
| config_value | text | |

Good place to store per-org settings once `org_id` is added (Section 3): `industry`, `receipt_template`, `default_tax_id`, `currency`, `timezone`, `books_sync_enabled`, `books_org_id`.

### 2.3 Authentication
- Native Catalyst Authentication: **enabled**, Public Signup: **on**.
- Social logins enabled: **Zoho, Google, Microsoft 365, LinkedIn, Facebook**.
- Hosted auth pages (default  use these first):
  - Login: `/__catalyst/auth/login`
  - Signup: `/__catalyst/auth/signup`
  - Reset password: `/__catalyst/auth/reset-password`
- An Embedded Authentication option also exists (v4 SDK, `catalyst.auth.signIn(elementId, config)`, with `css_url` / `service_url` / forgot-password overrides) for later, if the login form needs to sit inline on your own domain instead of redirecting to the catalystserverless.com hosted page. Start with hosted; treat embedded as a post-launch nicety.

### 2.4 API Gateway  3 routes
| Name | Method | Path | Target |
|---|---|---|---|
| Login Redirect (default) | GET | `/app/index.html` | Web Client Hosting  `/app/index.html` |
| aether_pos | GET | `/app/{path}(.*)` | Web Client Hosting  `/app/{path}` (serves the SPA + its assets/routes) |
| pos_backend | **confirm all methods, not just GET** | `/server/pos_backend/{path}(.*)` | Advanced I/O function `pos_backend`  `/server/pos_backend/{path}` |

All three currently show **"No authentication"** at the gateway layer. That's fine for the two static-hosting routes, but `pos_backend` carries every business operation  **the function itself must validate the caller's Catalyst session and enforce org membership on every request.** Don't rely on the gateway for this.

### 2.5 Zoho Books Connection (existing, single-tenant)
- Connection name: `zohobooks_conn`, service: Zoho Books, status: Connected.
- Scopes: `ZohoBooks.accountants.All`, `ZohoBooks.fullaccess.all`.
- Tied to the connection creator's own Zoho account at the project level, not per customer  see 0.6 and Section 9.

### 2.6 Mail & Domain
- A verified sender (display name matching your product, address on your own domain) is already confirmed.
- Domain `cloudpartners.biz` is email-verified and authenticated (DKIM/SPF)  usable for onboarding mail, receipts, and password resets.

### 2.7 Environment Variables (function: `pos_backend`)
| Key | Purpose |
|---|---|
| `ZOHO_CLIENT_ID` | OAuth client id for the Zoho API Console app (2.8) |
| `ZOHO_CLIENT_SECRET` | OAuth client secret  **rotate before use, see warning below** |
| `ZOHO_DC` | Zoho data-center suffix (`com`, `eu`, `in`, `com.au`, ) matching your account |
| `POS_OTP_SECRET` | HMAC signing key for one-time codes (manager overrides, cashier PIN, etc.) |
| `SMTP_USER` | verified sending mailbox |
| `SMTP_PASS` | mailbox app password  **rotate before use, see warning below** |

** Rotate before deploying anything real:** the source document this brief was built from contained live-looking values for `ZOHO_CLIENT_SECRET`, `POS_OTP_SECRET`, and `SMTP_PASS`. Treat any credential that's ever been pasted into a document, a chat, or another AI tool's context as compromised. Generate fresh values and set them directly in Catalyst's Environment Variables screen  never in code, comments, commits, or prompts (including this one).

### 2.8 Zoho API Console OAuth App
- Client name: `POS`
- Homepage URL: `https://pos-914406080.development.catalystserverless.com`
- Redirect URI: `https://pos-914406080.development.catalystserverless.com/server/pos_backend/api/auth/callback`

This app is for the **per-organization** Books OAuth flow in Section 9  separate from the single shared `zohobooks_conn` Connection in 2.5.

---

## 3. Schema Additions to Provision `[NEW]`

Add these in Data Store (console or CLI) before/while writing the code that depends on them:

**Organizations** `[NEW]`
| Column | Type | Notes |
|---|---|---|
| org_name | text | |
| industry | text | drives defaults  see 5.3 |
| master_admin_user_id | text | Catalyst user id of the creator |
| zoho_books_org_id | text | set once this org connects its own Books account |
| books_connected | text | quick status flag (`true`/`false`) |

**OrgUsers** `[NEW]`  staff roster + roles, since a POS has more than one login per org
| Column | Type | Notes |
|---|---|---|
| org_id | text | |
| user_id | text | Catalyst user id |
| role | text | `master_admin` / `manager` / `cashier` |
| display_name | text | |

**Add an `org_id` (text) column to:** `Orders`, `OrderItems` (or derive it via the `order_id` join  either works; a direct column is simpler for queries), `Items`, `Configurations`. Every one of these currently has no tenant boundary except Shifts.

---

## 4. Product Snapshot

- Working name: **Aether POS** (rename freely  see Section 0).
- One-liner: a fast-to-launch, multi-industry retail POS that keeps its books in sync with Zoho Books automatically.
- Target users: small-to-medium retail and service businesses across several verticals (see 5.3).
- The landing page should follow the layout rhythm in your reference material  hero headline, one-line description, dual CTA buttons, a different primary button once logged in  but with **original copy and branding**. The reference screenshots are Zoho's own live commercial product page; match the structure, not their wordmark or exact marketing lines. A few original tagline directions if useful: "Retail, unboxed." / "Ring up. Sync up. Scale up." / "Your counter's new brain."

---

## 5. Functional Spec

### 5.1 Landing Page
- Logged out: nav with Log In ( hosted login URL) and Sign Up Now; hero with headline/subhead; two CTAs  primary ("Get Started Free") and secondary ("Get a Demo").
- Logged in: same layout, but the primary CTA becomes "Access Aether POS" ( `/app/index.html`, which routes on to dashboard or onboarding per 5.3/5.4) and the secondary stays "Get a Demo".

### 5.2 Auth Entry
- Log In  redirect to the hosted sign-in page (2.3), email/password or any of the five social providers.
- Wire the hosted Sign Up and Reset Password pages too.

### 5.3 First-Run Onboarding (new user, no OrgUsers row yet)
Trigger: authenticated user with zero `OrgUsers` rows.
1. Generate a unique `org_id` (the Catalyst ROWID of the new Organizations row works fine as the id).
2. Insert an `Organizations` row; insert an `OrgUsers` row for this user with `role = master_admin`.
3. Ask for: business name, **industry** (single-select), currency, timezone.
4. Apply industry defaults: seed starter `Items.category` values and a default `Configurations` row set (`industry`, `receipt_template`, `default_tax_id`, `currency`, `timezone`) for this `org_id`. Suggested starter industries  keep this list extensible rather than a hardcoded permanent enum: Retail/General Store, Restaurant/Café/QSR, Grocery/Supermarket, Pharmacy, Salon/Spa & Services, Fashion/Apparel, Electronics, Convenience/Kiosk.
5. Redirect into the POS dashboard.

### 5.4 Returning User
Authenticated user with an existing `OrgUsers` row  skip onboarding, load their org's dashboard directly, role-gated per 5.8.

### 5.5 POS Terminal / Sale Flow
- Item grid/search (by `category`, `sku`, `name`), scoped to `org_id`.
- Cart: add/remove/adjust quantity; compute subtotal, tax (per `Items.tax_percentage`), total.
- Choose `payment_mode`; complete sale:
  - Insert an `Orders` row (`status = completed`, `local_ref` auto-generated, e.g. `ORD-000123`).
  - Insert one `OrderItems` row per line, **snapshotting** `rate` at sale time.
  - Decrement `Items.stock`.
  - Roll the sale into the open `Shifts` row: add to `cash_sales` or `noncash_sales` depending on `payment_mode`.
  - If this org has Books connected, push an invoice (Section 9) and write back `books_invoice_id` + `invoice_number`.
  - Email a receipt via Catalyst Mail (optional but nice, using the verified sender from 2.6).

### 5.6 Shift Management
- Open: cashier enters `opening_float` + `open_notes`  insert a `Shifts` row, `status = open`.
- During: every completed sale updates that shift's `cash_sales`/`noncash_sales` (5.5).
- Close: compute `expected_cash = opening_float + cash_sales`; cashier enters counted `actual_cash` + `close_notes`; compute `variance = actual_cash  expected_cash`; set `status = closed`. Consider requiring the OTP flow (5.8) for shift close or any negative-variance override.

### 5.7 Settings  Zoho Books Integration
- Status card: connected/disconnected, which Books org, last sync time.
- "Connect" kicks off the per-org OAuth flow (Section 9)  not the shared `zohobooks_conn`.
- "Sync Now" (manual), item pull, disconnect.

### 5.8 Roles & Permissions
- `master_admin`: everything, including Books integration and staff management.
- `manager`: reports, shift oversight, approving voids/discounts/refunds.
- `cashier`: terminal only; anything above a configurable threshold (void, discount %, refund) requires a `manager`/`master_admin` OTP approval  generate/verify via `POS_OTP_SECRET`, short TTL (e.g. 5 minutes), 6-digit code.

---

## 6. Backend  `pos_backend` (Advanced I/O, Node.js 20)

Route groups to implement under `/server/pos_backend/api/...`:
- `auth/callback`  Zoho Books per-org OAuth callback (Section 9).
- `orgs`  onboarding (create org + master admin + industry defaults), org profile read/update.
- `items`  CRUD, scoped to `org_id`; Books item pull.
- `orders`  create sale (the multi-step write in 5.5), list/read, refund/void.
- `shifts`  open/close, running totals, variance.
- `config`  get/set org `Configurations` key-values.
- `otp`  issue and verify one-time codes for manager overrides.

**On every route:** resolve the caller's Catalyst identity from the session, look up their `OrgUsers` row, and reject (403) if the request's `org_id` doesn't match theirs, or their `role` doesn't permit the action. Never trust an `org_id` sent from the client body or query alone.

---

## 7. Frontend  Web Client (served at `/app/*`)

Suggested stack: React 18 + Vite + Tailwind CSS, built to static assets, deployed via Catalyst Web Client Hosting (framework-agnostic  swap if preferred). Configure SPA fallback so client-side routes resolve to `index.html`.

Pages: `/` landing (5.1)  `/app` dashboard/router shell  onboarding wizard (5.3)  POS terminal (5.5)  shift open/close (5.6)  settings  integrations (5.7), org profile, staff & roles (5.8)  basic sales/shift reports.

Use the Catalyst Web SDK for session handling  it's what the hosted/embedded auth in 2.3 hands off to.

---

## 8. Non-Functional / Security Requirements
- Every business table scoped by `org_id`; every backend query filters by it.
- Snapshot price/tax on `OrderItems` at sale time (5.5)  never rely on a later join back to live `Items` pricing for historical orders.
- Rate-limit `auth/callback` and `otp` specifically  they're the auth-adjacent surface.
- No secret ever hardcoded  everything through Catalyst Environment Variables (2.7), rotated per the warning there.

---

## 9. Zoho Books Sync  Detail

Two different things are both "a Zoho Books connection" in the source material  keep them separate:

1. **`zohobooks_conn`** (existing Catalyst Connection, 2.5): one fixed set of credentials, shared at the project level (`"isUserAccess": false`). Fine for a demo/internal org, wrong for real customer data.
2. **Per-organization OAuth** (what you're building): each customer org clicks "Connect" in Settings (5.7)  redirected to Zoho's OAuth consent screen using `ZOHO_CLIENT_ID` (2.8)  user approves  Zoho redirects to `/server/pos_backend/api/auth/callback` with a `code`  the function exchanges it (with `ZOHO_CLIENT_SECRET`) for **that org's own** access/refresh tokens  store them encrypted against that `org_id` (in `Organizations` or a dedicated tokens table)  use those tokens, not the shared connection, for that org's sync calls.

**Sync directions:**
- *Books  POS (items):* pull the org's Books item catalog into `Items`, keyed by `books_item_id`.
- *POS  Books (invoices):* on sale completion (5.5), create an invoice in that org's Books account; write the returned invoice id/number back onto the `Orders` row (`books_invoice_id`, `invoice_number`).

---

## 10. Suggested Build Phases

1. `catalyst login`, then `catalyst init` in the project directory and select the existing `POS` project (id `914406080`)  don't create a new one, since the console-side setup already exists.
2. Provision the Section 3 schema additions.
3. Scaffold the `pos_backend` Advanced I/O function; confirm the gateway route accepts all HTTP methods, not just GET.
4. Build `orgs` onboarding end-to-end (5.3)  critical path; nothing else works without an `org_id`.
5. Build the POS terminal plus `orders`/`items` routes (5.5).
6. Build shift open/close plus `shifts` routes (5.6).
7. Build the per-org Zoho Books OAuth flow (Section 9) and item/invoice sync.
8. Build Settings: integration status, org profile, staff/roles (5.7, 5.8).
9. Wire Mail templates (receipts, onboarding, OTP fallback) against the verified sender (2.6).
10. Add the OTP flow for overrides (5.8).
11. Build the landing page with original branding (Section 4).
12. `catalyst serve` locally, test each flow, then `catalyst deploy`. CLI flags shift between versions  run `catalyst --help` / `catalyst deploy --help` to confirm current syntax before scripting this step.

---

## 11. Acceptance Criteria
- [ ] A new user signs up (email or social), creates an org, chooses an industry, and lands on a working dashboard in one pass.
- [ ] Returning staff go straight to their org's dashboard, gated by role.
- [ ] A completed sale writes Orders + OrderItems, decrements stock, and updates the open shift's totals.
- [ ] Shift close computes `variance` correctly.
- [ ] An org with Books connected gets a real invoice created, with `books_invoice_id`/`invoice_number` written back.
- [ ] Two different orgs never see each other's items, orders, or config  verified by attempting cross-access with a manipulated `org_id`.
- [ ] No credential appears anywhere except Catalyst's Environment Variables screen.
