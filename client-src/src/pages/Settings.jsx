import React, { useEffect, useState } from 'react';
import { Store, Percent, Settings2, Network, CloudCog, Save, User, Loader2 } from 'lucide-react';
import Topbar from '../components/Topbar.jsx';
import { useAppState } from '../state/AppState.jsx';
import { api } from '../api/client.js';

// Custom toggle switch for premium Zoho-like micro-interactions
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start justify-between cursor-pointer select-none gap-4 py-1.5">
      <div className="flex-1">
        <span className="text-sm font-medium text-paper block">{label}</span>
        {description && <span className="text-xs text-counter-600 block mt-0.5 leading-relaxed">{description}</span>}
      </div>
      <div className="relative mt-1 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-mint' : 'bg-counter-700'}`} />
        <div className={`absolute left-0.5 top-0.5 bg-counter-800 w-5 h-5 rounded-full shadow-md transition-transform duration-200 ease-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </label>
  );
}

export default function Settings() {
  const { connection, setConnection, connectBooks, disconnectBooks, user, posSettings, savePosSettings, showToast } = useAppState();
  const [activeTab, setActiveTab] = useState('connections');
  const [saving, setSaving] = useState(false);

  // Form state, initialized from global posSettings
  const [formData, setFormData] = useState({
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
  });

  // Keep state in sync if global posSettings loads/changes
  useEffect(() => {
    if (posSettings) {
      setFormData((prev) => ({ ...prev, ...posSettings }));
    }
  }, [posSettings]);

  // Listen for OAuth popup completion — backend sends postMessage to window.opener
  useEffect(() => {
    function handleConn(data) {
      const { refreshToken, dc, organizations, email } = data;
      if (!refreshToken || !organizations || organizations.length === 0) return;
      const org = organizations[0];
      const conn = {
        refreshToken,
        dc: dc || 'US',
        orgId: org.organization_id || org.orgId,
        orgName: org.name || org.orgName || org.organization_name,
        email: email || org.email
      };
      localStorage.setItem('zoho_active_connection', JSON.stringify(conn));
      if (user?.email) {
        const scopedKey = `zoho_conn_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        localStorage.setItem(scopedKey, JSON.stringify(conn));
      }
      setConnection(conn);
    }

    function handleMessage(event) {
      if (event.origin !== window.location.origin) return;
      // Backend sends type: 'zoho_auth_success'
      if (event.data && event.data.type === 'zoho_auth_success') {
        handleConn(event.data);
      }
    }

    // BroadcastChannel fallback (used when popup has no opener)
    let bc;
    try {
      bc = new BroadcastChannel('zoho_auth');
      bc.onmessage = (ev) => { if (ev.data && ev.data.type === 'zoho_auth_success') handleConn(ev.data); };
    } catch { /* BroadcastChannel not supported */ }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (bc) bc.close();
    };
  }, [user, setConnection]);

  // Poll for connection status after popup opens (fallback if postMessage isn't fired)
  const handleConnect = () => {
    connectBooks();
    // Poll /api/auth/status every 2s for up to 60s after popup opens
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      if (attempts > 30) { clearInterval(poll); return; }
      try {
        const res = await api.authStatus();
        if (res && res.connected && res.connection) {
          clearInterval(poll);
          const conn = res.connection;
          localStorage.setItem('zoho_active_connection', JSON.stringify(conn));
          if (user?.email) {
            const scopedKey = `zoho_conn_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            localStorage.setItem(scopedKey, JSON.stringify(conn));
          }
          setConnection(conn);
        }
      } catch { /* ignore */ }
    }, 2000);
  };

  // Save advanced configuration to catalyst database
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    const success = await savePosSettings(formData);
    setSaving(false);
  };

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Compute if local state differs from saved posSettings (isDirty)
  const isDirty = JSON.stringify(formData) !== JSON.stringify(posSettings);

  const tabs = [
    { id: 'connections', label: 'Connections', icon: Network },
    { id: 'store', label: 'Store Profile', icon: Store },
    { id: 'financials', label: 'Financials & Tax', icon: Percent },
    { id: 'operations', label: 'Operations Rules', icon: Settings2 }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-counter-950">
      <Topbar title="Advanced Settings" subtitle="Configure system rules, tax properties, and Zoho Integrations" />
      
      {/* Settings layout wrapper */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Sleek Vertical Tab Sidebar for Settings sections */}
        <aside className="lg:w-64 shrink-0 bg-counter-900 border-b lg:border-b-0 lg:border-r border-counter-700/60 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all font-medium text-left focus-ring
                  ${active 
                    ? 'bg-counter-800 text-brass-500 shadow-sm border border-counter-700/30' 
                    : 'text-counter-600 hover:text-paper hover:bg-counter-800/40'}`}
              >
                <Icon size={17} className={active ? 'text-brass-500' : 'text-counter-600'} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Main Settings Page content area */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-2xl">
            
            {/* Tab 1: CONNECTIONS & INTEGRATIONS */}
            {activeTab === 'connections' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brass-400/10 flex items-center justify-center text-brass-500">
                      <CloudCog size={22} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-paper leading-none">Zoho Books</h3>
                      <span className="text-xs text-counter-600">Sync items and register cash register sales invoices</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-counter-600 mb-6 leading-relaxed">
                    {connection
                      ? `Successfully integrated. This register automatically synchronizes products from ${connection.orgName || 'your Zoho organization'} (${connection.email || ''}).`
                      : 'Integrate your register with your Zoho Books organization to dynamically pull inventory, stock, and post transactional invoices.'}
                  </p>

                  {connection ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-counter-900 border border-counter-700/40 space-y-2 font-mono text-xs text-counter-600">
                        <div className="flex justify-between"><span className="font-medium text-paper">Organization Name:</span> <span>{connection.orgName}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-paper">Organization ID:</span> <span>{connection.orgId}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-paper">Data Center (DC):</span> <span className="uppercase">{connection.dc}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-paper">Integrated By:</span> <span>{connection.email}</span></div>
                      </div>
                      <button
                        type="button"
                        onClick={disconnectBooks}
                        className="focus-ring px-4 py-2.5 rounded-xl text-sm font-medium bg-clay/10 text-clay hover:bg-clay hover:text-white transition-all"
                      >
                        Disconnect Zoho Books
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnect}
                      className="focus-ring px-5 py-2.5 rounded-xl text-sm font-medium bg-brass-500 text-counter-950 hover:bg-brass-400 transition-colors shadow-sm"
                    >
                      Connect Zoho Books
                    </button>
                  )}
                </div>

                <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-brass-400/10 flex items-center justify-center text-brass-500">
                      <User size={22} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-paper leading-none">POS Terminal Operator</h3>
                      <span className="text-xs text-counter-600">Active session and staff details</span>
                    </div>
                  </div>
                  <div className="space-y-3 font-mono text-xs text-counter-600">
                    <div className="flex justify-between"><span className="font-medium text-paper">Staff Email:</span> <span>{user?.email || 'Guest Operator'}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-paper">Assigned Role:</span> <span className="text-brass-500 font-bold">{user?.role || 'Operator'}</span></div>
                    <div className="flex justify-between"><span className="font-medium text-paper">Auto-Provisioned:</span> <span>{user?.auto_provisioned ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: STORE PROFILE & RECEIPT SETUP */}
            {activeTab === 'store' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-paper mb-2">Store Details</h3>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Store Name</label>
                    <input
                      type="text"
                      value={formData.store_name}
                      onChange={(e) => updateField('store_name', e.target.value)}
                      placeholder="e.g. CloudHub Retail"
                      className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Store Phone</label>
                      <input
                        type="text"
                        value={formData.store_phone}
                        onChange={(e) => updateField('store_phone', e.target.value)}
                        placeholder="e.g. +1 555-0192"
                        className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Store Address</label>
                    <textarea
                      rows={3}
                      value={formData.store_address}
                      onChange={(e) => updateField('store_address', e.target.value)}
                      placeholder="Street, City, State, ZIP"
                      className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                    />
                  </div>
                </div>

                <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-paper mb-2">Receipt Templates</h3>
                  <p className="text-xs text-counter-600">Customize header and footer annotations printed on checkout slips.</p>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Receipt Header Message</label>
                    <input
                      type="text"
                      value={formData.receipt_header}
                      onChange={(e) => updateField('receipt_header', e.target.value)}
                      className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Receipt Footer Message</label>
                    <input
                      type="text"
                      value={formData.receipt_footer}
                      onChange={(e) => updateField('receipt_footer', e.target.value)}
                      className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: FINANCIALS & TAX RULES */}
            {activeTab === 'financials' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-paper mb-2">Currency & Checkout</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Currency Symbol</label>
                      <select
                        value={formData.currency_symbol}
                        onChange={(e) => updateField('currency_symbol', e.target.value)}
                        className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600 appearance-none"
                      >
                        <option value="$">USD ($)</option>
                        <option value="₹">INR (₹)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                        <option value="AED">AED (AED)</option>
                        <option value="Rs">LKR (Rs)</option>
                        <option value="¥">JPY (¥)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Default Payment Mode</label>
                      <select
                        value={formData.payment_mode}
                        onChange={(e) => updateField('payment_mode', e.target.value)}
                        className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600 appearance-none"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Credit/Debit Card</option>
                        <option value="UPI">UPI / Digital Wallet</option>
                        <option value="Split">Split Payment</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6 shadow-sm space-y-5">
                  <h3 className="font-display font-semibold text-paper mb-1">Sales Tax Rules</h3>
                  
                  <Toggle
                    checked={formData.tax_enabled}
                    onChange={(val) => updateField('tax_enabled', val)}
                    label="Enable Sales Tax calculations"
                    description="Automatically calculate tax lines on customer shopping cart totals"
                  />

                  {formData.tax_enabled && (
                    <div className="space-y-4 pt-2 border-t border-counter-700/30 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Tax Display Name</label>
                          <input
                            type="text"
                            value={formData.tax_name}
                            onChange={(e) => updateField('tax_name', e.target.value)}
                            placeholder="e.g. VAT, GST"
                            className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider">Tax Rate (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.tax_rate}
                            onChange={(e) => updateField('tax_rate', parseFloat(e.target.value) || 0)}
                            placeholder="e.g. 5.0"
                            className="focus-ring w-full bg-counter-900 border border-counter-700/50 rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                          />
                        </div>
                      </div>

                      <Toggle
                        checked={formData.tax_inclusive}
                        onChange={(val) => updateField('tax_inclusive', val)}
                        label="Prices are inclusive of tax"
                        description="When enabled, catalog items are considered inclusive of the tax rate defined above"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: OPERATIONS & SECURITY RULES */}
            {activeTab === 'operations' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6 shadow-sm space-y-4">
                  <h3 className="font-display font-semibold text-paper mb-3">POS Store Rules</h3>
                  
                  <Toggle
                    checked={formData.require_opening_float}
                    onChange={(val) => updateField('require_opening_float', val)}
                    label="Require daily shift opening float"
                    description="Cashiers must declare their beginning drawer float before ringing up sales transactions"
                  />

                  <hr className="border-counter-700/40" />

                  <Toggle
                    checked={formData.allow_price_override}
                    onChange={(val) => updateField('allow_price_override', val)}
                    label="Allow custom price overrides"
                    description="Permit cashiers to modify default product unit rates directly from the register screen"
                  />

                  <hr className="border-counter-700/40" />

                  <Toggle
                    checked={formData.offline_mode}
                    onChange={(val) => updateField('offline_mode', val)}
                    label="Enable offline safety cache"
                    description="Queue failed checkouts in the browser cache, syncing them when connectivity returns"
                  />
                </div>
              </div>
            )}

          </div>

          {/* Floating premium save bar, visible ONLY when local form state is modified (dirty) */}
          {isDirty && (
            <div className="p-4 bg-counter-900 border-t border-brass-500/10 flex items-center justify-end px-8 gap-4 animate-slideUp backdrop-blur-md bg-opacity-95">
              <span className="text-xs text-brass-500 font-medium">You have unsaved changes in settings</span>
              <button
                type="submit"
                disabled={saving}
                className="focus-ring flex items-center gap-2 bg-brass-500 text-counter-950 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-brass-400 transition-colors shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}
