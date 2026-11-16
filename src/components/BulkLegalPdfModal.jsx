import React, { useState, useRef, useEffect } from 'react';
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
  CreditCard
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { printLegalBulk } from '../utils/printLegalBulk';
import { useLanguage } from '../context/LanguageContext';
import ToggleSwitch from './ToggleSwitch';
import { resolvePoliceRank, stripRankFromName } from '../utils/rankResolver';

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
  isBriefingEnabled = true,
  initialFormat = 'id_badge'
}) {
  const { language, t } = useLanguage();
  const [cardFormat, setCardFormat] = useState(initialFormat || 'id_badge');
  const [badgeLayoutMode, setBadgeLayoutMode] = useState('side_by_side'); // 'side_by_side' (Front & Back side-by-side) | 'duplex'
  const [activeBatchType, setActiveBatchType] = useState('side_by_side'); // 'side_by_side' | 'front' | 'back'
  const [previewSide, setPreviewSide] = useState('front'); // 'front' | 'back'
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, page: 0, totalPages: 0 });
  const [selectedPointFilter, setSelectedPointFilter] = useState('ALL');
  const [rangeMode, setRangeMode] = useState('all'); // 'all' | 'custom'
  const [paperSize, setPaperSize] = useState('legal'); // 'a4' | 'legal'
  const [layoutMode, setLayoutMode] = useState(4); // 4 or 2 for A4, 6 or 4 or 2 for Legal
  const [includeCoForce, setIncludeCoForce] = useState(true);
  const [includeBackSide, setIncludeBackSide] = useState(false);
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(25);
  const [activeBatch, setActiveBatch] = useState([]);
  const printContainerRef = useRef(null);

  useEffect(() => {
    if (initialFormat) {
      setCardFormat(initialFormat);
      if (initialFormat === 'id_badge') {
        setPaperSize('legal');
        setLayoutMode(4);
      }
    }
  }, [initialFormat, isOpen]);

  if (!isOpen) return null;

  // Filter valid records
  const validRecords = (records || []).filter(r => r && (r.name || r.id));

  const targetRecords = selectedPointFilter === 'ALL'
    ? validRecords
    : validRecords.filter(r => (r.duty_place || '').trim() === selectedPointFilter);

  const totalPossiblePages = Math.max(
    1,
    Math.ceil(
      targetRecords.length / (
        cardFormat === 'id_badge' ? 4 : layoutMode
      )
    )
  );

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
      layoutMode: cardFormat === 'id_badge' ? 4 : layoutMode,
      paperSize: cardFormat === 'id_badge' ? 'legal' : paperSize,
      includeCoForce: cardFormat === 'id_badge' ? false : includeCoForce,
      includeBackSide: cardFormat === 'id_badge' ? true : includeBackSide,
      cardFormat,
      badgeLayoutMode: cardFormat === 'id_badge' ? badgeLayoutMode : 'side_by_side'
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

      // -----------------------------------------------------------
      // BRANCH A: FAST JS-PDF FOR 4-IN-1 LANYARD POUCH ID BADGES (LEGAL)
      // 4 DISTINCT OFFICERS PER LEGAL SHEET (2x2 GRID, POLICE LANYARD POUCH SIZE)
      // -----------------------------------------------------------
      if (cardFormat === 'id_badge') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'legal',
          compress: true
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const BATCH_SIZE = 4;
        const pageStartIdx = (actualStart - 1) * BATCH_SIZE;
        const pageEndIdx = actualEnd * BATCH_SIZE;
        const recordsToProcess = targetRecords.slice(pageStartIdx, pageEndIdx);
        const totalBatches = Math.ceil(recordsToProcess.length / BATCH_SIZE);

        for (let p = 0; p < totalBatches; p++) {
          const batch = recordsToProcess.slice(p * BATCH_SIZE, (p + 1) * BATCH_SIZE);

          // 8 Slots for 4 Officers (Front & Back for each officer side-by-side)
          const eightSlots = [];
          for (let i = 0; i < 4; i++) {
            const off = batch[i] || null;
            eightSlots.push(off); // Slot 2*i: Front
            eightSlots.push(off); // Slot 2*i+1: Back
          }

          setActiveBatch(eightSlots);
          setProgress({
            current: Math.min((p + 1) * BATCH_SIZE, recordsToProcess.length),
            total: recordsToProcess.length,
            page: p + 1,
            totalPages: totalBatches
          });

          await new Promise((res) => setTimeout(res, 60));

          const element = printContainerRef.current;
          if (element) {
            const canvas = await html2canvas(element, {
              scale: 1.4,
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.85);

            if (p > 0) {
              pdf.addPage('legal', 'portrait');
            }

            const marginX = 4;
            const marginY = 4;
            const printW = pdfWidth - (marginX * 2);
            const printH = (canvas.height * printW) / canvas.width;
            pdf.addImage(imgData, 'JPEG', marginX, marginY, printW, Math.min(printH, pdfHeight - (marginY * 2)));
          }
        }

        const safeTitle = (eventTitle || 'DutyPass').replace(/\s+/g, '_');
        pdf.save(`Lanyard_ID_Card_4in1_Legal_${safeTitle}_Pages_${actualStart}_to_${actualEnd}.pdf`);
        onClose();
        return;
      }

      // -----------------------------------------------------------
      // BRANCH B: STANDARD ROSTER CARDS (2 / 4 / 6 IN 1)
      // -----------------------------------------------------------
      const isA4 = paperSize === 'a4';
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isA4 ? 'a4' : 'legal',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const pageStartIdx = (actualStart - 1) * layoutMode;
      const pageEndIdx = actualEnd * layoutMode;
      const recordsToProcess = targetRecords.slice(pageStartIdx, pageEndIdx);
      const totalBatchPages = Math.ceil(recordsToProcess.length / layoutMode);

      for (let p = 0; p < totalBatchPages; p++) {
        const batch = recordsToProcess.slice(p * layoutMode, (p + 1) * layoutMode);
        setActiveBatch(batch);
        setProgress({
          current: Math.min((p + 1) * layoutMode, recordsToProcess.length),
          total: recordsToProcess.length,
          page: p + 1,
          totalPages: totalBatchPages
        });

        // Fast minimal delay for DOM paint
        await new Promise((res) => setTimeout(res, 50));

        const element = printContainerRef.current;
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 1.4,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);

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

  // Helper to render Compact Horizontal Front ID Badge in React (for Canvas & Preview)
  const renderIdBadgeHorizontalFrontReact = (duty, idx, isPreview = false) => {
    if (!duty) return <div key={idx} style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', minHeight: isPreview ? '140px' : '100%' }} />;

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

    const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName);
    const displayCleanName = stripRankFromName(cleanOfficerName);

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

    return (
      <div
        key={idx}
        style={{
          border: '1.5px solid #0f172a',
          borderRadius: '6px',
          padding: 0,
          backgroundColor: '#ffffff',
          color: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          fontSize: isPreview ? '8px' : '9px',
          lineHeight: '1.2',
          height: '100%',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}
      >
        {/* Flush Top Navy Header */}
        <div style={{ backgroundColor: '#0b132b', color: '#ffffff', padding: isPreview ? '3px 5px' : '4px 6px 3px', borderBottom: '2px solid #b45309', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
          <img src="/badge.png" alt="Badge" style={{ width: isPreview ? '20px' : '24px', height: isPreview ? '20px' : '24px', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isPreview ? '6.5px' : '6.8px', fontWeight: '800', color: '#fde68a', letterSpacing: '0.4px', lineHeight: 1, textTransform: 'uppercase' }}>उत्तर प्रदेश पुलिस • जनपद अयोध्या</div>
            <div style={{ fontSize: isPreview ? '10px' : '11.5px', fontWeight: '900', color: '#ffffff', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.5px' }}>
              {eventTitle}
            </div>
            <div style={{ fontSize: isPreview ? '6.5px' : '7px', fontWeight: '800', color: '#fde047', lineHeight: 1 }}>
              {eventSubtitle || 'विशेष सुरक्षा व्यवस्था • ड्यूटी पास'}
            </div>
          </div>
          <img src="/badge.png" alt="Badge" style={{ width: isPreview ? '20px' : '24px', height: isPreview ? '20px' : '24px', objectFit: 'contain', flexShrink: 0 }} />
        </div>

        {/* Main Body Container */}
        <div style={{ padding: isPreview ? '3px 5px' : '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '3px', boxSizing: 'border-box' }}>
          {/* Officer Details Strip (Horizontal Layout) */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: isPreview ? '2px 4px' : '3px 5px' }}>
            <div style={{ width: isPreview ? '28px' : '32px', height: isPreview ? '36px' : '40px', border: '1px solid #94a3b8', borderRadius: '3px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {duty.photo ? (
                <img src={duty.photo} alt={duty.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '5.5px', fontWeight: 'bold', color: '#64748b', textAlign: 'center', lineHeight: 1 }}>
                  पासपोर्ट<br />फोटो
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: isPreview ? '10px' : '11px', fontWeight: '900', color: '#0f172a', lineHeight: 1.15 }}>
                    {displayCleanName || duty.name}
                  </span>
                  {effectiveRank && (
                    <span style={{ backgroundColor: '#b45309', color: '#ffffff', padding: '0.5px 4.5px', borderRadius: '2px', fontSize: isPreview ? '6.5px' : '7px', fontWeight: '900', lineHeight: 1 }}>
                      {effectiveRank}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: isPreview ? '7.5px' : '8.5px', fontWeight: '800', color: '#1e3a8a', marginTop: '1.5px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontFamily: 'monospace', fontSize: isPreview ? '8.5px' : '9.5px', fontWeight: '900' }}>
                    📞 {duty.mobile || '-'}
                  </span>
                  {cleanPno && (
                    <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: isPreview ? '7px' : '7.5px' }}>
                      PNO: <strong>{cleanPno}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: isPreview ? '6.5px' : '7px', color: '#334155', borderTop: '0.8px solid #cbd5e1', paddingTop: '1px', marginTop: '1.5px', lineHeight: 1.1 }}>
                मूल तैनाती: <strong style={{ color: '#0f172a' }}>{duty.posting || duty.posting_place || duty.thana || (duty.district ? `जनपद ${duty.district}` : '-')}</strong>
              </div>
            </div>
          </div>

          {/* HERO BANNER: 🚩 कर्तव्य स्थल (DUTY PLACE) - Full Width */}
          <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', border: '1.4px solid #d97706', borderRadius: '4px', padding: isPreview ? '2px 5px' : '3px 6px', textAlign: 'center', boxShadow: '0 1px 2px rgba(180,83,9,0.08)' }}>
            <div style={{ fontSize: isPreview ? '6.5px' : '6.8px', fontWeight: '900', color: '#92400e', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              🚩 कर्तव्य स्थल (ASSIGNED DUTY POINT)
            </div>
            <div style={{ fontSize: isPreview ? '11px' : '12.5px', fontWeight: '900', color: '#78350f', lineHeight: 1.2, marginTop: '1px' }}>
              {duty.duty_place || '-'}
            </div>
          </div>

          {/* DUTY TIMING / SHIFT BANNER - Full Width (No Truncation) */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '3px', padding: isPreview ? '1.5px 5px' : '2px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isPreview ? '6.8px' : '7.2px' }}>
            <span style={{ fontWeight: '900', color: '#166534', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span>⏰</span>
              <span>ड्यूटी दिनाँक व समय:</span>
            </span>
            <span style={{ fontWeight: '800', color: '#0f172a' }}>
              {duty.shift || 'प्रातः 09:00 से समाप्ति तक'}
            </span>
          </div>

          {/* Security & Signature Footer */}
          <div style={{ borderTop: '1.2px solid #0f172a', paddingTop: '2px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '0.8px solid #cbd5e1', borderRadius: '2px', padding: '1px' }}>
                <QRCodeSVG value={qrData} size={isPreview ? 20 : 24} level="M" />
              </div>
              <div>
                <div style={{ fontSize: '6px', fontWeight: '900', color: '#166534', backgroundColor: '#dcfce7', border: '0.5px solid #86efac', padding: '0.5px 3px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                  ✓ अधिकृत पास
                </div>
                <div style={{ fontSize: '6px', fontFamily: 'monospace', color: '#475569', fontWeight: 'bold', marginTop: '0.5px' }}>
                  ID: {cleanPno || duty.id || '-'}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <div style={{ fontSize: isPreview ? '6.5px' : '7px', fontWeight: '900', color: '#64748b', letterSpacing: '0.5px' }}>अयोध्या पुलिस</div>
              <div style={{ fontSize: '5.5px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.8px' }}>AYODHYA POLICE</div>
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {signatureImg ? (
                <img src={signatureImg} alt="Sign" style={{ height: isPreview ? '14px' : '16px', maxWidth: '65px', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: '6px', fontStyle: 'italic', color: '#475569' }}>(हस्ताक्षरित)</div>
              )}
              <div style={{ fontSize: isPreview ? '6.5px' : '6.8px', fontWeight: '900', color: '#020617', lineHeight: 1, marginTop: '1px' }}>
                {signatoryText}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper to render Compact Horizontal Back ID Badge in React (for Canvas & Preview)
  const renderIdBadgeHorizontalBackReact = (duty, idx, isPreview = false) => {
    if (!duty) return <div key={idx} style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', minHeight: isPreview ? '140px' : '100%' }} />;

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

    const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName);
    const displayCleanName = stripRankFromName(cleanOfficerName);

    const activeNoteText = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
    const activeBriefingText = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

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

    return (
      <div
        key={idx}
        style={{
          border: '1.5px solid #0f172a',
          borderRadius: '6px',
          padding: 0,
          backgroundColor: '#ffffff',
          color: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          fontSize: isPreview ? '8px' : '9px',
          lineHeight: '1.2',
          height: '100%',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}
      >
        {/* Flush Top Navy Header */}
        <div style={{ backgroundColor: '#0b132b', color: '#ffffff', padding: isPreview ? '3px 5px' : '3.5px 6px', borderBottom: '2px solid #1e3a8a', textAlign: 'center' }}>
          <div style={{ fontSize: isPreview ? '6px' : '6.5px', fontWeight: '800', color: '#94a3b8', lineHeight: 1, letterSpacing: '0.3px' }}>
            कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या
          </div>
          <div style={{ fontSize: isPreview ? '8.5px' : '9.5px', fontWeight: '900', color: '#ffffff', marginTop: '0.5px', lineHeight: 1.15 }}>
            ड्यूटी नियंत्रण एवं महत्वपूर्ण निर्देश (पृष्ठ भाग)
          </div>
        </div>

        {/* Main Body Container */}
        <div style={{ padding: isPreview ? '3px 5px' : '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '3px', boxSizing: 'border-box' }}>
          {/* Officer Mini Strip */}
          <div style={{ backgroundColor: '#f1f5f9', border: '0.8px solid #cbd5e1', borderRadius: '3px', padding: isPreview ? '1.5px 5px' : '2px 6px', fontSize: isPreview ? '6.8px' : '7.2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>अधिकारी: <strong style={{ color: '#0f172a' }}>{displayCleanName || duty.name}</strong> {effectiveRank && <span style={{ backgroundColor: '#b45309', color: '#fff', fontSize: '6px', padding: '0.2px 3.5px', borderRadius: '2px', fontWeight: 'bold' }}>{effectiveRank}</span>}</span>
            <span>मो०: <strong style={{ fontFamily: 'monospace', color: '#0369a1' }}>{duty.mobile || '-'}</strong> {cleanPno && `| PNO: ${cleanPno}`}</span>
          </div>

          {/* Zone & Sector 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {/* Zone */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: isPreview ? '2px 3.5px' : '2.5px 4px', fontSize: isPreview ? '6.5px' : '6.8px', lineHeight: 1.25 }}>
              <div style={{ fontWeight: '900', color: '#0f172a', borderBottom: '0.8px solid #e2e8f0', paddingBottom: '1px', marginBottom: '1.5px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span>🏢</span><span>जोन / जोनल कमान</span>
              </div>
              <div><span style={{ color: '#64748b' }}>जोन:</span> <strong style={{ color: '#0f172a' }}>{cleanZone || '-'}</strong></div>
              {cleanZonalIncharge && <div style={{ marginTop: '1px' }}><span style={{ color: '#64748b' }}>प्रभारी:</span> <strong style={{ color: '#0369a1' }}>{cleanZonalIncharge}</strong></div>}
            </div>

            {/* Sector */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: isPreview ? '2px 3.5px' : '2.5px 4px', fontSize: isPreview ? '6.5px' : '6.8px', lineHeight: 1.25 }}>
              <div style={{ fontWeight: '900', color: '#0f172a', borderBottom: '0.8px solid #e2e8f0', paddingBottom: '1px', marginBottom: '1.5px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span>🛡️</span><span>सेक्टर / सेक्टर कमान</span>
              </div>
              <div><span style={{ color: '#64748b' }}>सेक्टर:</span> <strong style={{ color: '#0f172a' }}>{cleanSector || '-'}</strong></div>
              {cleanSectorIncharge && <div style={{ marginTop: '1px' }}><span style={{ color: '#64748b' }}>प्रभारी:</span> <strong style={{ color: '#0369a1' }}>{cleanSectorIncharge}</strong></div>}
            </div>
          </div>

          {/* Briefing */}
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '3px', padding: isPreview ? '1.5px 4px' : '2px 5px', fontSize: isPreview ? '6.5px' : '6.8px', lineHeight: 1.2 }}>
            <span style={{ fontWeight: '900', color: '#1e40af' }}>📢 ब्रीफिंग स्थल व समय: </span>
            <span style={{ color: '#0f172a', fontWeight: '800' }}>{activeBriefingText || 'पुलिस लाइन्स आर०टी०सी० सभागार जनपद अयोध्या'}</span>
          </div>

          {/* 📌 विशेष नोट / निर्देश (THE NOTE!) */}
          <div style={{ backgroundColor: '#fffbeb', border: '1.2px solid #fde68a', borderRadius: '4px', padding: isPreview ? '2px 4px' : '3px 5px', fontSize: isPreview ? '6.5px' : '6.8px', lineHeight: 1.25 }}>
            <div style={{ fontWeight: '900', color: '#92400e', display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
              <span>📌 विशेष नोट / महत्वपूर्ण निर्देश:</span>
              <span style={{ fontSize: '5.5px', color: '#b45309', backgroundColor: '#fef3c7', border: '0.5px solid #fde68a', padding: '0.2px 3px', borderRadius: '2px' }}>अनिवार्य अनुपालन</span>
            </div>
            <div style={{ color: '#78350f', fontWeight: '700' }}>
              {activeNoteText ? activeNoteText : '14 कोसी परिक्रमा में ड्यूटीरत कर्मी 14 कोसी परिक्रमा समाप्ति के बाद दिनांक 19.11.2026 को अपना अगला ड्यूटी कार्ड मेला कार्यालय सिंचाई डाक बंगला नया घाट अयोध्या से प्राप्त करना सुनिश्चित करेंगे।'}
            </div>
          </div>

          {/* 24x7 Emergency CUG / Helpline */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '3px', padding: isPreview ? '1.5px 4px' : '2px 5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: isPreview ? '6.2px' : '6.8px' }}>
            <span>📞 पुलिस कंट्रोल: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>9454402648</strong></span>
            <span>🎪 मेला कंट्रोल: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>9454402655</strong></span>
            <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '0.5px solid #fca5a5', padding: '0.5px 3px', borderRadius: '2px', fontWeight: '900' }}>🚨 आपातकाल: 112</span>
          </div>

          {/* Bottom Sign-off */}
          <div style={{ textAlign: 'center', fontSize: isPreview ? '6.8px' : '7.2px', fontWeight: '900', color: '#0f172a', borderTop: '1px solid #0f172a', paddingTop: '1.5px', marginTop: 'auto' }}>
            ( वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या )
          </div>
        </div>
      </div>
    );
  };

  const renderIdBadgeFrontReact = renderIdBadgeHorizontalFrontReact;
  const renderIdBadgeBackReact = renderIdBadgeHorizontalBackReact;
  const renderIdBadgeReact = renderIdBadgeHorizontalFrontReact;

  // Helper to render individual card for background canvas
  const renderSingleCard = (duty, idx) => {
    if (!duty) return <div key={idx} style={{ border: '1px dashed #cbd5e1', borderRadius: '6px' }} />;

    if (cardFormat === 'id_badge') {
      return (idx % 2 === 0)
        ? renderIdBadgeHorizontalFrontReact(duty, idx, false)
        : renderIdBadgeHorizontalBackReact(duty, idx, false);
    }

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

    const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName);
    const displayCleanName = stripRankFromName(cleanOfficerName);

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

    return (
      <div
        key={idx}
        style={{
          border: '2px solid #0b132b',
          boxShadow: 'inset 0 0 0 1.5px #d97706',
          borderRadius: '8px',
          padding: layoutMode === 2 ? '12px 14px' : '6px 8px',
          backgroundColor: '#ffffff',
          color: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: hasCoForce ? 'space-between' : 'flex-start',
          boxSizing: 'border-box',
          fontSize: layoutMode === 2 ? '10px' : '9.5px',
          lineHeight: '1.25'
        }}
      >
        {/* Card Top Header */}
        <div style={{ borderBottom: '2px solid #0b132b', paddingBottom: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/badge.png" alt="Badge" style={{ width: layoutMode === 2 ? '36px' : '30px', height: layoutMode === 2 ? '36px' : '30px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', flex: 1, padding: '0 4px' }}>
            <div style={{ fontSize: layoutMode === 2 ? '13px' : '11.5px', fontWeight: '900', color: '#000000', lineHeight: '1.2' }}>
              {eventTitle}
            </div>
            <div style={{ fontSize: layoutMode === 2 ? '9.5px' : '8.5px', fontWeight: 'bold', color: '#333333' }}>
              {eventSubtitle}
            </div>
          </div>
          <img src="/badge.png" alt="Badge" style={{ width: layoutMode === 2 ? '36px' : '30px', height: layoutMode === 2 ? '36px' : '30px', objectFit: 'contain' }} />
        </div>

        {/* Officer Photo & Info Row */}
        <div style={{ display: 'flex', gap: '6px', border: '1px solid #94a3b8', padding: layoutMode === 2 && !hasCoForce ? '6px 8px' : '4px', borderRadius: '6px', backgroundColor: '#f8fafc', margin: layoutMode === 2 && !hasCoForce ? '8px 0 6px' : '3px 0' }}>
          <div style={{ width: layoutMode === 2 ? (hasCoForce ? '48px' : '56px') : '44px', height: layoutMode === 2 ? (hasCoForce ? '60px' : '70px') : '56px', border: '1px dashed #64748b', borderRadius: '4px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {duty.photo ? (
              <img src={duty.photo} alt={duty.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', lineHeight: '1.1' }}>
                फोटो<br />चस्पा करें
              </div>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: layoutMode === 2 ? '8.5px' : '7.5px', fontWeight: 'bold', color: '#64748b' }}>अधिकारी / कर्मचारी:</div>
              <div style={{ fontSize: layoutMode === 2 ? (hasCoForce ? '11.5px' : '13px') : '10px', fontWeight: '900', color: '#000000', lineHeight: '1.2', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', wordBreak: 'break-word' }}>
                <span>{duty.name || duty.composite_details || cleanOfficerName || '-'}</span>
              </div>
              <div style={{ fontSize: layoutMode === 2 ? (hasCoForce ? '9.5px' : '11px') : '8.5px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' }}>
                {duty.mobile || '-'}
              </div>
            </div>
            <div style={{ fontSize: layoutMode === 2 ? '8.5px' : '7.5px', color: '#334155', borderTop: '1px solid #cbd5e1', paddingTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
              {cleanPno ? (
                <span>P.No: <strong>{cleanPno}</strong></span>
              ) : null}
              <span>मूल तैनाती: <strong>{duty.posting || duty.posting_place || duty.thana || (duty.district ? `जनपद ${duty.district}` : '-')}</strong> {duty.posting && duty.district && !String(duty.posting).includes(duty.district) ? `(${duty.district})` : ''}</span>
            </div>
          </div>
        </div>

        {/* Duty Details Table */}
        <table style={{ width: '100%', flex: hasCoForce ? 'none' : 1, borderCollapse: 'collapse', fontSize: layoutMode === 2 ? (hasCoForce ? '11px' : '12.5px') : '8.5px', border: '1.5px solid #0f172a', margin: layoutMode === 2 ? (hasCoForce ? '6px 0 4px' : '10px 0') : '2px 0', lineHeight: '1.4' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={{ width: '28%', backgroundColor: '#f1f5f9', fontWeight: '800', color: '#0f172a', padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>ड्यूटी स्थल</td>
              <td style={{ padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', fontWeight: '900', color: '#78350f', backgroundColor: '#fef3c7', fontSize: layoutMode === 2 ? (hasCoForce ? '12.5px' : '14.5px') : '9.5px' }}>{duty.duty_place || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', color: '#0f172a', padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>दिनाँक व समय</td>
              <td style={{ padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', fontWeight: 'bold' }}>{duty.shift || '-'}</td>
            </tr>
            {!hasCoForce ? (
              <>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', color: '#0f172a', padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>जोन</td>
                  <td style={{ padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', fontWeight: '600' }}>{cleanZone || '-'}</td>
                </tr>
                {cleanZonalIncharge && (
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ backgroundColor: '#f8fafc', fontWeight: '800', color: '#0369a1', padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>जोनल प्रभारी</td>
                    <td style={{ padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', fontWeight: '900', color: '#0369a1' }}>{cleanZonalIncharge}</td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', color: '#0f172a', padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>सेक्टर</td>
                  <td style={{ padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', fontWeight: '600' }}>{cleanSector || '-'}</td>
                </tr>
                {cleanSectorIncharge && (
                  <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ backgroundColor: '#f8fafc', fontWeight: '800', color: '#0369a1', padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>सेक्टर प्रभारी</td>
                    <td style={{ padding: layoutMode === 2 ? '7px 10px' : '2.5px 4px', fontWeight: '900', color: '#0369a1' }}>{cleanSectorIncharge}</td>
                  </tr>
                )}
              </>
            ) : (
              <>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', color: '#0f172a', padding: layoutMode === 2 ? '5px 8px' : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>जोन / प्रभारी</td>
                  <td style={{ padding: layoutMode === 2 ? '5px 8px' : '2.5px 4px' }}>{cleanZone || '-'} {cleanZonalIncharge ? ` / ${cleanZonalIncharge}` : ''}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ backgroundColor: '#f1f5f9', fontWeight: '800', color: '#0f172a', padding: layoutMode === 2 ? '5px 8px' : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>सेक्टर / प्रभारी</td>
                  <td style={{ padding: layoutMode === 2 ? '5px 8px' : '2.5px 4px' }}>{cleanSector || '-'} {cleanSectorIncharge ? ` / ${cleanSectorIncharge}` : ''}</td>
                </tr>
              </>
            )}
            {activeBriefingText && (
              <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#f0f9ff' }}>
                <td style={{ backgroundColor: '#e0f2fe', fontWeight: '900', color: '#075985', padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>ब्रीफिंग स्थल</td>
                <td style={{ padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', fontWeight: 'bold', color: '#0369a1' }}>{activeBriefingText}</td>
              </tr>
            )}
            {activeNoteText && (
              <tr style={{ backgroundColor: '#fffbeb' }}>
                <td style={{ backgroundColor: '#fef3c7', fontWeight: '900', color: '#92400e', padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', borderRight: '1.5px solid #cbd5e1', whiteSpace: 'nowrap' }}>विशेष निर्देश</td>
                <td style={{ padding: layoutMode === 2 ? (hasCoForce ? '5px 8px' : '7px 10px') : '2.5px 4px', fontWeight: 'bold', fontSize: layoutMode === 2 ? (hasCoForce ? '10.5px' : '12px') : '7.5px', color: '#92400e' }}>{activeNoteText}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Co-deployed Force (Gated by includeCoForce) */}
        {includeCoForce && coForceList.length > 0 && (() => {
          const maxVisible = layoutMode === 2 ? 36 : 28;
          const displayedList = coForceList.slice(0, maxVisible);
          const remainingCount = coForceList.length - displayedList.length;

          return (
            <div style={{ border: '1.5px solid #0b132b', borderRadius: '6px', overflow: 'hidden', margin: layoutMode === 2 ? '5px 0 4px' : '3px 0', fontSize: layoutMode === 2 ? '8.5px' : '7.5px' }}>
              <div style={{ backgroundColor: '#f1f5f9', fontWeight: '900', padding: layoutMode === 2 ? '3px 8px' : '2px 5px', borderBottom: '1.5px solid #cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: layoutMode === 2 ? '10px' : '8.5px', color: '#0f172a' }}>सहयोगार्थ पुलिस बल:</span>
                <span style={{ color: '#0369a1', fontFamily: 'monospace', fontWeight: 'bold' }}>कुल: {coForceList.length} जवान</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: layoutMode === 2 ? '8px' : '5px', rowGap: layoutMode === 2 ? '2.5px' : '1.5px', padding: layoutMode === 2 ? '4px 6px' : '2.5px 4px', overflow: 'hidden' }}>
                {displayedList.map((colleague, cIdx) => {
                  let cleanName = (colleague.name || '').trim()
                    .replace(/,\s*\d{10}\b/g, '')
                    .replace(/\b\d{10}\b/g, '')
                    .replace(/।\s*नं\s*\(?.*$/g, '')
                    .replace(/,\s*$/, '')
                    .trim();

                  if (cleanName.includes(',')) {
                    cleanName = cleanName.split(',')[0].trim();
                  }

                  return (
                    <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: layoutMode === 2 ? '2px 4px' : '1px 3px', border: '1px solid #e2e8f0', borderRadius: '3px', backgroundColor: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <span style={{ fontWeight: 'bold', color: '#64748b', fontFamily: 'monospace', fontSize: layoutMode === 2 ? '8px' : '6.5px' }}>{cIdx + 1}.</span>
                      <span style={{ fontWeight: '900', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{cleanName}</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0369a1', marginLeft: 'auto' }}>{colleague.mobile || '-'}</span>
                    </div>
                  );
                })}
              </div>
              {remainingCount > 0 && (
                <div style={{ backgroundColor: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '2px 4px', textAlign: 'center', fontSize: layoutMode === 2 ? '8px' : '7px', fontWeight: 'bold', color: '#475569' }}>
                  + {remainingCount} अन्य पुलिस बल (देखें संपूर्ण ड्यूटी बुकलेट)
                </div>
              )}
            </div>
          );
        })()}

        {/* Footer Authority & QR Code */}
        <div style={{ borderTop: '1.5px solid #000000', paddingTop: '3px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <QRCodeSVG value={qrData} size={layoutMode === 2 ? 34 : 28} level="M" />
            <div>
              <div style={{ fontSize: layoutMode === 2 ? '7.5px' : '6.5px', fontWeight: '900', color: '#065f46' }}>✓ सत्यापित पास</div>
              <div style={{ fontSize: layoutMode === 2 ? '7.5px' : '6.5px', fontFamily: 'monospace' }}>ID: {duty.id || '-'}</div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            {signatureImg ? (
              <img src={signatureImg} alt="Sign" style={{ height: layoutMode === 2 ? '22px' : '17px', maxWidth: '75px', objectFit: 'contain', marginLeft: 'auto' }} />
            ) : (
              <div style={{ fontSize: layoutMode === 2 ? '8.5px' : '7.5px', fontStyle: 'italic' }}>(हस्ताक्षरित)</div>
            )}
            <div style={{ fontSize: layoutMode === 2 ? '8.5px' : '7.5px', fontWeight: '900', lineHeight: '1.1' }}>
              {signatoryText}
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
            {/* 1. CARD FORMAT SWITCHER (ID BADGE VS STANDARD ROSTER) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                <span>कार्ड प्रारूप चुनें (Card Format):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setCardFormat('id_badge');
                    setPaperSize('legal');
                    setLayoutMode(4);
                  }}
                  className={`p-2.5 rounded-xl text-left transition cursor-pointer flex items-start gap-2.5 ${
                    cardFormat === 'id_badge'
                      ? 'bg-[#0b132b] text-white shadow-sm ring-2 ring-amber-500/60'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cardFormat === 'id_badge' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-100 text-slate-500'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xs flex items-center justify-between">
                      <span>गले का ID कार्ड (4-इन-1)</span>
                      {cardFormat === 'id_badge' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-tight ${cardFormat === 'id_badge' ? 'text-slate-300' : 'text-slate-500'}`}>
                      पॉलीबैग पाउच साइज • 4 कार्ड प्रति लीगल पेज
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCardFormat('standard')}
                  className={`p-2.5 rounded-xl text-left transition cursor-pointer flex items-start gap-2.5 ${
                    cardFormat === 'standard'
                      ? 'bg-[#0b132b] text-white shadow-sm ring-2 ring-blue-500/60'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cardFormat === 'standard' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-100 text-slate-500'}`}>
                    <Grid className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xs flex items-center justify-between">
                      <span>विस्तृत ड्यूटी रोस्टर</span>
                      {cardFormat === 'standard' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-tight ${cardFormat === 'standard' ? 'text-slate-300' : 'text-slate-500'}`}>
                      मानक शीट • 2, 4 या 6 कार्ड प्रति पेज
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2A. ID BADGE SPECIFIC CONTROLS & LIVE PREVIEW */}
            {cardFormat === 'id_badge' ? (
              <div className="space-y-3">
                {/* ID Badge Info Banner */}
                <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-2xl space-y-1.5 text-amber-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>विजिटिंग कार्ड / पॉलीबैग साइज ID कार्ड (4 कार्ड प्रति लीगल पेज)</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                      ✓ Front + Back
                    </span>
                  </div>
                  <div className="text-[10.5px] leading-relaxed text-amber-900/90 font-medium space-y-0.5">
                    <div>
                      • <strong>1 लीगल पेज = 4 जवानों के पूरे कार्ड:</strong> प्रत्येक पंक्ति में बाँये मुख पृष्ठ (Front) और दायें पृष्ठ भाग (Back) पास-पास छपेंगे।
                    </div>
                    <div>
                      • <strong>विजिटिंग कार्ड साइज (~103mm × 85mm):</strong> 3 सीधे कट लगाकर बीच से मोड़ते ही मानक लैनयार्ड पॉलीबैग में पूरी तरह फिट।
                    </div>
                    <div>
                      • <strong>विशेष नोट व आवश्यक विवरण:</strong> फ्रंट पर नाम, फोटो, मोबाइल, बड़ा कर्तव्य स्थल, QR व हस्ताक्षर; बैक पर जोन/सेक्टर प्रभारी, ब्रीफिंग व <strong>विशेष नोट (Note)</strong> सुरक्षित रूप से शामिल।
                    </div>
                  </div>
                </div>

                {/* Live Sample Badge Preview (Front & Back Side-by-Side) */}
                {targetRecords[0] && (
                  <div className="bg-slate-100 border border-slate-300 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                        <span className="font-black text-slate-800 text-xs">
                          लाइव आईडी कार्ड नमूना (Front व Back पास-पास):
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        ✓ 4 कार्ड प्रति लीगल पेज (8 ब्लॉक)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-200/70 p-2 rounded-xl border border-slate-300">
                      <div className="bg-white rounded-lg shadow-xs border border-slate-300 p-1 flex flex-col">
                        <div className="text-[9px] font-black text-amber-900 bg-amber-50 px-2 py-0.5 rounded text-center mb-1 border border-amber-200">
                          1. मुख पृष्ठ (FRONT)
                        </div>
                        {renderIdBadgeHorizontalFrontReact(targetRecords[0], 0, true)}
                      </div>
                      <div className="bg-white rounded-lg shadow-xs border border-slate-300 p-1 flex flex-col">
                        <div className="text-[9px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-center mb-1 border border-slate-200">
                          2. पृष्ठ भाग (BACK)
                        </div>
                        {renderIdBadgeHorizontalBackReact(targetRecords[0], 1, true)}
                      </div>
                    </div>
                    <div className="text-[9.5px] text-center text-slate-600 font-bold">
                      ✂️ 3 सीधे कट लगाएं और 📄 बीच से मोड़कर गले के पॉलीबैग / पाउच में रखें
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* 2B. STANDARD ROSTER CONTROLS */
              <div className="space-y-4">
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
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-600">प्रति पृष्ठ कार्ड:</div>
                  <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-300 flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLayoutMode(2)}
                      className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        layoutMode === 2
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-transparent text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>2 कार्ड / पेज</span>
                      {layoutMode === 2 && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setLayoutMode(4)}
                      className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        layoutMode === 4
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-transparent text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>4 कार्ड / पेज</span>
                      {layoutMode === 4 && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    {paperSize === 'legal' && (
                      <button
                        type="button"
                        onClick={() => setLayoutMode(6)}
                        className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          layoutMode === 6
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-transparent text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>6 कार्ड / पेज</span>
                        {layoutMode === 6 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    )}
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
              </div>
            )}

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
                      <span>
                        PDF फ़ाइल जनरेट करें ({selectedSlicePages} पेज / {
                          cardFormat === 'id_badge'
                            ? `${selectedSlicePages * 4} कार्ड (4 प्रति लीगल पेज)`
                            : `${selectedSlicePages * layoutMode} कार्ड`
                        })
                      </span>
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
          width: '780px',
          minHeight: '1285px',
          height: '1285px',
          backgroundColor: '#ffffff',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: cardFormat === 'id_badge' ? 'repeat(4, 1fr)' : (layoutMode === 4 ? '1fr 1fr' : (layoutMode === 2 ? '1fr 1fr' : '1fr 1fr 1fr')),
          gap: cardFormat === 'id_badge' ? '6px 8px' : '10px',
          padding: cardFormat === 'id_badge' ? '6px' : '10px',
          boxSizing: 'border-box',
          fontFamily: "'Mukta', 'Poppins', sans-serif"
        }}
      >
        {activeBatch.map((duty, idx) => renderSingleCard(duty, idx))}
      </div>
    </>
  );
}
