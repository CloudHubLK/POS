import React from 'react';
import Topbar from '../components/Topbar.jsx';
import { useAppState } from '../state/AppState.jsx';

export default function Settings() {
  const { connection, connectBooks, disconnectBooks, user } = useAppState();

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <Topbar title="Settings" subtitle="Connections and account" />
      <div className="p-8 max-w-xl space-y-6">
        <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-paper mb-1">Zoho Books</h3>
          <p className="text-sm text-counter-600 mb-4">
            {connection
              ? `Connected to ${connection.orgName || 'your organization'} (${connection.email})`
              : 'Connect your Zoho Books account to sync products and post invoices.'}
          </p>
          {connection ? (
            <button
              onClick={disconnectBooks}
              className="focus-ring px-4 py-2 rounded-xl text-sm font-medium bg-clay text-paper hover:brightness-95"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectBooks}
              className="focus-ring px-4 py-2 rounded-xl text-sm font-medium bg-brass-500 text-counter-950 hover:bg-brass-400"
            >
              Connect Zoho Books
            </button>
          )}
        </div>

        <div className="bg-counter-800 border border-counter-700/60 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-paper mb-1">Your account</h3>
          <p className="text-sm text-counter-600">{user?.email || 'Not signed in'}</p>
          <p className="text-sm text-counter-600 mt-1">Role: {user?.role || '—'}</p>
        </div>
      </div>
    </div>
  );
}
