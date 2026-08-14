import React, { useState, useRef } from 'react';
import {
  Printer,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  Phone,
  Share2,
  Download,
  CheckCircle2,
  FileDown,
  User,
  Camera,
  Layers,
  Users,
  Award
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const photoInputRef = useRef(null);

  if (!duty) return null;

  // Find co-deployed personnel at the exact same duty point
  const normalizePlace = (str) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const coDeployedOfficers = (allRecords || []).filter(r => {
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
    const text = `*उत्तर प्रदेश पुलिस - डिजिटल ड्यूटी कार्ड*\n\n` +
      `*नाम:* ${duty.name} (${duty.rank || 'जवान'})\n` +
      `*ID (PNO):* ${duty.id}\n` +
      `*ड्यूटी स्थान:* ${duty.duty_place}\n` +
      `*समय/शिफ्ट:* ${duty.shift || 'प्रातः 09:00 बजे से मेला समाप्ति तक'}\n` +
      `*जोन/सेक्टर:* ${duty.zone || '-'} / ${duty.sector || '-'}\n` +
      `*जोनाल प्रभारी:* ${duty.zonal_incharge || duty.zonal || '-'}\n` +
      `*सेक्टर प्रभारी:* ${duty.sector_incharge || '-'}\n\n` +
      `कार्यालय वरिष्ठ पुलिस अधीक्षक, अयोध्या`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleDownloadDirectPDF = async () => {
    const element = document.getElementById('printable-duty-card');
    if (!element) return;

    try {
      setIsDownloadingPDF(true);
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 12;
      const printWidth = pdfWidth - (margin * 2);
      const printHeight = (canvas.height * printWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, 15, printWidth, printHeight);
      const safeName = (duty.name || 'DutyPass').replace(/\s+/g, '_');
      pdf.save(`Duty_Card_${duty.id}_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF Download Error:', err);
      alert('PDF डाउनलोड करने में त्रुटि: ' + err.message);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const qrPayload = JSON.stringify({
    id: duty.id,
    name: duty.name,
    rank: duty.rank || 'का0',
    duty_place: duty.duty_place,
    mobile: duty.mobile,
    zone: duty.zone,
    sector: duty.sector,
    auth: "UP_POLICE_SECURE_VERIFIED"
  });

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3.5 sm:space-y-4 font-devanagari text-slate-900 px-0 sm:px-0">
      {/* Hidden Photo Input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Action Toolbar (Perfect for all mobile screen sizes) */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">अयोध्या पुलिस ड्यूटी पास</div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-mono font-bold">P.No: {duty.id}</div>
          </div>
        </div>

        {/* Action Buttons: Responsive Grid */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
          {/* Direct PDF Download */}
          <button
            onClick={handleDownloadDirectPDF}
            disabled={isDownloadingPDF}
            className="px-2 sm:px-3.5 py-2 rounded-lg sm:rounded-xl bg-[#0b132b] hover:bg-slate-800 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            title="PDF फाइल डाउनलोड करें"
          >
            <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <span>{isDownloadingPDF ? '...' : 'PDF'}</span>
          </button>

          {/* Print Trigger */}
          <button
            onClick={onPrintClick}
            className="px-2 sm:px-3.5 py-2 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>प्रिंट</span>
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer"
            title="WhatsApp पर शेयर करें"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            <span>शेयर</span>
          </button>
        </div>
      </div>

      {/* Main Printable Duty Card Container */}
      <div
        id="printable-duty-card"
        className="bg-white text-slate-900 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-900 shadow-md space-y-3 sm:space-y-4"
      >
        {/* Pass Header */}
        <div className="border-b-2 border-slate-900 pb-2 sm:pb-3 flex items-center justify-between gap-1.5 sm:gap-3">
          <img src="/badge.png" alt="Police Badge Left" className="w-9 h-9 sm:w-14 sm:h-14 object-contain shrink-0" />
          
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-base sm:text-2xl font-black text-slate-950 tracking-tight leading-tight truncate">
              {eventTitle}
            </h1>
            <h2 className="text-xs sm:text-base font-bold text-slate-700 mt-0.5 truncate">
              {eventSubtitle}
            </h2>
          </div>

          <img src="/badge.png" alt="Police Badge Right" className="w-9 h-9 sm:w-14 sm:h-14 object-contain shrink-0" />
        </div>

        {/* Officer Identity & Passport Photo Block */}
        <div className="flex items-stretch gap-2 sm:gap-3 border border-slate-300 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50/80">
          {/* Photo Frame */}
          <div
            onClick={() => photoInputRef.current?.click()}
            className="w-18 h-24 sm:w-24 sm:h-28 border-2 border-dashed border-slate-400 hover:border-amber-500 rounded-lg bg-white overflow-hidden flex flex-col items-center justify-center text-center shrink-0 relative group cursor-pointer transition shadow-inner"
            title="फोटो अपलोड/बदलने के लिए क्लिक करें"
          >
            {duty.photo ? (
              <img
                src={duty.photo}
                alt={duty.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-1 space-y-0.5 text-slate-400">
                <User className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-slate-400" />
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-700 leading-tight">
                  पासपोर्ट फोटो
                </div>
                <div className="text-[8px] sm:text-[9px] text-slate-400">चस्पा करें</div>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition no-print">
              <Camera className="w-4 h-4 mb-0.5" />
              <span>बदलें</span>
            </div>
          </div>

          {/* Officer Details Info */}
          <div className="flex-1 flex flex-col justify-between text-slate-900 py-0.5 min-w-0">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">अधिकारी / कर्मचारी:</span>
              <div className="text-sm sm:text-lg font-black text-slate-950 flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                <span className="break-words">{duty.name}</span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold shrink-0">
                  {duty.rank || 'जवान'}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                📱 {duty.mobile || 'मोबाइल अनुपलब्ध'}
              </div>
            </div>

            <div className="text-[10px] sm:text-xs text-slate-600 border-t border-slate-200 pt-1 flex flex-wrap items-center justify-between gap-1">
              <div>P.No: <strong className="font-mono text-slate-950">{duty.id}</strong></div>
              <div>मूल तैनाती: <strong className="text-slate-950">{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}</div>
            </div>
          </div>
        </div>

        {/* Clean Alternating Rows Table */}
        <div className="overflow-hidden border border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-slate-200">
              {duty.event_name ? (
                <tr>
                  <td className="w-[38%] sm:w-1/3 bg-slate-50 font-bold p-1.5 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm">
                    ड्यूटी का प्रकार
                  </td>
                  <td className="p-1.5 sm:p-2.5 font-bold text-slate-900 bg-white text-[11px] sm:text-sm break-words">
                    {duty.event_name}
                  </td>
                </tr>
              ) : null}

              <tr>
                <td className="w-[38%] sm:w-1/3 bg-slate-50 font-bold p-1.5 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm">
                  ड्यूटी का स्थान
                </td>
                <td className="p-1.5 sm:p-2.5 font-black text-xs sm:text-base text-amber-950 bg-amber-50/50 break-words">
                  {duty.duty_place || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-1.5 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm">
                  दिनाँक व समय
                </td>
                <td className="p-1.5 sm:p-2.5 font-bold text-slate-900 bg-white text-[11px] sm:text-sm break-words">
                  {duty.shift || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-1.5 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm">
                  जोन / व्यवस्था
                </td>
                <td className="p-1.5 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words">
                  {duty.zone || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-1.5 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm">
                  जोनाल प्रभारी
                </td>
                <td className="p-1.5 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words">
                  {duty.zonal_incharge || duty.zonal || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-1.5 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm">
                  सेक्टर
                </td>
                <td className="p-1.5 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words">
                  {duty.sector || ''}
                </td>
              </tr>

              <tr>
                <td className="bg-slate-50 font-bold p-1.5 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm">
                  सेक्टर प्रभारी
                </td>
                <td className="p-1.5 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words">
                  {duty.sector_incharge || ''}
                </td>
              </tr>

              {/* Briefing Location Row */}
              {activeBriefingPlace && (
                <tr className="bg-amber-50/70 border-t-2 border-amber-200">
                  <td className="bg-amber-100/60 font-black p-1.5 sm:p-2.5 border-r border-amber-200 text-amber-950 text-[11px] sm:text-sm">
                    ब्रीफिंग स्थान
                  </td>
                  <td className="p-1.5 sm:p-2.5 font-bold text-amber-950 bg-amber-50/70 text-[11px] sm:text-sm break-words">
                    {activeBriefingPlace}
                  </td>
                </tr>
              )}

              {/* Special Note Row */}
              {activeNote && (
                <tr className="bg-amber-50/70 border-t-2 border-amber-200">
                  <td className="bg-amber-100/60 font-black p-1.5 sm:p-2.5 border-r border-amber-200 text-amber-950 text-[11px] sm:text-sm">
                    विशेष नोट
                  </td>
                  <td className="p-1.5 sm:p-2.5 font-bold text-amber-950 bg-amber-50/70 text-[11px] sm:text-sm leading-relaxed break-words">
                    {activeNote}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Authority & QR Block */}
        <div className="pt-2 border-t-2 border-slate-900 flex flex-row items-center justify-between gap-2">
          {/* QR Code with Verification Trigger */}
          <div
            onClick={() => setIsVerifyModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition group"
            title="सत्यापन देखने हेतु क्लिक करें"
          >
            <div className="p-1 bg-white border border-slate-400 rounded-lg shadow-2xs group-hover:border-emerald-500 transition shrink-0">
              <QRCodeSVG
                value={qrPayload}
                size={48}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="text-left space-y-0.5">
              <div className="text-[9px] sm:text-[10px] font-black text-emerald-800 uppercase flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>डिजिटल सत्यापित</span>
              </div>
              <div className="text-[8px] sm:text-[9px] text-slate-500 font-mono">
                PASS: {duty.id}
              </div>
            </div>
          </div>

          {/* Official Signatory Authority */}
          <div className="text-right space-y-0.5 sm:space-y-1">
            {signatureImg ? (
              <div className="flex justify-end">
                <img
                  src={signatureImg}
                  alt="Official Signature"
                  className="h-8 sm:h-11 max-w-[100px] sm:max-w-[120px] object-contain"
                />
              </div>
            ) : (
              <div className="h-5 sm:h-8 flex items-center justify-end font-serif italic text-[11px] sm:text-xs text-slate-600">
                (हस्ताक्षरित)
              </div>
            )}
            <div className="text-[11px] sm:text-sm font-black text-slate-950 leading-tight">
              {signatoryText}
            </div>
          </div>
        </div>
      </div>

      {/* CO-DEPLOYED PERSONNEL SECTION (साथी जवान) */}
      <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 space-y-3 shadow-sm no-print">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              इस पॉइंट पर अन्य तैनात बल
            </h3>
          </div>
          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-mono">
            {coDeployedOfficers.length} साथी
          </span>
        </div>

        {coDeployedOfficers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {coDeployedOfficers.map((peer, idx) => (
              <div
                key={idx}
                className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">{peer.name}</span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold shrink-0">
                      {peer.rank || 'जवान'}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                    {peer.posting || 'थाना कोतवाली'} {peer.district ? `(${peer.district})` : ''}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700">
                    📱 {peer.mobile || '-'}
                  </div>
                </div>

                {peer.mobile && (
                  <a
                    href={`tel:${peer.mobile}`}
                    className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition shrink-0 active:scale-95 shadow-2xs"
                    title="सीधे कॉल करें"
                  >
                    <Phone className="w-3 h-3" />
                    <span>कॉल</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-slate-500 font-medium">
            इस ड्यूटी पॉइंट पर आपके अतिरिक्त अन्य कोई बल डेटाबेस में आवंटित नहीं है।
          </div>
        )}
      </div>

      {/* Live Verification Modal */}
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
