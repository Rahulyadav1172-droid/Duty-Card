import React, { useState } from 'react';
import { Printer, ArrowLeft, Shield, Calendar, Clock, MapPin, Users, Edit3 } from 'lucide-react';

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

  // If rawName is comma-separated (e.g. "उ0नि0 अजय कुमार , मांझी, उन्नाव" or "हेकां शंकरलाल पटेल, शिवरतनगंज, अमेठी")
  // The first segment is the actual Name & Rank
  const commaParts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  if (commaParts.length > 1) {
    cleaned = commaParts[0];
  }

  // Remove double commas, trailing/leading commas & spaces
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').replace(/^[\s,]+/, '').trim();

  return cleaned || rawName;
}

/**
 * Helper to format ISO timestamp strings into clean Hindi dates
 */
function formatDisplayDate(rawDate) {
  if (!rawDate) return '16.08.2026 से अग्रिम आदेश तक';
  if (rawDate.includes('T') && rawDate.includes('-')) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString('hi-IN')} से कार्यक्रम समाप्ति तक`;
      }
    } catch (e) {}
  }
  return rawDate;
}

export default function OfficialBooklet({
  records = [],
  instructions,
  onBack,
  eventTitle = 'श्रावण झूला मेला',
  eventSubtitle = 'ड्यूटी कार्ड अयोध्या-2026',
  eventStartDate = '16.08.2026 से अग्रिम आदेश तक'
}) {
  const [patrankInput, setPatrankInput] = useState(() => {
    try {
      return localStorage.getItem('OFFICIAL_PATRANK_KEY') || 'सुरक्षा-2026/ड्यूटी-आदेश';
    } catch (e) {
      return 'सुरक्षा-2026/ड्यूटी-आदेश';
    }
  });

  const [dateInput, setDateInput] = useState(() => new Date().toLocaleDateString('hi-IN'));

  // Extract distinct duty times from records
  const dutyTimes = Array.from(new Set((records || []).map(r => (r.shift || '').trim()).filter(Boolean)));
  const displayShift = dutyTimes.length > 0 ? dutyTimes.join(' | ') : 'मेला / कार्यक्रम समयानुसार';
  const displayEventDate = formatDisplayDate(eventStartDate);

  // Group records by Zone -> Sector -> Duty Place
  const groupedData = {};

  records.forEach(rec => {
    const z = rec.zone || 'सामान्य जोन';
    const s = rec.sector || 'सामान्य सेक्टर';
    const p = rec.duty_place || 'सामान्य ड्यूटी स्थल';

    if (!groupedData[z]) groupedData[z] = {};
    if (!groupedData[z][s]) groupedData[z][s] = {};
    if (!groupedData[z][s][p]) groupedData[z][s][p] = [];

    groupedData[z][s][p].push(rec);
  });

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `${(eventTitle || 'ड्यूटी_पुस्तिका').replace(/\s+/g, '_')}_आधिकारिक_सुरक्षा_आदेश_अयोध्या`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 font-devanagari">
      {/* Top Action Bar (hidden on print) with Patrank manual input */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-md no-print text-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-300 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              वापस जाएं
            </button>
          )}

          {/* Manual Patrank Input Field */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-300">
            <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
            <label className="text-xs font-black text-slate-800 shrink-0">पत्रांक सं०:</label>
            <input
              type="text"
              value={patrankInput}
              onChange={(e) => {
                setPatrankInput(e.target.value);
                try {
                  localStorage.setItem('OFFICIAL_PATRANK_KEY', e.target.value);
                } catch (err) {}
              }}
              placeholder="पत्रांक दर्ज करें..."
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 w-48 sm:w-56"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            📄 A4 आधिकारिक बुकलेट प्रिंट करें / Save PDF
          </button>
        </div>
      </div>

      {/* Main Official Document Layout (Calibrated tightly for A4 Paper with Zero Wasted Space) */}
      <div
        id="printable-official-booklet"
        className="bg-white text-black p-4 sm:p-8 rounded-2xl shadow-xl space-y-3.5 border border-gray-400 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* Official Letterhead Header (Compact & Tight) */}
        <div className="text-center border-b-2 border-black pb-2 space-y-0.5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/badge.png" alt="Police Emblem" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight uppercase leading-snug">
            कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या
          </h1>
          <h2 className="text-[11px] sm:text-xs font-bold text-gray-800">
            आधिकारिक सुरक्षा ड्यूटी आदेश पुस्तिका
          </h2>
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-mono pt-1 px-1 text-gray-700 font-bold border-t border-gray-300 mt-1">
            <span>पत्रांक: {patrankInput || 'सुरक्षा-2026/ड्यूटी-आदेश'}</span>
            <span>दिनांक: {dateInput}</span>
          </div>
        </div>

        {/* Subject & Official Title Block (Tight, space-efficient, authentic police style) */}
        <div className="border-2 border-black rounded-lg p-2.5 bg-gray-50 text-center space-y-1 shadow-xs">
          <h2 className="font-black text-xs sm:text-sm text-black underline underline-offset-4 decoration-1">
            {eventTitle} के अवसर पर पुलिस प्रबन्ध
          </h2>
          <div className="text-[11px] sm:text-xs font-bold text-gray-900 underline underline-offset-2 font-mono">
            दिनांक:— {displayEventDate}
          </div>
        </div>

        {/* Grouped Zone -> Sector -> Duty Place Tables (No Vertical Left Lines) */}
        <div className="space-y-4">
          {Object.keys(groupedData).map((zoneName, zIdx) => (
            <div key={zIdx} className="space-y-3 page-break-zone">
              {/* Zone Number & Name Header Banner */}
              <div className="bg-black text-white px-3 py-1.5 rounded font-extrabold text-xs uppercase flex items-center justify-between border border-black">
                <span>🛡️ जोन: {zoneName}</span>
                <span className="text-[10px] font-mono text-gray-300">OFFICIAL DEPLOYMENT ZONE</span>
              </div>

              {Object.keys(groupedData[zoneName]).map((sectorName, sIdx) => (
                <div key={sIdx} className="space-y-2.5">
                  <div className="text-xs font-extrabold text-black bg-gray-100 p-1.5 rounded border border-gray-300">
                    <span>🚩 सेक्टर: {sectorName}</span>
                  </div>

                  {/* Grouped by Duty Place */}
                  {Object.keys(groupedData[zoneName][sectorName]).map((placeName, pIdx) => {
                    const placeRecords = groupedData[zoneName][sectorName][placeName];
                    const placeShift = placeRecords[0]?.shift || displayShift;

                    return (
                      <div
                        key={pIdx}
                        className="bg-white rounded-lg border-2 border-black overflow-hidden break-inside-avoid print:mb-3 shadow-xs"
                      >
                        {/* Compact 2-Row Official Duty Point Header */}
                        <div className="bg-slate-100 px-2.5 py-1.5 border-b-2 border-black space-y-0.5">
                          {/* Row 1: Duty Place Name + Total Personnel Badge */}
                          <div className="flex items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-black text-xs sm:text-[13px] text-black">
                              <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
                              <span><strong>ड्यूटी स्थल:</strong> {placeName}</span>
                            </div>
                            <span className="font-mono text-[10px] sm:text-[11px] font-black bg-black text-white px-2 py-0.5 rounded shrink-0">
                              तैनात बल: {placeRecords.length}
                            </span>
                          </div>

                          {/* Row 2: Clean Duty Shift & Time */}
                          {placeShift && (
                            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-gray-800">
                              <Clock className="w-3 h-3 text-gray-700 shrink-0" />
                              <span><strong>समय / पाली:</strong> {placeShift}</span>
                            </div>
                          )}
                        </div>

                        {/* Clean 5-Column A4 Table Layout: S.No | Name | Mobile | Mul Tainati | Janpad */}
                        <div className="p-0 bg-white">
                          <table className="w-full text-xs border-collapse border-0 text-left">
                            <thead>
                              <tr className="bg-gray-200 text-black border-b border-black font-bold text-[11px]">
                                <th className="border-r border-black py-1 px-1.5 w-10 text-center">क्र०सं०</th>
                                <th className="border-r border-black py-1 px-2">नाम एवं पदनाम</th>
                                <th className="border-r border-black py-1 px-2 font-mono w-28 text-center">मोबाईल नंबर</th>
                                <th className="border-r border-black py-1 px-2 w-36">मूल तैनाती</th>
                                <th className="py-1 px-2 w-28">जनपद</th>
                              </tr>
                            </thead>
                            <tbody>
                              {placeRecords.map((row, rIdx) => {
                                const cleanName = cleanOfficerName(row.name, row.posting, row.district, row.mobile);

                                return (
                                  <tr key={rIdx} className="border-b border-gray-300 hover:bg-gray-50 last:border-b-0">
                                    <td className="border-r border-gray-300 py-1.5 px-1.5 text-center font-mono font-bold">{rIdx + 1}</td>
                                    <td className="border-r border-gray-300 py-1.5 px-2 font-extrabold text-black">
                                      {cleanName}
                                    </td>
                                    <td className="border-r border-gray-300 py-1.5 px-2 font-mono font-bold text-black text-center">
                                      {row.mobile || '-'}
                                    </td>
                                    <td className="border-r border-gray-300 py-1.5 px-2 text-gray-800 font-medium">
                                      {row.posting || '-'}
                                    </td>
                                    <td className="py-1.5 px-2 text-gray-800 font-medium">
                                      {row.district || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Global Official Instructions / Briefing Notes (Compact) */}
        <div className="border-2 border-black rounded-lg p-2.5 space-y-1 bg-gray-50 break-inside-avoid">
          <div className="font-extrabold text-[11px] text-black border-b border-black pb-0.5 uppercase">
            महत्वपूर्ण सुरक्षा निर्देश एवं दिशा-निर्देश:
          </div>
          <div className="text-[10px] leading-relaxed text-gray-900 whitespace-pre-line font-medium">
            {instructions || `1. सभी अधिकारी/कर्मचारी ड्यूटी समय से 01 घंटे पूर्व अपने निर्धारित स्थान पर उपस्थित होंगे।
2. ड्यूटी के दौरान मोबाइल फोन का अनावश्यक उपयोग सख्त वर्जित है।
3. प्रत्येक पुलिसकर्मी अपने साथ यह डिजिटल पास / प्रिंट ड्यूटी कार्ड एवं आई-कार्ड अनिवार्य रूप से रखेगा।
4. किसी भी संदिग्ध गतिविधि की सूचना तत्काल कंट्रोल रूम एवं अपने प्रभारी अधिकारी को देंगे।`}
          </div>
        </div>

        {/* Senior Officer Signature Block (Compact) */}
        <div className="pt-6 flex justify-between items-end text-[11px] font-bold break-inside-avoid">
          <div className="text-left space-y-0.5">
            <div>प्रतिलिपि: समस्त संबंधित अधिकारी/कर्मचारी।</div>
            <div>कंट्रोल रूम सुरक्षा व्यवस्था अयोध्या।</div>
          </div>
          <div className="text-center space-y-0.5">
            <div className="h-8 flex items-end justify-center font-mono text-gray-400 italic text-[10px]">
              [ Digitally Signed ]
            </div>
            <div className="font-extrabold text-xs border-t border-black pt-0.5">
              ( वरिष्ठ पुलिस अधीक्षक )
            </div>
            <div>जनपद अयोध्या</div>
          </div>
        </div>
      </div>

      {/* Print Media CSS for perfect A4 paper formatting */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .page-break-zone {
            page-break-before: auto;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
