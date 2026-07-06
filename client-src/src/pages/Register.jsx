import React, { useState } from 'react';
import Topbar from '../components/Topbar.jsx';
import ProductCard from '../components/ProductCard.jsx';
import CartDrawer from '../components/CartDrawer.jsx';
import { useAppState } from '../state/AppState.jsx';

export default function Register() {
  const { catalogItems, addToCart } = useAppState();
  const [query, setQuery] = useState('');

  const filtered = catalogItems.filter((item) =>
    (item.name || '').toLowerCase().includes(query.toLowerCase()) ||
    (item.sku || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title="Register" subtitle="Tap a product to add it to the current order" />
        <div className="px-8 pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SKU…"
            className="focus-ring w-full max-w-md bg-counter-800 border border-counter-700/60
                       rounded-xl px-4 py-2.5 text-sm text-paper placeholder:text-counter-600"
          />
        </div>
        <div className="perspective-deck flex-1 overflow-y-auto px-8 py-6">
          {filtered.length === 0 ? (
            <div className="text-center text-counter-600 mt-20">
              <p className="font-display text-lg">No products found</p>
              <p className="text-sm mt-1">Try a different search, or sync with Zoho Books.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((item) => (
                <ProductCard key={item.sku || item.books_item_id} item={item} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>
      <CartDrawer />
    </div>
  );
}
