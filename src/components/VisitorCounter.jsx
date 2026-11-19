import React from 'react';
import { Users, Eye, Activity } from 'lucide-react';

export default function VisitorCounter({
  count = 10427,
  uniqueCount = null,
  variant = 'footer', // 'footer' | 'header' | 'sidebar'
  className = ''
}) {
  const num = typeof count === 'number' && !isNaN(count) ? Math.max(0, count) : 10427;
  const numStr = String(num);
  // Pad to minimum 6 digits (e.g. "010427")
  const paddedStr = numStr.padStart(6, '0');
  const digits = paddedStr.split('');

  if (variant === 'header') {
    return (
      <div
        className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-slate-300 select-none shadow-xs transition hover:bg-slate-800 ${className}`}
        title={`कुल पोर्टल आगंतुक: ${num.toLocaleString('en-IN')}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="font-mono text-amber-200 font-extrabold tracking-wide">
          {num.toLocaleString('en-IN')}
        </span>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-center space-y-1.5 shadow-inner ${className}`}>
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>कुल आगंतुक / Visitors</span>
        </div>
        <div className="flex items-center justify-center gap-1 font-mono select-none">
          {digits.map((d, idx) => (
            <span
              key={idx}
              className="inline-flex items-center justify-center w-5 h-6 rounded-md bg-slate-950 border border-amber-500/30 text-amber-300 font-black text-xs shadow-xs"
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Default: 'footer' official UP Police Government-style odometer counter
  return (
    <div className={`flex flex-col items-center justify-center gap-2 pt-1 ${className}`}>
      <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-md backdrop-blur-xs">
        {/* Label */}
        <div className="flex items-center gap-2 text-slate-300 font-bold text-xs sm:text-[13px]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <Users className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="tracking-wide">कुल आगंतुक / Total Visitors:</span>
        </div>

        {/* Digital Odometer Boxes */}
        <div
          className="flex items-center gap-1 font-mono select-none"
          title={`कुल विजिट संख्या: ${num.toLocaleString('en-IN')}`}
          aria-label={`कुल आगंतुक संख्या: ${num}`}
        >
          {digits.map((d, idx) => (
            <span
              key={idx}
              className="inline-flex items-center justify-center w-6 sm:w-7 h-7 sm:h-8 rounded-lg bg-gradient-to-b from-slate-800 to-slate-950 border border-amber-500/50 text-amber-300 font-black text-sm sm:text-base shadow-xs"
            >
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
