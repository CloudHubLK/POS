import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Register from './pages/Register.jsx';
import Products from './pages/Products.jsx';
import Customers from './pages/Customers.jsx';
import Orders from './pages/Orders.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Users from './pages/Users.jsx';
import OnboardingModal from './components/OnboardingModal.jsx';
import { AppStateProvider, useAppState } from './state/AppState.jsx';

import { 
  Cloud, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  LogIn, 
  UserPlus, 
  Store, 
  BarChart3, 
  WifiOff, 
  Users2, 
  ShieldCheck, 
  Check, 
  ChevronRight, 
  Play, 
  Globe, 
  Lock, 
  Cpu, 
  Menu,
  Receipt,
  ShoppingCart,
  TrendingUp,
  History,
  Coins,
  Package,
  X,
  CreditCard
} from 'lucide-react';

const MOCK_ITEMS = {
  retail: [
    { sku: 'RET-01', name: 'Premium Arabica Beans', rate: 24.00, icon: '☕' },
    { sku: 'RET-02', name: 'Ceramic Coffee Mug', rate: 14.50, icon: '🥛' },
    { sku: 'RET-03', name: 'Travel Flask (500ml)', rate: 32.00, icon: '🏺' },
    { sku: 'RET-04', name: 'Plunger French Press', rate: 28.00, icon: '⚗️' }
  ],
  restaurant: [
    { sku: 'RES-01', name: 'Truffle Mushroom Risotto', rate: 18.50, icon: '🍛' },
    { sku: 'RES-02', name: 'Pepperoni Wood Pizza', rate: 16.00, icon: '🍕' },
    { sku: 'RES-03', name: 'Salmon Caesar Salad', rate: 21.00, icon: '🥗' },
    { sku: 'RES-04', name: 'Classic Crème Brûlée', rate: 9.50, icon: '🍮' }
  ],
  cafe: [
    { sku: 'CAF-01', name: 'Iced Spanish Latte', rate: 6.50, icon: '🥤' },
    { sku: 'CAF-02', name: 'Chocolate Croissant', rate: 4.80, icon: '🥐' },
    { sku: 'CAF-03', name: 'Avocado Sourdough', rate: 11.20, icon: '🍞' },
    { sku: 'CAF-04', name: 'Matcha Cappuccino', rate: 5.50, icon: '🍵' }
  ],
  supermarket: [
    { sku: 'SUP-01', name: 'Organic Almond Milk', rate: 5.20, icon: '🥛' },
    { sku: 'SUP-02', name: 'Fresh Blueberries', rate: 3.90, icon: '🫐' },
    { sku: 'SUP-03', name: 'Quinoa Veggie Chips', rate: 4.50, icon: '🍿' },
    { sku: 'SUP-04', name: 'Greek Honey Yogurt', rate: 6.80, icon: '🍧' }
  ]
};

function POSLandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('retail');
  const [mockCart, setMockCart] = useState([
    { sku: 'RET-01', name: 'Premium Arabica Beans', rate: 24.00, qty: 1, icon: '☕' },
    { sku: 'RET-02', name: 'Ceramic Coffee Mug', rate: 14.50, qty: 2, icon: '🥛' }
  ]);
  const [checkoutModalOpen, setMockCheckoutOpen] = useState(false);
  const [checkoutTxnCode, setCheckoutTxnCode] = useState('');

  const handleLogin = () => {
    navigate('/login');
  };

  const handleSignup = () => {
    navigate('/login');
  };

  // Live POS Mockup Cart Logic
  const addMockItem = (item) => {
    setMockCart(prev => {
      const existing = prev.find(i => i.sku === item.sku);
      if (existing) {
        return prev.map(i => i.sku === item.sku ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateMockQty = (sku, qty) => {
    setMockCart(prev => {
      if (qty <= 0) return prev.filter(i => i.sku !== sku);
      return prev.map(i => i.sku === sku ? { ...i, qty } : i);
    });
  };

  const clearMockCart = () => setMockCart([]);

  const mockSubtotal = mockCart.reduce((sum, i) => sum + i.rate * i.qty, 0);
  const mockTax = mockSubtotal * 0.08;
  const mockTotal = mockSubtotal + mockTax;

  const triggerMockCheckout = () => {
    if (mockCart.length === 0) return;
    const rCode = `TXN-${Math.floor(Math.random() * 9000000) + 1000000}-${new Date().getFullYear()}`;
    setCheckoutTxnCode(rCode);
    setMockCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen w-screen bg-counter-950 text-paper selection:bg-brass-500 selection:text-white font-body overflow-x-hidden relative">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-brass-400/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-brass-500/3 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-mint/5 blur-[100px] pointer-events-none" />

      {/* 1. Zoho-themed Modern Header */}
      <header className="sticky top-0 z-50 w-full bg-counter-800/80 backdrop-blur-md border-b border-counter-700/60 px-6 lg:px-16 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brass-500 to-amber-500 text-white flex items-center justify-center shadow-md font-display font-bold text-xl">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-tight text-paper">CloudHub POS</span>
              <span className="text-[10px] bg-brass-500/10 text-brass-600 font-bold px-2 py-0.5 rounded-full font-mono uppercase">SaaS</span>
            </div>
            <span className="text-[9px] font-mono uppercase text-counter-600 font-bold tracking-widest block -mt-0.5">Zoho Books Integrated</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-counter-600">
          <a href="#features" className="hover:text-brass-500 transition-colors">POS Features</a>
          <a href="#demo" className="hover:text-brass-500 transition-colors">Interactive Demo</a>
          <a href="#integration" className="hover:text-brass-500 transition-colors">Ledger Integration</a>
          <a href="#compliance" className="hover:text-brass-500 transition-colors">Cloud Compliance</a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogin}
            className="text-sm font-semibold text-counter-600 hover:text-paper transition-colors py-2 px-4 cursor-pointer"
          >
            Sign In
          </button>
          <button 
            onClick={handleSignup}
            className="focus-ring bg-brass-500 hover:bg-brass-400 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-brass-400/15"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Register Node</span>
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-6 lg:px-16 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center max-w-7xl mx-auto">
        <div className="lg:col-span-6 space-y-8 text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brass-500/10 border border-brass-400/25 text-brass-600 text-xs font-semibold font-mono tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-brass-500" />
            <span>POWERED BY ZOHO CATALYST SERVERLESS</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display tracking-tight text-paper leading-[1.1]">
            Next-Gen Cloud POS built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-brass-500 to-amber-500">Fast Operations</span>
          </h1>

          <p className="text-counter-600 text-base md:text-lg max-w-xl leading-relaxed font-body">
            A state-of-the-art, multi-tenant POS register system synchronizing sales, invoices, stock, and ledger entries with <span className="text-paper font-semibold">Zoho Books</span> in real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <button 
              onClick={handleLogin}
              className="focus-ring bg-brass-500 hover:bg-brass-400 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2.5 cursor-pointer border border-brass-400/25 active:scale-[0.98]"
            >
              <LogIn className="w-4.5 h-4.5" />
              <span>Launch Live register console</span>
              <ArrowRight className="w-4.5 h-4.5 ml-1 text-brass-100" />
            </button>
            
            <button 
              onClick={handleSignup}
              className="focus-ring bg-counter-800 hover:bg-counter-900 text-paper border border-counter-700/80 font-semibold py-4 px-8 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-sm"
            >
              <span>Onboard Store Free</span>
            </button>
          </div>

          {/* Core Trust Stats */}
          <div className="pt-8 border-t border-counter-700/80 grid grid-cols-3 gap-6 text-left">
            <div>
              <span className="block text-2xl md:text-3xl font-bold font-display text-paper">Real-time</span>
              <span className="text-xs text-counter-600 font-mono uppercase tracking-wider block mt-0.5">Ledger Sync</span>
            </div>
            <div>
              <span className="block text-2xl md:text-3xl font-bold font-display text-paper">99.99%</span>
              <span className="text-xs text-counter-600 font-mono uppercase tracking-wider block mt-0.5">Uptime SLA</span>
            </div>
            <div>
              <span className="block text-2xl md:text-3xl font-bold font-display text-paper">40+</span>
              <span className="text-xs text-counter-600 font-mono uppercase tracking-wider block mt-0.5">Countries Mapped</span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Mockup Column - Fully Interactive POS! */}
        <div id="demo" className="lg:col-span-6 relative mt-8 lg:mt-0">
          <div className="absolute -inset-2 bg-gradient-to-r from-brass-500/10 to-transparent rounded-3xl blur-xl pointer-events-none" />
          
          <div className="relative w-full bg-counter-800 rounded-3xl border border-counter-700 shadow-drawer overflow-hidden p-6 flex flex-col justify-between">
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-counter-700 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-clay" />
                <div className="w-2.5 h-2.5 rounded-full bg-brass-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-mint" />
                <span className="text-[10px] text-counter-600 font-mono ml-1.5 uppercase tracking-wider font-semibold">terminal-register-01</span>
              </div>
              <div className="flex items-center gap-1.5 bg-mint/10 border border-mint/20 text-mint text-[9px] font-mono px-2.5 py-1 rounded-full font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                <span>ONLINE LEDGER SECURED</span>
              </div>
            </div>

            {/* Selector for Sectors */}
            <div className="grid grid-cols-4 gap-1.5 bg-counter-900 p-1 rounded-xl mt-4">
              {['retail', 'restaurant', 'cafe', 'supermarket'].map(sec => (
                <button
                  key={sec}
                  onClick={() => {
                    setActiveTab(sec);
                    // Prepopulate cart with different items on tab change
                    const items = MOCK_ITEMS[sec];
                    setMockCart([
                      { ...items[0], qty: 1 },
                      { ...items[1], qty: 2 }
                    ]);
                  }}
                  className={`text-[10px] font-bold uppercase tracking-wide py-2 px-1 rounded-lg transition-all cursor-pointer ${
                    activeTab === sec 
                      ? 'bg-counter-800 text-brass-500 shadow-sm' 
                      : 'text-counter-600 hover:text-paper hover:bg-counter-800/40'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            {/* Interactive Checkout Grid */}
            <div className="flex-1 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-left">
              {/* Product Shelf (Mock Catalog) */}
              <div className="col-span-1 md:col-span-7 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-counter-600 uppercase tracking-wider block">Product Catalog</span>
                  <span className="text-[9px] text-brass-500 font-mono">Click to ring item</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MOCK_ITEMS[activeTab].map(item => (
                    <button
                      key={item.sku}
                      onClick={() => addMockItem(item)}
                      className="bg-counter-900 hover:bg-counter-900/60 p-3 rounded-xl border border-counter-700/60 hover:border-brass-500/20 text-left transition-all group flex items-start gap-2.5 focus-ring cursor-pointer"
                    >
                      <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">{item.icon}</span>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-paper text-xs truncate leading-tight">{item.name}</h4>
                        <p className="text-[10px] text-counter-600 font-mono mt-0.5">${item.rate.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart Receipt & Calc */}
              <div className="col-span-1 md:col-span-5 bg-counter-900 p-3 rounded-2xl border border-counter-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-counter-700 pb-2 mb-2">
                    <span className="text-[9px] font-bold text-counter-600 uppercase tracking-wider flex items-center gap-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-brass-500" /> Shopping Cart
                    </span>
                    {mockCart.length > 0 && (
                      <button onClick={clearMockCart} className="text-[9px] font-mono text-clay hover:underline">Clear</button>
                    )}
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[140px] pr-0.5">
                    {mockCart.length === 0 ? (
                      <div className="py-8 text-center text-counter-600 text-xs flex flex-col items-center justify-center gap-1.5">
                        <ShoppingCart className="w-6 h-6 text-counter-700" />
                        <span>Cart is empty</span>
                      </div>
                    ) : (
                      mockCart.map(i => (
                        <div key={i.sku} className="flex items-center justify-between text-[11px] bg-counter-800 p-1.5 rounded-lg border border-counter-700/40">
                          <div className="min-w-0">
                            <span className="font-bold text-paper block truncate">{i.icon} {i.name}</span>
                            <span className="text-[9px] text-counter-600 font-mono">${i.rate.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={() => updateMockQty(i.sku, i.qty - 1)}
                              className="w-4 h-4 bg-counter-900 hover:bg-counter-700 border border-counter-700 flex items-center justify-center text-[10px] rounded text-paper cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-paper font-semibold w-4 text-center text-[10px]">{i.qty}</span>
                            <button 
                              onClick={() => updateMockQty(i.sku, i.qty + 1)}
                              className="w-4 h-4 bg-counter-900 hover:bg-counter-700 border border-counter-700 flex items-center justify-center text-[10px] rounded text-paper cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Calculation */}
                <div className="border-t border-counter-700 pt-3 mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-counter-600 text-[10px]">
                    <span>Subtotal:</span>
                    <span className="font-mono">${mockSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-counter-600 text-[10px]">
                    <span>Sales Tax (8%):</span>
                    <span className="font-mono">${mockTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-paper text-sm border-t border-counter-700/40 pt-1.5 mt-1">
                    <span>Total:</span>
                    <span className="font-mono text-brass-500">${mockTotal.toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={triggerMockCheckout}
                    disabled={mockCart.length === 0}
                    className="w-full mt-2.5 bg-brass-500 hover:bg-brass-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <CreditCard className="w-3.5 h-3.5 animate-pulse" />
                    <span>Process Mock Checkout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Terminal Footer */}
            <div className="border-t border-counter-700 pt-3 flex items-center justify-between text-[9px] text-counter-600 font-mono font-semibold">
              <span className="flex items-center gap-1">
                <Store className="w-3 h-3 text-brass-500" /> Mode: Local Trial Mode
              </span>
              <span>v2.0.0 Stable</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Grid */}
      <section id="features" className="bg-counter-900/60 border-y border-counter-700/60 py-24 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brass-500 font-mono">Premium Capabilities</h2>
            <h3 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-paper">
              Engineered for Speed & Direct Sync
            </h3>
            <p className="text-counter-600 text-sm font-body leading-relaxed">
              Every tool required to process high-velocity sales transactions, run offline register, and balance ledger accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-counter-800 border border-counter-700 p-6 rounded-2xl flex flex-col justify-between group hover:border-brass-500/20 transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500 shadow-inner">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-paper text-base text-left">Real-Time Sync</h4>
                <p className="text-counter-600 text-xs leading-relaxed text-left font-body">
                  Sales logs, catalog items, and tax structures are pushed instantly into your Zoho Books general ledger with automated journal entries.
                </p>
              </div>
            </div>

            <div className="bg-counter-800 border border-counter-700 p-6 rounded-2xl flex flex-col justify-between group hover:border-brass-500/20 transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500 shadow-inner">
                  <Globe className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-paper text-base text-left">Global Mappings</h4>
                <p className="text-counter-600 text-xs leading-relaxed text-left font-body">
                  Supports multiple currencies (LKR, INR, USD, GBP) with automatic country telephone dialing codes. Perfect for localized operations.
                </p>
              </div>
            </div>

            <div className="bg-counter-800 border border-counter-700 p-6 rounded-2xl flex flex-col justify-between group hover:border-brass-500/20 transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500 shadow-inner">
                  <WifiOff className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-paper text-base text-left">Offline Protection</h4>
                <p className="text-counter-600 text-xs leading-relaxed text-left font-body">
                  Keep ringing sales even during internet drops. Cash register cache queues failed invoice requests and auto-uploads them when online.
                </p>
              </div>
            </div>

            <div className="bg-counter-800 border border-counter-700 p-6 rounded-2xl flex flex-col justify-between group hover:border-brass-500/20 transition-all hover:-translate-y-1 shadow-sm">
              <div className="space-y-4">
                <div className="w-11 h-11 rounded-xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500 shadow-inner">
                  <Users2 className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-paper text-base text-left">Roles & Shift Controls</h4>
                <p className="text-counter-600 text-xs leading-relaxed text-left font-body">
                  Define user levels: Master Admins, Managers, and Cashiers. Monitor daily shifting cash drawer opening float declarations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Zoho Books Integration Diagram */}
      <section id="integration" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-counter-800 to-counter-900 border border-counter-700 rounded-3xl p-8 md:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative overflow-hidden shadow-sm">
          <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-brass-500/5 blur-[80px] pointer-events-none" />
          
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brass-500/10 border border-brass-500/30 text-brass-600 text-[10px] font-mono font-bold uppercase rounded-full tracking-wider">
              Sync Ecosystem
            </div>
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold font-display tracking-tight text-paper leading-tight">
              A Direct Pipeline to your Zoho Books Ledger Accounts
            </h3>
            <p className="text-counter-600 text-sm leading-relaxed font-body">
              Say goodbye to double-entry errors. Our advanced background integration queries, creates, and reconciles invoices, stock sheets, and customer databases immediately as they happen in our POS interface.
            </p>
            <ul className="space-y-3 pt-2 text-xs font-semibold text-paper">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/15 text-mint flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Map dynamic inventory stock rates to item sheets</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/15 text-mint flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Autopopulate payments into journal books</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-mint/15 text-mint flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>Create customer profile on checkout with zero lag</span>
              </li>
            </ul>
            <div className="pt-4">
              <button 
                onClick={handleLogin}
                className="focus-ring bg-brass-500 hover:bg-brass-400 text-white font-bold py-3 px-6 rounded-xl shadow transition-all text-xs inline-flex items-center gap-1.5 cursor-pointer border border-brass-400/25 active:scale-[0.98]"
              >
                <span>Connect Zoho Books Account</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Flow visual infographic */}
          <div className="lg:col-span-5 bg-counter-800 border border-counter-700 p-6 rounded-2xl space-y-4 shadow-inner">
            <span className="text-[9.5px] text-counter-600 font-bold uppercase tracking-wider block text-left">Synchronization Lifecycle</span>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-counter-900/60 p-3 rounded-xl border border-counter-700/60 text-xs">
                <div className="w-8 h-8 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-500 font-bold shrink-0">1</div>
                <div className="text-left">
                  <h5 className="font-semibold text-paper">Checkout Declared</h5>
                  <p className="text-[10px] text-counter-600">POS logs cash / card receipt</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-counter-900/60 p-3 rounded-xl border border-counter-700/60 text-xs">
                <div className="w-8 h-8 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-500 font-bold shrink-0">2</div>
                <div className="text-left">
                  <h5 className="font-semibold text-paper">Catalyst Advanced I/O Push</h5>
                  <p className="text-[10px] text-counter-600">Secure secure serverless microservice trigger</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-counter-900/60 p-3 rounded-xl border border-counter-700/60 text-xs">
                <div className="w-8 h-8 rounded-lg bg-mint/10 border border-mint/20 flex items-center justify-center text-mint font-bold shrink-0">3</div>
                <div className="text-left">
                  <h5 className="font-semibold text-mint">Ledger Reconciliation</h5>
                  <p className="text-[10px] text-counter-600">Invoice instantly balanced inside Zoho Books</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Zero-Trust Security & Compliance Section */}
      <section id="compliance" className="bg-counter-900/60 border-y border-counter-700/60 py-24 px-6 lg:px-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <div className="bg-counter-800 border border-counter-700 p-8 rounded-3xl space-y-6 text-left shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-brass-500/10 border border-brass-400/20 flex items-center justify-center text-brass-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-paper font-display">Compliance & Trust Framework</h4>
              <p className="text-xs text-counter-600 leading-relaxed font-body">
                Completely hosted inside Zoho Catalyst secure micro-computing nodes, offering bulletproof tenant isolation.
              </p>
              <div className="space-y-3 pt-2 text-xs font-mono text-counter-600">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brass-500 shrink-0" />
                  <span>AES-256 Cloud Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-brass-500 shrink-0" />
                  <span>ISO 27001 Datacenters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brass-500 shrink-0" />
                  <span>Catalyst App Authentication</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6 text-left">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brass-500 font-mono">Enterprise Standard</h2>
            <h3 className="text-3xl md:text-4xl font-bold font-display tracking-tight text-paper">
              Zero Server Management. Absolute Cloud Security.
            </h3>
            <p className="text-counter-600 text-sm leading-relaxed font-body">
              Never worry about database migrations, server patch logs, or scale crashes. CloudHub POS handles millions of transactions per second on an automated, zero-overhead elastic infrastructure. Every signup spins up its isolated register instance.
            </p>
            <div className="pt-2">
              <button 
                onClick={handleLogin}
                className="focus-ring bg-counter-800 hover:bg-counter-900 text-paper border border-counter-700 font-semibold py-3 px-6 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:border-counter-700"
              >
                <span>Read security whitepaper</span>
                <ChevronRight className="w-4 h-4 text-counter-600" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="bg-counter-800 border-t border-counter-700/60 px-6 lg:px-16 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brass-500 to-amber-500 text-white flex items-center justify-center font-bold text-base">
              C
            </div>
            <div className="text-left">
              <span className="font-display font-bold text-base tracking-tight text-paper block">CloudHub POS Suite</span>
              <span className="text-[8px] font-mono uppercase text-counter-600 block mt-0.5">© 2026 CloudHub Node. All rights reserved. Deployed on Catalyst.</span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-counter-600 font-mono">
            <a href="#" className="hover:text-brass-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brass-500 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-brass-500 transition-colors">Developer API</a>
          </div>
        </div>
      </footer>

      {/* Checkout Success Mockup Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-counter-800 border border-counter-700 max-w-sm w-full rounded-3xl p-6 shadow-drawer relative animate-scaleIn text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-mint/10 border border-mint/20 flex items-center justify-center text-mint mb-3 animate-bounce">
              <Check className="w-6 h-6" />
            </div>

            <h3 className="font-display font-bold text-paper text-lg">Sales Checkout Cleared!</h3>
            <p className="text-[11px] text-counter-600 mt-1">Mock sale completed inside the sandbox. Here is your checkout slip:</p>

            {/* Simulated Printed Receipt */}
            <div className="bg-counter-900 border border-counter-700/60 rounded-xl p-4 w-full mt-4 text-left font-mono text-[10px] text-counter-600 space-y-2">
              <div className="text-center border-b border-dashed border-counter-700 pb-2 mb-2">
                <span className="font-bold text-paper text-xs uppercase block">CLOUDHUB TRIAL STORE</span>
                <span>REGISTER TERMINAL #01</span>
              </div>
              <div className="flex justify-between">
                <span>TXN CODE:</span>
                <span className="text-paper font-semibold">{checkoutTxnCode}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE / TIME:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div className="border-t border-dashed border-counter-700 pt-2 my-2 space-y-1">
                {mockCart.map(i => (
                  <div key={i.sku} className="flex justify-between text-paper">
                    <span>{i.name} (x{i.qty})</span>
                    <span>${(i.rate * i.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-counter-700 pt-2 flex justify-between font-bold text-paper text-xs">
                <span>TOTAL RECONCILED:</span>
                <span className="text-brass-500">${mockTotal.toFixed(2)}</span>
              </div>
              <div className="text-[8px] text-center text-counter-600 pt-2 border-t border-dashed border-counter-700/60 mt-1">
                IN SANDBOX DEMO MODE. REAL LEDGER ACCOUNT INTEGRATION IS LOCKED TO REGISTERED NODES.
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-4">
              <button
                onClick={handleLogin}
                className="w-full bg-brass-500 hover:bg-brass-400 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Sync Real Ledger</span>
              </button>
              <button
                onClick={() => setMockCheckoutOpen(false)}
                className="w-full bg-counter-900 hover:bg-counter-900/60 text-counter-600 font-bold py-2.5 rounded-xl text-xs cursor-pointer border border-counter-700"
              >
                Continue Demo Shopping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Auth gate: shows a loading screen while Catalyst auth is being checked.
// If unauthenticated, displays the beautiful, premium marketing website or custom login.
function AuthGate({ children }) {
  const { authStatus } = useAppState();

  if (authStatus === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-counter-950">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-brass-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-counter-600 text-sm font-medium font-body">
            Verifying cloud session…
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === false) {
    return (
      <Routes>
        <Route path="/" element={<POSLandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return children;
}

function AppContent() {
  const { authStatus, posSettings, user } = useAppState();

  // Backward compatibility safety: if the store has been configured previously, consider them onboarded.
  const isOnboarded = posSettings && (posSettings.onboarded === true || (posSettings.store_name && posSettings.store_name !== 'CloudHub POS'));

  // Ensure returning users do not flash the Onboarding modal while profile is checking/loading
  if (authStatus === true && !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-counter-950">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-brass-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-counter-600 text-sm font-medium font-body font-semibold">
            Loading secure store profile…
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === true && !isOnboarded) {
    return <OnboardingModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<Products />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<Users />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </AppStateProvider>
  );
}
