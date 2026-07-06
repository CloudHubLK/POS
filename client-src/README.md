# CloudHub POS — React frontend (v2)

A full rebuild of the POS client on React + Vite + Tailwind + Framer Motion.
The backend (`functions/pos_backend`) is untouched apart from the two bug fixes
already applied (`index.js` in the other download) — every API route and
request/response shape is identical, so this frontend is a drop-in replacement
for the old `client/` folder.

## What's here

- `src/api/client.js` — one wrapper per existing backend route, no new endpoints.
- `src/state/AppState.jsx` — shared app state (catalog, cart, connection, user),
  including the two datastore-first fixes: catalog is refreshed from
  `GET /api/items` (not just localStorage), and `GET /api/auth/me` is used to
  read back the auto-provisioned user.
- `src/pages/` — Dashboard, Register (the POS screen), Products, Customers,
  Orders, Settings (Zoho Books connect/disconnect).
- `src/components/ProductCard.jsx` — the signature interaction: a subtle 3D
  tilt toward the cursor, like picking an item up off a counter.
- `src/components/CartDrawer.jsx` — the order/receipt panel with drawer-style motion.

Design tokens (`tailwind.config.js`): charcoal counter surfaces, a brass accent
for actions/prices, mint for success/checkout, clay for danger/disconnect —
built around the idea of a physical register terminal rather than a generic
admin-panel look.

## Local development

```bash
npm install
npm run dev
```

By default `/api/*` calls are proxied to `http://localhost:3000` (wherever you
run `pos_backend` locally with the Catalyst CLI). Override with:

```bash
VITE_API_PROXY_TARGET=https://your-catalyst-dev-url npm run dev
```

## Building for Catalyst deployment

```bash
npm run build
```

This outputs a static bundle to `dist/`. Point your `catalyst.json` client
config at this `dist/` folder (replacing the old `client/` folder), then
deploy as usual — the backend function does not need to change.

## What's NOT built yet (full rebuild is a phased effort)

This covers the core POS flows end-to-end and real API wiring, but a few
screens from the old app were intentionally left as later phases so the
first drop is solid rather than shallow everywhere:
- Shifts open/close UI (backend routes already exist and are wired in `api/client.js`)
- Staff invite/OTP management UI
- Reports/analytics views
- Offline/local-first order queueing (the old app supported working offline
  and syncing later — worth preserving, not yet ported)

Happy to build out any of these next — just say which one.
