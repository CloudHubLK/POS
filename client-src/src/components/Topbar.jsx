import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppState } from '../state/AppState.jsx';

export default function Topbar({ title, subtitle }) {
  const { syncing, syncWithBooks, connection, toast, user } = useAppState();

  return (
    <>
      <header className="flex items-center justify-between px-8 py-5 border-b border-counter-700/60">
        <div>
          <h1 className="font-display text-xl font-semibold text-paper">{title}</h1>
          {subtitle && <p className="text-sm text-counter-600 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-xs font-mono text-counter-600 hidden sm:block">{user.email}</span>
          )}
          <button
            onClick={syncWithBooks}
            disabled={!connection || syncing}
            className="focus-ring flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl
                       bg-brass-500 text-counter-950 hover:bg-brass-400 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync with Books'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -16, x: '-50%' }}
            className={`fixed top-5 left-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-drawer
                        ${toast.isError ? 'bg-clay text-paper' : 'bg-mint text-counter-950'}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
