import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useAppState } from '../state/AppState.jsx';
import { api } from '../api/client.js';

export default function CartDrawer() {
  const { cart, updateCartQty, clearCart, cartTotal, showToast } = useAppState();

  async function checkout() {
    if (cart.length === 0) return;
    try {
      const res = await api.createOrder({
        customer_name: 'Walk-in Customer',
        items: cart.map((c) => ({ sku: c.sku, name: c.name, rate: c.rate, qty: c.qty })),
        subtotal: cartTotal,
        tax_amount: 0,
        total: cartTotal,
        payment_mode: 'Cash'
      });
      if (!res || !res.success) throw new Error(res?.error || 'Checkout failed');
      showToast('Order completed and synced');
      clearCart();
    } catch (err) {
      showToast(err.message || 'Checkout failed', true);
    }
  }

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 shrink-0 h-full bg-counter-900 border-l border-counter-700/60
                 flex flex-col shadow-drawer"
    >
      <div className="px-5 py-5 border-b border-counter-700/60">
        <h2 className="font-display font-semibold text-paper">Current Order</h2>
        <p className="text-xs text-counter-600 font-mono mt-0.5">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <AnimatePresence initial={false}>
          {cart.length === 0 && (
            <p className="text-sm text-counter-600 text-center mt-10">Tap a product to add it here.</p>
          )}
          {cart.map((item) => (
            <motion.div
              key={item.sku}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24, height: 0 }}
              className="bg-counter-800 rounded-xl px-3 py-2.5 border border-counter-700/60"
            >
              <div className="flex justify-between items-start gap-2">
                <span className="text-sm text-paper font-medium leading-tight">{item.name}</span>
                <span className="font-mono text-brass-400 text-sm whitespace-nowrap">
                  ${(item.rate * item.qty).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateCartQty(item.sku, item.qty - 1)}
                  className="focus-ring w-6 h-6 rounded-md bg-counter-700 flex items-center justify-center text-counter-600 hover:text-paper"
                >
                  <Minus size={12} />
                </button>
                <span className="font-mono text-xs text-paper w-6 text-center">{item.qty}</span>
                <button
                  onClick={() => updateCartQty(item.sku, item.qty + 1)}
                  className="focus-ring w-6 h-6 rounded-md bg-counter-700 flex items-center justify-center text-counter-600 hover:text-paper"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => updateCartQty(item.sku, 0)}
                  className="focus-ring ml-auto w-6 h-6 rounded-md flex items-center justify-center text-counter-600 hover:text-clay"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="px-5 py-5 border-t border-counter-700/60">
        <div className="flex justify-between text-sm text-counter-600 mb-1">
          <span>Total</span>
          <span className="font-mono text-paper text-lg">${cartTotal.toFixed(2)}</span>
        </div>
        <button
          onClick={checkout}
          disabled={cart.length === 0}
          className="focus-ring w-full mt-3 py-3 rounded-xl bg-mint text-counter-950 font-semibold
                     hover:brightness-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Charge ${cartTotal.toFixed(2)}
        </button>
      </div>
    </motion.aside>
  );
}
