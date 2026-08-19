import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Users,
  Phone,
  Search,
  ShieldCheck,
  Filter,
  Layers,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  AlertCircle,
  Calendar,
  FileText,
  FileDown,
  Printer
} from 'lucide-react';
import CheckingReportModal from './CheckingReportModal';

/**
 * Helper to clean raw name string by stripping duplicate mobile numbers,
 * trailing commas, and separating clean name from posting/district.
 */
function cleanOfficerName(rawName = '', posting = '', district = '', mobile = '') {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();

  // Remove any 10-digit mobile numbers from the name text
  cleaned = cleaned.replace(/\b[6-9]\d{9}\b/g, '');
  if (mobile) {
    const cleanMob = String(mobile).trim();
    if (cleanMob.length >= 5) {
      cleaned = cleaned.replace(new RegExp(`\\b${cleanMob}\\b`, 'g'), '');
    }
  }

  // Remove redundant parentheses with rank if already included
  cleaned = cleaned.replace(/\(\s*(?:का0|उ0नि0|हे0का0|नि0|म0का0|म0उ0नि0|का०|उ०नि०|हे०कां०|नि०|कां०|हेकां|जवान)\s*\)/gi, '');

  // If rawName is comma-separated, take first segment
  const commaParts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  if (commaParts.length > 1) {
    cleaned = commaParts[0];
  }

  // Remove double commas, trailing/leading commas & spaces
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').replace(/^[\s,]+/, '').trim();

  return cleaned || rawName;
}

export default function DutyPointFilterSection({
  records = [],
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  eventTitle = '',
  eventSubtitle = '',
  attendanceMap = {},
  attendanceByDate = {},
  onMarkAttendance,
  userRole = 'guest'
}) {
  const [selectedPoint, setSelectedPoint] = useState('ALL');
  const [pointSearchQuery, setPointSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('ALL'); // 'ALL' | 'present' | 'absent' | 'pending'
  const [isCheckingReportOpen, setIsCheckingReportOpen] = useState(false);

  // Default Checking Date to Today (YYYY-MM-DD)
  const [checkingDate, setCheckingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Active attendance for the selected date
  const activeAttendance = useMemo(() => {
    if (attendanceByDate && attendanceByDate[checkingDate]) {
      return attendanceByDate[checkingDate];
    }
    return attendanceMap || {};
  }, [attendanceByDate, checkingDate, attendanceMap]);

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

  // Selected personnel list based on duty point filter & attendance filter
  const displayedPersonnel = useMemo(() => {
    let list = selectedPoint === 'ALL' ? (records || []) : (dutyPointStats[selectedPoint] || []);

    if (attendanceFilter !== 'ALL') {
      list = list.filter(p => {
        const att = activeAttendance[p.id];
        if (attendanceFilter === 'present') {
          return att?.status === 'present' || (att?.reported && att?.status !== 'absent');
        }
        if (attendanceFilter === 'absent') {
          return att?.status === 'absent';
        }
        if (attendanceFilter === 'pending') {
          return !att;
        }
        return true;
      });
    }

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
  }, [records, selectedPoint, dutyPointStats, pointSearchQuery, attendanceFilter, activeAttendance]);

  // Point Attendance Statistics for selected checking date
  const pointTotal = selectedPoint === 'ALL' ? records.length : (dutyPointStats[selectedPoint]?.length || 0);
  const pointPersonnelList = selectedPoint === 'ALL' ? records : (dutyPointStats[selectedPoint] || []);
  
  const presentCount = pointPersonnelList.filter(p => {
    const att = activeAttendance[p.id];
    return att?.status === 'present' || (att?.reported && att?.status !== 'absent');
  }).length;

  const absentCount = pointPersonnelList.filter(p => {
    const att = activeAttendance[p.id];
    return att?.status === 'absent';
  }).length;

  const pendingCount = Math.max(0, pointTotal - (presentCount + absentCount));

  const handleSetTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    setCheckingDate(today);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* Event Selector & Daily Checking Report Action Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold">ड्यूटी का प्रकार:</div>
            <div className="text-base font-black text-amber-400">{eventTitle || 'श्रावण झूला मेला'}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-300 shrink-0">इवेंट:</label>
              <select
                value={activeEventId}
                onChange={(e) => {
                  onSelectActiveEvent?.(e.target.value);
                  setSelectedPoint('ALL');
                }}
                className="bg-slate-800 text-white border border-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.title} ({evt.records?.length || 0} बल)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Trigger Official Checking Report Modal */}
          <button
            onClick={() => setIsCheckingReportOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            title="आधिकारिक दैनिक चेकिंग रिपोर्ट A4 प्रोफ़ार्मा खोलें"
          >
            <FileText className="w-4 h-4 stroke-[2.5]" />
            <span>📑 दैनिक चेकिंग रिपोर्ट (Print Proforma)</span>
          </button>
        </div>
      </div>

      {/* Date-Wise Checking Bar */}
      <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-black text-amber-950">
              📅 चेकिंग दिनांक (Inspection Date):
            </div>
            <div className="text-[11px] text-amber-800 font-medium">
              चयनित दिनांक के अनुसार बल की दैनिक उपस्थिति/गैरहाजिरी मार्क व रिकॉर्ड करें
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={checkingDate}
            onChange={(e) => setCheckingDate(e.target.value)}
            className="h-10 px-3 bg-white border border-amber-300 rounded-xl font-bold font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />

          <button
            onClick={handleSetTodayDate}
            className="h-10 px-3 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs rounded-xl transition cursor-pointer active:scale-95"
            title="आज की दिनांक चुनें"
          >
            आज (Today)
          </button>
        </div>
      </div>

      {/* Top Filter Panel with Dropdown */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                ड्यूटी पॉइंट आधारित बल फ़िल्टर एवं लाइव उपस्थिति
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                ड्यूटी स्थल का चयन करें और तैनात पुलिसकर्मियों की उपस्थिति/गैरहाजिरी लाइव मार्क करें
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

        {/* Realtime Attendance Metric Chips / Filter */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAttendanceFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                attendanceFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>समस्त बल ({pointTotal})</span>
            </button>

            <button
              onClick={() => setAttendanceFilter('present')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                attendanceFilter === 'present'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>🟢 उपस्थित ({presentCount})</span>
            </button>

            <button
              onClick={() => setAttendanceFilter('absent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                attendanceFilter === 'absent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>🔴 गैरहाजिर ({absentCount})</span>
            </button>

            <button
              onClick={() => setAttendanceFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                attendanceFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⚪ शेष / लंबित ({pendingCount})</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            📡 रियल-टाइम क्लाउड सिंक सक्रिय
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedPersonnel.length > 0 ? (
            displayedPersonnel.map((p, idx) => {
              const att = activeAttendance[p.id];
              const isPresent = att?.status === 'present' || (att?.reported && att?.status !== 'absent');
              const isAbsent = att?.status === 'absent';
              const canMark = userRole === 'senior' || userRole === 'admin';

              const rosterIndex = records.findIndex(r => r.id === p.id);
              const stableSerialNo = rosterIndex >= 0 ? rosterIndex + 1 : (idx + 1);
              const cleanName = cleanOfficerName(p.name, p.posting, p.district, p.mobile);

              return (
                <div
                  key={p.id || idx}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 shadow-xs relative ${
                    isPresent
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30'
                      : isAbsent
                      ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Row: Serial Number Badge & Rank */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-2xs" title={`रोस्टर क्रमांक: #${stableSerialNo}`}>
                          #{stableSerialNo}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-500">
                          ID: <strong className="text-slate-800">{p.id}</strong>
                        </span>
                      </div>

                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 font-black shrink-0 border border-amber-300">
                        {p.rank || 'जवान'}
                      </span>
                    </div>

                    {/* Officer Name & Posting */}
                    <div>
                      <h4 className="font-black text-slate-950 text-sm leading-snug">
                        {cleanName}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        थाना: <strong className="text-slate-900">{p.posting || 'थाना कोतवाली'}</strong> {p.district ? `(${p.district})` : ''}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono">
                      {p.zone || '-'} / {p.sector || '-'}
                    </div>

                    {selectedPoint === 'ALL' && (
                      <div className="text-[11px] text-amber-950 font-bold truncate bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-700 shrink-0" />
                        <span className="truncate">{p.duty_place}</span>
                      </div>
                    )}
                  </div>

                  {/* Attendance Status & Action Controls */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between text-xs">
                      {isPresent ? (
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>🟢 उपस्थित</span>
                          {att?.time && <span className="font-mono text-[10px] text-emerald-600">({att.time})</span>}
                        </div>
                      ) : isAbsent ? (
                        <div className="flex items-center gap-1.5 font-bold text-rose-800">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>🔴 गैरहाजिर</span>
                          {att?.time && <span className="font-mono text-[10px] text-rose-600">({att.time})</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>⚪ उपस्थिति लंबित</span>
                        </div>
                      )}

                      {p.mobile && (
                        <a
                          href={`tel:${p.mobile}`}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition"
                          title="कॉल करें"
                        >
                          <Phone className="w-3 h-3" />
                          <span className="font-mono text-[11px]">{p.mobile}</span>
                        </a>
                      )}
                    </div>

                    {/* Attendance Mark Buttons for Senior Officer & Admin */}
                    {canMark && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => onMarkAttendance?.(p.id, p.name, isPresent ? 'unmarked' : 'present', checkingDate)}
                          className={`py-1.5 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                            isPresent
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isPresent ? '✓ उपस्थित' : 'उपस्थित'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onMarkAttendance?.(p.id, p.name, isAbsent ? 'unmarked' : 'absent', checkingDate)}
                          className={`py-1.5 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                            isAbsent
                              ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/30'
                              : 'bg-rose-50 text-rose-900 border border-rose-300 hover:bg-rose-100'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isAbsent ? '✕ गैरहाजिर' : 'गैरहाजिर'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              इस फ़िल्टर के अंतर्गत कोई पुलिसकर्मी नहीं मिला।
            </div>
          )}
        </div>
      </div>

      {/* Official Checking Report Proforma Modal */}
      <CheckingReportModal
        isOpen={isCheckingReportOpen}
        onClose={() => setIsCheckingReportOpen(false)}
        eventTitle={eventTitle}
        eventSubtitle={eventSubtitle}
        records={records}
        attendanceMap={attendanceMap}
        attendanceByDate={attendanceByDate}
        selectedDate={checkingDate}
        onDateChange={(newDate) => setCheckingDate(newDate)}
      />
    </div>
  );
}
