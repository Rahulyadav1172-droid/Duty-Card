import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function PrintTemplate({
  duty,
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true,
  eventTitle = 'श्रावण झूला मेला',
  eventSubtitle = 'ड्यूटी कार्ड अयोध्या-2026',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या'
}) {
  if (!duty) return null;

  const activeNote = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
  const activeBriefingPlace = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

  return (
    <div className="p-4 max-w-lg mx-auto bg-white text-black font-sans border-4 border-black rounded-lg shadow-none font-devanagari space-y-3">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 flex items-center justify-between">
        <img src="/badge.png" alt="Badge Left" className="w-12 h-12 object-contain" />
        <div>
          <h1 className="text-base font-black tracking-tight">{eventTitle}</h1>
          <h2 className="text-sm font-bold text-gray-900">{eventSubtitle}</h2>
        </div>
        <img src="/badge.png" alt="Badge Right" className="w-12 h-12 object-contain" />
      </div>

      {/* Officer Header with Passport Photo Frame */}
      <div className="flex items-center gap-2 border border-black p-1.5 rounded bg-gray-50">
        <div className="w-16 h-20 border border-black bg-white rounded flex flex-col items-center justify-center text-center shrink-0 overflow-hidden">
          {duty.photo ? (
            <img src={duty.photo} alt={duty.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-[8px] text-gray-600 font-bold p-0.5 leading-tight">
              पासपोर्ट फोटो<br />चस्पा करें
            </div>
          )}
        </div>

        <div className="flex-1 text-xs">
          <div className="font-bold text-sm text-black">
            {duty.name}
          </div>
          <div className="font-mono text-black font-bold">📱 {duty.mobile}</div>
          <div className="text-[10px] text-gray-800">
            P.No: <strong>{duty.id}</strong> | मूल तैनाती: <strong>{duty.posting || ''}</strong> {duty.district ? `(${duty.district})` : ''}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-black text-xs">
        <table className="w-full border-collapse">
          <tbody className="divide-y divide-black">
            {duty.event_name ? (
              <tr>
                <td className="w-1/3 bg-gray-100 font-bold p-1.5 border-r border-black">ड्यूटी का प्रकार</td>
                <td className="p-1.5 font-semibold">{duty.event_name}</td>
              </tr>
            ) : null}
            <tr>
              <td className="w-1/3 bg-gray-100 font-bold p-1.5 border-r border-black">ड्यूटी का स्थान</td>
              <td className="p-1.5 font-bold">{duty.duty_place || ''}</td>
            </tr>
            <tr>
              <td className="bg-gray-100 font-bold p-1.5 border-r border-black">दिनाँक व समय</td>
              <td className="p-1.5">{duty.shift || ''}</td>
            </tr>
            <tr>
              <td className="bg-gray-100 font-bold p-1.5 border-r border-black">जोन / व्यवस्था</td>
              <td className="p-1.5">{duty.zone || ''}</td>
            </tr>
            <tr>
              <td className="bg-gray-100 font-bold p-1.5 border-r border-black">जोनाल प्रभारी का नाम</td>
              <td className="p-1.5">{duty.zonal_incharge || duty.zonal || ''}</td>
            </tr>
            <tr>
              <td className="bg-gray-100 font-bold p-1.5 border-r border-black">सेक्टर</td>
              <td className="p-1.5">{duty.sector || ''}</td>
            </tr>
            <tr>
              <td className="bg-gray-100 font-bold p-1.5 border-r border-black">सेक्टर प्रभारी का नाम</td>
              <td className="p-1.5">{duty.sector_incharge || ''}</td>
            </tr>
            {activeNote ? (
              <tr>
                <td className="bg-gray-100 font-bold p-1.5 border-r border-black">नोट</td>
                <td className="p-1.5 text-[10px] text-gray-800">{activeNote}</td>
              </tr>
            ) : null}
            {activeBriefingPlace ? (
              <tr>
                <td className="bg-gray-100 font-bold p-1.5 border-r border-black">ब्रीफिंग का स्थान</td>
                <td className="p-1.5 font-semibold">{activeBriefingPlace}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between text-[10px] pt-1">
        <div className="flex items-center gap-2">
          <QRCodeSVG value={`POLICE-DUTY:${duty.id}:${duty.mobile}`} size={48} />
          <div>
            <div>सत्यापित पास (Verified 🟢)</div>
            <div className="text-[9px] text-gray-700">कार्यालय वरिष्ठ पुलिस अधीक्षक</div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          {signatureImg ? (
            <img
              src={signatureImg}
              alt="Signature"
              className="h-8 max-w-[100px] object-contain mb-0.5"
            />
          ) : (
            <div className="w-24 border-b border-black mb-0.5" />
          )}
          <div className="font-bold">{signatoryText}</div>
        </div>
      </div>
    </div>
  );
}
