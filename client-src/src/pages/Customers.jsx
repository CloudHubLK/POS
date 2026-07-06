import React, { useEffect, useState } from 'react';
import Topbar from '../components/Topbar.jsx';
import { api } from '../api/client.js';

export default function Customers() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    api.contacts().then((res) => {
      if (res && res.success && Array.isArray(res.data)) setContacts(res.data);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <Topbar title="Customers" subtitle={`${contacts.length} contacts`} />
      <div className="p-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.length === 0 && (
          <p className="text-sm text-counter-600">No customers yet.</p>
        )}
        {contacts.map((c, i) => (
          <div key={c.contact_id || i} className="bg-counter-800 border border-counter-700/60 rounded-2xl p-4">
            <p className="font-display text-paper font-medium">{c.contact_name || c.name}</p>
            <p className="text-xs text-counter-600 mt-1">{c.email || 'No email on file'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
