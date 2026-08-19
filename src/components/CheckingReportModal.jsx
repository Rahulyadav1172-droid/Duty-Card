import React, { useState, useRef } from 'react';
import {
  Printer,
  FileDown,
  X,
  Calendar,
  ShieldCheck,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle2,
  Filter,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Helper to clean raw name
 */
function cleanName(raw = '') {
  if (!raw) return '';
  let str = String(raw).trim();
  str = str.replace(/\b[6-9]\d{9}\b/g, '');
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  return (parts[0] || str).replace(/\s+/g, ' ');
}

export default function CheckingReportModal({
  isOpen,
  onClose,
  eventTitle = 'श्रावण झूला मेला अयोध्या-2026',
  eventSubtitle = '',
  records = [],
  attendanceMap = {},
  attendanceByDate = {},
  selectedDate = '',
  onDateChange,
  zones = [],
  sectors = []
}) {
  const [reportDate, setReportDate] = useState(() => {
    if (selectedDate) return selectedDate;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [selectedZone, setSelectedZone] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [inchargeName, setInchargeName] = useState('');
  const [checkingOfficerName, setCheckingOfficerName] = useState('');
  const [reportType, setReportType] = useState('live'); // 'live' (only absent) | 'blank' (empty lines for field checking) | 'all'
  const [blankRowsCount, setBlankRowsCount] = useState(15);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const reportRef = useRef(null);

  // Clean Event Title: "चेकिंग रिपोर्ट [इवेंट का नाम]" e.g. "चेकिंग रिपोर्ट श्रावण झूला मेला अयोध्या-2026"
  const cleanEventHeading = React.useMemo(() => {
    const rawTitle = (eventTitle || '').trim();
    let sub = (eventSubtitle || '').replace(/ड्यूटी कार्ड/gi, '').replace(/अयोध्या-2026/gi, '').trim();
    
    // If title doesn't already contain district/year, append
    let full = rawTitle;
    if (sub && !full.includes(sub)) {
      full = `${full} ${sub}`;
    }
    if (!full.includes('अयोध्या') && !full.includes('2026')) {
      full = `${full} अयोध्या-2026`;
    }
    return full.trim() || 'श्रावण झूला मेला अयोध्या-2026';
  }, [eventTitle, eventSubtitle]);

  // Extract attendance for this specific date
  // Support both attendanceByDate[reportDate] and fallback to attendanceMap
  const activeDateAttendance = (attendanceByDate && attendanceByDate[reportDate]) || attendanceMap || {};

  // Filter records based on selected zone & sector
  const filteredRecords = records.filter(r => {
    if (selectedZone !== 'ALL' && (r.zone || '').trim() !== selectedZone.trim()) {
      return false;
    }
    if (selectedSector !== 'ALL' && (r.sector || '').trim() !== selectedSector.trim()) {
      return false;
    }
    return true;
  });

  // Auto-detect Incharge Name based on selected Zone and Sector
  const autoInchargeName = React.useMemo(() => {
    if (inchargeName.trim()) {
      return inchargeName.trim();
    }

    let foundSectorIncharge = '';
    let foundZonalIncharge = '';

    if (selectedSector !== 'ALL') {
      const matchSector = records.find(r => (r.sector || '').trim() === selectedSector.trim() && (r.sector_incharge || '').trim());
      if (matchSector?.sector_incharge) {
        foundSectorIncharge = matchSector.sector_incharge.trim();
      }
    }

    if (selectedZone !== 'ALL') {
      const matchZone = records.find(r => (r.zone || '').trim() === selectedZone.trim() && (r.zonal_incharge || r.zonal || '').trim());
      if (matchZone?.zonal_incharge || matchZone?.zonal) {
        foundZonalIncharge = (matchZone.zonal_incharge || matchZone.zonal).trim();
      }
    }

    if (foundSectorIncharge && foundZonalIncharge && foundSectorIncharge !== foundZonalIncharge) {
      return `${foundSectorIncharge} / ${foundZonalIncharge}`;
    }
    if (foundSectorIncharge) return foundSectorIncharge;
    if (foundZonalIncharge) return foundZonalIncharge;

    // If "ALL" is selected, try to find any first available incharge in filtered list
    const anyIncharge = filteredRecords.find(r => (r.sector_incharge || r.zonal_incharge || r.zonal || '').trim());
    if (anyIncharge) {
      return (anyIncharge.sector_incharge || anyIncharge.zonal_incharge || anyIncharge.zonal || '').trim();
    }

    return '';
  }, [inchargeName, selectedZone, selectedSector, records, filteredRecords]);

  // Extract absent personnel for the report
  const absentRecords = filteredRecords.filter(r => {
    const att = activeDateAttendance[r.id];
    return att?.status === 'absent';
  });

  // Unique zones and sectors list
  const uniqueZones = Array.from(new Set(records.map(r => (r.zone || '').trim()).filter(Boolean))).sort();
  const availableSectors = Array.from(
    new Set(
      records
        .filter(r => selectedZone === 'ALL' || (r.zone || '').trim() === selectedZone.trim())
        .map(r => (r.sector || '').trim())
        .filter(Boolean)
    )
  ).sort();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = reportRef.current;
    if (!element) return;

    try {
      setIsGeneratingPDF(true);
      if (document.fonts) await document.fonts.ready;

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Checking_Report_${reportDate || 'Date'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('PDF तैयार करने में समस्या आई। कृपया सीधे प्रिंट बटन का उपयोग करें।');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-devanagari text-slate-900">
      {/* Modal Card */}
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Modal Header (Hidden on Print) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-400">
                आधिकारिक चेकिंग रिपोर्ट (Checking Report Proforma)
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                दैनिक चेकिंग प्रपत्र व अनुपस्थित कर्मचारियों की आधिकारिक रिपोर्ट (A4 Format)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट A4</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>{isGeneratingPDF ? '...' : 'PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden on Print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold space-y-3 no-print shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Checking Date Picker */}
            <div>
              <label className="text-slate-700 font-black block mb-1">
                📅 चेकिंग दिनांक:
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => {
                  setReportDate(e.target.value);
                  onDateChange?.(e.target.value);
                }}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 2. Zone Filter */}
            <div>
              <label className="text-slate-700 font-black block mb-1">
                🛡️ ज़ोन फ़िल्टर:
              </label>
              <select
                value={selectedZone}
                onChange={(e) => {
                  setSelectedZone(e.target.value);
                  setSelectedSector('ALL');
                }}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">समस्त ज़ोन (All Zones)</option>
                {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            {/* 3. Sector Filter */}
            <div>
              <label className="text-slate-700 font-black block mb-1">
                🚩 सेक्टर फ़िल्टर:
              </label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">समस्त सेक्टर (All Sectors)</option>
                {availableSectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 4. Report Type */}
            <div>
              <label className="text-slate-700 font-black block mb-1">
                📄 रिपोर्ट का प्रकार:
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="live">🔴 केवल गैरहाजिर ({absentRecords.length} कर्मचारी)</option>
                <option value="blank">📝 ब्लैंक प्रोफ़ार्मा (हाथ से चेकिंग हेतु)</option>
              </select>
            </div>
          </div>

          {/* Officer Names Manual Override */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-slate-700 block mb-1">
                जोनल / सेक्टर प्रभारी का नाम (स्वतः प्राप्त / संपादन योग्य):
              </label>
              <input
                type="text"
                value={inchargeName}
                onChange={(e) => setInchargeName(e.target.value)}
                placeholder={autoInchargeName ? `स्वतः चयनित: ${autoInchargeName}` : 'उदा: श्री रामेश्वर सिंह, क्षेत्राधिकारी'}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="text-slate-700 block mb-1">
                चेकिंग अधिकारी का नाम / पद (हस्ताक्षर हेतु):
              </label>
              <input
                type="text"
                value={checkingOfficerName}
                onChange={(e) => setCheckingOfficerName(e.target.value)}
                placeholder="उदा: अपर पुलिस अधीक्षक / क्षेत्राधिकारी"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE A4 OFFICIAL CHECKING REPORT PROFORMA                            */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 print:bg-white print:p-0 print:overflow-visible">
          <div
            ref={reportRef}
            id="printable-checking-report"
            className="bg-white text-black p-6 sm:p-10 max-w-[210mm] mx-auto shadow-lg print:shadow-none print:p-4 rounded-xl print:rounded-none border border-slate-300 print:border-none font-devanagari space-y-4"
          >
            {/* Header: Title */}
            <div className="text-center space-y-1 border-b-2 border-black pb-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-black">
                चेकिंग रिपोर्ट {cleanEventHeading}
              </h1>
            </div>

            {/* Sub-Header: Incharge Name and Zone/Sector Name */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm font-bold text-black pt-1 pb-1">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="font-black shrink-0">जोनल/सेक्टर प्रभारी का नाम:-</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-semibold truncate min-h-[20px]">
                  {autoInchargeName || inchargeName || '...............................................................'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start sm:justify-end">
                <span className="font-black shrink-0">जोन/सेक्टर का नाम:-</span>
                <span className="border-b border-dotted border-black flex-1 sm:flex-initial px-2 font-semibold truncate min-h-[20px]">
                  {selectedZone !== 'ALL' ? selectedZone : ''} {selectedSector !== 'ALL' ? `/ ${selectedSector}` : ''}
                  {selectedZone === 'ALL' && selectedSector === 'ALL' && 'समस्त व्यवस्था'}
                </span>
              </div>
            </div>

            {/* Official 6-Column Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse border-2 border-black text-xs sm:text-[13px] text-black">
                <thead>
                  <tr className="border-b-2 border-black bg-gray-100 print:bg-transparent font-black text-center">
                    <th className="border border-black p-2 w-[8%]">
                      क० सं०
                    </th>
                    <th className="border border-black p-2 w-[16%]">
                      <div>चेकिंग</div>
                      <div className="text-[11px] font-bold mt-0.5">दिनांक</div>
                    </th>
                    <th className="border border-black p-2 w-[12%]">
                      <div>चेकिंग</div>
                      <div className="text-[11px] font-bold mt-0.5">समय</div>
                    </th>
                    <th className="border border-black p-2 w-[26%] text-left pl-3">
                      ड्यूटी स्थल
                    </th>
                    <th className="border border-black p-2 w-[24%] text-left pl-3">
                      अनुपस्थित कर्मचारी का नाम
                    </th>
                    <th className="border border-black p-2 w-[14%] text-left pl-3">
                      जनपद / थाना
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reportType === 'live' ? (
                    absentRecords.length > 0 ? (
                      absentRecords.map((r, idx) => {
                        const att = activeDateAttendance[r.id];
                        return (
                          <tr key={r.id || idx} className="border-b border-black text-left">
                            <td className="border border-black p-2 text-center font-bold font-mono">
                              {idx + 1}
                            </td>
                            <td className="border border-black p-2 text-center font-mono font-bold">
                              {formatDisplayDate(reportDate)}
                            </td>
                            <td className="border border-black p-2 text-center font-mono font-bold">
                              {att?.time || '-'}
                            </td>
                            <td className="border border-black p-2 font-bold break-words">
                              {r.duty_place || '-'}
                            </td>
                            <td className="border border-black p-2 font-black break-words">
                              <div>{cleanName(r.name)}</div>
                              <div className="text-[10px] font-mono text-gray-700 font-bold">
                                {r.rank || 'जवान'} (PNO: {r.id})
                              </div>
                            </td>
                            <td className="border border-black p-2 font-bold break-words">
                              {r.posting || '-'} {r.district ? `(${r.district})` : ''}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-black p-6 text-center text-gray-600 font-bold text-xs">
                          🟢 चयनित दिनांक ({formatDisplayDate(reportDate)}) एवं फ़िल्टर में कोई भी कर्मचारी गैरहाजिर (Absent) मार्क नहीं है।
                        </td>
                      </tr>
                    )
                  ) : (
                    // Blank Rows for Manual Field Inspection
                    Array.from({ length: blankRowsCount }).map((_, idx) => (
                      <tr key={idx} className="border-b border-black h-9">
                        <td className="border border-black p-2 text-center font-mono font-bold text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="border border-black p-2 text-center font-mono font-bold text-gray-800">
                          {formatDisplayDate(reportDate)}
                        </td>
                        <td className="border border-black p-2 text-center font-mono"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Footer: Signature of Checking Officer */}
            <div className="pt-16 pb-4 flex justify-end">
              <div className="text-center space-y-1 min-w-[200px]">
                <div className="font-black text-sm text-black">
                  हस्ताक्षर चेकिंग अधिकारी
                </div>
                <div className="text-xs font-bold text-gray-700">
                  {checkingOfficerName || '(पदनाम व पदभार)'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
