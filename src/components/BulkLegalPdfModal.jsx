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
  Users
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
  isBriefingEnabled = true
}) {
  const { language, t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, page: 0, totalPages: 0 });
  const [selectedPointFilter, setSelectedPointFilter] = useState('ALL');
  const [rangeMode, setRangeMode] = useState('all'); // 'all' | 'custom'
  const [paperSize, setPaperSize] = useState('a4'); // 'a4' | 'legal'
  const [layoutMode, setLayoutMode] = useState(4); // 4 or 2 for A4, 6 or 4 or 2 for Legal
  const [includeCoForce, setIncludeCoForce] = useState(true);
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

  const totalPossiblePages = Math.max(1, Math.ceil(targetRecords.length / layoutMode));

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
      includeCoForce
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
      // Dynamic Paper dimensions in mm: A4 (210x297mm) vs Legal (215.9x355.6mm)
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

    const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName);
    const displayCleanName = stripRankFromName(cleanOfficerName);

    // Clean & Parse Zone and Zonal Incharge
    let cleanZone = (duty.zone || '').trim();
    let cleanZonalIncharge = (duty.zonal_incharge || duty.zonal || '').trim();
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
    let cleanSectorIncharge = (duty.sector_incharge || '').trim();
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
                <span>{displayCleanName || '-'}</span>
                <span style={{ fontSize: '9px', background: '#fef3c7', color: '#78350f', padding: '1px 5px', borderRadius: '4px', border: '1px solid #fde68a', fontWeight: 'bold' }}>{effectiveRank}</span>
              </div>
              <div style={{ fontSize: layoutMode === 2 ? (hasCoForce ? '9.5px' : '11px') : '8.5px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' }}>
                {duty.mobile || '-'}
              </div>
            </div>
            <div style={{ fontSize: layoutMode === 2 ? '8.5px' : '7.5px', color: '#334155', borderTop: '1px solid #cbd5e1', paddingTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
              {cleanPno ? (
                <span>P.No: <strong>{cleanPno}</strong></span>
              ) : null}
              <span>मूल तैनाती: <strong>{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}</span>
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
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                    paperSize === 'a4'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>A4</span>
                  {paperSize === 'a4' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('legal')}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                    paperSize === 'legal'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>Legal</span>
                  {paperSize === 'legal' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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
                  className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                    layoutMode === 2
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>2 कार्ड / पेज</span>
                  {layoutMode === 2 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutMode(4)}
                  className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                    layoutMode === 4
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>4 कार्ड / पेज</span>
                  {layoutMode === 4 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {paperSize === 'legal' && (
                  <button
                    type="button"
                    onClick={() => setLayoutMode(6)}
                    className={`flex-1 py-2 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                      layoutMode === 6
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
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
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition"
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
          minHeight: '1280px',
          backgroundColor: '#ffffff',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: layoutMode === 4 ? '1fr 1fr' : '1fr 1fr 1fr',
          gap: '8px',
          padding: '8px',
          boxSizing: 'border-box',
          fontFamily: "'Noto Sans Devanagari', sans-serif"
        }}
      >
        {activeBatch.map((duty, idx) => renderSingleCard(duty, idx))}
      </div>
    </>
  );
}
