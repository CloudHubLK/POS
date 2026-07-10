import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, callApi } from '../api/client.js';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [catalogItems, setCatalogItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [connection, setConnection] = useState(() => {
    const raw = localStorage.getItem('zoho_active_connection');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  // null = checking, true = authenticated, false = not authenticated
  const [authStatus, setAuthStatus] = useState(() => {
    try {
      return localStorage.getItem('catalyst_auth_cache') === 'true' ? true : null;
    } catch {
      return null;
    }
  });
  const [posSettings, setPosSettings] = useState(() => {
    let cachedOnboarded = false;
    try {
      cachedOnboarded = localStorage.getItem('pos_onboarded_cache') === 'true';
    } catch { /* ignore */ }
    return {
      onboarded: cachedOnboarded,
      store_name: 'CloudHub POS',
      store_address: '',
      store_phone: '',
      receipt_header: 'Thank you for shopping with us!',
      receipt_footer: 'Visit again!',
      currency_symbol: '$',
      tax_rate: 0,
      tax_name: 'Sales Tax',
      tax_enabled: false,
      tax_inclusive: false,
      payment_mode: 'Cash',
      require_opening_float: false,
      allow_price_override: false,
      offline_mode: false
    };
  });

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ============================================================
  // CATALYST AUTHENTICATION GATE
  // Calls /api/auth/me — backend returns 401 when there is no
  // authenticated Catalyst user, and we redirect them to the
  // Catalyst-hosted login page. The session cookie comes back on
  // the redirect and the next load succeeds.
  // ============================================================
  const triggerCatalystLogin = useCallback(() => {
    try { localStorage.removeItem('catalyst_auth_cache'); } catch { /* ignore */ }
    setAuthStatus(false);
  }, []);

  const forceLogout = useCallback(async () => {
    try {
      try { localStorage.removeItem('zoho_active_connection'); } catch { /* ignore */ }
      try { localStorage.removeItem('pos_catalog_db'); } catch { /* ignore */ }
      try { localStorage.removeItem('catalyst_auth_cache'); } catch { /* ignore */ }
      setConnection(null);
      setAuthStatus(false);
      setUser(null);
      
      const resetSettings = {
        onboarded: false,
        store_name: 'CloudHub POS',
        store_address: '',
        store_phone: '',
        receipt_header: 'Thank you for shopping with us!',
        receipt_footer: 'Visit again!',
        currency_symbol: '$',
        tax_rate: 0,
        tax_name: 'Sales Tax',
        tax_enabled: false,
        tax_inclusive: false,
        payment_mode: 'Cash',
        require_opening_float: false,
        allow_price_override: false,
        offline_mode: false
      };
      setPosSettings(resetSettings);

      // Attempt backend logout if possible
      try {
        await api.authDisconnect();
      } catch { /* ignore */ }
      
      // Redirect to Zoho Catalyst signout URL
      window.location.href = '/__catalyst/auth/logout';
    } catch (err) {
      window.location.reload();
    }
  }, []);

  const checkCatalystAuth = useCallback(async () => {
    try {
      // User is authenticated on the frontend; now sync and fetch real POS user metadata from our backend API.
      // Even if this call fails or retries, we NEVER kick the user out of the POS instantly.
      const res = await api.authMe();
      if (res && res.success && res.email) {
        try { localStorage.setItem('catalyst_auth_cache', 'true'); } catch { /* ignore */ }
        setAuthStatus(true);
        setUser({
          email: res.email,
          name: res.pos_user?.name || res.email.split('@')[0] || 'Merchant',
          role: res.pos_user?.role || 'Admin',
          permissions: res.pos_user?.permissions || ['pos_sale', 'admin_settings'],
          status: res.pos_user?.status || 'active',
          auto_provisioned: res.pos_user?.auto_provisioned || true
        });
      } else {
        console.warn('Backend API authMe returned success:false. Setting auth status to false.');
        try { localStorage.removeItem('catalyst_auth_cache'); } catch { /* ignore */ }
        setAuthStatus(false);
      }
    } catch (err) {
      console.warn('Backend API auth sync failed, retrying once...', err.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const retryRes = await api.authMe();
        if (retryRes && retryRes.success && retryRes.email) {
          try { localStorage.setItem('catalyst_auth_cache', 'true'); } catch { /* ignore */ }
          setAuthStatus(true);
          setUser({
            email: retryRes.email,
            name: retryRes.pos_user?.name || retryRes.email.split('@')[0] || 'Merchant',
            role: retryRes.pos_user?.role || 'Admin',
            permissions: retryRes.pos_user?.permissions || ['pos_sale', 'admin_settings'],
            status: retryRes.pos_user?.status || 'active',
            auto_provisioned: retryRes.pos_user?.auto_provisioned || true
          });
        } else {
          try { localStorage.removeItem('catalyst_auth_cache'); } catch { /* ignore */ }
          setAuthStatus(false);
        }
      } catch (retryErr) {
        console.error('Backend API auth sync failed on retry.', retryErr.message);
        try { localStorage.removeItem('catalyst_auth_cache'); } catch { /* ignore */ }
        setAuthStatus(false);
      }
    }
  }, []);

  useEffect(() => {
    checkCatalystAuth();
  }, [checkCatalystAuth]);

  // Load catalog once auth is confirmed
  const refreshCatalog = useCallback(async () => {
    const cached = localStorage.getItem('pos_catalog_db');
    if (cached) {
      try { setCatalogItems(JSON.parse(cached)); } catch { /* ignore */ }
    }
    try {
      const res = await api.items();
      if (res && res.success && Array.isArray(res.data)) {
        setCatalogItems(res.data);
        localStorage.setItem('pos_catalog_db', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Could not refresh catalog from server, using cache:', err.message);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.settings();
      if (res && res.success && res.settings) {
        setPosSettings(prev => ({ ...prev, ...res.settings }));
        if (res.settings.onboarded || (res.settings.store_name && res.settings.store_name !== 'CloudHub POS')) {
          try { localStorage.setItem('pos_onboarded_cache', 'true'); } catch { /* ignore */ }
        } else {
          try { localStorage.setItem('pos_onboarded_cache', 'false'); } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.warn('Could not refresh POS settings:', err.message);
    }
  }, []);

  const savePosSettings = useCallback(async (newSettings) => {
    try {
      const res = await api.saveSettings(newSettings);
      if (res && res.success) {
        setPosSettings(newSettings);
        if (newSettings.onboarded || (newSettings.store_name && newSettings.store_name !== 'CloudHub POS')) {
          try { localStorage.setItem('pos_onboarded_cache', 'true'); } catch { /* ignore */ }
        } else {
          try { localStorage.setItem('pos_onboarded_cache', 'false'); } catch { /* ignore */ }
        }
        showToast('Settings saved successfully');
        return true;
      }
      throw new Error(res?.error || 'Failed to save settings');
    } catch (err) {
      showToast(err.message || 'Error saving settings', true);
      return false;
    }
  }, [showToast]);

  useEffect(() => {
    if (authStatus === true) {
      refreshCatalog();
      refreshSettings();
    }
  }, [authStatus, refreshCatalog, refreshSettings]);

  const syncWithBooks = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await api.syncBooks();
      if (!res || !res.success) throw new Error(res?.error || 'Sync failed');
      if (res.items) {
        setCatalogItems(res.items);
        localStorage.setItem('pos_catalog_db', JSON.stringify(res.items));
      }
      showToast(`Synced ${res.summary?.total_fetched ?? res.items?.length ?? 0} items from Zoho Books`);
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('disabled') || msg.toLowerCase().includes('administrator') || msg.toLowerCase().includes('access') || msg.toLowerCase().includes('refresh token is missing')) {
        localStorage.removeItem('zoho_active_connection');
        showToast('Your Zoho Books connection is disabled or expired. Please go to Settings and reconnect your Zoho Books account.', true);
      } else {
        showToast(msg || 'Sync with Zoho Books failed', true);
      }
    } finally {
      setSyncing(false);
    }
  }, [showToast]);

  const connectBooks = useCallback(() => {
    // Opens the existing OAuth flow served by the backend (unchanged contract).
    // Must use full /server/pos_backend prefix since we're on the /app/ client origin.
    window.open('/server/pos_backend/api/auth/url', 'zoho-connect', 'width=480,height=640');
  }, []);

  const disconnectBooks = useCallback(async () => {
    await api.authDisconnect();
    localStorage.removeItem('zoho_active_connection');
    setConnection(null);
    showToast('Disconnected from Zoho Books');
  }, [showToast]);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.sku === item.sku);
      if (existing) {
        return prev.map((c) => (c.sku === item.sku ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const updateCartQty = useCallback((sku, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((c) => c.sku !== sku);
      return prev.map((c) => (c.sku === sku ? { ...c, qty } : c));
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + (c.rate || 0) * c.qty, 0),
    [cart]
  );

  const value = {
    catalogItems, refreshCatalog,
    cart, addToCart, updateCartQty, clearCart, cartTotal,
    connection, setConnection, connectBooks, disconnectBooks,
    user, authStatus,
    syncing, syncWithBooks,
    toast, showToast,
    posSettings, savePosSettings,
    triggerCatalystLogin, forceLogout
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
