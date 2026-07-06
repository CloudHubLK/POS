// Thin wrapper around fetch. Talks to the SAME backend routes as the old app.js —
// no contract changes. Tenant headers are attached the same way the old client did,
// read from the same localStorage key, so a rollback never strands you mid-migration.

function getTenantHeaders() {
  const raw = localStorage.getItem('zoho_active_connection');
  if (!raw) return {};
  try {
    const conn = JSON.parse(raw);
    return {
      'x-org-id': conn.orgId || '',
      'x-org-email': conn.email || ''
    };
  } catch {
    return {};
  }
}

export async function callApi(endpoint, method = 'GET', body = null) {
  const res = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getTenantHeaders()
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned a non-JSON response (status ${res.status})`);
  }
  if (!res.ok && !data) {
    throw new Error(`Request failed with status ${res.status}`);
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
  saveSettings: (payload) => callApi('/api/config/settings', 'POST', payload),

  openShift: (payload) => callApi('/api/shifts/open', 'POST', payload),
  closeShift: (payload) => callApi('/api/shifts/close', 'POST', payload),
  shifts: () => callApi('/api/shifts')
};
