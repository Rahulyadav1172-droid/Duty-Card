import React from 'react';
import { Eye } from 'lucide-react';

export default function VisitorCounter({
  count = 10427,
  variant = 'corner', // 'corner' | 'sidebar'
  className = ''
}) {
  const num = typeof count === 'number' && !isNaN(count) ? Math.max(0, count) : 10427;

  if (variant === 'sidebar') {
    return (
      <div className={`py-1.5 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center flex items-center justify-between text-[11px] text-slate-400 ${className}`}>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Eye className="w-3 h-3 text-slate-500 shrink-0" />
          <span>विज़िटर्स:</span>
        </span>
        <span className="font-mono text-slate-300 font-bold tracking-wide">
          {num.toLocaleString('en-IN')}
        </span>
      </div>
    );
  }

  // Default: 'corner' - small, discreet, quiet corner pill that doesn't highlight or distract
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 select-none shadow-2xs ${className}`}
      title={`कुल पोर्टल आगंतुक: ${num.toLocaleString('en-IN')}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0"></span>
      <span className="text-[10.5px] text-slate-400 font-medium">विज़िटर्स:</span>
      <span className="font-mono text-slate-300 font-semibold tracking-wider text-[11px]">
        {num.toLocaleString('en-IN')}
      </span>
    </div>
  );
}
