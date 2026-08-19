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
  Award,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import VerifyModal from './VerifyModal';
import { useLanguage } from '../context/LanguageContext';

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
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  onUpdateDutyPhoto,
  onUpdateDutyRecord,
  userRole = 'guest',
  onRequestAuth,
  customLabels = {}
}) {
  const { language, t } = useLanguage();
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    duty_place: '',
    zone: '',
    sector: '',
    shift: '',
    zonal_incharge: '',
    sector_incharge: '',
    event_name: ''
  });
  const photoInputRef = useRef(null);

  if (!duty) return null;

  const labels = {
    duty_place: customLabels?.duty_place?.trim() || 'ड्यूटी का स्थान',
    shift: customLabels?.shift?.trim() || 'दिनाँक व समय',
    zone: customLabels?.zone?.trim() || 'जोन / व्यवस्था',
    zonal_incharge: customLabels?.zonal_incharge?.trim() || 'जोनाल प्रभारी',
    sector: customLabels?.sector?.trim() || 'सेक्टर',
    sector_incharge: customLabels?.sector_incharge?.trim() || 'सेक्टर प्रभारी',
    briefing: customLabels?.briefing?.trim() || 'ब्रीफिंग स्थान',
    note: customLabels?.note?.trim() || 'विशेष नोट'
  };

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

  const openEditForm = () => {
    setEditFormData({
      duty_place: duty.duty_place || '',
      zone: duty.zone || '',
      sector: duty.sector || '',
      shift: duty.shift || 'प्रातः 08:00 बजे से मेला समाप्ति तक',
      zonal_incharge: duty.zonal_incharge || duty.zonal || '',
      sector_incharge: duty.sector_incharge || '',
      event_name: duty.event_name || ''
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (userRole !== 'admin' && userRole !== 'senior') {
      if (onRequestAuth) {
        onRequestAuth(() => {
          openEditForm();
        });
      } else {
        alert('ड्यूटी विवरण बदलने के लिए एडमिन या वरिष्ठ अधिकारी लॉगिन आवश्यक है।');
      }
      return;
    }
    openEditForm();
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editFormData.duty_place.trim()) {
      alert('कृपया ड्यूटी स्थल का नाम अवश्य भरें।');
      return;
    }

    const updated = {
      ...duty,
      duty_place: editFormData.duty_place.trim(),
      zone: editFormData.zone.trim(),
      sector: editFormData.sector.trim(),
      shift: editFormData.shift.trim(),
      zonal_incharge: editFormData.zonal_incharge.trim(),
      zonal: editFormData.zonal_incharge.trim(),
      sector_incharge: editFormData.sector_incharge.trim(),
      event_name: editFormData.event_name.trim()
    };

    if (onUpdateDutyRecord) {
      onUpdateDutyRecord(updated);
    }
    setIsEditModalOpen(false);
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

      // Ensure fonts are fully loaded before rendering to canvas
      if (document.fonts) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const card = clonedDoc.getElementById('printable-duty-card');
          if (card) {
            // Apply standard fixed dimensions for pristine PDF rendering
            card.style.width = '640px';
            card.style.maxWidth = '640px';
            card.style.margin = '0 auto';
            card.style.padding = '24px';
            card.style.letterSpacing = 'normal';

            // Ensure no clipped ligatures or broken matras in cloned tree
            const textNodes = card.querySelectorAll('h1, h2, h3, h4, span, td, div, p');
            textNodes.forEach((node) => {
              node.style.letterSpacing = 'normal';
              node.style.overflow = 'visible';
              node.style.textOverflow = 'clip';
              node.style.whiteSpace = 'normal';
              node.style.lineHeight = '1.45';
              node.style.fontFamily = "'Noto Sans Devanagari', sans-serif";
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
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
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Edit Duty Details Button (Admin/Senior) */}
          <button
            onClick={handleOpenEditModal}
            className="px-2.5 sm:px-3 py-2 rounded-lg sm:rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
            title="ड्यूटी स्थल, ज़ोन, सेक्टर व समय बदलें"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>ड्यूटी बदलें</span>
          </button>

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
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-900 dark:border-slate-700 shadow-md space-y-3.5 sm:space-y-4 transition"
      >
        {/* Pass Header */}
        <div className="border-b-2 border-slate-900 dark:border-slate-700 pb-2.5 sm:pb-3.5 flex items-center justify-between gap-2 sm:gap-3">
          <img src="/badge.png" alt="Police Badge Left" className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
          
          <div className="flex-1 text-center min-w-0 px-1">
            <h1 className="text-base sm:text-2xl font-black text-slate-950 dark:text-white leading-normal">
              {eventTitle}
            </h1>
            <h2 className="text-xs sm:text-base font-bold text-slate-700 dark:text-amber-400 mt-1 leading-normal">
              {eventSubtitle}
            </h2>
          </div>

          <img src="/badge.png" alt="Police Badge Right" className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
        </div>

        {/* Officer Identity & Passport Photo Block */}
        <div className="flex items-stretch gap-2.5 sm:gap-3 border border-slate-300 dark:border-slate-700 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50/90 dark:bg-slate-800/80">
          {/* Photo Frame */}
          <div
            onClick={() => photoInputRef.current?.click()}
            className="w-18 h-24 sm:w-24 sm:h-28 border-2 border-dashed border-slate-400 dark:border-slate-600 hover:border-amber-500 rounded-lg bg-white dark:bg-slate-900 overflow-hidden flex flex-col items-center justify-center text-center shrink-0 relative group cursor-pointer transition shadow-inner"
            title="फोटो अपलोड/बदलने के लिए क्लिक करें"
          >
            {duty.photo ? (
              <img
                src={duty.photo}
                alt={duty.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-1 space-y-0.5 text-slate-400 dark:text-slate-500">
                <User className="w-5 h-5 sm:w-6 sm:h-6 mx-auto text-slate-400 dark:text-slate-500" />
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  पासपोर्ट फोटो
                </div>
                <div className="text-[8px] sm:text-[9px] text-slate-400 dark:text-slate-500">चस्पा करें</div>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition no-print">
              <Camera className="w-4 h-4 mb-0.5" />
              <span>बदलें</span>
            </div>
          </div>

          {/* Officer Details Info */}
          <div className="flex-1 flex flex-col justify-between text-slate-900 dark:text-slate-100 py-0.5 min-w-0">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400">अधिकारी / कर्मचारी:</span>
              <div className="text-sm sm:text-lg font-black text-slate-950 dark:text-white mt-0.5 break-words">
                {duty.name}
              </div>
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-amber-300 mt-1 flex items-center gap-1.5">
                <span>📱</span>
                <span>{duty.mobile || 'मोबाइल अनुपलब्ध'}</span>
              </div>
            </div>

            <div className="text-[10px] sm:text-xs text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-1.5 flex flex-wrap items-center justify-between gap-1">
              <div>P.No: <strong className="font-mono text-slate-950 dark:text-white">{duty.id}</strong></div>
              <div>मूल तैनाती: <strong className="text-slate-950 dark:text-white">{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}</div>
            </div>
          </div>
        </div>

        {/* Clean Alternating Rows Table */}
        <div className="overflow-hidden border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs sm:text-sm">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {duty.event_name ? (
                <tr>
                  <td className="w-[38%] sm:w-1/3 bg-slate-100 dark:bg-slate-800/80 font-bold p-2 sm:p-2.5 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-[11px] sm:text-sm leading-relaxed">
                    ड्यूटी का प्रकार
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-950 dark:text-white bg-white dark:bg-slate-900 text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.event_name}
                  </td>
                </tr>
              ) : null}

              <tr>
                <td className="w-[38%] sm:w-1/3 bg-slate-100 dark:bg-slate-800/80 font-bold p-2 sm:p-2.5 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-[11px] sm:text-sm leading-relaxed">
                  {labels.duty_place}
                </td>
                <td className="p-2 sm:p-2.5 font-black text-xs sm:text-base bg-amber-100/80 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 break-words leading-relaxed">
                  {duty.duty_place || '-'}
                </td>
              </tr>

              {duty.shift ? (
                <tr>
                  <td className="bg-slate-100 dark:bg-slate-800/80 font-bold p-2 sm:p-2.5 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-[11px] sm:text-sm leading-relaxed">
                    {labels.shift}
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-950 dark:text-white bg-white dark:bg-slate-900 text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.shift}
                  </td>
                </tr>
              ) : null}

              {duty.zone ? (
                <tr>
                  <td className="bg-slate-100 dark:bg-slate-800/80 font-bold p-2 sm:p-2.5 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-[11px] sm:text-sm leading-relaxed">
                    {labels.zone}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.zone}
                  </td>
                </tr>
              ) : null}

              {(duty.zonal_incharge || duty.zonal) ? (
                <tr>
                  <td className="bg-slate-100 dark:bg-slate-800/80 font-bold p-2 sm:p-2.5 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-[11px] sm:text-sm leading-relaxed">
                    {labels.zonal_incharge}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.zonal_incharge || duty.zonal}
                  </td>
                </tr>
              ) : null}

              {duty.sector ? (
                <tr>
                  <td className="bg-slate-100 dark:bg-slate-800/80 font-bold p-2 sm:p-2.5 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-[11px] sm:text-sm leading-relaxed">
                    {labels.sector}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.sector}
                  </td>
                </tr>
              ) : null}

              {duty.sector_incharge ? (
                <tr>
                  <td className="bg-slate-100 dark:bg-slate-800/80 font-bold p-2 sm:p-2.5 border-r border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-[11px] sm:text-sm leading-relaxed">
                    {labels.sector_incharge}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-900 dark:text-slate-200 bg-white dark:bg-slate-900 text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.sector_incharge}
                  </td>
                </tr>
              ) : null}

              {/* Briefing Location Row */}
              {activeBriefingPlace && (
                <tr className="bg-amber-100/70 dark:bg-amber-950/40 border-t-2 border-amber-300 dark:border-amber-700/50">
                  <td className="bg-amber-200/60 dark:bg-amber-900/40 font-black p-2 sm:p-2.5 border-r border-amber-300 dark:border-amber-700/50 text-amber-950 dark:text-amber-300 text-[11px] sm:text-sm leading-relaxed">
                    {labels.briefing}
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-amber-950 dark:text-amber-200 bg-amber-100/50 dark:bg-amber-950/30 text-[11px] sm:text-sm break-words leading-relaxed">
                    {activeBriefingPlace}
                  </td>
                </tr>
              )}

              {/* Special Note Row */}
              {activeNote && (
                <tr className="bg-amber-100/70 dark:bg-amber-950/40 border-t-2 border-amber-300 dark:border-amber-700/50">
                  <td className="bg-amber-200/60 dark:bg-amber-900/40 font-black p-2 sm:p-2.5 border-r border-amber-300 dark:border-amber-700/50 text-amber-950 dark:text-amber-300 text-[11px] sm:text-sm leading-relaxed">
                    {labels.note}
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-amber-950 dark:text-amber-200 bg-amber-100/50 dark:bg-amber-950/30 text-[11px] sm:text-sm leading-relaxed break-words">
                    {activeNote}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Authority & QR Block */}
        <div className="pt-2.5 border-t-2 border-slate-900 flex flex-row items-center justify-between gap-2">
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

      {/* Edit Duty Card Details Modal (Zone, Sector, Duty Point, Shift, Incharges) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-slate-950">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <span>ड्यूटी कार्ड विवरण संशोधित करें</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Officer Brief */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs font-bold">
              <div>
                <span className="text-slate-500">अधिकारी / कर्मचारी:</span>
                <div className="font-black text-slate-950 text-sm mt-0.5">{duty.name} ({duty.rank || 'जवान'})</div>
              </div>
              <div className="font-mono text-slate-700">PNO: {duty.id}</div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs font-bold">
              {/* Duty Place */}
              <div>
                <label className="text-slate-800 font-black">
                  ड्यूटी का स्थान (Duty Place) *
                </label>
                <input
                  type="text"
                  value={editFormData.duty_place}
                  onChange={(e) => setEditFormData({ ...editFormData, duty_place: e.target.value })}
                  placeholder="e.g. हनुमानगढ़ी मुख्य द्वार"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
                  required
                />
              </div>

              {/* Zone and Sector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-800 font-black">
                    जोन / व्यवस्था (Zone)
                  </label>
                  <input
                    type="text"
                    value={editFormData.zone}
                    onChange={(e) => setEditFormData({ ...editFormData, zone: e.target.value })}
                    placeholder="e.g. मंदिर जोन"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
                  />
                </div>

                <div>
                  <label className="text-slate-800 font-black">
                    सेक्टर (Sector)
                  </label>
                  <input
                    type="text"
                    value={editFormData.sector}
                    onChange={(e) => setEditFormData({ ...editFormData, sector: e.target.value })}
                    placeholder="e.g. मंदिर सेक्टर-01"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
                  />
                </div>
              </div>

              {/* Shift & Time */}
              <div>
                <label className="text-slate-800 font-black">
                  दिनाँक व समय / पाली (Shift & Timing)
                </label>
                <input
                  type="text"
                  value={editFormData.shift}
                  onChange={(e) => setEditFormData({ ...editFormData, shift: e.target.value })}
                  placeholder="e.g. प्रातः 08:00 बजे से 20:30 बजे तक"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
                />
              </div>

              {/* Zonal and Sector Incharges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-800">
                    जोनाल प्रभारी अधिकारी
                  </label>
                  <input
                    type="text"
                    value={editFormData.zonal_incharge}
                    onChange={(e) => setEditFormData({ ...editFormData, zonal_incharge: e.target.value })}
                    placeholder="e.g. क्षेत्राधिकारी"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 mt-1"
                  />
                </div>

                <div>
                  <label className="text-slate-800">
                    सेक्टर प्रभारी अधिकारी
                  </label>
                  <input
                    type="text"
                    value={editFormData.sector_incharge}
                    onChange={(e) => setEditFormData({ ...editFormData, sector_incharge: e.target.value })}
                    placeholder="e.g. प्र0नि0 कोतवाली"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>ड्यूटी कार्ड में सहेजें (Save)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
