import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  Share2,
  Phone,
  Users,
  ShieldCheck,
  MapPin,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  Check,
  Shield,
  FileDown,
  Camera,
  User,
  BadgeCheck
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import VerifyModal from './VerifyModal';

export default function DutyCard({
  duty,
  allRecords = [],
  onPrintClick,
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true,
  attendanceMap = {},
  onMarkAttendance,
  eventTitle = 'श्रावण झूला मेला',
  eventSubtitle = 'ड्यूटी कार्ड अयोध्या-2026',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  onUpdateDutyPhoto
}) {
  const [isTeammatesOpen, setIsTeammatesOpen] = useState(true);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const photoInputRef = useRef(null);

  if (!duty) return null;

  const attendanceInfo = attendanceMap[duty.id] || null;

  // Normalize place string for strict exact matching
  const normalizePlace = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/[०-९]/g, d => "0123456789"["०१२३४५६७८९".indexOf(d)])
      .replace(/[\.\,\-\_\(\)\/\\\s]+/g, ' ')
      .trim();
  };

  // Find all teammates posted at the EXACT same duty place
  const teammates = (allRecords || []).filter(r => {
    if (!r || r.id === duty.id) return false;
    const placeA = normalizePlace(r.duty_place);
    const placeB = normalizePlace(duty.duty_place);
    return placeA && placeB && placeA === placeB;
  });

  // Active note text
  const activeNote = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');

  // Active briefing place text
  const activeBriefingPlace = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (onUpdateDutyPhoto) {
        onUpdateDutyPhoto(duty.id, base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleWhatsAppShare = () => {
    let text = `🚨 *पुलिस सुरक्षा ड्यूटी कार्ड* 🚨\n\n` +
      `📌 *${eventTitle} - ${eventSubtitle}*\n` +
      `👮 *नाम:* ${duty.name} (${duty.rank || 'जवान'})\n` +
      `📱 *मोबाईल:* ${duty.mobile}\n` +
      `📍 *ड्यूटी स्थल:* ${duty.duty_place || 'N/A'}\n` +
      `🛡️ *जोन:* ${duty.zone || 'N/A'}\n` +
      `👤 *जोनाल प्रभारी:* ${duty.zonal_incharge || duty.zonal || 'N/A'}\n` +
      `🚩 *सेक्टर:* ${duty.sector || 'N/A'}\n` +
      `👤 *सेक्टर प्रभारी:* ${duty.sector_incharge || 'N/A'}\n` +
      `⏰ *समय:* ${duty.shift || 'N/A'}\n` +
      `🏛️ *मूल तैनाती:* ${duty.posting || ''} (${duty.district || ''})\n\n`;

    if (teammates.length > 0) {
      text += `👥 *साथ में तैनात सहकर्मी (${teammates.length}):*\n`;
      teammates.forEach((t, i) => {
        text += `${i + 1}. ${t.name} (${t.rank}) - 📱 ${t.mobile} - ${t.posting}\n`;
      });
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadDirectPDF = async () => {
    const cardEl = document.getElementById('printable-duty-card');
    if (!cardEl) return;

    try {
      setIsDownloadingPDF(true);
      const canvas = await html2canvas(cardEl, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 15, imgWidth, imgHeight);
      pdf.save(`Duty_Card_${(duty.name || 'Police').replace(/\s+/g, '_')}_${duty.id}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed, fallback to print:', err);
      window.print();
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleAttendanceClick = () => {
    if (onMarkAttendance) {
      onMarkAttendance(duty.id, duty.name);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 font-devanagari text-slate-900">
      {/* Hidden Photo Input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Action Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 leading-tight">अयोध्या पुलिस ड्यूटी पास</div>
            <div className="text-xs text-slate-500 font-mono font-bold">ID: {duty.id}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct PDF Download */}
          <button
            onClick={handleDownloadDirectPDF}
            disabled={isDownloadingPDF}
            className="px-3.5 py-2 rounded-xl bg-[#0b132b] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
            title="PDF फाइल डाउनलोड करें"
          >
            <FileDown className="w-4 h-4 text-amber-400" />
            <span>{isDownloadingPDF ? 'डाउनलोड...' : 'PDF डाउनलोड'}</span>
          </button>

          {/* Print Trigger */}
          <button
            onClick={onPrintClick}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>प्रिंट</span>
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black flex items-center gap-1 transition"
            title="WhatsApp पर शेयर करें"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* Main Printable Duty Card Container */}
      <div
        id="printable-duty-card"
        className="bg-white text-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-slate-900 shadow-md space-y-4"
      >
        {/* Pass Header */}
        <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-3">
          <img src="/badge.png" alt="Police Badge Left" className="w-14 h-14 object-contain shrink-0" />
          
          <div className="flex-1 text-center">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
              {eventTitle}
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-slate-700 mt-0.5">
              {eventSubtitle}
            </h2>
          </div>

          <img src="/badge.png" alt="Police Badge Right" className="w-14 h-14 object-contain shrink-0" />
        </div>

        {/* Officer Identity & Passport Photo Block */}
        <div className="flex items-stretch gap-3 border border-slate-300 p-3 rounded-xl bg-slate-50/80">
          {/* Photo Frame */}
          <div
            onClick={() => photoInputRef.current?.click()}
            className="w-22 h-26 sm:w-24 sm:h-28 border-2 border-dashed border-slate-400 hover:border-amber-500 rounded-lg bg-white overflow-hidden flex flex-col items-center justify-center text-center shrink-0 relative group cursor-pointer transition shadow-inner"
            title="फोटो अपलोड/बदलने के लिए क्लिक करें"
          >
            {duty.photo ? (
              <img
                src={duty.photo}
                alt={duty.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-1 space-y-1 text-slate-400">
                <User className="w-6 h-6 mx-auto" />
                <div className="text-[10px] font-bold text-slate-700 leading-tight">
                  पासपोर्ट फोटो
                </div>
                <div className="text-[9px] text-slate-400">चस्पा करें</div>
              </div>
            )}

            {/* Hover overlay for 1-click change */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition no-print">
              <Camera className="w-4 h-4 mb-0.5" />
              <span>बदलें</span>
            </div>
          </div>

          {/* Officer Details Info */}
          <div className="flex-1 flex flex-col justify-between text-slate-900 py-0.5">
            <div>
              <span className="text-[11px] font-bold text-slate-500">अधिकारी / कर्मचारी विवरण:</span>
              <div className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2 mt-0.5">
                <span>{duty.name}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  {duty.rank || 'जवान'}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-1">
                📱 {duty.mobile || 'मोबाइल नंबर अनुपलब्ध'}
              </div>
            </div>

            <div className="text-xs text-slate-600 border-t border-slate-200 pt-1 flex flex-wrap items-center justify-between gap-1">
              <div>P.No: <strong className="font-mono text-slate-950">{duty.id}</strong></div>
              <div>मूल तैनाती: <strong className="text-slate-950">{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}</div>
            </div>
          </div>
        </div>

        {/* Clean Alternating Rows Table */}
        <div className="overflow-hidden border border-slate-300 rounded-xl text-xs sm:text-sm">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-slate-200">
              {duty.event_name ? (
                <tr>
                  <td className="w-1/3 bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                    ड्यूटी का प्रकार
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 bg-white">
                    {duty.event_name}
                  </td>
                </tr>
              ) : null}

              <tr>
                <td className="w-1/3 bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                  ड्यूटी का स्थान
                </td>
                <td className="p-2.5 font-black text-sm sm:text-base text-amber-950 bg-amber-50/50">
                  {duty.duty_place || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                  ड्यूटी का दिनाँक व समय
                </td>
                <td className="p-2.5 font-bold text-slate-900 bg-white">
                  {duty.shift || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                  जोन / व्यवस्था
                </td>
                <td className="p-2.5 font-semibold text-slate-800 bg-white">
                  {duty.zone || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                  जोनाल प्रभारी
                </td>
                <td className="p-2.5 font-semibold text-slate-800 bg-white">
                  {duty.zonal_incharge || duty.zonal || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                  सेक्टर
                </td>
                <td className="p-2.5 font-bold text-slate-900 bg-white">
                  {duty.sector || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                  सेक्टर प्रभारी
                </td>
                <td className="p-2.5 font-semibold text-slate-800 bg-white">
                  {duty.sector_incharge || ''}
                </td>
              </tr>

              {/* Conditional Note */}
              {activeNote ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                    नोट
                  </td>
                  <td className="p-2.5 text-xs font-bold text-amber-900 bg-amber-50">
                    {activeNote}
                  </td>
                </tr>
              ) : null}

              {/* Conditional Briefing Place */}
              {activeBriefingPlace ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2.5 border-r border-slate-200 text-slate-700">
                    ब्रीफिंग का स्थान
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 bg-white">
                    {activeBriefingPlace}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Footer: QR Code & Signature Block */}
        <div className="pt-2 flex items-end justify-between border-t border-slate-300">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsVerifyModalOpen(true)}
              className="bg-white border border-slate-300 p-1.5 rounded-lg text-center shadow-xs hover:border-amber-500 transition cursor-pointer"
              title="सत्यापन विवरण देखने के लिए क्लिक करें"
            >
              <QRCodeSVG
                value={`https://police.up.gov.in/verify?id=${duty.id}&mob=${duty.mobile}`}
                size={55}
              />
              <div className="text-[8px] font-mono font-bold text-slate-700 mt-0.5">
                {duty.id} ✓
              </div>
            </button>
            <div className="text-xs text-slate-700 space-y-0.5 font-medium">
              <div>
                वैधता:{" "}
                <button
                  onClick={() => setIsVerifyModalOpen(true)}
                  className="font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  🟢 डिजिटल सत्यापित पास
                </button>
              </div>
              <div className="text-[10px] text-slate-500">कार्यालय वरिष्ठ पुलिस अधीक्षक</div>
            </div>
          </div>

          {/* Official Signature Area */}
          <div className="text-right flex flex-col items-end">
            {signatureImg ? (
              <img
                src={signatureImg}
                alt="Official Signature"
                className="h-10 max-w-[120px] object-contain mb-0.5"
              />
            ) : (
              <div className="w-28 h-8 border-b-2 border-dashed border-slate-400 mb-0.5" />
            )}
            <div className="text-xs font-bold text-slate-900">
              {signatoryText}
            </div>
          </div>
        </div>
      </div>

      {/* CO-DEPLOYED STAFF SECTION (साथी जवान) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition no-print">
        <button
          onClick={() => setIsTeammatesOpen(!isTeammatesOpen)}
          className="w-full p-4 flex items-center justify-between gap-3 text-left bg-slate-50 hover:bg-slate-100 transition border-b border-slate-200"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                🤝 इस पॉइंट पर आपके साथ तैनात अन्य बल (Co-deployed Staff)
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs font-mono">
                  {teammates.length} साथी जवान
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                स्थान: <span className="font-bold text-slate-800">{duty.duty_place || 'अनिश्चित'}</span>
              </p>
            </div>
          </div>

          {isTeammatesOpen ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
        </button>

        {isTeammatesOpen && (
          <div className="p-4 space-y-3 bg-white">
            {teammates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teammates.map((tm, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-slate-900 text-sm truncate">{tm.name}</span>
                        {tm.rank && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold shrink-0">
                            {tm.rank}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 truncate">
                        थाना: <strong className="text-slate-800">{tm.posting || 'N/A'}</strong> {tm.district ? `(${tm.district})` : ''}
                      </div>

                      <div className="text-xs font-mono text-emerald-800 font-bold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{tm.mobile || 'नंबर अनुपलब्ध'}</span>
                      </div>
                    </div>

                    {tm.mobile && (
                      <a
                        href={`tel:${tm.mobile}`}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs transition active:scale-95 shrink-0 whitespace-nowrap"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>कॉल</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
                <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  इस ड्यूटी पॉइंट पर केवल 01 जवान (आप) की तैनाती है।
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Verification Modal */}
      <VerifyModal
        duty={duty}
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        eventTitle={eventTitle}
        eventSubtitle={eventSubtitle}
      />
    </div>
  );
}
