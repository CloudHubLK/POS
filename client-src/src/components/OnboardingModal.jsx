import React, { useState, useEffect } from 'react';
import { Cloud, Sparkles, ArrowRight, Check, Loader2, Building2, MapPin, Phone, Coins, Settings, Award, Globe } from 'lucide-react';
import { useAppState } from '../state/AppState.jsx';
import { api } from '../api/client.js';

// Real metadata lists: popular countries, phone dial codes, base currencies, and symbols
const countries = [
  { code: 'US', name: 'United States', phoneCode: '+1', currency: 'USD', symbol: '$' },
  { code: 'GB', name: 'United Kingdom', phoneCode: '+44', currency: 'GBP', symbol: '£' },
  { code: 'IN', name: 'India', phoneCode: '+91', currency: 'INR', symbol: '₹' },
  { code: 'LK', name: 'Sri Lanka', phoneCode: '+94', currency: 'LKR', symbol: 'Rs' },
  { code: 'CA', name: 'Canada', phoneCode: '+1', currency: 'CAD', symbol: 'C$' },
  { code: 'AU', name: 'Australia', phoneCode: '+61', currency: 'AUD', symbol: 'A$' },
  { code: 'NZ', name: 'New Zealand', phoneCode: '+64', currency: 'NZD', symbol: 'NZ$' },
  { code: 'SG', name: 'Singapore', phoneCode: '+65', currency: 'SGD', symbol: 'S$' },
  { code: 'MY', name: 'Malaysia', phoneCode: '+60', currency: 'MYR', symbol: 'RM' },
  { code: 'AE', name: 'United Arab Emirates', phoneCode: '+971', currency: 'AED', symbol: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', phoneCode: '+966', currency: 'SAR', symbol: 'SR' },
  { code: 'QA', name: 'Qatar', phoneCode: '+974', currency: 'QAR', symbol: 'QR' },
  { code: 'OM', name: 'Oman', phoneCode: '+968', currency: 'OMR', symbol: 'OMR' },
  { code: 'BH', name: 'Bahrain', phoneCode: '+973', currency: 'BHD', symbol: 'BD' },
  { code: 'KW', name: 'Kuwait', phoneCode: '+965', currency: 'KWD', symbol: 'KD' },
  { code: 'DE', name: 'Germany', phoneCode: '+49', currency: 'EUR', symbol: '€' },
  { code: 'FR', name: 'France', phoneCode: '+33', currency: 'EUR', symbol: '€' },
  { code: 'IT', name: 'Italy', phoneCode: '+39', currency: 'EUR', symbol: '€' },
  { code: 'ES', name: 'Spain', phoneCode: '+34', currency: 'EUR', symbol: '€' },
  { code: 'NL', name: 'Netherlands', phoneCode: '+31', currency: 'EUR', symbol: '€' },
  { code: 'CH', name: 'Switzerland', phoneCode: '+41', currency: 'CHF', symbol: 'CHF' },
  { code: 'IE', name: 'Ireland', phoneCode: '+353', currency: 'EUR', symbol: '€' },
  { code: 'JP', name: 'Japan', phoneCode: '+81', currency: 'JPY', symbol: '¥' },
  { code: 'CN', name: 'China', phoneCode: '+86', currency: 'CNY', symbol: '¥' },
  { code: 'HK', name: 'Hong Kong', phoneCode: '+852', currency: 'HKD', symbol: 'HK$' },
  { code: 'ZA', name: 'South Africa', phoneCode: '+27', currency: 'ZAR', symbol: 'R' },
  { code: 'EG', name: 'Egypt', phoneCode: '+20', currency: 'EGP', symbol: 'E£' },
  { code: 'TR', name: 'Turkey', phoneCode: '+90', currency: 'TRY', symbol: '₺' },
  { code: 'PH', name: 'Philippines', phoneCode: '+63', currency: 'PHP', symbol: '₱' },
  { code: 'ID', name: 'Indonesia', phoneCode: '+62', currency: 'IDR', symbol: 'Rp' },
  { code: 'TH', name: 'Thailand', phoneCode: '+66', currency: 'THB', symbol: '฿' },
  { code: 'VN', name: 'Vietnam', phoneCode: '+84', currency: 'VND', symbol: '₫' },
  { code: 'PK', name: 'Pakistan', phoneCode: '+92', currency: 'PKR', symbol: '₨' },
  { code: 'BD', name: 'Bangladesh', phoneCode: '+880', currency: 'BDT', symbol: '৳' },
  { code: 'NP', name: 'Nepal', phoneCode: '+977', currency: 'NPR', symbol: '₨' },
  { code: 'MV', name: 'Maldives', phoneCode: '+960', currency: 'MVR', symbol: 'Rf' },
  { code: 'BR', name: 'Brazil', phoneCode: '+55', currency: 'BRL', symbol: 'R$' },
  { code: 'MX', name: 'Mexico', phoneCode: '+52', currency: 'MXN', symbol: '$' },
  { code: 'KE', name: 'Kenya', phoneCode: '+254', currency: 'KES', symbol: 'KSh' },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234', currency: 'NGN', symbol: '₦' },
  { code: 'PL', name: 'Poland', phoneCode: '+48', currency: 'PLN', symbol: 'zł' },
  { code: 'SE', name: 'Sweden', phoneCode: '+46', currency: 'SEK', symbol: 'kr' },
  { code: 'NO', name: 'Norway', phoneCode: '+47', currency: 'NOK', symbol: 'kr' },
  { code: 'DK', name: 'Denmark', phoneCode: '+45', currency: 'DKK', symbol: 'kr' }
];

export default function OnboardingModal() {
  const { connectBooks, connection, setConnection, user, savePosSettings } = useAppState();
  const [step, setStep] = useState(1); // 1 = Welcome/Choose path, 2 = Details form, 3 = Success
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const [formData, setFormData] = useState({
    store_name: '',
    store_address: '',
    store_phone_code: '+1',
    store_phone_num: '',
    store_phone: '',
    store_country: 'US',
    currency_code: 'USD',
    currency_symbol: '$',
    receipt_header: 'Thank you for shopping with us!',
    receipt_footer: 'Visit again!',
    tax_rate: 0,
    tax_name: 'Sales Tax',
    tax_enabled: false,
    tax_inclusive: false,
    payment_mode: 'Cash',
    require_opening_float: false,
    allow_price_override: false,
    offline_mode: false
  });

  const [errorMsg, setErrorErrorMsg] = useState('');

  // Listen for OAuth connection message updates to auto-fetch details
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
      if (event.data && event.data.type === 'zoho_auth_success') {
        handleConn(event.data);
      }
    }

    let bc;
    try {
      bc = new BroadcastChannel('zoho_auth');
      bc.onmessage = (ev) => {
        if (ev.data && ev.data.type === 'zoho_auth_success') {
          handleConn(ev.data);
        }
      };
    } catch { /* ignored */ }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (bc) bc.close();
    };
  }, [user, setConnection]);

  // When connection updates, if we are in Step 1 or 2, fetch detailed profile
  useEffect(() => {
    if (connection && connection.orgId && !autoFilled) {
      fetchOrganizationProfile();
    }
  }, [connection]);

  const fetchOrganizationProfile = async () => {
    try {
      setLoadingDetails(true);
      setErrorErrorMsg('');
      const res = await api.organization();
      if (res && res.success && res.organization) {
        const org = res.organization;
        
        let formattedAddress = '';
        if (org.address) {
          const parts = [
            org.address.street,
            org.address.city,
            org.address.state,
            org.address.zip,
            org.address.country
          ].filter(Boolean);
          formattedAddress = parts.join(', ');
        }

        let storeCountry = 'US';
        let phoneCode = '+1';
        let phoneNum = org.phone || '';

        // Try to map country
        if (org.address && org.address.country) {
          const match = countries.find(c => c.name.toLowerCase() === org.address.country.toLowerCase() || c.code.toLowerCase() === org.address.country.toLowerCase());
          if (match) {
            storeCountry = match.code;
            phoneCode = match.phoneCode;
          }
        }

        // Try to parse phone dial code
        if (org.phone) {
          const cleanPhone = org.phone.trim();
          const matchedCountry = countries.find(c => cleanPhone.startsWith(c.phoneCode));
          if (matchedCountry) {
            phoneCode = matchedCountry.phoneCode;
            phoneNum = cleanPhone.slice(matchedCountry.phoneCode.length).trim();
          }
        }

        // Try to map currency
        let currCode = 'USD';
        let currSymbol = org.currency_symbol || '$';
        if (org.currency_symbol) {
          const match = countries.find(c => c.symbol === org.currency_symbol);
          if (match) {
            currCode = match.currency;
            currSymbol = match.symbol;
          }
        }

        setFormData(prev => ({
          ...prev,
          store_name: org.name || org.company_name || prev.store_name,
          store_phone_code: phoneCode,
          store_phone_num: phoneNum,
          store_phone: org.phone || prev.store_phone,
          store_address: formattedAddress || prev.store_address,
          store_country: storeCountry,
          currency_code: currCode,
          currency_symbol: currSymbol
        }));
        setAutoFilled(true);
        setStep(2); // Auto-advance to details step with values populated
      }
    } catch (err) {
      console.error('Failed to fetch detailed profile:', err.message);
      // Even if fetch profile fails, we connected successfully, so let them manually edit
      setStep(2);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleConnectZoho = () => {
    connectBooks();
  };

  const handleManualSetup = () => {
    setStep(2);
  };

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.store_name.trim()) {
      setErrorErrorMsg('Store / Company Name is required.');
      return;
    }
    if (!formData.store_phone_num.trim()) {
      setErrorErrorMsg('Contact phone number is required.');
      return;
    }

    try {
      setSaving(true);
      setErrorErrorMsg('');

      // Combine dialing code and phone digits for the final store_phone property
      const fullPhone = `${formData.store_phone_code} ${formData.store_phone_num.trim()}`;

      // Mark settings as onboarded
      const payload = {
        ...formData,
        store_phone: fullPhone,
        onboarded: true
      };

      const success = await savePosSettings(payload);
      if (success) {
        setStep(3);
      } else {
        throw new Error('Could not persist configuration.');
      }
    } catch (err) {
      setErrorErrorMsg(err.message || 'Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="max-w-xl w-full bg-counter-800 rounded-3xl border border-counter-700 shadow-drawer relative overflow-hidden transition-all duration-300">
        
        {/* Modern decorative backgrounds */}
        <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-brass-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-brass-500/5 blur-2xl pointer-events-none" />

        {/* Content Panel */}
        <div className="p-8 md:p-10 relative z-10">
          
          {/* Step 1: Welcome & Path Selection */}
          {step === 1 && (
            <div className="space-y-8 animate-fadeIn text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500 mb-2 shadow-inner">
                <Cloud className="w-9 h-9" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-paper font-display tracking-tight">
                  Welcome to Zoho POS Suite
                </h1>
                <p className="text-counter-600 text-sm max-w-sm mx-auto font-body leading-relaxed">
                  Let's configure your Point of Sale register. Select an onboarding method below to get started.
                </p>
              </div>

              {loadingDetails ? (
                <div className="py-12 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-brass-500 animate-spin" />
                  <p className="text-xs font-medium text-counter-600 font-mono">Fetching Zoho profile details...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 w-full">
                  
                  {/* Zoho sync option */}
                  <button
                    onClick={handleConnectZoho}
                    className="group text-left p-5 rounded-2xl border-2 border-brass-400/30 hover:border-brass-400 bg-brass-500/5 hover:bg-brass-500/10 transition-all duration-200 flex items-start gap-4 focus-ring"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500 shrink-0">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display font-bold text-paper text-sm">One-Click Zoho Books Connect</h3>
                        <span className="text-[10px] bg-brass-500 text-white font-semibold font-mono px-2 py-0.5 rounded-full uppercase">Recommended</span>
                      </div>
                      <p className="text-xs text-counter-600 mt-1 leading-relaxed font-body">
                        Sign in with Zoho to auto-import company name, address, phone, currency, and link ledger accounts instantly.
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-counter-600 group-hover:text-brass-500 transition-transform group-hover:translate-x-1 self-center shrink-0" />
                  </button>

                  {/* Manual option */}
                  <button
                    onClick={handleManualSetup}
                    className="group text-left p-5 rounded-2xl border-2 border-counter-700 hover:border-counter-600 bg-counter-900/40 hover:bg-counter-900 transition-all duration-200 flex items-start gap-4 focus-ring"
                  >
                    <div className="w-12 h-12 rounded-xl bg-counter-700/60 border border-counter-700 flex items-center justify-center text-counter-600 shrink-0">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-paper text-sm">Manual Store Setup</h3>
                      <p className="text-xs text-counter-600 mt-1 leading-relaxed font-body">
                        Configure company profile, receipt metadata, currency symbol, and payment properties yourself.
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-counter-600 group-hover:text-paper transition-transform group-hover:translate-x-1 self-center shrink-0" />
                  </button>

                </div>
              )}

              <div className="pt-4 border-t border-counter-700/50 w-full text-center text-[11px] text-counter-600 font-medium">
                SaaS Register Node Onboarding Gate
              </div>
            </div>
          )}

          {/* Step 2: Company Details Form */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-paper font-display leading-tight">Company Profile Setup</h1>
                  <p className="text-xs text-counter-600">Please provide your business and register settings</p>
                </div>
              </div>

              {autoFilled && (
                <div className="flex items-center gap-2.5 p-3.5 bg-mint/10 border border-mint/20 rounded-xl text-mint text-xs">
                  <Check className="w-4 h-4 shrink-0" />
                  <span className="font-medium">Business details automatically imported from your linked Zoho Books account!</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-clay/10 border border-clay/20 text-clay rounded-xl text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                
                {/* Store Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider block">Company / Store Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-counter-600" />
                    <input
                      type="text"
                      required
                      value={formData.store_name}
                      onChange={(e) => updateField('store_name', e.target.value)}
                      placeholder="e.g. CloudHub Retail Solutions"
                      className="focus-ring w-full bg-counter-900 border border-counter-700/60 rounded-xl pl-11 pr-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                    />
                  </div>
                </div>

                {/* Store Country */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider block">Operational Country *</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-counter-600" />
                    <select
                      value={formData.store_country}
                      onChange={(e) => {
                        const selectedCode = e.target.value;
                        const countryMatch = countries.find(c => c.code === selectedCode);
                        if (countryMatch) {
                          setFormData(prev => ({
                            ...prev,
                            store_country: selectedCode,
                            store_phone_code: countryMatch.phoneCode,
                            currency_code: countryMatch.currency,
                            currency_symbol: countryMatch.symbol
                          }));
                        } else {
                          updateField('store_country', selectedCode);
                        }
                      }}
                      className="focus-ring w-full bg-counter-900 border border-counter-700/60 rounded-xl pl-11 pr-4 py-2.5 text-sm text-paper cursor-pointer font-medium"
                    >
                      {countries.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Store Phone with Dialing Code */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider block">Contact Phone Number *</label>
                  <div className="flex gap-2">
                    <div className="w-1/3 min-w-[100px] relative">
                      <select
                        value={formData.store_phone_code}
                        onChange={(e) => updateField('store_phone_code', e.target.value)}
                        className="focus-ring w-full bg-counter-900 border border-counter-700/60 rounded-xl px-3 py-2.5 text-sm text-paper cursor-pointer font-medium"
                      >
                        {Array.from(new Set(countries.map(c => c.phoneCode))).sort().map(code => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-counter-600" />
                      <input
                        type="tel"
                        required
                        value={formData.store_phone_num}
                        onChange={(e) => updateField('store_phone_num', e.target.value)}
                        placeholder="e.g. 771234567"
                        className="focus-ring w-full bg-counter-900 border border-counter-700/60 rounded-xl pl-11 pr-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Store Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider block">Store Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-counter-600" />
                    <input
                      type="text"
                      value={formData.store_address}
                      onChange={(e) => updateField('store_address', e.target.value)}
                      placeholder="e.g. 128 Elite Trade Avenue, Suite 400"
                      className="focus-ring w-full bg-counter-900 border border-counter-700/60 rounded-xl pl-11 pr-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Currency Dropdown */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider block">Base Currency *</label>
                    <div className="relative">
                      <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-counter-600" />
                      <select
                        value={formData.currency_code}
                        onChange={(e) => {
                          const code = e.target.value;
                          const match = countries.find(c => c.currency === code);
                          setFormData(prev => ({
                            ...prev,
                            currency_code: code,
                            currency_symbol: match ? match.symbol : '$'
                          }));
                        }}
                        className="focus-ring w-full bg-counter-900 border border-counter-700/60 rounded-xl pl-11 pr-4 py-2.5 text-sm text-paper cursor-pointer font-medium"
                      >
                        {Array.from(new Map(countries.map(c => [c.currency, c])).values()).map(c => (
                          <option key={c.currency} value={c.currency}>
                            {c.currency} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-counter-600 uppercase tracking-wider block">Default Payment Mode</label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => updateField('payment_mode', e.target.value)}
                      className="focus-ring w-full bg-counter-900 border border-counter-700/60 rounded-xl px-4 py-2.5 text-sm text-paper cursor-pointer font-medium"
                    >
                      <option value="Cash">Cash Drawer</option>
                      <option value="Card">Credit/Debit Terminal</option>
                      <option value="UPI">UPI / Digital QR</option>
                      <option value="Bank Transfer">Bank Wire Transfer</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-counter-700/50 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-counter-600 hover:text-paper hover:bg-counter-900 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="focus-ring px-6 py-2.5 rounded-xl text-sm font-semibold bg-brass-500 text-white hover:bg-brass-400 transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Complete Setup
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Success Screen */}
          {step === 3 && (
            <div className="space-y-8 animate-fadeIn text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center text-mint mb-2 shadow-inner">
                <Check className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-paper font-display tracking-tight">Onboarding Completed!</h1>
                <p className="text-xs text-counter-600 max-w-sm leading-relaxed">
                  Your merchant POS node is fully provisioned, integrated, and ready for operations. Welcome to the workspace.
                </p>
              </div>

              <div className="p-5 bg-counter-900 rounded-2xl border border-counter-700/50 w-full text-left space-y-3">
                <h3 className="text-xs font-bold text-paper uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-brass-500" /> Provisioned Store Properties
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono text-counter-600">
                  <div>Store Name:</div><div className="text-paper font-semibold">{formData.store_name}</div>
                  <div>Base Currency:</div><div className="text-paper font-semibold">{formData.currency_symbol}</div>
                  <div>Store Country:</div><div className="text-paper font-semibold">{formData.store_country}</div>
                  <div>Store Phone:</div><div className="text-paper font-semibold">{formData.store_phone}</div>
                  <div>Sync Ledger:</div><div className="text-mint font-semibold flex items-center gap-1">{connection ? 'Zoho Books Connected' : 'Local Sandbox Mode'}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()} // Reloads the app to pull the updated settings cleanly
                className="w-full focus-ring bg-brass-500 hover:bg-brass-400 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 group text-sm cursor-pointer"
              >
                <span>Enter POS Dashboard</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
