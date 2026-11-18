import React, { useState, useRef } from 'react';
import {
  Printer,
  ShieldCheck,
  Phone,
  Share2,
  CheckCircle2,
  FileDown,
  User,
  Camera,
  Layers,
  Users,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import VerifyModal from './VerifyModal';
import { printIndividualPass, generateIndividualPassHtml, cleanOfficerNameAndTitle, formatCleanPosting } from '../utils/printLegalBulk';

export default function DutyCard({
  duty,
  allRecords = [],
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
  isOffline = false,
  eventId = ''
}) {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [showBackSide, setShowBackSide] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isPhotoZoomOpen, setIsPhotoZoomOpen] = useState(false);
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
    zonal_incharge: customLabels?.zonal_incharge?.trim() || 'जोनल प्रभारी',
    sector: customLabels?.sector?.trim() || 'सेक्टर',
    sector_incharge: customLabels?.sector_incharge?.trim() || 'सेक्टर प्रभारी',
    briefing: customLabels?.briefing?.trim() || 'ब्रीफिंग स्थान',
    note: customLabels?.note?.trim() || 'विशेष निर्देश'
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
    if (userRole !== 'admin' && userRole !== 'senior') {
      alert('पासपोर्ट फोटो अपलोड करने की अनुमति केवल अधिकृत अधिकारियों को है।');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result;
      if (!rawBase64) return;

      // Automatically downscale passport photo to max 280x360 with JPEG compression (~15KB)
      // to prevent bloating cloud database and causing timeouts.
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 320;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          if (onUpdateDutyPhoto) {
            onUpdateDutyPhoto(duty.id, compressed);
          }
        } catch (err) {
          if (onUpdateDutyPhoto) {
            onUpdateDutyPhoto(duty.id, rawBase64);
          }
        }
      };
      img.onerror = () => {
        if (onUpdateDutyPhoto) {
          onUpdateDutyPhoto(duty.id, rawBase64);
        }
      };
      img.src = rawBase64;
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
      `*जोनल प्रभारी:* ${effectiveZonalIncharge || '-'}\n` +
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
        includeBackSide: showBackSide,
        autoPrint: false
      });

      // Create isolated offscreen iframe so all CSS styles, fonts, and images render 100% cleanly
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '780px';
      iframe.style.height = '1200px';
      iframe.style.border = 'none';
      iframe.style.backgroundColor = '#ffffff';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(passHtml);
      iframeDoc.close();

      // Wait for fonts and images to load inside iframe
      if (iframe.contentWindow.document.fonts) {
        await iframe.contentWindow.document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 350));

      const passContainers = iframeDoc.querySelectorAll('.pass-container');
      const targets = passContainers.length > 0 ? Array.from(passContainers) : [iframeDoc.body];

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

      for (let i = 0; i < targets.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const targetEl = targets[i];
        const canvas = await html2canvas(targetEl, {
          scale: 2.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const printHeight = (canvas.height * printWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, Math.min(printHeight, pdfHeight - (margin * 2)));
      }

      document.body.removeChild(iframe);

      const safeName = (duty.name || 'DutyPass').replace(/\s+/g, '_');
      pdf.save(`Duty_Card_${duty.id || 'Pass'}_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF Download Error:', err);
      alert('PDF डाउनलोड करने में त्रुटि: ' + err.message);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Direct live verification URL so scanning with any phone camera opens the verified card directly
  const targetEventId = eventId || duty?.event_id || '';
  const eventParam = targetEventId ? `&event=${encodeURIComponent(targetEventId)}` : '';
  const searchParam = encodeURIComponent(duty.mobile || duty.pno || duty.id || '');
  const qrVerificationUrl = typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/?search=${searchParam}${eventParam}`
    : '';

  const cleanPno = (duty.pno && !String(duty.pno).startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : null;

  const qrPayload = qrVerificationUrl || JSON.stringify({
    id: duty.id,
    name: duty.name,
    rank: duty.rank || 'का0',
    duty_place: duty.duty_place,
    shift: duty.shift,
    zone: duty.zone,
    sector: duty.sector
  });

  const cleanOfficerName = cleanOfficerNameAndTitle(duty?.name, duty?.posting, duty?.district, duty?.mobile);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95 duration-300 pb-32 md:pb-6">
      {/* Hidden File Input for Photo Upload */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      {/* Action Toolbar (Responsive for tablet and desktop) */}
      <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                अयोध्या पुलिस ड्यूटी पास
              </span>
              {isOffline && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[9px] sm:text-[10px]">
                  📶 ऑफ़लाइन सुरक्षित
                </span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-mono font-bold">
              {cleanPno ? `P.No: ${cleanPno}` : (duty.district ? `जनपद: ${duty.district}` : 'उत्तर प्रदेश पुलिस')}
            </div>
          </div>
        </div>

        {/* Desktop Action Buttons: Streamlined Bar */}
        <div className="hidden md:flex md:flex-wrap md:items-center gap-2 w-full md:w-auto">
          {/* Edit Duty Details Button (Admin / Senior Officer Only - Hidden from Public View) */}
          {(userRole === 'admin' || userRole === 'senior') && (
            <button
              onClick={handleOpenEditModal}
              className="h-9 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/90 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
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
            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            title="सहयोगार्थ बल सहित आधिकारिक PDF डाउनलोड करें"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{isDownloadingPDF ? 'बना रहा है...' : 'PDF डाउनलोड'}</span>
          </button>

          {/* Official Sahyogarth Print Trigger */}
          <button
            onClick={handlePrintIndividualPass}
            className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            title="सहयोगार्थ बल सहित आधिकारिक पास प्रिंट करें"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>प्रिंट करें</span>
          </button>

          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="WhatsApp पर शेयर करें"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>शेयर</span>
          </button>
        </div>
      </div>

      {/* Front / Back Side Switcher Tab (Election Standard Duplex View) */}
      <div className="flex items-center gap-2 border-b border-slate-200 no-print pb-2">
        <button
          onClick={() => setShowBackSide(false)}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
            !showBackSide
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>मुख पृष्ठ (Duty Pass)</span>
        </button>
        <button
          onClick={() => setShowBackSide(true)}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
            showBackSide
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-300" />
          <span>पृष्ठ भाग (ड्यूटी विवरण)</span>
        </button>
      </div>

      {showBackSide ? (
        <div
          id="printable-duty-card-back"
          className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-900 shadow-md space-y-4"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-2.5 flex items-center justify-between gap-2">
            <img src="/badge.png" alt="Police Badge Left" className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" />
            <div className="flex-1 text-center">
              <h2 className="text-sm sm:text-lg font-black text-slate-950 uppercase tracking-wide">
                उत्तर प्रदेश पुलिस • जनपद अयोध्या
              </h2>
              <div className="text-[10px] sm:text-xs font-bold text-amber-900 mt-0.5">
                (ड्यूटी कार्ड — पृष्ठ भाग)
              </div>
            </div>
            <img src="/badge.png" alt="Police Badge Right" className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" />
          </div>

          {/* Officer Details Info */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs font-bold">
            <div>
              <span className="text-slate-500 text-[11px]">अधिकारी / कर्मचारी:</span>
              <div className="font-black text-slate-950 text-sm mt-0.5 flex items-center gap-1.5">
                <span>{cleanOfficerName || duty.name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-blue-900 font-bold">📞 {duty.mobile || '-'}</div>
              {cleanPno && <div className="text-[10px] text-slate-500 font-mono">PNO: {cleanPno}</div>}
            </div>
          </div>

          {/* Zone & Sector Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Zone */}
            <div className="bg-white border border-slate-300 rounded-xl p-3 space-y-1">
              <div className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1">
                जोन / जोनल प्रभारी
              </div>
              <div className="text-xs text-slate-700 pb-1 border-b border-dotted border-slate-300">
                <span className="font-bold">जोन:</span> <strong className="text-slate-950">{effectiveZone || '-'}</strong>
              </div>
              {effectiveZonalIncharge && (
                <div className="text-xs text-slate-700 pt-1">
                  <span className="font-bold">जोनल प्रभारी:</span> <strong className="text-blue-900">{effectiveZonalIncharge}</strong>
                </div>
              )}
            </div>

            {/* Sector */}
            <div className="bg-white border border-slate-300 rounded-xl p-3 space-y-1">
              <div className="text-xs font-black text-slate-900 border-b border-slate-200 pb-1">
                सेक्टर / सेक्टर प्रभारी
              </div>
              <div className="text-xs text-slate-700 pb-1 border-b border-dotted border-slate-300">
                <span className="font-bold">सेक्टर:</span> <strong className="text-slate-950">{effectiveSector || '-'}</strong>
              </div>
              {effectiveSectorIncharge && (
                <div className="text-xs text-slate-700 pt-1">
                  <span className="font-bold">सेक्टर प्रभारी:</span> <strong className="text-blue-900">{effectiveSectorIncharge}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Briefing Place */}
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex justify-between items-start text-xs gap-3">
            <span className="font-black text-sky-900 shrink-0">
              ब्रीफिंग स्थल:
            </span>
            <span className="font-black text-slate-900 text-right">
              {activeBriefingPlace || duty.briefing_place || customBriefing || '-'}
            </span>
          </div>

          {/* Special Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
            <div className="font-black text-amber-950">विशेष निर्देश:</div>
            <div className="text-slate-800 font-medium leading-relaxed">
              {activeNote || 'आवंटित कर्तव्य स्थल पर समय से उपस्थिति सुनिश्चित करें एवं उच्चाधिकारियों के निर्देशों का अक्षरशः पालन करें।'}
            </div>
          </div>

          {/* Signatory Footer */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
            <div className="text-[11px] font-bold text-slate-500">
              अयोध्या पुलिस • सुरक्षा सेवा निष्ठा
            </div>
            <div className="text-right">
              {signatureImg ? (
                <img src={signatureImg} alt="Signature" className="h-8 max-w-[100px] object-contain ml-auto" />
              ) : (
                <div className="text-[10px] italic text-slate-500">(हस्ताक्षरित)</div>
              )}
              <div className="font-black text-slate-900 text-xs mt-0.5">
                {signatoryText}
              </div>
            </div>
          </div>

          {/* Smart Cell Ayodhya Footer */}
          <div className="bg-[#0b132b] text-white text-[9px] font-black tracking-widest text-center py-1.5 rounded-lg uppercase">
            DESIGN AND DEVELOPED BY SMART CELL AYODHYA
          </div>
        </div>
      ) : (
        /* Main Printable Duty Card Container */
        <div
          id="printable-duty-card"
          className="bg-white text-slate-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-900 shadow-md space-y-3.5 sm:space-y-4"
        >
        {/* Pass Header */}
        <div className="border-b-2 border-slate-900 pb-2.5 sm:pb-3.5 flex items-center justify-between gap-2 sm:gap-3">
          <img src="/badge.png" alt="Police Badge Left" className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
          
          <div className="flex-1 text-center min-w-0 px-1">
            <h1 className="text-base sm:text-2xl font-black text-slate-950 leading-normal">
              {eventTitle}
            </h1>
            <h2 className="text-xs sm:text-base font-bold text-slate-700 mt-1 leading-normal">
              {eventSubtitle}
            </h2>
          </div>

          <img src="/badge.png" alt="Police Badge Right" className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
        </div>

        {/* Officer Identity & Passport Photo Block */}
        <div className="flex items-stretch gap-2.5 sm:gap-3 border border-slate-300 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50/80">
          {/* Photo Frame */}
          <div
            onClick={() => {
              if (duty.photo) {
                setIsPhotoZoomOpen(true);
              } else {
                if (userRole !== 'admin' && userRole !== 'senior') {
                  if (onRequestAuth) {
                    onRequestAuth(() => {
                      photoInputRef.current?.click();
                    });
                  } else {
                    alert('पासपोर्ट फोटो अपलोड करने के लिए एडमिन या वरिष्ठ अधिकारी लॉगिन आवश्यक है।');
                  }
                  return;
                }
                photoInputRef.current?.click();
              }
            }}
            className="w-18 h-24 sm:w-24 sm:h-28 border-2 border-dashed border-slate-400 hover:border-slate-600 rounded-lg bg-white overflow-hidden flex flex-col items-center justify-center text-center shrink-0 relative group cursor-pointer transition shadow-inner"
            title={duty.photo ? "पासपोर्ट फोटो देखने / ज़ूम करने के लिए क्लिक करें" : "फोटो अपलोड करने के लिए क्लिक करें"}
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
              <span>{duty.photo ? 'देखें / बदलें' : 'अपलोड'}</span>
            </div>
          </div>

          {/* Officer Details Info */}
          <div className="flex-1 flex flex-col justify-between text-slate-900 py-0.5 min-w-0">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">अधिकारी / कर्मचारी:</span>
              <div className="text-sm sm:text-lg font-black text-slate-950 mt-0.5 break-words flex items-center gap-1.5 flex-wrap">
                <span>{cleanOfficerName || duty.name || duty.composite_details || '-'}</span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{duty.mobile || 'मोबाइल अनुपलब्ध'}</span>
              </div>
            </div>

            <div className="text-[10px] sm:text-xs text-slate-600 border-t border-slate-200 pt-1.5 flex flex-wrap items-center justify-between gap-1">
              {cleanPno && (
                <div>P.No: <strong className="font-mono text-slate-950">{cleanPno}</strong></div>
              )}
              <div>मूल तैनाती: <strong className="text-slate-950">{formatCleanPosting(duty.posting || duty.posting_place || duty.thana, duty.district)}</strong></div>
            </div>
          </div>
        </div>

        {/* Clean Alternating Rows Table */}
        <div className="overflow-hidden border border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-slate-200">
              {duty.event_name ? (
                <tr>
                  <td className="w-[38%] sm:w-1/3 bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    ड्यूटी का प्रकार
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.event_name}
                  </td>
                </tr>
              ) : null}

              <tr>
                <td className="w-[38%] sm:w-1/3 bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                  {labels.duty_place}
                </td>
                <td className="p-2 sm:p-2.5 font-black text-xs sm:text-base text-slate-950 bg-white break-words leading-relaxed">
                  {duty.duty_place || '-'}
                </td>
              </tr>

              {duty.shift ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    {labels.shift}
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.shift}
                  </td>
                </tr>
              ) : null}

              {effectiveZone ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    {labels.zone}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {effectiveZone}
                  </td>
                </tr>
              ) : null}

              {effectiveZonalIncharge ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    {labels.zonal_incharge}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {effectiveZonalIncharge}
                  </td>
                </tr>
              ) : null}

              {effectiveSector ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    {labels.sector}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {effectiveSector}
                  </td>
                </tr>
              ) : null}

              {effectiveSectorIncharge ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    {labels.sector_incharge}
                  </td>
                  <td className="p-2 sm:p-2.5 font-semibold text-slate-800 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {effectiveSectorIncharge}
                  </td>
                </tr>
              ) : null}

              {/* Official Election Fields (UP Police Election Format) */}
              {duty.booth_no ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    मतदान केंद्र / बूथ सं०
                  </td>
                  <td className="p-2 sm:p-2.5 font-black text-amber-950 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.booth_no}
                  </td>
                </tr>
              ) : null}

              {duty.vehicle_no ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    वाहन / बस सं०
                  </td>
                  <td className="p-2 sm:p-2.5 font-black text-slate-900 bg-white text-[11px] sm:text-sm break-words leading-relaxed font-mono">
                    {duty.vehicle_no}
                  </td>
                </tr>
              ) : null}

              {duty.weapon ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    शस्त्र / असलहा
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.weapon}
                  </td>
                </tr>
              ) : null}

              {duty.capf ? (
                <tr>
                  <td className="bg-slate-50 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-700 text-[11px] sm:text-sm leading-relaxed">
                    सीएपीएफ / पीएसी
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900 bg-white text-[11px] sm:text-sm break-words leading-relaxed">
                    {duty.capf}
                  </td>
                </tr>
              ) : null}

              {/* Briefing Location Row */}
              {activeBriefingPlace && (
                <tr className="bg-slate-50/70 border-t border-slate-200">
                  <td className="bg-slate-100/80 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-800 text-[11px] sm:text-sm leading-relaxed">
                    {labels.briefing}
                  </td>
                  <td className="p-2 sm:p-2.5 font-bold text-slate-900 bg-slate-50/70 text-[11px] sm:text-sm break-words leading-relaxed">
                    {activeBriefingPlace}
                  </td>
                </tr>
              )}

              {/* Special Note Row */}
              {activeNote && (
                <tr className="bg-slate-50/70 border-t border-slate-200">
                  <td className="bg-slate-100/80 font-bold p-2 sm:p-2.5 border-r border-slate-200 text-slate-800 text-[11px] sm:text-sm leading-relaxed">
                    {labels.note}
                  </td>
                  <td className="p-2 sm:p-2.5 font-normal text-slate-800 bg-slate-50/70 text-[11px] sm:text-sm leading-relaxed break-words">
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
      )}

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
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {cleanOfficerNameAndTitle(peer.name, peer.posting, peer.district, peer.mobile)}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-600 truncate">
                    {formatCleanPosting(peer.posting || peer.thana, peer.district)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700">
                    मो० {peer.mobile || '-'}
                  </div>
                </div>

                {peer.mobile && (
                  <a
                    href={`tel:${peer.mobile}`}
                    className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition shrink-0 ml-auto active:scale-95 shadow-2xs"
                    title="सीधे कॉल करें"
                  >
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>कॉल</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 px-3 text-center bg-slate-50/80 rounded-xl border border-dashed border-slate-200 space-y-1">
            <ShieldCheck className="w-6 h-6 text-amber-600 mx-auto opacity-80" />
            <p className="text-xs font-bold text-slate-800">इस स्थल पर एकल ड्यूटी आवंटित है</p>
            <p className="text-[11px] text-slate-500">इस ड्यूटी पॉइंट पर वर्तमान में केवल आपकी ही तैनाती दर्ज है।</p>
          </div>
        )}
      </div>

      {/* Passport Photo Preview & Zoom Modal */}
      {isPhotoZoomOpen && duty.photo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPhotoZoomOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="min-w-0">
                <h4 className="font-black text-sm text-slate-900 truncate">
                  {cleanOfficerName || duty.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-bold">पासपोर्ट फोटो पूर्वावलोकन</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoZoomOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                title="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-3/4 flex items-center justify-center shadow-inner">
              <img
                src={duty.photo}
                alt={duty.name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              {(userRole === 'admin' || userRole === 'senior') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoZoomOpen(false);
                    photoInputRef.current?.click();
                  }}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>फोटो बदलें</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsPhotoZoomOpen(false)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer text-center"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="font-black text-slate-950 text-sm mt-0.5">{duty.name}</div>
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
                    जोनल प्रभारी अधिकारी
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
          onClick={() => setShowBackSide(!showBackSide)}
          className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 shadow-xs transition active:scale-95 cursor-pointer ${
            showBackSide
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80'
          }`}
          title={showBackSide ? 'मुख पृष्ठ देखें' : 'पृष्ठ भाग देखें'}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] truncate max-w-full">{showBackSide ? 'मुख पृष्ठ' : 'पृष्ठ भाग'}</span>
        </button>
      </div>
    </div>
  );
}
