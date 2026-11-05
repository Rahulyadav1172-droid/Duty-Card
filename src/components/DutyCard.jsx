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
import { printIndividualPass, generateIndividualPassHtml } from '../utils/printLegalBulk';
import { resolvePoliceRank, stripRankFromName, parseIncharge } from '../utils/rankResolver';
import { ELECTION_DUTY_CARD_INSTRUCTIONS, ELECTION_CUG_DIRECTORY } from '../data/electionStandardData';
import UpPoliceLogo from './UpPoliceLogo';

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
  customLabels = {},
  isOffline = false
}) {
  const { language, t } = useLanguage();
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'front' | 'back'
  const showBackSide = viewMode === 'back';
  const setShowBackSide = (val) => setViewMode(val ? 'back' : 'both');
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

  // 1. Resolve Zone & Zonal Incharge
  let cleanZone = (duty.zone || '').trim();
  let cleanZonalIncharge = (
    duty.zonal_incharge || 
    duty.zonal || 
    duty.zonal_officer || 
    duty.zonalOfficer || 
    duty.zone_incharge || 
    duty.zonal_magistrate ||
    duty['जोनाल प्रभारी'] ||
    duty['जोनल प्रभारी'] ||
    ''
  ).trim();
  if (cleanZonalIncharge === '-') cleanZonalIncharge = '';

  if (!cleanZonalIncharge && cleanZone.includes('/')) {
    const parts = cleanZone.split('/');
    cleanZone = parts[0].trim();
    cleanZonalIncharge = parts.slice(1).join('/').trim();
  } else if (cleanZone.endsWith('/')) {
    cleanZone = cleanZone.replace(/\/+\s*$/, '').trim();
  }
  if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
    cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
  }

  // Cross-lookup in allRecords for zonal incharge if missing
  if (!cleanZonalIncharge && cleanZone && Array.isArray(allRecords)) {
    const matchedZoneRec = allRecords.find(r => 
      r && 
      (r.zone || '').trim().toLowerCase() === cleanZone.toLowerCase() && 
      (r.zonal_incharge || r.zonal || r.zonal_officer || r.zonalOfficer || r.zone_incharge || r['जोनाल प्रभारी'] || r['जोनल प्रभारी'])
    );
    if (matchedZoneRec) {
      cleanZonalIncharge = (
        matchedZoneRec.zonal_incharge || 
        matchedZoneRec.zonal || 
        matchedZoneRec.zonal_officer || 
        matchedZoneRec.zonalOfficer || 
        matchedZoneRec.zone_incharge || 
        matchedZoneRec['जोनाल प्रभारी'] || 
        matchedZoneRec['जोनल प्रभारी'] || 
        ''
      ).trim();
    }
  }

  // 2. Resolve Sector & Sector Incharge
  let cleanSector = (duty.sector || '').trim();
  let cleanSectorIncharge = (
    duty.sector_incharge || 
    duty.sector_officer || 
    duty.sectorOfficer || 
    duty.sectorIncharge || 
    duty.sector_magistrate || 
    duty.sectorMagistrate || 
    duty.incharge || 
    duty['सेक्टर प्रभारी'] ||
    duty['सेक्टर अधिकारी'] ||
    duty['सेक्टर मजिस्ट्रेट'] ||
    duty['प्रभारी'] ||
    ''
  ).trim();
  if (cleanSectorIncharge === '-') cleanSectorIncharge = '';

  if (!cleanSectorIncharge && cleanSector.includes('/')) {
    const parts = cleanSector.split('/');
    cleanSector = parts[0].trim();
    cleanSectorIncharge = parts.slice(1).join('/').trim();
  } else if (cleanSector.endsWith('/')) {
    cleanSector = cleanSector.replace(/\/+\s*$/, '').trim();
  }
  if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
    cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
  }

  // Cross-lookup in allRecords for sector incharge if missing
  if (!cleanSectorIncharge && cleanSector && Array.isArray(allRecords)) {
    const matchedSectorRec = allRecords.find(r => {
      if (!r) return false;
      const rSec = (r.sector || '').trim().toLowerCase();
      const currSec = cleanSector.toLowerCase();
      const isSameSector = rSec === currSec || rSec.startsWith(currSec) || currSec.startsWith(rSec);
      const inc = (
        r.sector_incharge || 
        r.sector_officer || 
        r.sectorOfficer || 
        r.sectorIncharge || 
        r.sector_magistrate || 
        r.sectorMagistrate || 
        r.incharge || 
        r['सेक्टर प्रभारी'] ||
        r['सेक्टर अधिकारी'] ||
        r['सेक्टर मजिस्ट्रेट'] ||
        r['प्रभारी'] ||
        ''
      ).trim();
      return isSameSector && inc && inc !== '-';
    });

    if (matchedSectorRec) {
      cleanSectorIncharge = (
        matchedSectorRec.sector_incharge || 
        matchedSectorRec.sector_officer || 
        matchedSectorRec.sectorOfficer || 
        matchedSectorRec.sectorIncharge || 
        matchedSectorRec.sector_magistrate || 
        matchedSectorRec.sectorMagistrate || 
        matchedSectorRec.incharge || 
        matchedSectorRec['सेक्टर प्रभारी'] || 
        matchedSectorRec['सेक्टर अधिकारी'] || 
        matchedSectorRec['सेक्टर मजिस्ट्रेट'] || 
        matchedSectorRec['प्रभारी'] || 
        ''
      ).trim();
    }
  }

  const effectiveZone = cleanZone;
  const effectiveZonalIncharge = cleanZonalIncharge;
  const effectiveSector = cleanSector;
  const effectiveSectorIncharge = cleanSectorIncharge;

  const enrichedDuty = {
    ...duty,
    zone: effectiveZone || duty.zone,
    zonal_incharge: effectiveZonalIncharge || duty.zonal_incharge || duty.zonal,
    sector: effectiveSector || duty.sector,
    sector_incharge: effectiveSectorIncharge || duty.sector_incharge
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
      zone: effectiveZone || duty.zone || '',
      sector: effectiveSector || duty.sector || '',
      shift: duty.shift || 'प्रातः 08:00 बजे से मेला समाप्ति तक',
      zonal_incharge: effectiveZonalIncharge || duty.zonal_incharge || duty.zonal || '',
      sector_incharge: effectiveSectorIncharge || duty.sector_incharge || '',
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
      `*जोन/सेक्टर:* ${effectiveZone || duty.zone || '-'} / ${effectiveSector || duty.sector || '-'}\n` +
      `*जोनाल प्रभारी:* ${effectiveZonalIncharge || '-'}\n` +
      `*सेक्टर प्रभारी:* ${effectiveSectorIncharge || '-'}\n\n` +
      `कार्यालय वरिष्ठ पुलिस अधीक्षक, अयोध्या`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Print Individual Duty Pass in Official Sahyogarth Layout
  const handlePrintIndividualPass = (forceBack = null) => {
    printIndividualPass({
      duty: enrichedDuty,
      allRecords,
      eventTitle,
      eventSubtitle,
      signatureImg,
      signatoryText,
      customNote,
      isNoteEnabled,
      customBriefing,
      isBriefingEnabled,
      includeBackSide: forceBack !== null ? forceBack : showBackSide
    });
  };

  // Download Individual Duty Pass PDF in Official Sahyogarth Layout
  const handleDownloadDirectPDF = async () => {
    try {
      setIsDownloadingPDF(true);

      if (document.fonts) {
        await document.fonts.ready;
      }

      const passHtml = generateIndividualPassHtml({
        duty: enrichedDuty,
        allRecords,
        eventTitle,
        eventSubtitle,
        signatureImg,
        signatoryText,
        customNote,
        isNoteEnabled,
        customBriefing,
        isBriefingEnabled,
        includeBackSide: showBackSide
      });

      // Create temporary offscreen container
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '740px';
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '16px';
      container.style.fontFamily = "'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif";
      container.innerHTML = passHtml;

      const passBox = container.querySelector('.pass-container') || container;
      document.body.appendChild(container);

      const canvas = await html2canvas(passBox, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printWidth = pdfWidth - (margin * 2);
      const printHeight = (canvas.height * printWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, Math.min(printHeight, pdfHeight - (margin * 2)));
      const safeName = (duty.name || 'DutyPass').replace(/\s+/g, '_');
      pdf.save(`Duty_Card_${duty.id || 'Pass'}_${safeName}_सहयोगार्थ.pdf`);
    } catch (err) {
      console.error('PDF Download Error:', err);
      alert('PDF डाउनलोड करने में त्रुटि: ' + err.message);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Direct live verification URL so scanning with any phone camera opens the verified card directly
  const qrVerificationUrl = typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/?search=${encodeURIComponent(duty.mobile || duty.pno || duty.id || '')}`
    : '';

  const cleanPno = (duty.pno && !String(duty.pno).startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : null;

  const qrPayload = qrVerificationUrl || JSON.stringify({
    id: duty.id,
    name: duty.name,
    rank: duty.rank || '',
    duty_place: duty.duty_place,
    shift: duty.shift,
    zone: duty.zone,
    sector: duty.sector
  });

  const effectiveRank = duty?.rank ? resolvePoliceRank(duty.rank) : '';
  const cleanOfficerName = stripRankFromName(duty?.name) || '-';

  const zonalInfo = parseIncharge(effectiveZonalIncharge);
  const sectorInfo = parseIncharge(effectiveSectorIncharge);
  const zonalMobile = zonalInfo.mobile || duty.zonal_mobile || duty.zone_mobile || '';
  const sectorMobile = sectorInfo.mobile || duty.sector_mobile || '';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95 duration-300 pb-20 md:pb-0">
      {/* Hidden File Input for Photo Upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      {/* Action Toolbar (Perfect for all mobile screen sizes) */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 leading-tight truncate">
                अयोध्या पुलिस ड्यूटी पास
              </span>
              {isOffline && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[9px] sm:text-[10px]">
                  📶 ऑफ़लाइन सुरक्षित
                </span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-mono font-medium tnum">
              {cleanPno ? `P.No: ${cleanPno}` : (duty.district ? `जनपद: ${duty.district}` : 'अयोध्या')}
            </div>
          </div>
        </div>

        {/* Action Buttons: Responsive Grid */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto">
          {/* Toggle Pass View: Foldable Both Sides / Single Front */}
          <button
            onClick={() => setViewMode(viewMode === 'both' ? 'front' : 'both')}
            className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-xs ${
              viewMode === 'both'
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="फ़ोल्डेबल 2-साइड पास (मुख व पृष्ठ भाग) देखें"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{viewMode === 'both' ? 'फ़ोल्डेबल 2-इन-1 पास' : 'विस्तृत दृश्य'}</span>
          </button>

          {/* Edit Duty Details Button (Admin / Senior Officer Only - Hidden from Public View) */}
          {(userRole === 'admin' || userRole === 'senior') && (
            <button
              onClick={handleOpenEditModal}
              className="h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-xs"
              title="ड्यूटी स्थल, ज़ोन, सेक्टर व समय बदलें"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>ड्यूटी बदलें</span>
            </button>
          )}

          {/* Direct PDF Download (Official Sahyogarth Layout) */}
          <button
            onClick={handleDownloadDirectPDF}
            disabled={isDownloadingPDF}
            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-[0.98] cursor-pointer"
            title="सहयोगार्थ बल सहित आधिकारिक PDF डाउनलोड करें"
          >
            <FileDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{isDownloadingPDF ? 'बना रहा है...' : 'PDF डाउनलोड'}</span>
          </button>

          {/* Official Sahyogarth Print Trigger */}
          <button
            onClick={handlePrintIndividualPass}
            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-[0.98] cursor-pointer"
            title="सहयोगार्थ बल सहित आधिकारिक पास प्रिंट करें"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>प्रिंट करें</span>
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="col-span-2 sm:col-span-1 h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            title="WhatsApp पर शेयर करें"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>शेयर</span>
          </button>
        </div>
      </div>

      {/* View Switcher / Badge Info (Lanyard Foldable Standard) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/80 no-print pb-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'both'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>फ़ोल्डेबल पास (दोनों पृष्ठ)</span>
          </button>
          <button
            onClick={() => setViewMode('front')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'front'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>केवल मुख पृष्ठ</span>
          </button>
          <button
            onClick={() => setViewMode('back')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'back'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-200" />
            <span>केवल पृष्ठ भाग (जोन/सेक्टर)</span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>लैनयार्ड पाउच साइज: 90×128mm (सिंगल-साइड प्रिंट व सेंटर-फोल्ड)</span>
        </div>
      </div>
      {/* Main Card */}
      <div className="w-full overflow-x-auto pb-2 flex justify-center">
        <div
          id="printable-duty-card"
          className={`foldable-pass-unit bg-white text-slate-950 rounded-2xl border-2 border-slate-900 shadow-2xl overflow-hidden w-full select-none font-devanagari relative grid transition-all duration-200 ${
            viewMode === 'both' ? 'max-w-[820px] grid-cols-1 md:grid-cols-2' : 'max-w-[420px] grid-cols-1'
          }`}
          style={{ boxSizing: 'border-box' }}
        >
          {/* ================= FRONT SIDE (LEFT PANEL) ================= */}
          <div
            className={`pass-panel-front bg-white p-2 flex flex-col justify-between relative ${
              viewMode === 'both' ? 'md:border-r-[1.5px] md:border-dashed md:border-slate-300 flex' : (viewMode === 'front' ? 'flex' : 'hidden')
            }`}
          >
            {/* 1. Lanyard Punch Slot Indicator */}
            <div className="pt-0.5 pb-0.5 text-center shrink-0">
              <div
                className="w-10 h-1.5 rounded-full border border-slate-300 bg-slate-100 mx-auto flex items-center justify-center shadow-inner"
                title="लैनयार्ड पंच स्लॉट"
              >
                <span className="w-1 h-0.5 bg-slate-400 rounded-full" />
              </div>
            </div>

            {/* 2. Official UP Police Header Banner (Dark Navy #0f172a with 2.5px Crimson Red #dc2626 border) */}
            <div className="bg-[#0f172a] text-white px-2 py-1.5 border-b-[2.5px] border-[#dc2626] flex items-center justify-between gap-1.5 shrink-0 rounded-t-md">
              <UpPoliceLogo size={30} />

              <div className="flex-1 text-center min-w-0 px-1">
                <div className="text-amber-400 font-bold text-[9.5px] tracking-wider uppercase truncate leading-tight">
                  उत्तर प्रदेश पुलिस • अयोध्या
                </div>
                <h1 className="text-white font-extrabold text-[12.5px] leading-tight break-words my-0.5">
                  {eventTitle || 'मा० मुख्यमंत्री उ०प्र० अयोध्या आगमन'}
                </h1>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="bg-[#dc2626] text-white text-[8px] px-2 py-0.2 rounded-full font-bold shadow-2xs">
                    {eventSubtitle || 'ड्यूटी पास - 2026'}
                  </span>
                </div>
              </div>

              <UpPoliceLogo size={30} />
            </div>

            {/* 3. Officer Identity Row */}
            <div className="px-1 pt-1 pb-0.5 flex items-center gap-2 shrink-0 bg-white">
              {/* Passport Photo Box */}
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-[62px] min-w-[62px] h-[78px] border-2 border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center shrink-0 relative group cursor-pointer overflow-hidden shadow-2xs hover:border-blue-500 transition"
                style={{ width: '62px', minWidth: '62px', height: '78px' }}
                title="फोटो अपलोड/बदलने के लिए क्लिक करें"
              >
                {duty.photo ? (
                  <img src={duty.photo} alt={cleanOfficerName} className="w-full h-full object-cover" />
                ) : (
                  <div className="p-1 space-y-0.5 text-slate-400 flex flex-col items-center justify-center">
                    <User className="w-6 h-6 mx-auto text-slate-400 mb-0.5" />
                    <div className="text-[8.5px] font-bold text-slate-700 leading-tight">पासपोर्ट फोटो</div>
                    <div className="text-[7.5px] font-semibold text-slate-400 leading-none">चस्पा करें</div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[7.5px] font-bold transition no-print">
                  <Camera className="w-3.5 h-3.5 mb-0.5" />
                  <span>बदलें</span>
                </div>
              </div>

              {/* Officer Details Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[16px] font-extrabold text-slate-950 leading-tight break-words">
                    {cleanOfficerName}
                  </span>
                </div>

                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-[14.5px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.2 rounded tabular-nums inline-flex items-center gap-1 shadow-2xs">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{duty.mobile || 'अनुपलब्ध'}</span>
                  </span>
                </div>

                <div className="text-[11.5px] font-medium text-slate-700 mt-0.5 whitespace-normal break-words leading-tight">
                  मूल तैनाती: <strong className="text-slate-900 font-bold">{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}
                  {cleanPno && <span className="ml-1.5 font-mono text-slate-900">| P.No: <strong>{cleanPno}</strong></span>}
                </div>
              </div>
            </div>

            {/* 4. Primary Duty Point Spotlight (High-contrast Amber Box) */}
            <div className="px-0.5 py-1 shrink-0">
              <div className="bg-amber-50 border-2 border-amber-500 border-l-4 border-l-amber-600 rounded-lg p-2 shadow-2xs">
                <div className="text-[10px] font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>ड्यूटी स्थल</span>
                </div>
                <div className="text-[14.5px] font-black text-slate-950 leading-snug break-words whitespace-normal mt-0.5">
                  {duty.duty_place || '-'}
                </div>
              </div>
            </div>

            {/* 5. Duty Date & Time Bar */}
            <div className="px-0.5 py-1 shrink-0">
              <div className="bg-slate-100 border border-slate-300 p-1.5 rounded-lg flex items-center justify-between gap-1 flex-wrap">
                <div className="text-[12px] font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="text-slate-600 font-medium">दिनाँक व समय:</span>
                  <span className="font-mono">{duty.shift || 'प्रातः 08:00 बजे से कार्यक्रम समाप्ति तक'}</span>
                </div>
                {(duty.booth_no || duty.vehicle_no || duty.weapon || duty.capf) && (
                  <div className="flex items-center gap-1 shrink-0 text-[8.5px]">
                    {duty.booth_no && <span className="bg-blue-100 text-blue-900 px-1 py-0.2 rounded font-bold">बूथ: {duty.booth_no}</span>}
                    {duty.vehicle_no && <span className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold">वाहन: {duty.vehicle_no}</span>}
                    {duty.weapon && <span className="bg-red-100 text-red-900 px-1 py-0.2 rounded font-bold">🛡️ {duty.weapon}</span>}
                    {duty.capf && <span className="bg-emerald-100 text-emerald-900 px-1 py-0.2 rounded font-bold">🎖️ {duty.capf}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* 6. Bottom Security Footer */}
            <div className="px-2 py-1.5 border-t-2 border-slate-900 bg-slate-50 flex justify-between items-end w-full mt-auto rounded-b-md">
              {/* Left: QR Code + Digital Verification */}
              <div
                onClick={() => setIsVerifyModalOpen(true)}
                className="flex gap-2 items-center cursor-pointer group text-left"
                title="सत्यापन देखने हेतु क्लिक करें"
              >
                <div className="p-0.5 bg-white border border-slate-300 rounded shadow-2xs group-hover:border-emerald-500 shrink-0">
                  <QRCodeSVG value={qrPayload} size={42} level="M" />
                </div>
                <div className="text-left space-y-0.5">
                  <div className="text-[9px] font-extrabold text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>डिजिटल सत्यापित पास</span>
                  </div>
                  <div className="text-[12px] font-extrabold font-mono text-slate-800">
                    ID: {cleanPno || duty.id || 'DUTY-0001'}
                  </div>
                </div>
              </div>

              {/* Right: Signature & Authority */}
              <div className="text-right flex flex-col items-end">
                {signatureImg ? (
                  <img
                    src={signatureImg}
                    alt="Official Signature"
                    className="h-5 max-w-[80px] object-contain mb-0.5"
                  />
                ) : (
                  <div className="font-serif italic text-[10px] text-slate-600 leading-none mb-0.5">
                    (हस्ताक्षरित)
                  </div>
                )}
                <div className="text-[11.5px] font-extrabold text-slate-950 leading-tight">
                  वरिष्ठ पुलिस अधीक्षक,
                </div>
                <div className="text-[11.5px] font-extrabold text-slate-950 leading-tight">
                  अयोध्या
                </div>
              </div>
            </div>
          </div>

          {/* ================= BACK SIDE (RIGHT PANEL) ================= */}
          <div
            className={`pass-panel-back bg-white p-2 flex flex-col justify-between relative ${
              viewMode === 'both' ? 'flex' : (viewMode === 'back' ? 'flex' : 'hidden')
            }`}
          >
            {/* 1. Matching Lanyard Punch Slot Indicator */}
            <div className="pt-0.5 pb-0.5 text-center shrink-0">
              <div
                className="w-10 h-1.5 rounded-full border border-slate-300 bg-slate-100 mx-auto flex items-center justify-center shadow-inner"
                title="लैनयार्ड पंच स्लॉट"
              >
                <span className="w-1 h-0.5 bg-slate-400 rounded-full" />
              </div>
            </div>

            {/* 2. Slate Header (Clean UP Police Navy, no neon blue strip) */}
            <div className="bg-[#0f172a] text-white py-1.5 px-3 text-center font-extrabold text-[12.5px] rounded-t-md shrink-0">
              जोन, सेक्टर एवं ब्रीफिंग विवरण
            </div>

            {/* 3. Zone Card (NO Ellipsis, Full Text Wrap, NO floating watermark badge) */}
            <div className="bg-blue-50/80 border-2 border-blue-200 p-2.5 rounded-lg mb-1.5 shadow-2xs flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-blue-900 uppercase">
                  <span>जोन विवरण</span>
                </div>
                <div className="text-[14px] font-black text-blue-950 leading-snug break-words whitespace-normal mt-0.5">
                  {effectiveZone || 'जोन-01'}
                </div>
              </div>
              <div className="border-b border-blue-200 my-1" />
              <div className="text-[12.5px] font-medium text-slate-800 leading-snug break-words whitespace-normal">
                जोनल प्रभारी: <strong className="font-extrabold text-slate-950">{zonalInfo.name || 'नियुक्त अधिकारी'}</strong>
              </div>
              {duty.zonal_sahyogarth && (
                <div className="text-[11.5px] font-medium text-blue-900 mt-0.5 leading-snug break-words">
                  सहयोगार्थ: <strong className="font-bold">{duty.zonal_sahyogarth}</strong>
                </div>
              )}
              {zonalMobile && (
                <div className="mt-1">
                  <span className="text-[14.5px] font-extrabold text-blue-900 bg-white border border-blue-300 px-2 py-0.2 rounded tabular-nums inline-flex items-center gap-1 shadow-2xs">
                    <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{zonalMobile}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 4. Sector Card (NO Ellipsis, Full Text Wrap, NO floating watermark badge) */}
            <div className="bg-indigo-50/80 border-2 border-indigo-200 p-2.5 rounded-lg mb-1.5 shadow-2xs flex-1 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold text-indigo-900 uppercase">
                  <span>सेक्टर विवरण</span>
                </div>
                <div className="text-[14px] font-black text-indigo-950 leading-snug break-words whitespace-normal mt-0.5">
                  {effectiveSector || 'सेक्टर-01'}
                </div>
              </div>
              <div className="border-b border-indigo-200 my-1" />
              <div className="text-[12.5px] font-medium text-slate-800 leading-snug break-words whitespace-normal">
                सेक्टर प्रभारी: <strong className="font-extrabold text-slate-950">{sectorInfo.name || 'नियुक्त अधिकारी'}</strong>
              </div>
              {duty.sector_sahyogarth && (
                <div className="text-[11.5px] font-medium text-indigo-900 mt-0.5 leading-snug break-words">
                  सहयोगार्थ: <strong className="font-bold">{duty.sector_sahyogarth}</strong>
                </div>
              )}
              {sectorMobile && (
                <div className="mt-1">
                  <span className="text-[14.5px] font-extrabold text-indigo-900 bg-white border border-indigo-300 px-2 py-0.2 rounded tabular-nums inline-flex items-center gap-1 shadow-2xs">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{sectorMobile}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 5. Briefing Box (Full Text Wrap) */}
            <div className="bg-emerald-50 border-2 border-emerald-300 p-2 rounded-lg shadow-2xs shrink-0 mt-auto">
              <div className="text-[10px] font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>ब्रीफिंग स्थल व समय</span>
              </div>
              <div className="text-[12.5px] font-bold text-emerald-950 leading-snug break-words whitespace-normal mt-0.5">
                {activeBriefingPlace || 'दिनाँक- 01.11.2026 को पूर्वान्ह 13.00 बजे श्रीराम कथा पार्क नया घाट, अयोध्या'}
              </div>
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
                    {peer.posting || '-'} {peer.district ? `(${peer.district})` : ''}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700">
                    मो० {peer.mobile || '-'}
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
                  ड्यूटी का स्थान *
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
                    जोन / व्यवस्था
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
                    सेक्टर
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
                  दिनाँक व समय / पाली
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>ड्यूटी कार्ड में सहेजें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Action Dock (Native Mobile App Experience) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2 px-3 grid grid-cols-4 gap-1.5 shadow-2xl safe-area-bottom no-print">
        <button
          onClick={handleDownloadDirectPDF}
          disabled={isDownloadingPDF}
          className="py-2 px-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <FileDown className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] truncate max-w-full">{isDownloadingPDF ? 'तैयार...' : 'PDF पास'}</span>
        </button>

        <button
          onClick={handleWhatsAppShare}
          className="py-2 px-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Share2 className="w-4 h-4 text-white" />
          <span className="text-[10px]">WhatsApp</span>
        </button>

        <button
          onClick={() => setIsVerifyModalOpen(true)}
          className="py-2 px-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-white border border-slate-700/80 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 shadow-xs transition active:scale-95 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] truncate max-w-full">सत्यापित पास</span>
        </button>

        <button
          onClick={handlePrintIndividualPass}
          className="py-2 px-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 shadow-xs transition active:scale-95 cursor-pointer"
          title="प्रिंट पास"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] truncate max-w-full">प्रिंट पास</span>
        </button>
      </div>
    </div>
  );
}
