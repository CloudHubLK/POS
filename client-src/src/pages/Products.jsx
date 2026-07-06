import React from 'react';
import Topbar from '../components/Topbar.jsx';
import { useAppState } from '../state/AppState.jsx';

export default function Products() {
  const { catalogItems } = useAppState();

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      <Topbar title="Products" subtitle={`${catalogItems.length} items in your catalog`} />
      <div className="p-8">
        <div className="rounded-2xl border border-counter-700/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-counter-800 text-counter-600 text-xs uppercase font-mono">
              <tr>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Stock</th>
              </tr>
            </thead>
            <tbody>
              {catalogItems.map((item) => (
                <tr key={item.sku || item.books_item_id} className="border-t border-counter-700/40 hover:bg-counter-800/60">
                  <td className="px-4 py-3 font-mono text-counter-600">{item.sku || '—'}</td>
                  <td className="px-4 py-3 text-paper">{item.name}</td>
                  <td className="px-4 py-3 text-counter-600">{item.category || 'General'}</td>
                  <td className="px-4 py-3 text-right font-mono text-brass-400">${(item.rate || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-counter-600">{item.stock ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
