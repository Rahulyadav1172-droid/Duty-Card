import React from 'react';
import { Printer, ArrowLeft, Shield, Calendar, Clock, MapPin, Users } from 'lucide-react';

export default function OfficialBooklet({
  records = [],
  instructions,
  onBack,
  eventTitle = 'श्रावण झूला मेला',
  eventSubtitle = 'ड्यूटी कार्ड अयोध्या-2026',
  eventStartDate = '16.08.2026 से अग्रिम आदेश तक'
}) {
  // Extract distinct duty times from records
  const dutyTimes = Array.from(new Set((records || []).map(r => (r.shift || '').trim()).filter(Boolean)));
  const displayShift = dutyTimes.length > 0 ? dutyTimes.join(' | ') : 'मेला / कार्यक्रम समयानुसार';

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
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-md no-print text-slate-900">
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-300 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            वापस जाएं (Back to Portal)
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            📄 आधिकारिक बुकलेट प्रिंट करें / Save PDF
          </button>
        </div>
      </div>

      {/* Main Official Document Layout (Calibrated for Standard Print) */}
      <div
        id="printable-official-booklet"
        className="bg-white text-black p-6 sm:p-10 rounded-2xl shadow-xl space-y-5 border border-gray-400 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* Official Letterhead Header */}
        <div className="text-center border-b-2 border-black pb-3 space-y-1">
          <div className="flex items-center justify-center gap-3 mb-1.5">
            <img src="/badge.png" alt="Police Emblem" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight uppercase">
            कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या
          </h1>
          <h2 className="text-xs sm:text-sm font-bold text-gray-800">
            आधिकारिक सुरक्षा ड्यूटी आदेश पुस्तिका
          </h2>
          <div className="flex justify-between items-center text-[11px] font-mono pt-1.5 px-2 text-gray-700 font-bold border-t border-gray-300 mt-1.5">
            <span>पत्रांक: सुरक्षा-2026/ड्यूटी-आदेश</span>
            <span>दिनांक: {new Date().toLocaleDateString('hi-IN')}</span>
          </div>
        </div>

        {/* Subject & Official Title Block (Single-Line Header + Exact Event Date) */}
        <div className="border-2 border-black rounded-xl p-4 sm:p-5 bg-gray-50 text-center space-y-1.5 shadow-xs">
          <h2 className="font-black text-base sm:text-lg text-black underline underline-offset-4 decoration-2">
            {eventTitle} के अवसर पर पुलिस प्रबन्ध
          </h2>
          <div className="pt-0.5 text-xs sm:text-sm font-bold text-gray-900 underline underline-offset-2 font-mono">
            दिनांक:— {eventStartDate || '16.08.2026 से अग्रिम आदेश तक'}
          </div>
        </div>

        {/* Grouped Zone -> Sector -> Duty Place Tables */}
        <div className="space-y-6">
          {Object.keys(groupedData).map((zoneName, zIdx) => (
            <div key={zIdx} className="space-y-4 page-break-zone">
              {/* Zone Number & Name Header Banner */}
              <div className="bg-black text-white px-4 py-2 rounded font-extrabold text-xs uppercase flex items-center justify-between border border-black">
                <span>🛡️ जोन: {zoneName}</span>
                <span className="text-[10px] font-mono text-gray-300">OFFICIAL DEPLOYMENT ZONE</span>
              </div>

              {Object.keys(groupedData[zoneName]).map((sectorName, sIdx) => (
                <div key={sIdx} className="space-y-3 pl-2 sm:pl-3 border-l-2 border-black">
                  <div className="text-xs font-extrabold text-black flex items-center gap-2 bg-gray-100 p-1.5 rounded border border-gray-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-black shrink-0"></span>
                    <span>🚩 सेक्टर: {sectorName}</span>
                  </div>

                  {/* Grouped by Duty Place */}
                  {Object.keys(groupedData[zoneName][sectorName]).map((placeName, pIdx) => {
                    const placeRecords = groupedData[zoneName][sectorName][placeName];
                    const placeShift = placeRecords[0]?.shift || displayShift;

                    return (
                      <div
                        key={pIdx}
                        className="bg-white rounded-lg border-2 border-black overflow-hidden break-inside-avoid print:mb-4 shadow-xs"
                      >
                        {/* Elegant 2-Row Official Duty Point Header */}
                        <div className="bg-slate-100 p-2.5 sm:p-3 border-b-2 border-black space-y-1">
                          {/* Row 1: Duty Place Name + Total Personnel Badge */}
                          <div className="flex items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-black">
                              <MapPin className="w-4 h-4 text-black shrink-0" />
                              <span><strong>ड्यूटी स्थल:</strong> {placeName}</span>
                            </div>
                            <span className="font-mono text-[11px] sm:text-xs font-black bg-black text-white px-2.5 py-0.5 rounded shrink-0">
                              तैनात बल: {placeRecords.length}
                            </span>
                          </div>

                          {/* Row 2: Clean Duty Shift & Time */}
                          {placeShift && (
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-gray-800 pt-0.5">
                              <Clock className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                              <span><strong>ड्यूटी समय / पाली:</strong> {placeShift}</span>
                            </div>
                          )}
                        </div>

                        {/* Clean 4-Column A4 Table Layout */}
                        <div className="p-0 bg-white">
                          <table className="w-full text-xs border-collapse border-0 text-left">
                            <thead>
                              <tr className="bg-gray-200 text-black border-b border-black font-bold">
                                <th className="border-r border-black p-2 w-12 text-center">क्र०सं०</th>
                                <th className="border-r border-black p-2">नाम एवं पदनाम</th>
                                <th className="border-r border-black p-2 font-mono w-32">मोबाईल नंबर</th>
                                <th className="p-2 w-48">मूल तैनाती / जनपद</th>
                              </tr>
                            </thead>
                            <tbody>
                              {placeRecords.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-gray-300 hover:bg-gray-50 last:border-b-0">
                                  <td className="border-r border-gray-300 p-2 text-center font-mono font-bold">{rIdx + 1}</td>
                                  <td className="border-r border-gray-300 p-2 font-extrabold text-black">
                                    {row.name} {row.rank ? `(${row.rank})` : ''}
                                  </td>
                                  <td className="border-r border-gray-300 p-2 font-mono font-bold text-black">{row.mobile}</td>
                                  <td className="p-2 text-gray-800">{row.posting || ''} {row.district ? `(${row.district})` : ''}</td>
                                </tr>
                              ))}
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

        {/* Global Official Instructions / Briefing Notes */}
        <div className="border-2 border-black rounded-lg p-3.5 space-y-1.5 bg-gray-50 break-inside-avoid">
          <div className="font-extrabold text-xs text-black border-b border-black pb-1 uppercase">
            महत्वपूर्ण सुरक्षा निर्देश एवं दिशा-निर्देश:
          </div>
          <div className="text-[11px] leading-relaxed text-gray-900 whitespace-pre-line font-medium">
            {instructions || `1. सभी अधिकारी/कर्मचारी ड्यूटी समय से 01 घंटे पूर्व अपने निर्धारित स्थान पर उपस्थित होंगे।
2. ड्यूटी के दौरान मोबाइल फोन का अनावश्यक उपयोग सख्त वर्जित है।
3. प्रत्येक पुलिसकर्मी अपने साथ यह डिजिटल पास / प्रिंट ड्यूटी कार्ड एवं आई-कार्ड अनिवार्य रूप से रखेगा।
4. किसी भी संदिग्ध गतिविधि की सूचना तत्काल कंट्रोल रूम एवं अपने प्रभारी अधिकारी को देंगे।`}
          </div>
        </div>

        {/* Senior Officer Signature Block */}
        <div className="pt-8 flex justify-between items-end text-xs font-bold break-inside-avoid">
          <div className="text-left space-y-0.5">
            <div>प्रतिलिपि: समस्त संबंधित अधिकारी/कर्मचारी।</div>
            <div>कंट्रोल रूम सुरक्षा व्यवस्था अयोध्या।</div>
          </div>
          <div className="text-center space-y-0.5">
            <div className="h-10 flex items-end justify-center font-mono text-gray-400 italic">
              [ Digitally Signed ]
            </div>
            <div className="font-extrabold text-xs sm:text-sm border-t border-black pt-1">
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
            margin: 10mm 12mm;
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
