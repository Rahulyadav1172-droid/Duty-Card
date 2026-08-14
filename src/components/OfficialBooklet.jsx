import React from 'react';
import { Printer, ArrowLeft, Shield, Calendar, Clock, MapPin, Users } from 'lucide-react';

export default function OfficialBooklet({ records, instructions, onBack }) {
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-md no-print text-slate-900">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-300"
        >
          <ArrowLeft className="w-4 h-4" />
          वापस जाएं (Back to Portal)
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-2 shadow transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            📄 आधिकारिक सरकारी बुकलेट प्रिंट करें / Save PDF
          </button>
        </div>
      </div>

      {/* Main Official Document Layout (White Paper for Official Govt Print) */}
      <div
        id="printable-official-booklet"
        className="bg-white text-black p-8 sm:p-12 rounded-2xl shadow-xl space-y-6 border border-gray-400 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* Official Letterhead Header */}
        <div className="text-center border-b-2 border-black pb-4 space-y-1">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/badge.png" alt="Police Emblem" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight uppercase">
            कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या
          </h1>
          <h2 className="text-sm font-bold text-gray-800">
            ड्यूटी आदेश पुस्तिका 2026
          </h2>
          <div className="flex justify-between items-center text-xs font-mono pt-2 px-2 text-gray-700 font-bold border-t border-gray-300 mt-2">
            <span>पत्रांक: सुरक्षा-2026/VIP-ड्यूटी/842</span>
            <span>दिनांक: 15 अगस्त 2026</span>
          </div>
        </div>

        {/* Subject & VIP Movement Schedule Block */}
        <div className="border-2 border-black rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="text-center font-extrabold text-sm border-b border-gray-400 pb-2 text-black">
            विषय: {records[0]?.event_name || 'श्रावण झूला मेला सुरक्षा व्यवस्था ड्यूटी आवंटन आदेश 2026'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold text-gray-900 pt-1">
            <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-gray-300">
              <Clock className="w-4 h-4 text-black shrink-0" />
              <span>आगमन: प्रातः 09:00 बजे से</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-gray-300">
              <MapPin className="w-4 h-4 text-black shrink-0" />
              <span>स्थल: राम जन्मभूमि / मन्दिर परिसर अयोध्या</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-2 rounded border border-gray-300">
              <Clock className="w-4 h-4 text-black shrink-0" />
              <span>अवधि: मेला/भीड़ समाप्ति तक</span>
            </div>
          </div>
        </div>

        {/* Grouped Zone -> Sector -> Duty Place Tables */}
        <div className="space-y-6">
          {Object.keys(groupedData).map((zoneName, zIdx) => (
            <div key={zIdx} className="space-y-4">
              {/* Zone Header Banner */}
              <div className="bg-black text-white px-4 py-2 rounded font-extrabold text-xs uppercase flex items-center justify-between">
                <span>🛡️ {zoneName}</span>
                <span className="text-[10px] font-mono text-gray-300">OFFICIAL DEPLOYMENT ZONE</span>
              </div>

              {Object.keys(groupedData[zoneName]).map((sectorName, sIdx) => (
                <div key={sIdx} className="space-y-4 pl-2 border-l-2 border-black">
                  <div className="text-xs font-extrabold text-black flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-black"></span>
                    <span>🚩 {sectorName}</span>
                  </div>

                  {/* Grouped by Duty Place */}
                  {Object.keys(groupedData[zoneName][sectorName]).map((placeName, pIdx) => (
                    <div key={pIdx} className="space-y-1.5 bg-gray-50 p-2.5 rounded border border-black">
                      <div className="text-xs font-bold text-black flex items-center justify-between border-b border-gray-400 pb-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
                          <strong>ड्यूटी स्थल:</strong> {placeName}
                        </span>
                        <span className="font-mono text-[11px] font-bold bg-gray-200 px-2 py-0.5 rounded border border-gray-400">
                          साथी जवान: {groupedData[zoneName][sectorName][placeName].length}
                        </span>
                      </div>

                      {/* Word-Style Government Table Layout */}
                      <table className="w-full text-xs border-collapse border border-black text-left bg-white">
                        <thead>
                          <tr className="bg-gray-200 text-black border-b border-black font-bold">
                            <th className="border border-black p-1.5 w-10 text-center">क्र.सं.</th>
                            <th className="border border-black p-1.5 font-bold">नाम एवं पदनाम</th>
                            <th className="border border-black p-1.5 font-mono w-28">मोबाईल नंबर</th>
                            <th className="border border-black p-1.5">मूल तैनाती / जनपद</th>
                            <th className="border border-black p-1.5 w-28">ड्यूटी समय</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedData[zoneName][sectorName][placeName].map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-gray-300 hover:bg-gray-100">
                              <td className="border border-black p-1.5 text-center font-mono font-bold">{rIdx + 1}</td>
                              <td className="border border-black p-1.5 font-extrabold text-black">{row.name} ({row.rank || 'जवान'})</td>
                              <td className="border border-black p-1.5 font-mono font-bold text-black">{row.mobile}</td>
                              <td className="border border-black p-1.5">{row.posting || ''} {row.district ? `(${row.district})` : ''}</td>
                              <td className="border border-black p-1.5 font-mono">{row.shift || ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Global Official Instructions / Briefing Notes */}
        <div className="border-2 border-black rounded-lg p-4 space-y-2 bg-gray-50">
          <div className="font-extrabold text-xs text-black border-b border-black pb-1 uppercase">
            महत्वपूर्ण सुरक्षा निर्देश एवं दिशा-निर्देश (General Briefing Guidelines):
          </div>
          <div className="text-xs leading-relaxed text-gray-900 whitespace-pre-line font-medium">
            {instructions || `1. सभी अधिकारी/कर्मचारी ड्यूटी समय से 01 घंटे पूर्व अपने निर्धारित स्थान पर उपस्थित होंगे।
2. ड्यूटी के दौरान मोबाइल फोन का अनावश्यक उपयोग सख्त वर्जित है।
3. प्रत्येक पुलिसकर्मी अपने साथ यह डिजिटल पास / प्रिंट ड्यूटी कार्ड एवं आई-कार्ड अनिवार्य रूप से रखेगा।
4. किसी भी संदिग्ध गतिविधि की सूचना तत्काल कंट्रोल रूम एवं अपने प्रभारी अधिकारी को देंगे।`}
          </div>
        </div>

        {/* Senior Officer Signature Block */}
        <div className="pt-10 flex justify-between items-end text-xs font-bold">
          <div className="text-left space-y-1">
            <div>प्रतिलिपि: समस्त संबंधित अधिकारी/कर्मचारी।</div>
            <div>कंट्रोल रूम सुरक्षा व्यवस्था अयोध्या।</div>
          </div>
          <div className="text-center space-y-1">
            <div className="h-12 flex items-end justify-center font-mono text-gray-400 italic">
              [ Digitally Signed ]
            </div>
            <div className="font-extrabold text-sm border-t border-black pt-1">
              ( वरिष्ठ पुलिस अधीक्षक )
            </div>
            <div>जनपद अयोध्या</div>
          </div>
        </div>
      </div>
    </div>
  );
}
