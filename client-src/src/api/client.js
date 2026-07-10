// Thin wrapper around fetch. Talks to the SAME backend routes as the old app.js —
// no contract changes. Tenant headers are attached the same way the old client did,
// read from the same localStorage key, so a rollback never strands you mid-migration.

// Backend runs at /server/pos_backend — always use absolute path from host root.
const API_BASE = '/server/pos_backend';

function getTenantHeaders() {
  const raw = localStorage.getItem('zoho_active_connection');
  if (!raw) return {};
  try {
    const conn = JSON.parse(raw);
    const headers = {};
    if (conn.refreshToken) headers['x-zoho-refresh-token'] = conn.refreshToken;
    if (conn.orgId)        headers['x-zoho-org-id']        = conn.orgId;
    if (conn.dc)           headers['x-zoho-dc']             = conn.dc;
    return headers;
  } catch {
    return {};
  }
}

export async function callApi(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getTenantHeaders()
    },
    body: body ? JSON.stringify(body) : undefined,
    // Always send credentials so the Catalyst session cookie is included.
    credentials: 'include'
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned a non-JSON response (status ${res.status})`);
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---- Named wrappers for every existing backend route (kept 1:1 with pos_backend/index.js) ----
export const api = {
  health: () => callApi('/api/health'),

  authMe: () => callApi('/api/auth/me'),
  authStatus: () => callApi('/api/auth/status'),
  authUrl: () => callApi('/api/auth/url'),
  authDisconnect: () => callApi('/api/auth/disconnect', 'POST'),

  organizations: () => callApi('/api/organizations'),
  organization: () => callApi('/api/organization'),

  items: () => callApi('/api/items'),
  createItem: (item) => callApi('/api/items', 'POST', item),
  updateItem: (id, item) => callApi(`/api/items/${id}`, 'PUT', item),
  deleteItem: (id) => callApi(`/api/items/${id}`, 'DELETE'),
  adjustStock: (payload) => callApi('/api/items/stock-adjust', 'POST', payload),
  syncBooks: () => callApi('/api/sync/books', 'POST'),
  syncDiagnose: () => callApi('/api/sync/diagnose'),

  orders: () => callApi('/api/orders'),
  createOrder: (order) => callApi('/api/orders', 'POST', order),

  contacts: () => callApi('/api/contacts'),
  createContact: (contact) => callApi('/api/contacts', 'POST', contact),

  users: () => callApi('/api/users'),
  inviteUser: (payload) => callApi('/api/users/invite', 'POST', payload),
  verifyOtp: (payload) => callApi('/api/users/verify-otp', 'POST', payload),
  loginUser: (payload) => callApi('/api/users/login', 'POST', payload),
  deleteUser: (payload) => callApi('/api/users/delete', 'POST', payload),
  updateUserRole: (payload) => callApi('/api/users/update-role', 'POST', payload),

  settings: () => callApi('/api/config/settings'),
  saveSettings: (payload) => callApi('/api/config/settings', 'POST', { settings: payload }),
  saveMasterCredentials: (payload) => callApi('/api/auth/save-master-credentials', 'POST', payload),

  openShift: (payload) => callApi('/api/shifts/open', 'POST', payload),
  closeShift: (payload) => callApi('/api/shifts/close', 'POST', payload),
  shifts: () => callApi('/api/shifts')
};
