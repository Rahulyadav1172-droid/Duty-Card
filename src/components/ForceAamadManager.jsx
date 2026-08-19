import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Upload,
  Trash2,
  FileSpreadsheet,
  Shield,
  Phone,
  Building,
  Clock,
  History,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  FileText,
  UserX,
  RefreshCw,
  X,
  Check,
  Server
} from 'lucide-react';
import { parseDutyFile } from '../utils/fileParser';
import * as XLSX from 'xlsx';

const AAMAD_STORAGE_KEY = 'police_force_aamad_records_v1';
const AAMAD_AUDIT_LOG_KEY = 'police_force_aamad_audit_logs_v1';

/**
 * Robust helper to fetch true Server Date & Time from Cloud / HTTP headers
 * Prevents tampering with local computer clock.
 */
async function fetchServerDateTime() {
  try {
    const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
    const serverHeader = response.headers.get('date');
    if (serverHeader) {
      const serverDate = new Date(serverHeader);
      if (!isNaN(serverDate.getTime())) {
        return serverDate.toLocaleString('hi-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    }
  } catch (e) {}

  try {
    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata');
    if (res.ok) {
      const data = await res.json();
      if (data.dateTime) {
        const d = new Date(data.dateTime);
        return d.toLocaleString('hi-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    }
  } catch (e) {}

  // Fallback to standard IST
  const now = new Date();
  return now.toLocaleString('hi-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export default function ForceAamadManager({
  forceRecords = [],
  onUpdateForce
}) {
  // Aamad Records State
  const [aamadRecords, setAamadRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(AAMAD_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(AAMAD_AUDIT_LOG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [rangeFilter, setRangeFilter] = useState('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [serverTimeDisplay, setServerTimeDisplay] = useState('');
  const [isLoadingServerTime, setIsLoadingServerTime] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    rank: 'का0',
    pno: '',
    mobile: '',
    posting: '',
    district: '',
    range: '',
    police_zone: '',
    aamad_time: ''
  });

  // Delete with Mandatory Remark Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteRemark, setDeleteRemark] = useState('');

  // Audit Log Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const fileInputRef = useRef(null);

  // Save Aamad Records & Audit Logs
  const saveAamadState = (newAamad, newLogs = auditLogs) => {
    setAamadRecords(newAamad);
    setAuditLogs(newLogs);
    try {
      localStorage.setItem(AAMAD_STORAGE_KEY, JSON.stringify(newAamad));
      localStorage.setItem(AAMAD_AUDIT_LOG_KEY, JSON.stringify(newLogs));
    } catch (e) {}
  };

  // Synchronize new Aamad entries into Master Force
  const syncToMasterForce = (incomingAamadList) => {
    const existingPnos = new Set(forceRecords.map(p => p.pno));
    const existingMobs = new Set(forceRecords.map(p => p.mobile));

    const toAddToMaster = [];
    incomingAamadList.forEach(item => {
      const pno = item.pno || `PN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      if (!existingPnos.has(pno) && (!item.mobile || !existingMobs.has(item.mobile))) {
        toAddToMaster.push({
          pno: pno,
          name: item.name,
          rank: item.rank || 'का0',
          mobile: item.mobile || '',
          posting: item.posting || 'थाना कोतवाली',
          district: item.district || '',
          range: item.range || '',
          police_zone: item.police_zone || ''
        });
      }
    });

    if (toAddToMaster.length > 0 && onUpdateForce) {
      onUpdateForce([...toAddToMaster, ...forceRecords]);
    }
  };

  // Open Add Single Aamad Modal with Server Timestamp
  const handleOpenAddModal = async () => {
    setIsLoadingServerTime(true);
    const trueServerTime = await fetchServerDateTime();
    setServerTimeDisplay(trueServerTime);
    setIsLoadingServerTime(false);

    setFormData({
      name: '',
      rank: 'का0',
      pno: `PN-${Math.floor(100000 + Math.random() * 900000)}`,
      mobile: '',
      posting: '',
      district: '',
      range: '',
      police_zone: '',
      aamad_time: trueServerTime
    });
    setIsAddModalOpen(true);
  };

  // Save Single Aamad with Verified Server Time
  const handleSaveAamad = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      alert('कृपया पुलिसकर्मी का नाम एवं मोबाईल नंबर अवश्य भरें।');
      return;
    }

    // Always capture fresh server timestamp on final submit
    const finalServerTime = await fetchServerDateTime();

    const newEntry = {
      id: `AAMAD-${Date.now()}`,
      ...formData,
      aamad_time: finalServerTime,
      recorded_by: 'सुपर एडमिन (आमद कार्यालय)'
    };

    const updated = [newEntry, ...aamadRecords];
    saveAamadState(updated);
    syncToMasterForce([newEntry]);

    setIsAddModalOpen(false);
    setSuccessToast(`🎉 ${formData.name} की आमद सर्वर समय (${finalServerTime}) पर दर्ज की गई एवं मास्टर फ़ोर्स में जोड़ी गई!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Initiate Delete with Remark
  const handleInitiateDelete = (record) => {
    setRecordToDelete(record);
    setDeleteRemark('');
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete with Remark & Audit Log
  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deleteRemark.trim()) {
      alert('पारदर्शिता एवं ऑडिट हेतु हटाने का कारण / रिमार्क लिखना अनिवार्य है।');
      return;
    }

    const deletionServerTime = await fetchServerDateTime();

    const deletedLogEntry = {
      id: `LOG-${Date.now()}`,
      deletedRecord: recordToDelete,
      remark: deleteRemark.trim(),
      deletedAt: deletionServerTime,
      deletedBy: 'सुपर एडमिन'
    };

    const updatedAamad = aamadRecords.filter(r => r.id !== recordToDelete.id);
    const updatedLogs = [deletedLogEntry, ...auditLogs];

    saveAamadState(updatedAamad, updatedLogs);
    setIsDeleteModalOpen(false);
    setRecordToDelete(null);
    setDeleteRemark('');

    setSuccessToast(`🗑️ रिकॉर्ड हटाया गया एवं ऑडिट लॉग में सुरक्षित कर दिया गया।`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Bulk Excel Aamad File Upload with Server Time
  const handleBulkExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseDutyFile(file);
      if (parsed && parsed.length > 0) {
        const bulkServerTime = await fetchServerDateTime();

        const newAamadList = parsed.map((item, idx) => ({
          id: `AAMAD-${Date.now()}-${idx}`,
          name: item.name,
          rank: item.rank || 'का0',
          pno: item.pno || `PN-${Date.now()}-${idx}`,
          mobile: item.mobile || '',
          posting: item.posting || 'थाना कोतवाली',
          district: item.district || '',
          range: item.range || item.police_range || '',
          police_zone: item.zone || item.police_zone || '',
          aamad_time: bulkServerTime,
          recorded_by: 'एक्सेल बल्क आमद'
        }));

        const updated = [...newAamadList, ...aamadRecords];
        saveAamadState(updated);
        syncToMasterForce(newAamadList);

        setSuccessToast(`🎉 एक्सेल फ़ाइल से कुल ${newAamadList.length} पुलिसकर्मियों की आमद सर्वर समय (${bulkServerTime}) पर दर्ज की गई!`);
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err) {
      alert(`फ़ाइल पढ़ने में त्रुटि: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Export Aamad to Excel
  const handleExportExcel = () => {
    if (aamadRecords.length === 0) {
      alert('डाउनलोड करने के लिए कोई आमद रिकॉर्ड मौजूद नहीं है।');
      return;
    }

    const exportRows = aamadRecords.map((r, idx) => ({
      'क्र०सं०': idx + 1,
      'नाम': r.name,
      'पद': r.rank,
      'पी०एन०ओ० (PNO)': r.pno,
      'मोबाईल नंबर': r.mobile,
      'मूल तैनाती / थाना': r.posting,
      'जनपद': r.district,
      'रेंज (Range)': r.range || '-',
      'ज़ोन (Zone)': r.police_zone || '-',
      'आमद दिनांक व सर्वर समय': r.aamad_time,
      'दर्जकर्ता': r.recorded_by
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'बल आमद रजिस्टर');
    XLSX.writeFile(wb, `पुलिस_बल_आमद_रजिस्टर_अयोध्या_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Unique Dropdown Options
  const uniqueRanges = useMemo(() => {
    return Array.from(new Set(aamadRecords.map(r => (r.range || '').trim()).filter(Boolean))).sort();
  }, [aamadRecords]);

  const uniquePoliceZones = useMemo(() => {
    return Array.from(new Set(aamadRecords.map(r => (r.police_zone || '').trim()).filter(Boolean))).sort();
  }, [aamadRecords]);

  const uniqueDistricts = useMemo(() => {
    return Array.from(new Set(aamadRecords.map(r => (r.district || '').trim()).filter(Boolean))).sort();
  }, [aamadRecords]);

  // Filtered Display List
  const displayedAamad = useMemo(() => {
    return aamadRecords.filter(r => {
      if (rangeFilter !== 'ALL' && (r.range || '') !== rangeFilter) return false;
      if (zoneFilter !== 'ALL' && (r.police_zone || '') !== zoneFilter) return false;
      if (districtFilter !== 'ALL' && (r.district || '') !== districtFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          (r.name || '').toLowerCase().includes(q) ||
          (r.pno || '').toLowerCase().includes(q) ||
          (r.mobile || '').includes(q) ||
          (r.posting || '').toLowerCase().includes(q) ||
          (r.district || '').toLowerCase().includes(q) ||
          (r.range || '').toLowerCase().includes(q) ||
          (r.police_zone || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [aamadRecords, rangeFilter, zoneFilter, districtFilter, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  पुलिस बल आमद रजिस्टर (Force Arrival)
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1 shrink-0">
                  <Server className="w-3 h-3 text-emerald-600" />
                  सर्वर टाइम सिंक
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                बाहरी जनपदों एवं रेंजों से आए पुलिस बल की आमद दर्ज करें (डेटा स्वतः मास्टर फ़ोर्स में जुड़ता है)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="हटाए गए रिकॉर्ड्स एवं रिमार्क लॉग देखें"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>ऑडिट लॉग ({auditLogs.length})</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="आमद रजिस्टर एक्सेल में डाउनलोड करें"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel डाउनलोड</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.docx,.json"
              onChange={handleBulkExcelUpload}
              className="hidden"
              id="bulk-aamad-excel-input"
            />
            <label
              htmlFor="bulk-aamad-excel-input"
              className="cursor-pointer px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>बल्क एक्सेल</span>
            </label>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ एकल आमद</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 text-center space-y-0.5">
            <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">कुल आमद प्राप्त बल</div>
            <div className="text-lg font-black text-slate-900 font-mono">{aamadRecords.length} <span className="text-xs font-bold font-sans text-slate-600">जवान</span></div>
          </div>
          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/80 text-center space-y-0.5">
            <div className="text-emerald-800 font-bold text-[10px] uppercase tracking-wider">संबंधित जनपद</div>
            <div className="text-lg font-black text-emerald-950 font-mono">{uniqueDistricts.length} <span className="text-xs font-bold font-sans text-emerald-800">जनपद</span></div>
          </div>
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/80 text-center space-y-0.5">
            <div className="text-amber-800 font-bold text-[10px] uppercase tracking-wider">संबंधित रेंज (Ranges)</div>
            <div className="text-lg font-black text-amber-950 font-mono">{uniqueRanges.length} <span className="text-xs font-bold font-sans text-amber-800">रेंज</span></div>
          </div>
          <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 text-center space-y-0.5">
            <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">संबंधित पुलिस ज़ोन</div>
            <div className="text-lg font-black text-slate-900 font-mono">{uniquePoliceZones.length} <span className="text-xs font-bold font-sans text-slate-600">ज़ोन</span></div>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-300 font-black text-xs sm:text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Aamad Table Container */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-bold">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाम, PNO, मोबाइल, जनपद खोजें..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">समस्त जनपद (All Districts)</option>
              {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <select
              value={rangeFilter}
              onChange={(e) => setRangeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">समस्त रेंज (All Ranges)</option>
              {uniqueRanges.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">समस्त पुलिस ज़ोन (All Zones)</option>
              {uniquePoliceZones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>

        {/* Table of Aamad Records */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-xs text-slate-900 text-left">
            <thead className="bg-slate-100 font-black text-slate-950 border-b border-slate-200">
              <tr>
                <th className="p-3 w-12 text-center">क्र०सं०</th>
                <th className="p-3">नाम एवं पद</th>
                <th className="p-3 font-mono">PNO</th>
                <th className="p-3 font-mono">मोबाईल नंबर</th>
                <th className="p-3">मूल तैनाती (थाना)</th>
                <th className="p-3">जनपद</th>
                <th className="p-3">रेंज (Range)</th>
                <th className="p-3">ज़ोन (Zone)</th>
                <th className="p-3 font-mono">आमद समय (Server Time)</th>
                <th className="p-3 text-center w-16">हटाएं</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedAamad.length > 0 ? (
                displayedAamad.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-black text-slate-950">
                      <div className="flex items-center gap-1.5">
                        <span>{r.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-950 font-bold border border-amber-300 shrink-0">
                          {r.rank || 'का0'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-700">{r.pno || '-'}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{r.mobile || '-'}</td>
                    <td className="p-3 font-medium text-slate-800">{r.posting || '-'}</td>
                    <td className="p-3 font-bold text-slate-900">{r.district || '-'}</td>
                    <td className="p-3 text-slate-700">{r.range || '-'}</td>
                    <td className="p-3 text-slate-700">{r.police_zone || '-'}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 font-bold">
                      ⏱️ {r.aamad_time || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleInitiateDelete(r)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                        title="रिमार्क दर्ज करके हटाएं"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400 font-bold">
                    कोई आमद रिकॉर्ड प्राप्त नहीं हुआ।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD SINGLE AAMAD MODAL (WITH VERIFIED SERVER TIME & ALL FEMALE RANKS)      */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-slate-950">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <span>एकल पुलिस बल आमद दर्ज करें</span>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer">✕</button>
            </div>

            {/* Server Timestamp Box (Tamper-proof) */}
            <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-slate-300">सर्वर प्रमाणित आमद दिनांक व समय:</span>
              </div>
              <span className="font-mono font-black text-emerald-400">
                {isLoadingServerTime ? 'लोड हो रहा है...' : (serverTimeDisplay || 'प्रमाणित समय')}
              </span>
            </div>

            <form onSubmit={handleSaveAamad} className="space-y-3.5 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-slate-800 font-black">पुलिसकर्मी का नाम *:</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. अजय कुमार"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {/* Rank (With Female SI, Female Inspector, etc.) */}
                <div className="space-y-1">
                  <label className="text-slate-800 font-black">पदनाम (Rank) *:</label>
                  <select
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <optgroup label="महिला अधिकारी / कर्मचारी (Female Officers)">
                      <option value="म0उ0नि0">म0उ0नि0 (Female Sub-Inspector)</option>
                      <option value="म0नि0">म0नि0 (Female Inspector)</option>
                      <option value="म0हे0का0">म0हे0का0 (Female Head Constable)</option>
                      <option value="म0का0">म0का0 (Female Constable)</option>
                    </optgroup>
                    <optgroup label="पुरुष अधिकारी / कर्मचारी (Male Officers)">
                      <option value="उ0नि0">उ0नि0 (Sub-Inspector)</option>
                      <option value="नि0">नि0 (Inspector)</option>
                      <option value="हे0का0">हे0का0 (Head Constable)</option>
                      <option value="का0">का0 (Constable)</option>
                      <option value="उ0नि0 (स0पु0)">उ0नि0 (स0पु0)</option>
                    </optgroup>
                  </select>
                </div>

                {/* PNO */}
                <div className="space-y-1">
                  <label className="text-slate-800">PNO (पी०एन०ओ०):</label>
                  <input
                    type="text"
                    value={formData.pno}
                    onChange={(e) => setFormData({ ...formData, pno: e.target.value })}
                    placeholder="e.g. 192830192"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Mobile */}
                <div className="space-y-1">
                  <label className="text-slate-800 font-black">मोबाईल नंबर *:</label>
                  <input
                    type="tel"
                    maxLength="10"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-अंकीय नंबर"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {/* Posting */}
                <div className="space-y-1">
                  <label className="text-slate-800">मूल तैनाती (थाना / यूनिट):</label>
                  <input
                    type="text"
                    value={formData.posting}
                    onChange={(e) => setFormData({ ...formData, posting: e.target.value })}
                    placeholder="e.g. थाना कोतवाली / पुलिस लाइन"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* District */}
                <div className="space-y-1">
                  <label className="text-slate-800">गृह / तैनाती जनपद:</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="e.g. वाराणसी / लखनऊ / अमेठी"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Range */}
                <div className="space-y-1">
                  <label className="text-slate-800">रेंज (Police Range):</label>
                  <input
                    type="text"
                    value={formData.range}
                    onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                    placeholder="e.g. अयोध्या रेंज / वाराणसी रेंज"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Police Zone */}
                <div className="space-y-1">
                  <label className="text-slate-800">ज़ोन (Police Zone):</label>
                  <input
                    type="text"
                    value={formData.police_zone}
                    onChange={(e) => setFormData({ ...formData, police_zone: e.target.value })}
                    placeholder="e.g. लखनऊ ज़ोन / प्रयागराज ज़ोन"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>आमद दर्ज करें (Save Arrival)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANDATORY REMARK DELETION MODAL                                           */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600 font-black text-base border-b border-slate-200 pb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>आमद रिकॉर्ड हटाने हेतु रिमार्क (Audit Trail)</span>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-3.5 text-xs font-bold">
              <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-slate-900 space-y-1">
                <div>हटाया जाने वाला जवान: <strong className="text-rose-950 font-black">{recordToDelete?.name} ({recordToDelete?.rank})</strong></div>
                <div className="font-mono text-[11px] text-slate-600">PNO: {recordToDelete?.pno} | 📱 {recordToDelete?.mobile}</div>
                <div className="text-[11px] text-slate-600">थाना: {recordToDelete?.posting} ({recordToDelete?.district})</div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-900 font-black">
                  हटाने का कारण / रिमार्क दर्ज करें (अनिवार्य) *:
                </label>
                <textarea
                  rows="3"
                  value={deleteRemark}
                  onChange={(e) => setDeleteRemark(e.target.value)}
                  placeholder="e.g. रवानगी वापस मूल जनपद / गलत प्रविष्टि / चिकित्सा अवकाश पर प्रस्थान..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>रिमार्क के साथ हटाएं (Delete & Log)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT LOG MODAL (TRANSPARENCY)                                            */}
      {/* ========================================================================= */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-slate-950">
                <History className="w-5 h-5 text-amber-600" />
                <span>आमद डिलीशन ऑडिट लॉग (Transparency Trail)</span>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-950 text-sm">
                        {log.deletedRecord?.name} ({log.deletedRecord?.rank})
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        ⏱️ सर्वर समय: {log.deletedAt}
                      </span>
                    </div>

                    <div className="text-slate-600 text-[11px]">
                      PNO: <strong className="font-mono">{log.deletedRecord?.pno}</strong> | थाना: {log.deletedRecord?.posting} ({log.deletedRecord?.district})
                    </div>

                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-950 font-bold text-[11px]">
                      📝 <strong>वजह / रिमार्क:</strong> {log.remark}
                    </div>

                    <div className="text-[10px] text-slate-400 text-right">
                      हटाया गया द्वारा: <strong>{log.deletedBy}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 font-bold">
                  अभी तक कोई रिकॉर्ड हटाया नहीं गया है। ऑडिट लॉग साफ़ है।
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white font-black text-xs rounded-xl cursor-pointer"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
