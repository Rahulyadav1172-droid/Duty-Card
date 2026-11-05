import React, { useState, useRef } from 'react';
import {
  FileDown,
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Loader2,
  Sparkles,
  Zap,
  Filter,
  Check,
  Grid,
  Users,
  FileText,
  Phone,
  MapPin,
  Clock,
  User
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { printLegalBulk, getZoneTheme } from '../utils/printLegalBulk';
import { useLanguage } from '../context/LanguageContext';
import ToggleSwitch from './ToggleSwitch';
import { resolvePoliceRank, stripRankFromName, parseIncharge } from '../utils/rankResolver';
import UpPoliceLogo from './UpPoliceLogo';

export default function BulkLegalPdfModal({
  isOpen,
  onClose,
  records = [],
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true
}) {
  const { language, t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, page: 0, totalPages: 0 });
  const [selectedPointFilter, setSelectedPointFilter] = useState('ALL');
  const [rangeMode, setRangeMode] = useState('all'); // 'all' | 'custom'
  const [paperSize, setPaperSize] = useState('legal'); // 'a4' | 'legal'
  const [layoutMode, setLayoutMode] = useState(6); // 6 = 3 Pass (Legal Standard 3-in-1 Foldable), 4 = 2 Pass, 2 = 1 Pass
  const [includeCoForce, setIncludeCoForce] = useState(true);
  const [includeBackSide, setIncludeBackSide] = useState(false);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(25);
  const [activeBatch, setActiveBatch] = useState([]);
  const printContainerRef = useRef(null);

  if (!isOpen) return null;

  // Filter valid records
  const validRecords = (records || []).filter(r => r && (r.name || r.id));

  const targetRecords = selectedPointFilter === 'ALL'
    ? validRecords
    : validRecords.filter(r => (r.duty_place || '').trim() === selectedPointFilter);

  const passesPerPage = layoutMode === 6 ? 3 : (layoutMode === 4 ? 2 : 1);
  const totalPossiblePages = Math.max(1, Math.ceil(targetRecords.length / passesPerPage));

  // Determine active slice for JS PDF generator
  const actualStart = rangeMode === 'custom' ? Math.max(1, parseInt(startPage) || 1) : 1;
  const actualEnd = rangeMode === 'custom' ? Math.min(totalPossiblePages, parseInt(endPage) || totalPossiblePages) : totalPossiblePages;
  const selectedSlicePages = Math.max(1, actualEnd - actualStart + 1);

  // Unique duty points
  const uniqueDutyPoints = Array.from(
    new Set(validRecords.map(r => (r.duty_place || '').trim()).filter(Boolean))
  ).sort();

  // -------------------------------------------------------------
  // METHOD 1: ULTRA-FAST ISOLATED A4 / LEGAL PRINT / SAVE AS PDF (1 SECOND)
  // -------------------------------------------------------------
  const handleInstantBrowserPrint = () => {
    printLegalBulk({
      records: targetRecords,
      eventTitle,
      eventSubtitle,
      signatureImg,
      signatoryText,
      customNote,
      isNoteEnabled,
      customBriefing,
      isBriefingEnabled,
      layoutMode,
      paperSize,
      includeCoForce,
      includeBackSide
    });
  };

  // -------------------------------------------------------------
  // METHOD 2: DIRECT FAST JS-PDF GENERATION (HIGH SPEED)
  // -------------------------------------------------------------
  const handleStartFastJsPdf = async () => {
    if (targetRecords.length === 0) {
      alert('डाउनलोड करने के लिए कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    try {
      setIsGenerating(true);

      if (document.fonts) {
        await document.fonts.ready;
      }

      const isA4 = paperSize === 'a4';
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isA4 ? 'a4' : 'legal',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const pageStartIdx = (actualStart - 1) * passesPerPage;
      const pageEndIdx = actualEnd * passesPerPage;
      const recordsToProcess = targetRecords.slice(pageStartIdx, pageEndIdx);
      const totalBatchPages = Math.ceil(recordsToProcess.length / passesPerPage);

      for (let p = 0; p < totalBatchPages; p++) {
        const batch = recordsToProcess.slice(p * passesPerPage, (p + 1) * passesPerPage);
        setActiveBatch(batch);
        setProgress({
          current: Math.min((p + 1) * passesPerPage, recordsToProcess.length),
          total: recordsToProcess.length,
          page: p + 1,
          totalPages: totalBatchPages
        });

        // Fast minimal delay for DOM paint
        await new Promise((res) => setTimeout(res, 50));

        const element = printContainerRef.current;
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2.0,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.92);

        if (p > 0) {
          pdf.addPage(isA4 ? 'a4' : 'legal', 'portrait');
        }

        const marginX = 5;
        const marginY = 5;
        const printW = pdfWidth - (marginX * 2);
        const printH = (canvas.height * printW) / canvas.width;

        pdf.addImage(imgData, 'JPEG', marginX, marginY, printW, Math.min(printH, pdfHeight - (marginY * 2)));
      }

      const safeTitle = (eventTitle || 'DutyPass').replace(/\s+/g, '_');
      pdf.save(`Bulk_Duty_Cards_${paperSize.toUpperCase()}_${layoutMode}in1_${safeTitle}_Pages_${actualStart}_to_${actualEnd}.pdf`);
      onClose();
    } catch (err) {
      console.error('Fast PDF Generation Error:', err);
      alert('बल्क PDF बनाने में त्रुटि: ' + (err?.message || 'अज्ञात त्रुटि'));
    } finally {
      setIsGenerating(false);
      setActiveBatch([]);
      setProgress({ current: 0, total: 0, page: 0, totalPages: 0 });
    }
  };

  // Helper to render individual card for background canvas
  const renderSingleCard = (duty, idx) => {
    if (!duty) return <div key={idx} style={{ border: '1px dashed #cbd5e1', borderRadius: '8px' }} />;

    const activeNoteText = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
    const activeBriefingText = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

    const qrDirectUrl = typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/?search=${encodeURIComponent(duty.mobile || duty.pno || duty.id || '')}`
      : '';

    const qrData = qrDirectUrl || JSON.stringify({
      id: duty.id || 'DUTY',
      name: duty.name || '',
      duty_place: duty.duty_place || '',
      mobile: duty.mobile || '',
      auth: "UP_POLICE_SECURE_VERIFIED"
    });

    // Co-deployed officers at same place
    const normalizePlace = (str) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const coForceList = validRecords.filter(r => {
      if (!r || r.id === duty.id) return false;
      const placeA = normalizePlace(r.duty_place);
      const placeB = normalizePlace(duty.duty_place);
      return placeA && placeB && placeA === placeB;
    });

    const cleanPno = (duty.pno && !String(duty.pno).toUpperCase().startsWith('DUTY-'))
      ? String(duty.pno)
      : (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') && String(duty.id).length <= 12)
        ? String(duty.id)
        : null;

    const cleanOfficerName = (duty.name || '').trim()
      .replace(/,\s*\d{10}\b/g, '')
      .replace(/\b\d{10}\b/g, '')
      .replace(/[,।]?\s*नं0?[-:]?\s*$/g, '')
      .replace(/[,।]?\s*नं\s*\(?.*$/g, '')
      .replace(/,\s*$/, '')
      .trim() || duty.name;

    const effectiveRank = duty.rank ? resolvePoliceRank(duty.rank) : '';
    const displayCleanName = stripRankFromName(cleanOfficerName) || duty.name;

    // Clean & Parse Zone and Zonal Incharge
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

    if (!cleanZonalIncharge && cleanZone && Array.isArray(records)) {
      const matchedZone = records.find(r => 
        r && 
        (r.zone || '').trim().toLowerCase() === cleanZone.toLowerCase() && 
        (r.zonal_incharge || r.zonal || r.zonal_officer || r.zonalOfficer || r.zone_incharge || r['जोनाल प्रभारी'] || r['जोनल प्रभारी'])
      );
      if (matchedZone) {
        cleanZonalIncharge = (
          matchedZone.zonal_incharge || 
          matchedZone.zonal || 
          matchedZone.zonal_officer || 
          matchedZone.zonalOfficer || 
          matchedZone.zone_incharge || 
          matchedZone['जोनाल प्रभारी'] || 
          matchedZone['जोनल प्रभारी'] || 
          ''
        ).trim();
      }
    }

    // Clean & Parse Sector and Sector Incharge
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

    if (!cleanSectorIncharge && cleanSector && Array.isArray(records)) {
      const matchedSector = records.find(r => {
        if (!r) return false;
        const rSec = (r.sector || '').trim().toLowerCase();
        const currSec = cleanSector.toLowerCase();
        const isSame = rSec === currSec || rSec.startsWith(currSec) || currSec.startsWith(rSec);
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
        return isSame && inc && inc !== '-';
      });
      if (matchedSector) {
        cleanSectorIncharge = (
          matchedSector.sector_incharge || 
          matchedSector.sector_officer || 
          matchedSector.sectorOfficer || 
          matchedSector.sectorIncharge || 
          matchedSector.sector_magistrate || 
          matchedSector.sectorMagistrate || 
          matchedSector.incharge || 
          matchedSector['सेक्टर प्रभारी'] || 
          matchedSector['सेक्टर अधिकारी'] || 
          matchedSector['सेक्टर मजिस्ट्रेट'] || 
          matchedSector['प्रभारी'] || 
          ''
        ).trim();
      }
    }

    const zonalInfo = parseIncharge(cleanZonalIncharge);
    const sectorInfo = parseIncharge(cleanSectorIncharge);
    const zonalMobile = zonalInfo.mobile || duty.zonal_mobile || duty.zone_mobile || '';
    const sectorMobile = sectorInfo.mobile || duty.sector_mobile || '';
    const zoneCode = cleanZone ? cleanZone.split(/[(/]/)[0].trim() : '01';

    // -------------------------------------------------------------------------
    // UNIFIED 2-SIDED FOLDABLE WEARABLE LANYARD PASS (180mm x 112mm)
    // Left Panel = FRONT SIDE (90mm x 112mm) | Right Panel = BACK SIDE (90mm x 112mm)
    // -------------------------------------------------------------------------
    return (
      <div
        key={idx}
        className="foldable-pass-unit"
        style={{
          width: '180mm',
          height: '112mm',
          maxHeight: '112mm',
          border: '1.5px solid #0f172a',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          boxSizing: 'border-box',
          position: 'relative',
          fontFamily: "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif"
        }}
      >
        {/* ================= LEFT PANEL = FRONT SIDE (90mm x 112mm) ================= */}
        <div
          className="pass-panel-front"
          style={{
            width: '90mm',
            height: '112mm',
            maxHeight: '112mm',
            padding: '2mm 2.5mm',
            borderRight: '1.5px dashed #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Lanyard punch slot */}
          <div style={{ textAlign: 'center', marginBottom: '2px' }}>
            <div style={{ width: '40px', height: '6px', borderRadius: '9999px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', margin: '0 auto' }} />
          </div>

          {/* Header Banner */}
          <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3px 5px', borderBottom: '2.5px solid #dc2626', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
            <UpPoliceLogo size={28} />
            <div style={{ flex: 1, textAlign: 'center', minWidth: 0, padding: '0 2px' }}>
              <div style={{ color: '#fbbf24', fontSize: '8.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: '1.1' }}>
                उत्तर प्रदेश पुलिस • अयोध्या
              </div>
              <div style={{ color: '#ffffff', fontSize: '11.5px', fontWeight: '900', lineHeight: '1.15', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                {eventTitle || 'मा० मुख्यमंत्री उ०प्र० अयोध्या आगमन'}
              </div>
              <div>
                <span style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '7.5px', padding: '0.5px 5px', borderRadius: '9999px', fontWeight: '700' }}>
                  {eventSubtitle || 'ड्यूटी पास - 2026'}
                </span>
              </div>
            </div>
            <UpPoliceLogo size={28} />
          </div>

          {/* Officer Profile Row */}
          <div style={{ padding: '3px 1px 1px 1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '60px', minWidth: '60px', height: '76px', border: '1.5px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, boxSizing: 'border-box' }}>
              {duty.photo ? (
                <img src={duty.photo} alt={duty.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <User style={{ width: '22px', height: '22px', margin: '0 auto', stroke: '#94a3b8' }} />
                  <div style={{ fontSize: '8.5px', fontWeight: '800', color: '#334155', marginTop: '2px', lineHeight: '1.1' }}>पासपोर्ट फोटो</div>
                  <div style={{ fontSize: '7.5px', fontWeight: '600', color: '#94a3b8', lineHeight: '1' }}>चस्पा करें</div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: '900', color: '#020617', lineHeight: '1.15', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                  {displayCleanName || duty.name || '-'}
                </span>
              </div>
              <div style={{ marginTop: '2px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#065f46', backgroundColor: '#ecfdf5', border: '1px solid #6ee7b7', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'monospace' }}>
                  <Phone style={{ width: '11px', height: '11px', stroke: '#047857' }} />
                  <span>{duty.mobile || 'अनुपलब्ध'}</span>
                </span>
              </div>
              <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#334155', marginTop: '1px', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
                मूल तैनाती: <strong>{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}
                {cleanPno && <span> | P.No: <strong>{cleanPno}</strong></span>}
              </div>
            </div>
          </div>

          {/* Spotlight Duty Box */}
          <div style={{ margin: '2px 0', backgroundColor: '#fffbeb', border: '1.5px solid #f59e0b', borderLeft: '4px solid #d97706', borderRadius: '5px', padding: '3px 6px' }}>
            <div style={{ fontSize: '9px', fontWeight: '800', color: '#78350f', textTransform: 'uppercase' }}>
              ड्यूटी स्थल
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: '900', color: '#020617', lineHeight: '1.2', marginTop: '1px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
              {duty.duty_place || '-'}
            </div>
          </div>

          {/* Time Bar */}
          <div style={{ margin: '1.5px 0', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '2.5px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2px' }}>
            <div>दिनाँक व समय: <strong>{duty.shift || 'प्रातः 08:00 बजे से कार्यक्रम समाप्ति तक'}</strong></div>
            {(duty.booth_no || duty.vehicle_no) && (
              <div>
                {duty.booth_no && <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', padding: '0.5px 4px', borderRadius: '3px', fontWeight: 'bold', marginRight: '2px' }}>बूथ: {duty.booth_no}</span>}
                {duty.vehicle_no && <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '0.5px 4px', borderRadius: '3px', fontWeight: 'bold' }}>वाहन: {duty.vehicle_no}</span>}
              </div>
            )}
          </div>

          {/* Security Footer */}
          <div style={{ backgroundColor: '#f8fafc', borderTop: '1.5px solid #0f172a', padding: '2.5px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 'auto', borderRadius: '0 0 4px 4px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '1px', lineHeight: 0 }}>
                <QRCodeSVG value={qrData} size={36} level="M" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '8px', fontWeight: '800', color: '#065f46' }}>● डिजिटल सत्यापित पास</div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: '800', color: '#1e293b' }}>ID: {cleanPno || duty.id || 'DUTY-0001'}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {signatureImg ? (
                <img src={signatureImg} alt="Sign" style={{ height: '18px', maxWidth: '75px', objectFit: 'contain', marginBottom: '2px' }} />
              ) : (
                <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '9.5px', color: '#475569', lineHeight: 1, marginBottom: '2px' }}>(हस्ताक्षरित)</div>
              )}
              <div style={{ fontSize: '9.5px', fontWeight: '800', color: '#020617', lineHeight: '1.15' }}>वरिष्ठ पुलिस अधीक्षक,</div>
              <div style={{ fontSize: '9.5px', fontWeight: '800', color: '#020617', lineHeight: '1.15' }}>अयोध्या</div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL = BACK SIDE ================= */}
        <div
          className="pass-panel-back"
          style={{
            width: '90mm',
            height: '112mm',
            maxHeight: '112mm',
            padding: '2mm 2.5mm',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Lanyard punch slot */}
          <div style={{ textAlign: 'center', marginBottom: '2px' }}>
            <div style={{ width: '40px', height: '6px', borderRadius: '9999px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', margin: '0 auto' }} />
          </div>

          {/* Back Header (Clean Slate Navy with Crimson Red Accent - Zero Blue Strip) */}
          <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '3px 6px', textAlign: 'center', fontSize: '11px', fontWeight: '800', borderRadius: '4px 4px 0 0', borderBottom: '2.5px solid #dc2626' }}>
            जोन, सेक्टर एवं ब्रीफिंग विवरण
          </div>

          {/* Zone Card (Full Text Wrap, NO Ellipsis, NO floating watermark badge) */}
          <div style={{ backgroundColor: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '6px', padding: '4px 6px', margin: '2px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1e40af' }}>
                <span>जोन विवरण</span>
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: '900', color: '#172554', margin: '1px 0', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
                {cleanZone || 'जोन-01'}
              </div>
            </div>
            <div style={{ borderBottom: '1px solid #bfdbfe', margin: '2px 0' }} />
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#0f172a', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
              जोनल प्रभारी: <strong>{zonalInfo.name || 'नियुक्त अधिकारी'}</strong>
            </div>
            {duty.zonal_sahyogarth && (
              <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#1e40af', marginTop: '1px', wordBreak: 'break-word' }}>
                सहयोगार्थ: <strong>{duty.zonal_sahyogarth}</strong>
              </div>
            )}
            {zonalMobile && (
              <div style={{ marginTop: '2px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#1e3a8a', backgroundColor: '#ffffff', border: '1px solid #93c5fd', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Phone style={{ width: '10px', height: '10px' }} />
                  <span>{zonalMobile}</span>
                </span>
              </div>
            )}
          </div>

          {/* Sector Card (Full Text Wrap, NO Ellipsis, NO floating watermark badge) */}
          <div style={{ backgroundColor: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: '6px', padding: '4px 6px', margin: '2px 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#3730a3' }}>
                <span>सेक्टर विवरण</span>
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: '900', color: '#1e1b4b', margin: '1px 0', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
                {cleanSector || 'सेक्टर-01'}
              </div>
            </div>
            <div style={{ borderBottom: '1px solid #c7d2fe', margin: '2px 0' }} />
            <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#0f172a', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: '1.2' }}>
              सेक्टर प्रभारी: <strong>{sectorInfo.name || 'नियुक्त अधिकारी'}</strong>
            </div>
            {duty.sector_sahyogarth && (
              <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#312e81', marginTop: '1px', wordBreak: 'break-word' }}>
                सहयोगार्थ: <strong>{duty.sector_sahyogarth}</strong>
              </div>
            )}
            {sectorMobile && (
              <div style={{ marginTop: '2px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#312e81', backgroundColor: '#ffffff', border: '1px solid #a5b4fc', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Phone style={{ width: '10px', height: '10px' }} />
                  <span>{sectorMobile}</span>
                </span>
              </div>
            )}
          </div>

          {/* Briefing Box (Full Text Wrap, NO Ellipsis) */}
          <div style={{ backgroundColor: '#ecfdf5', border: '1.5px solid #6ee7b7', padding: '4px 6px', borderRadius: '6px', marginTop: 'auto' }}>
            <div style={{ fontSize: '8.5px', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>📍 ब्रीफिंग स्थल व समय</div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#022c22', lineHeight: '1.2', marginTop: '1px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
              {activeBriefingText || 'दिनाँक- 01.11.2026 को पूर्वान्ह 13.00 बजे श्रीराम कथा पार्क नया घाट, अयोध्या'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Modal Dialog */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 font-devanagari no-print">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-[#0b132b] text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white leading-tight">
                  बल्क ड्यूटी पास प्रिंट / PDF
                </h3>
              </div>
            </div>
            {!isGenerating && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Content Body */}
          <div className="p-5 space-y-4 text-slate-800 text-xs max-h-[75vh] overflow-y-auto">
            {/* PAPER SIZE SELECTOR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-2xl border border-slate-300">
              <span className="font-black text-slate-900 text-xs">प्रिंटर पेपर:</span>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPaperSize('a4');
                    if (layoutMode === 6) setLayoutMode(4);
                  }}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                    paperSize === 'a4'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>A4</span>
                  {paperSize === 'a4' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('legal')}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                    paperSize === 'legal'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>Legal</span>
                  {paperSize === 'legal' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>
              </div>
            </div>

            {/* LAYOUT TOGGLE */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">प्रति पृष्ठ पास लेआउट (2-साइडेड फोल्डेबल):</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {layoutMode === 2 ? '⭐ 1 पास / पेज (2-इन-1 फ्रंट+बैक)' : layoutMode === 4 ? '2 पास / पेज (4-इन-1 फ्रंट+बैक)' : '3 पास / पेज (6-इन-1 लीगल)'}
                </span>
              </div>
              <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-300 flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLayoutMode(2)}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                    layoutMode === 2
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
                  }`}
                >
                  <span>1 पास (2-in-1) ⭐</span>
                  {layoutMode === 2 && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutMode(4)}
                  className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                    layoutMode === 4
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
                  }`}
                >
                  <span>2 पास (4-in-1)</span>
                  {layoutMode === 4 && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </button>

                {paperSize === 'legal' && (
                  <button
                    type="button"
                    onClick={() => setLayoutMode(6)}
                    className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                      layoutMode === 6
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
                    }`}
                  >
                    <span>3 पास (6-in-1)</span>
                    {layoutMode === 6 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                )}
              </div>
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200/90 text-blue-900 text-[11px] flex items-center gap-1.5 leading-snug">
                <span className="shrink-0">💡</span>
                <span><strong>2-साइडेड लैनयार्ड पास:</strong> प्रत्येक पास 180×128mm फोल्डेबल यूनिट (बाएं फ्रंट, दाएं बैक) में प्रिंट होगा, जिसे बीच से मोड़कर सीधे लैनयार्ड पाउच में लगाया जा सकता है।</span>
              </div>
            </div>

            {/* TOGGLE OPTION: INCLUDE CO-DEPLOYED FORCE */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${includeCoForce ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    सहयोगार्थ पुलिस बल
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {includeCoForce
                      ? 'उसी ड्यूटी स्थल के अन्य जवानों का विवरण शामिल रहेगा'
                      : 'कार्ड पर सहयोगार्थ बल नहीं छपेगा'}
                  </div>
                </div>
              </div>

              <ToggleSwitch
                enabled={includeCoForce}
                onChange={setIncludeCoForce}
              />
            </div>

            {/* TOGGLE OPTION: INCLUDE ELECTION BACK SIDE (16 INSTRUCTIONS & CUG DIRECTORY) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${includeBackSide ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900">
                    कार्ड बैक-साइड (16 पुलिस निर्देश + सीयूजी डायरेक्टरी)
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {includeBackSide
                      ? 'ड्यूटी कार्ड के पीछे 16 आचार संहिता निर्देश व CUG फोन छपेंगे'
                      : 'केवल फ्रंट पास प्रिंट होगा (सिंगल साइडेड)'}
                  </div>
                </div>
              </div>

              <ToggleSwitch
                enabled={includeBackSide}
                onChange={setIncludeBackSide}
              />
            </div>

            {/* Filter by Duty Point Option */}
            {uniqueDutyPoints.length > 1 && !isGenerating && (
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-xs">
                  ड्यूटी पॉइंट फ़िल्टर:
                </label>
                <select
                  value={selectedPointFilter}
                  onChange={(e) => setSelectedPointFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="ALL">सभी ड्यूटी पॉइंट ({validRecords.length} जवान)</option>
                  {uniqueDutyPoints.map((pt, idx) => (
                    <option key={idx} value={pt}>
                      {pt} ({validRecords.filter(r => (r.duty_place || '').trim() === pt).length} जवान)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Summary Row */}
            <div className="bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">कुल पास:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black">
                  {targetRecords.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-bold">कुल पृष्ठ:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black">
                  {totalPossiblePages} ({paperSize.toUpperCase()})
                </span>
              </div>
            </div>

            {/* UNIFIED PRINT & EXPORT SECTION */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-xs">
              {/* Primary Instant Print Button */}
              <button
                onClick={handleInstantBrowserPrint}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm rounded-xl shadow flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>प्रिंट / Save PDF</span>
              </button>

              {/* Direct PDF File Generator with Page Range */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">PDF फ़ाइल डाउनलोड:</span>
                  <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      onClick={() => setRangeMode('all')}
                      className={`px-2 py-0.5 rounded-md transition ${rangeMode === 'all' ? 'bg-white shadow text-slate-950 font-black' : 'text-slate-600'}`}
                    >
                      सभी पेज
                    </button>
                    <button
                      onClick={() => setRangeMode('custom')}
                      className={`px-2 py-0.5 rounded-md transition ${rangeMode === 'custom' ? 'bg-white shadow text-slate-950 font-black' : 'text-slate-600'}`}
                    >
                      पेज रेंज
                    </button>
                  </div>
                </div>

                {rangeMode === 'custom' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold block">शुरुआती पेज:</label>
                      <input
                        type="number"
                        min={1}
                        max={totalPossiblePages}
                        value={startPage}
                        onChange={(e) => setStartPage(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-bold block">अंतिम पेज:</label>
                      <input
                        type="number"
                        min={1}
                        max={totalPossiblePages}
                        value={endPage}
                        onChange={(e) => setEndPage(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* Progress Indicator */}
                {isGenerating && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-center">
                    <div className="flex items-center justify-center gap-2 text-amber-900 font-black text-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      <span>PDF तैयार हो रही है... ({progress.page} / {progress.totalPages} पेज)</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-600 h-1.5 rounded-full transition-all duration-150"
                        style={{ width: `${Math.round(((progress.current || 1) / (progress.total || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleStartFastJsPdf}
                  disabled={isGenerating || targetRecords.length === 0}
                  className="w-full py-2 bg-[#0b132b] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>डाउनलोड हो रहा है ({progress.current}/{progress.total})...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5 text-amber-400" />
                      <span>PDF फ़ाइल जनरेट करें ({selectedSlicePages} पेज / {selectedSlicePages * layoutMode} कार्ड)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
            {!isGenerating && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
              >
                बंद करें
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FAST JS-PDF RENDER CONTAINER (Positioned in-viewport, zero opacity)        */}
      {/* ========================================================================= */}
      <div
        ref={printContainerRef}
        style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          zIndex: -999,
          opacity: 0,
          pointerEvents: 'none',
          width: '180mm',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2mm',
          padding: '2mm 0',
          boxSizing: 'border-box',
          fontFamily: "'Noto Sans Devanagari', 'Plus Jakarta Sans', sans-serif"
        }}
      >
        {activeBatch.map((duty, idx) => (
          <React.Fragment key={idx}>
            {renderSingleCard(duty, idx)}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
