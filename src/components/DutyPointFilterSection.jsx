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
import { resolvePoliceRank, stripRankFromName } from '../utils/rankResolver';

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
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
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

  // Unique Zones with personnel count
  const zoneStats = useMemo(() => {
    const map = {};
    (records || []).forEach(r => {
      const z = (r.zone || '').trim();
      if (!z) return;
      if (!map[z]) map[z] = 0;
      map[z]++;
    });
    return map;
  }, [records]);
  const uniqueZones = useMemo(() => Object.keys(zoneStats).sort(), [zoneStats]);

  // Unique Sectors (cascaded by selectedZone) with personnel count
  const sectorStats = useMemo(() => {
    const map = {};
    (records || []).forEach(r => {
      if (selectedZone !== 'ALL' && (r.zone || '').trim() !== selectedZone) return;
      const s = (r.sector || '').trim();
      if (!s) return;
      if (!map[s]) map[s] = 0;
      map[s]++;
    });
    return map;
  }, [records, selectedZone]);
  const uniqueSectors = useMemo(() => Object.keys(sectorStats).sort(), [sectorStats]);

  // Extract unique duty points (cascaded by selectedZone and selectedSector)
  const dutyPointStats = useMemo(() => {
    const map = {};
    (records || []).forEach(r => {
      if (selectedZone !== 'ALL' && (r.zone || '').trim() !== selectedZone) return;
      if (selectedSector !== 'ALL' && (r.sector || '').trim() !== selectedSector) return;
      const p = (r.duty_place || '').trim();
      if (!p) return;
      if (!map[p]) map[p] = [];
      map[p].push(r);
    });
    return map;
  }, [records, selectedZone, selectedSector]);
  const uniqueDutyPoints = useMemo(() => Object.keys(dutyPointStats).sort(), [dutyPointStats]);

  // Selected personnel list based on Zone, Sector, Duty Point, Attendance & Search filters
  const displayedPersonnel = useMemo(() => {
    let list = records || [];

    // 1. Zone filter
    if (selectedZone !== 'ALL') {
      list = list.filter(p => (p.zone || '').trim() === selectedZone);
    }

    // 2. Sector filter
    if (selectedSector !== 'ALL') {
      list = list.filter(p => (p.sector || '').trim() === selectedSector);
    }

    // 3. Duty point filter
    if (selectedPoint !== 'ALL') {
      list = list.filter(p => (p.duty_place || '').trim() === selectedPoint);
    }

    // 4. Attendance filter
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

    // 5. Text search query
    if (pointSearchQuery.trim()) {
      const q = pointSearchQuery.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.mobile || '').includes(q) ||
        (p.duty_place || '').toLowerCase().includes(q) ||
        (p.posting || '').toLowerCase().includes(q) ||
        (p.district || '').toLowerCase().includes(q) ||
        (p.zone || '').toLowerCase().includes(q) ||
        (p.sector || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, selectedZone, selectedSector, selectedPoint, attendanceFilter, activeAttendance, pointSearchQuery]);

  // Handle Zone Change with automatic reset of child filters
  const handleZoneChange = (zVal) => {
    setSelectedZone(zVal);
    setSelectedSector('ALL');
    setSelectedPoint('ALL');
  };

  // Handle Sector Change with automatic reset of duty point
  const handleSectorChange = (sVal) => {
    setSelectedSector(sVal);
    setSelectedPoint('ALL');
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedZone('ALL');
    setSelectedSector('ALL');
    setSelectedPoint('ALL');
    setPointSearchQuery('');
    setAttendanceFilter('ALL');
  };

  // Point Attendance Statistics for currently filtered personnel list
  const pointTotal = displayedPersonnel.length;
  const pointPersonnelList = displayedPersonnel;
  
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

  // Grand live stats across all records for the selected checkingDate
  const totalRecordsCount = records.length;
  const grandPresentCount = useMemo(() => {
    return records.filter(p => {
      const att = activeAttendance[p.id];
      return att?.status === 'present' || (att?.reported && att?.status !== 'absent');
    }).length;
  }, [records, activeAttendance]);

  const grandAbsentCount = useMemo(() => {
    return records.filter(p => activeAttendance[p.id]?.status === 'absent').length;
  }, [records, activeAttendance]);

  const grandPendingCount = Math.max(0, totalRecordsCount - grandPresentCount - grandAbsentCount);
  const grandPresentPercent = totalRecordsCount > 0 ? Math.round((grandPresentCount / totalRecordsCount) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* 1. COHESIVE BENTO GRID ROW: EVENT, CHECKING DATE & REAL-TIME ATTENDANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 no-print">
        {/* Left Bento Card (7 cols): Event & Checking Date Control */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shrink-0">
                <Layers className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div className="min-w-0">
                <span className="card-subhead">ड्यूटी का प्रकार</span>
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate leading-tight mt-0.5">
                  {eventTitle || 'सक्रिय सुरक्षा व्यवस्था'}
                </h2>
              </div>
            </div>

            <button
              onClick={() => setIsCheckingReportOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition active:scale-[0.98] cursor-pointer shrink-0"
              title="आधिकारिक दैनिक चेकिंग रिपोर्ट A4 प्रोफ़ार्मा खोलें"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>दैनिक चेकिंग रिपोर्ट</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>चेकिंग दिनांक:</span>
              </label>
              <input
                type="date"
                value={checkingDate}
                onChange={(e) => setCheckingDate(e.target.value)}
                className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-mono text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              />
              <button
                onClick={handleSetTodayDate}
                className="h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition cursor-pointer shadow-2xs"
                title="आज की दिनांक चुनें"
              >
                आज
              </button>
            </div>

            {events.length > 1 && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500 font-medium shrink-0">इवेंट:</label>
                <select
                  value={activeEventId}
                  onChange={(e) => {
                    onSelectActiveEvent?.(e.target.value);
                    setSelectedPoint('ALL');
                  }}
                  className="h-8 bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 text-xs font-semibold rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.records?.length || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Bento Card (5 cols): Live Force Attendance Meter Bar with 4px rounded-full progress bar */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <span className="card-subhead">दैनिक बल उपस्थिति</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                    {grandPresentPercent}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (कुल बल: <strong className="font-mono text-slate-800">{totalRecordsCount}</strong>)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono">
                उपस्थित: <strong>{grandPresentCount}</strong>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-mono">
                गैरहाजिर: <strong>{grandAbsentCount}</strong>
              </span>
            </div>
          </div>

          {/* Visual 4px Rounded-Full Deployment Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalRecordsCount > 0 ? (grandPresentCount / totalRecordsCount) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`उपस्थित: ${grandPresentCount}`}
              />
              <div
                style={{ width: `${totalRecordsCount > 0 ? (grandAbsentCount / totalRecordsCount) * 100 : 0}%` }}
                className="bg-rose-500 h-full transition-all duration-300"
                title={`गैरहाजिर: ${grandAbsentCount}`}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>लंबित उपस्थिति: {grandPendingCount}</span>
              <span className="text-emerald-700 font-semibold font-mono">{grandPresentPercent}% रिपोर्टेड</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Filter Panel with Unified Height (h-9) & Subtle Focus Rings */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <MapPin className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                ड्यूटी पॉइंट आधारित बल फ़िल्टर एवं उपस्थिति
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                ड्यूटी स्थल का चयन करें और तैनात पुलिसकर्मियों की उपस्थिति लाइव मार्क करें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>कुल ड्यूटी पॉइंट्स: <strong className="font-mono text-slate-900">{uniqueDutyPoints.length}</strong></span>
          </div>
        </div>

        {/* CASCADING FILTER CONTROLS: UNIFORM HEIGHT (h-9) & SUBTLE FOCUS RINGS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. ZONE SELECTOR */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>1. ज़ोन:</span>
              {selectedZone !== 'ALL' && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-mono font-medium">
                  सक्रिय
                </span>
              )}
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedZone}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="w-full h-9 appearance-none pl-8 pr-7 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer shadow-2xs truncate"
              >
                <option value="ALL">
                  समस्त ज़ोन ({uniqueZones.length})
                </option>
                {uniqueZones.map((z) => (
                  <option key={z} value={z}>
                    {z} ({zoneStats[z]} जवान)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. SECTOR SELECTOR */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>2. सेक्टर:</span>
              {selectedSector !== 'ALL' && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-mono font-medium">
                  सक्रिय
                </span>
              )}
            </label>
            <div className="relative">
              <Layers className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedSector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full h-9 appearance-none pl-8 pr-7 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer shadow-2xs truncate"
              >
                <option value="ALL">
                  समस्त सेक्टर ({uniqueSectors.length})
                </option>
                {uniqueSectors.map((s) => (
                  <option key={s} value={s}>
                    {s} ({sectorStats[s]} जवान)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 3. DUTY POINT SELECTOR */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>3. ड्यूटी पॉइंट:</span>
              {selectedPoint !== 'ALL' && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-mono font-medium">
                  सक्रिय
                </span>
              )}
            </label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedPoint}
                onChange={(e) => setSelectedPoint(e.target.value)}
                className="w-full h-9 appearance-none pl-8 pr-7 bg-white hover:bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer shadow-2xs truncate"
              >
                <option value="ALL">
                  समस्त पॉइंट ({uniqueDutyPoints.length})
                </option>
                {uniqueDutyPoints.map((point) => {
                  const count = dutyPointStats[point]?.length || 0;
                  return (
                    <option key={point} value={point}>
                      {point} ({count} जवान)
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 4. TEXT SEARCH FILTER */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 block">
                4. खोजें:
              </label>
              {(selectedZone !== 'ALL' || selectedSector !== 'ALL' || selectedPoint !== 'ALL' || pointSearchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                >
                  रीसेट ✕
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={pointSearchQuery}
                onChange={(e) => setPointSearchQuery(e.target.value)}
                placeholder="नाम, मोबाइल, PNO या थाना..."
                className="w-full h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
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
              <span>उपस्थित ({presentCount})</span>
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
              <span>गैरहाजिर ({absentCount})</span>
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
              <span>शेष / लंबित ({pendingCount})</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500">
            रियल-टाइम क्लाउड सिंक सक्रिय
          </div>
        </div>
      </div>

      {/* Selected Duty Point Force Table / Grid */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>तैनात बल सूची</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold shadow-2xs">
                {displayedPersonnel.length} पुलिसकर्मी
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              चयनित पॉइंट: <strong className="text-amber-900">{selectedPoint === 'ALL' ? 'समस्त ड्यूटी पॉइंट्स' : selectedPoint}</strong>
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
              const displayCleanName = stripRankFromName(cleanName);
              const effectiveRank = p.rank ? resolvePoliceRank(p.rank) : '';

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
                    </div>

                    {/* Officer Name & Posting */}
                    <div>
                      <h4 className="font-black text-slate-950 text-sm leading-snug">
                        {displayCleanName}
                      </h4>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        मूल तैनाती: <strong className="text-slate-900">{p.posting || '-'}</strong> {p.district ? `(${p.district})` : ''}
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
                          <span>उपस्थित</span>
                          {att?.time && <span className="font-mono text-[10px] text-emerald-600">({att.time})</span>}
                        </div>
                      ) : isAbsent ? (
                        <div className="flex items-center gap-1.5 font-bold text-rose-800">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>गैरहाजिर</span>
                          {att?.time && <span className="font-mono text-[10px] text-rose-600">({att.time})</span>}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>उपस्थिति लंबित</span>
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
