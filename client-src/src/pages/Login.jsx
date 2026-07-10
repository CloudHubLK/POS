import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAppState } from '../state/AppState.jsx';
import { ArrowLeft, Sparkles, ShieldCheck, Lock, Globe, Cpu, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { authStatus, checkCatalystAuth } = useAppState();
  const navigate = useNavigate();
  const [loadingWidget, setLoadingWidget] = useState(true);

  // If already authenticated, redirect to POS dashboard immediately
  if (authStatus === true) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (window.catalyst) {
      try {
        setLoadingWidget(true);
        window.catalyst.auth.signIn("catalyst-auth-container", {
          service_url: window.location.origin + "/app/index.html"
        });
        
        // Hide initial spinner once iframe is mounted and rendering
        const t = setTimeout(() => {
          setLoadingWidget(false);
        }, 1500);
        return () => clearTimeout(t);
      } catch (err) {
        console.error("Failed to initialize Catalyst Embedded Auth widget:", err.message);
        setLoadingWidget(false);
      }
    } else {
      console.error("Catalyst Web SDK is not available on the window object.");
      setLoadingWidget(false);
    }
  }, []);

  return (
    <div className="min-h-screen w-screen bg-counter-950 text-paper flex relative font-sans overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brass-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-brass-600/5 blur-[150px] pointer-events-none" />

      {/* Left Panel: Branding & Marketing (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-counter-900 border-r border-counter-700/60 p-16 flex-col justify-between relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-counter-900/80 via-counter-950/40 to-counter-900/60 z-0" />
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#332d27_1px,transparent_1px)] [background-size:24px_24px] opacity-30 z-0" />
        
        {/* Header Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brass-500 to-amber-500 text-white flex items-center justify-center shadow-lg font-display font-bold text-xl">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg tracking-tight text-paper">Aether POS</span>
              <span className="text-[9px] bg-brass-500/10 text-brass-500 font-bold px-2 py-0.5 rounded-full font-mono uppercase">V2.0</span>
            </div>
            <span className="text-[9px] font-mono uppercase text-counter-600 font-bold tracking-widest block -mt-0.5">Zoho Books Integration Hub</span>
          </div>
        </div>

        {/* Feature showcase */}
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brass-500/10 border border-brass-400/15 text-brass-500 text-xs font-semibold font-mono tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ENTERPRISE REGISTER GATEWAY</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold font-display text-paper tracking-tight leading-[1.15]">
            Experience a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brass-500 to-amber-500">beautifully unified</span> register.
          </h2>

          <p className="text-counter-600 text-sm leading-relaxed font-body">
            Manage physical retail transactions with absolute microservice reliability. Deployed on Catalyst's globally isolated serverless framework to guarantee zero lag, infinite scale, and immediate automated Zoho Books journal entries.
          </p>

          <div className="space-y-4 pt-4 border-t border-counter-700/60">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-mint shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-semibold text-paper">Absolute Tenant Isolation</p>
                <p className="text-[11px] text-counter-600">Your inventory, customers, and shifting records are encrypted with unique org boundaries.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-mint shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-semibold text-paper">Direct Zoho Ledger Sync</p>
                <p className="text-[11px] text-counter-600">Post transactions instantly without manual double-entry or background cron delays.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-mint shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-semibold text-paper">Multi-Role Staff Controls</p>
                <p className="text-[11px] text-counter-600">Assign specific permissions for cashiers, managers, and admins with secure override codes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-[10px] text-counter-600 font-mono font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brass-500" /> Secure SSL Nodes
          </span>
          <span>© 2026 Aether POS • Cloud Hub</span>
        </div>
      </div>

      {/* Right Panel: Embedded Auth Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md flex flex-col gap-6">
          
          {/* Mobile-only Top Brand Header */}
          <div className="flex lg:hidden items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brass-500 text-white flex items-center justify-center font-bold text-base">
                A
              </div>
              <span className="font-display font-semibold text-paper">Aether POS</span>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="text-xs text-counter-600 hover:text-paper font-semibold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {/* Core Login Card */}
          <div className="bg-counter-800/40 border border-counter-700/60 backdrop-blur-xl p-8 rounded-3xl shadow-drawer flex flex-col justify-between relative overflow-hidden">
            {/* Gloss border top accent */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brass-500/40 to-transparent" />
            
            <div className="mb-6 text-left">
              <button 
                onClick={() => navigate('/')}
                className="hidden lg:flex items-center gap-1.5 text-xs text-counter-600 hover:text-brass-500 transition-colors mb-4 font-semibold group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Landing Page</span>
              </button>
              
              <h1 className="font-display text-2xl font-bold text-paper">Secure Console Login</h1>
              <p className="text-xs text-counter-600 mt-1.5 leading-relaxed">
                Enter your merchant credentials to authenticate your register node. Session handled securely via Zoho Catalyst auth services.
              </p>
            </div>

            {/* Catalyst Auth Container */}
            <div className="relative min-h-[340px] flex flex-col items-center justify-center bg-counter-900/30 border border-counter-700/30 rounded-2xl p-4 overflow-hidden">
              {loadingWidget && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-counter-900/90 backdrop-blur-sm rounded-2xl">
                  <div className="w-8 h-8 border-3 border-brass-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-medium text-counter-600 font-mono">
                    Initializing Zoho auth interface…
                  </p>
                </div>
              )}
              
              {/* This is the unique element where the Zoho Catalyst SDK mounts its secure login frame */}
              <div id="catalyst-auth-container" className="w-full h-full" />
            </div>

            {/* Micro details */}
            <div className="mt-6 pt-5 border-t border-counter-700/40 flex justify-between items-center text-[10px] text-counter-600 font-mono">
              <span className="flex items-center gap-1">
                <Lock size={12} className="text-brass-500" /> End-to-End Cryptography
              </span>
              <span className="flex items-center gap-1">
                <Globe size={12} className="text-brass-500" /> Multi-region
              </span>
            </div>
          </div>

          {/* Helpful Tip */}
          <div className="bg-counter-900/40 border border-counter-700/40 p-4 rounded-2xl text-[11px] text-counter-600 text-left leading-relaxed">
            <span className="font-semibold text-brass-500 block mb-0.5 font-mono uppercase tracking-wide">First Time Onboarding?</span>
            Register a free account via the signup link inside the form, then choose your register's industry template to auto-seed catalog items and start ringing sales.
          </div>

        </div>
      </div>
    </div>
  );
}
