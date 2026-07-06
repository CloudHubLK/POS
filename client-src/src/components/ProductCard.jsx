import React, { useRef } from 'react';
import { motion } from 'framer-motion';

// Signature interaction: cards tilt toward the cursor like you're picking a real
// item up off a counter, then settle flat. Kept subtle — a few degrees, not a gimmick.
export default function ProductCard({ item, onAdd, currencySymbol = '$' }) {
  const ref = useRef(null);

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0px)';
  }

  const isLowStock = typeof item.stock === 'number' && item.stock <= 5;

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onAdd(item)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.96, translateZ: 0 }}
      className="tilt-card focus-ring text-left bg-counter-800 border border-counter-600/60
                 rounded-2xl p-4 flex flex-col justify-between h-36 shadow-counter
                 hover:border-brass-500/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] text-counter-600 uppercase tracking-wider">
          {item.sku || '—'}
        </span>
        {isLowStock && (
          <span className="text-[10px] font-mono text-clay bg-clay/10 px-1.5 py-0.5 rounded">
            LOW
          </span>
        )}
      </div>
      <h3 className="font-display font-medium text-sm text-paper leading-snug line-clamp-2">
        {item.name}
      </h3>
      <div className="flex items-end justify-between">
        <span className="font-mono text-brass-400 text-base">
          {currencySymbol}{(item.rate || 0).toFixed(2)}
        </span>
        <span className="text-[10px] text-counter-600 font-mono">
          {typeof item.stock === 'number' ? `${item.stock} left` : ''}
        </span>
      </div>
    </motion.button>
  );
}
