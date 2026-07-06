import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

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

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Fixes the "products vanish after refresh" bug: the datastore ('Items' table)
  // is the source of truth, not localStorage. localStorage is only a fast-paint cache.
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

  // Fixes the "authenticated users aren't created" bug: hitting /api/auth/me now
  // auto-provisions a POS user record server-side, and we read that back here.
  const refreshAuth = useCallback(async () => {
    try {
      const res = await api.authMe();
      if (res && res.success) {
        setUser({ email: res.email, ...(res.pos_user || {}) });
      }
    } catch (err) {
      console.warn('Auth check failed:', err.message);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
    refreshCatalog();
  }, [refreshAuth, refreshCatalog]);

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
      showToast(err.message || 'Sync with Zoho Books failed', true);
    } finally {
      setSyncing(false);
    }
  }, [showToast]);

  const connectBooks = useCallback(() => {
    // Opens the existing OAuth flow served by the backend (unchanged contract).
    window.open('/api/auth/url', 'zoho-connect', 'width=480,height=640');
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
    connection, connectBooks, disconnectBooks,
    user, refreshAuth,
    syncing, syncWithBooks,
    toast, showToast
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
