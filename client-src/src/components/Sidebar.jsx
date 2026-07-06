import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ScanLine, Package, Users, ReceiptText, Settings, CloudCog } from 'lucide-react';
import { useAppState } from '../state/AppState.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/register', label: 'Register', icon: ScanLine },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export default function Sidebar() {
  const { connection } = useAppState();

  return (
    <aside className="w-60 shrink-0 h-full bg-counter-900 border-r border-counter-700/60
                       flex flex-col shadow-[8px_0_24px_-12px_rgba(0,0,0,0.5)] z-10">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brass-400 to-brass-600
                        flex items-center justify-center font-display font-bold text-counter-950 text-sm">
          C
        </div>
        <span className="font-display font-semibold tracking-tight text-paper">CloudHub POS</span>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors focus-ring
               ${isActive
                 ? 'bg-counter-700 text-paper font-medium'
                 : 'text-counter-600 hover:text-paper hover:bg-counter-800'}`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 mx-3 mb-4 rounded-xl bg-counter-800 border border-counter-700/60">
        <div className="flex items-center gap-2 text-xs font-mono">
          <CloudCog size={14} className={connection ? 'text-mint' : 'text-counter-600'} />
          <span className={connection ? 'text-mint' : 'text-counter-600'}>
            {connection ? `${connection.orgName || 'Zoho Books'}` : 'Books: not connected'}
          </span>
        </div>
      </div>
    </aside>
  );
}
