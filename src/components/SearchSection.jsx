import React, { useRef } from 'react';
import { Search, Smartphone, ShieldCheck, X, Calendar, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SearchSection({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  events = [],
  activeEventId = '',
  onSelectActiveEvent
}) {
  const { language, t } = useLanguage();
  const inputRef = useRef(null);

  const handleClear = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  // Strictly filter active (non-archived) events
  const activeEventsList = (events || []).filter(e => e.status !== 'archived');
  
  // Ensure selected event is always an active event
  const selectedEvent = activeEventsList.find(e => e.id === activeEventId) || activeEventsList[0];

  return (
    <div className="w-full max-w-xl mx-auto font-devanagari space-y-3 px-2 sm:px-0">
      {/* Duty Type Interactive Dropdown Bar (Mobile Responsive) */}
      {activeEventsList.length > 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 transition">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  {language === 'en' ? 'Active Event / Mela:' : 'सक्रिय ड्यूटी मेला:'}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {language === 'en' ? 'Active' : 'सक्रिय'}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate block mt-0.5">
                {selectedEvent?.title || (language === 'en' ? 'Select Event' : 'इवेंट चुनें')}
              </span>
            </div>
          </div>

          {/* If multiple active events, provide sleek selector dropdown */}
          {activeEventsList.length > 1 && (
            <div className="relative w-full sm:w-auto shrink-0">
              <select
                value={selectedEvent?.id || activeEventId}
                onChange={(e) => onSelectActiveEvent?.(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-black rounded-xl pl-3 pr-8 py-2 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs transition"
              >
                {activeEventsList.map((evt) => (
                  <option key={evt.id} value={evt.id} className="font-bold text-slate-900">
                    {evt.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 sm:top-3 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
          <p className="text-xs font-black text-amber-950">
            {language === 'en' ? '⚠️ No active duty event available at present.' : '⚠️ वर्तमान में कोई सक्रिय ड्यूटी मेला उपलब्ध नहीं है।'}
          </p>
          <p className="text-[11px] font-medium text-amber-800">
            {language === 'en' ? 'All events have been archived or completed.' : 'समस्त ड्यूटी इवेंट्स पूर्ण/आर्काइव कर दिए गए हैं।'}
          </p>
        </div>
      )}

      {/* Main Search Card (Optimized for Mobile Touch) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3.5 sm:space-y-4 text-center">
        {/* Title & Tagline */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] sm:text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{language === 'en' ? 'Ayodhya Police Digital Duty Pass' : 'अयोध्या पुलिस डिजिटल ड्यूटी पास'}</span>
          </div>

          <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
            {t('searchHeading', 'अपना ड्यूटी कार्ड खोजें')}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
            {t('searchSubheading', '10-अंकीय मोबाइल नंबर या अपना नाम दर्ज करें और तुरंत अपना ड्यूटी पास प्राप्त करें')}
          </p>
        </div>

        {/* Centered Search Box with Mobile-friendly Touch Sizing */}
        <div className="relative flex items-center">
          {/* Left Search/Phone Icon */}
          <div className="absolute left-3.5 sm:left-4 flex items-center justify-center pointer-events-none text-slate-400">
            <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          {/* Clean Input with pl-11 / pl-12 Padding */}
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit?.()}
            placeholder={language === 'en' ? 'Enter Mobile Number or Name...' : 'मोबाइल नंबर या नाम लिखें...'}
            className="w-full pl-11 sm:pl-12 pr-10 py-3 sm:py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white transition shadow-inner"
            autoFocus
          />

          {/* Clear Button */}
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-200/60 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title={language === 'en' ? 'Clear search' : 'खोज साफ़ करें'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
