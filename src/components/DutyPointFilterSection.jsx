import React, { useState, useMemo } from 'react';
import { MapPin, Users, Phone, Search, ShieldCheck, Filter, Layers, ChevronDown } from 'lucide-react';

export default function DutyPointFilterSection({
  records,
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  eventTitle = ''
}) {
  const [selectedPoint, setSelectedPoint] = useState('ALL');
  const [pointSearchQuery, setPointSearchQuery] = useState('');

  // Extract all unique duty points and their count
  const dutyPointStats = useMemo(() => {
    const map = {};
    (records || []).forEach(r => {
      const p = (r.duty_place || '').trim();
      if (!p) return;
      if (!map[p]) map[p] = [];
      map[p].push(r);
    });
    return map;
  }, [records]);

  const uniqueDutyPoints = useMemo(() => Object.keys(dutyPointStats).sort(), [dutyPointStats]);

  // Selected personnel list based on duty point filter
  const displayedPersonnel = useMemo(() => {
    let list = selectedPoint === 'ALL' ? (records || []) : (dutyPointStats[selectedPoint] || []);
    if (pointSearchQuery.trim()) {
      const q = pointSearchQuery.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.mobile || '').includes(q) ||
        (p.duty_place || '').toLowerCase().includes(q) ||
        (p.posting || '').toLowerCase().includes(q) ||
        (p.district || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, selectedPoint, dutyPointStats, pointSearchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* Event Selector for Senior Officers */}
      {events.length > 0 && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">ड्यूटी का प्रकार:</div>
              <div className="text-base font-black text-amber-400">{eventTitle || 'श्रावण झूला मेला'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-300 shrink-0">इवेंट चुनें:</label>
            <select
              value={activeEventId}
              onChange={(e) => {
                onSelectActiveEvent?.(e.target.value);
                setSelectedPoint('ALL');
              }}
              className="bg-slate-800 text-white border border-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto cursor-pointer"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.records?.length || 0} बल)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top Filter Panel with Dropdown */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                ड्यूटी पॉइंट आधारित बल फ़िल्टर (Duty Point Inspector)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                किसी भी ड्यूटी स्थान का चयन करके वहां तैनात समस्त पुलिस बल की सूची देखें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <Users className="w-4 h-4 text-amber-600" />
            <span>कुल ड्यूटी पॉइंट्स: <strong className="font-mono text-slate-900">{uniqueDutyPoints.length}</strong></span>
          </div>
        </div>

        {/* PRIMARY DUTY POINT DROPDOWN SELECTOR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 block">
              ड्यूटी पॉइंट चुनें (Select Duty Point Dropdown):
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-amber-600 pointer-events-none" />
              <select
                value={selectedPoint}
                onChange={(e) => setSelectedPoint(e.target.value)}
                className="w-full appearance-none pl-10 pr-10 py-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition cursor-pointer shadow-2xs"
              >
                <option value="ALL">
                  🚩 समस्त बल (All Staff) — कुल {records.length} पुलिसकर्मी
                </option>
                {uniqueDutyPoints.map((point) => {
                  const count = dutyPointStats[point]?.length || 0;
                  return (
                    <option key={point} value={point}>
                      📍 {point} ({count} जवान तैनात)
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Quick Search within this Duty Point */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              जवान का नाम या मोबाइल नंबर से फ़िल्टर करें:
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={pointSearchQuery}
                onChange={(e) => setPointSearchQuery(e.target.value)}
                placeholder="नाम, मोबाइल, थाना या जिला टाइप करें..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Duty Point Force Table / Grid */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>तैनात बल सूची</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-bold">
                {displayedPersonnel.length} पुलिसकर्मी
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              चयनित पॉइंट: <strong className="text-amber-900">{selectedPoint === 'ALL' ? 'समस्त ड्यूटी पॉइंट्स (All Staff)' : selectedPoint}</strong>
            </p>
          </div>
        </div>

        {/* Personnel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPersonnel.length > 0 ? (
            displayedPersonnel.map((p, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between gap-2.5 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold shrink-0">
                      {p.rank || 'जवान'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600">
                    थाना: <strong className="text-slate-800">{p.posting || 'थाना कोतवाली'}</strong> {p.district ? `(${p.district})` : ''}
                  </div>

                  <div className="text-xs text-slate-500 font-mono">
                    ID: <strong>{p.id}</strong> | {p.zone || '-'} / {p.sector || '-'}
                  </div>

                  {selectedPoint === 'ALL' && (
                    <div className="text-xs text-amber-900 font-bold truncate bg-amber-50 p-1 rounded">
                      📍 {p.duty_place}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-xs font-mono font-bold text-slate-800">
                    📱 {p.mobile || '-'}
                  </span>

                  {p.mobile && (
                    <a
                      href={`tel:${p.mobile}`}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs"
                    >
                      <Phone className="w-3 h-3" />
                      कॉल
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-8 text-center text-slate-400 font-bold">
              इस फ़िल्टर के अंतर्गत कोई पुलिसकर्मी नहीं मिला।
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
