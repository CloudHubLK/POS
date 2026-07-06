import React from 'react';
import { motion } from 'framer-motion';
import { Package, Users, CloudCog, ReceiptText } from 'lucide-react';
import Topbar from '../components/Topbar.jsx';
import { useAppState } from '../state/AppState.jsx';

function StatCard({ icon: Icon, label, value, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="tilt-card bg-counter-800 border border-counter-700/60 rounded-2xl p-5 shadow-counter"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-lg bg-brass-500/10 flex items-center justify-center">
          <Icon size={17} className="text-brass-400" />
        </div>
      </div>
      <p className="text-2xl font-display font-semibold text-paper">{value}</p>
      <p className="text-xs text-counter-600 mt-1">{label}</p>
    </motion.div>
  );
}

export default function Dashboard() {
  const { catalogItems, connection, user } = useAppState();

  const stats = [
    { icon: Package, label: 'Products in catalog', value: catalogItems.length },
    { icon: CloudCog, label: 'Books connection', value: connection ? 'Connected' : 'Not connected' },
    { icon: Users, label: 'Signed in as', value: user?.name || user?.email || '—' },
    { icon: ReceiptText, label: 'Role', value: user?.role || '—' }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <Topbar title="Dashboard" subtitle="An overview of your terminal" />
      <div className="p-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={s.label} index={i} {...s} />)}
      </div>
    </div>
  );
}
