# CloudHub POS — merged & ready to deploy

This is your repo with everything from our conversation already applied. Copy
this over your existing repo contents, commit, push, and deploy — no manual
file-merging required.

## What changed vs. your original repo

1. **`functions/pos_backend/index.js`**
   - `GET /api/auth/me` now auto-provisions a POS staff record (default role
     "Cashier") the first time a Catalyst-authenticated user is seen.
   - `/api/sync/books` no longer hardcodes `industry: 'Retail'` on synced
     items, which was hiding every synced product on any non-Retail template.

2. **`client/`** — this now contains the **built React app** (the compiled
   output of `client-src/`). This is what Catalyst actually deploys, per
   `catalyst.json`'s `"client": {"source": "client"}` — no config change needed.

3. **`client-src/`** — the new React + Vite + Tailwind + Framer Motion
   frontend source. This is what you edit going forward; `client/` is its
   build output, not source of truth.

4. **`client-legacy-reference/`** — your original vanilla JS client, kept
   only for reference/rollback. Safe to delete once you've confirmed the new
   frontend works in production. Not deployed (not referenced by `catalyst.json`).

## How to publish this

```bash
# From inside your existing local clone of CloudHubLK/POS:
git checkout -b react-rebuild

# Copy every folder from this download over your repo (overwriting client/,
# functions/pos_backend/index.js; adding client-src/, client-legacy-reference/)

git add -A
git commit -m "Fix Books sync + user auto-provisioning, rebuild frontend in React"
git push -u origin react-rebuild

# Open a PR, or merge to main directly if you're working solo
```

Then deploy as usual with the Catalyst CLI:

```bash
catalyst deploy
```

## If you change the frontend later

```bash
cd client-src
npm install
npm run dev     # local development, proxies /api to your Catalyst backend
npm run build   # outputs to client-src/dist

# then copy the fresh build into client/ before deploying:
rm -rf ../client && cp -r dist ../client
```

## Not yet ported to the new frontend

Shift open/close UI, staff invite/OTP screens, reports, and offline order
queueing existed in the old vanilla client and haven't been rebuilt yet in
React. See `client-src/README.md` for details — happy to build any of these
next.
