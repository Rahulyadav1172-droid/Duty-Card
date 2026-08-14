import React, { useRef } from 'react';
import { Search, Smartphone, ShieldCheck, X, Calendar, ChevronDown } from 'lucide-react';

export default function SearchSection({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  events = [],
  activeEventId = '',
  onSelectActiveEvent
}) {
  const inputRef = useRef(null);

  const handleClear = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const activeEventsList = events.filter(e => e.status !== 'archived');
  const selectedEvent = events.find(e => e.id === activeEventId) || events[0];

  return (
    <div className="w-full max-w-xl mx-auto font-devanagari space-y-3">
      {/* Duty Type Interactive Dropdown Bar */}
      {activeEventsList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                ड्यूटी का प्रकार (Duty Event):
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                {selectedEvent?.title || 'इवेंट चुनें'}
              </span>
            </div>
          </div>

          <div className="relative shrink-0">
            <select
              value={activeEventId}
              onChange={(e) => onSelectActiveEvent?.(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-black rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs transition"
            >
              {activeEventsList.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Main Search Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 text-center">
        {/* Title & Tagline */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>अयोध्या पुलिस ड्यूटी कार्ड पोर्टल</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
            अपना ड्यूटी कार्ड खोजें
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
            10-अंकीय मोबाइल नंबर या अपना नाम दर्ज करें और तुरंत डिजिटल पास प्राप्त करें
          </p>
        </div>

        {/* Centered Search Box with Non-Overlapping Icon */}
        <div className="relative flex items-center">
          {/* Left Search/Phone Icon */}
          <div className="absolute left-4 flex items-center justify-center pointer-events-none text-slate-400">
            <Smartphone className="w-5 h-5" />
          </div>

          {/* Clean Input with pl-12 Padding */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
            placeholder="मोबाइल नंबर या नाम दर्ज करें..."
            className="w-full pl-12 pr-11 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white transition shadow-inner"
            autoFocus
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-200/60 hover:bg-slate-200 rounded-lg transition"
              title="खोज साफ़ करें"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
