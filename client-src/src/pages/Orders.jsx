import React, { useEffect, useState } from 'react';
import Topbar from '../components/Topbar.jsx';
import { api } from '../api/client.js';

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.orders().then((res) => {
      if (res && res.success && Array.isArray(res.data)) setOrders(res.data);
    }).catch(() => {});
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <Topbar title="Orders" subtitle={`${orders.length} recorded orders`} />
      <div className="p-8">
        <div className="rounded-2xl border border-counter-700/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-counter-800 text-counter-600 text-xs uppercase font-mono">
              <tr>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={o.ROWID || i} className="border-t border-counter-700/40 hover:bg-counter-800/60">
                  <td className="px-4 py-3 text-paper">{o.customer_name}</td>
                  <td className="px-4 py-3 text-counter-600">{o.status}</td>
                  <td className="px-4 py-3 text-right font-mono text-brass-400">${Number(o.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
