import React from 'react';

/**
 * Ultra-clean, modern iOS / Tailwind Toggle Switch
 * Completely text-free, self-explanatory visual feedback
 */
export default function ToggleSwitch({
  enabled,
  onChange,
  className = ''
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!enabled);
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 select-none ${
        enabled ? 'bg-emerald-600' : 'bg-slate-300'
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
