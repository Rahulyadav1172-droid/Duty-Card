import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Printer,
  FileDown,
  X,
  CreditCard,
  Shield,
  Check,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { resolvePoliceRank, stripRankFromName } from '../utils/rankResolver';
import { printLegalBulk } from '../utils/printLegalBulk';

/**
 * =========================================================================
 * LEGAL SIZE (8.5 x 14 INCHES) BLACK & WHITE PRINT-OPTIMIZED MODULE
 * Ayodhya Police Duty Card Portal (dutycard.ayodhyapolice.in)
 * 
 * 1. Legal Page Layout:
 *    - 2x4 Grid containing 4 Front and 4 Back sides (4 complete officers per sheet)
 *    - @page { size: legal portrait; margin: 10mm; }
 *    - Center vertical fold line ('बीच से मोड़ें') + 3 horizontal cut lines ('काटें')
 * 
 * 2. Card Design (Clean Black & White Theme):
 *    - Front: Top black header ("उत्तर प्रदेश पुलिस • जनपद अयोध्या - मेला चौदह कोसी परिक्रमा - ड्यूटी कार्ड-2026"),
 *      photo box, name, rank badge (उ०नि०), mobile, base posting (मूल तैनाती),
 *      prominent Assigned Duty Point box (कर्तव्य स्थल), QR code, Pass ID, SSP signature,
 *      and bottom footer "DESIGN AND DEVELOPED BY SMART CELL AYODHYA"
 *    - Back: NO top header. Sequential fields: Zone (जोन), Zonal Command (जोनल कमान),
 *      Sector (सेक्टर), Sector Incharge with mobile (सेक्टर प्रभारी), Duty Time (ड्यूटी समय),
 *      Special Note (विशेष नोट), and bottom footer.
 * 
 * 3. Print Functionality:
 *    - Print Legal Page via window.print() with exact CSS print media queries
 *    - Direct high-resolution PDF file download via jsPDF
 * =========================================================================
 */
export default function LegalBwDutyCardModule({
  isOpen = false,
  onClose,
  records = [],
  eventTitle = 'मेला चौदह कोसी परिक्रमा',
  eventSubtitle = 'ड्यूटी कार्ड-2026',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, page: 0, totalPages: 0 });
  const [selectedPointFilter, setSelectedPointFilter] = useState('ALL');
  const [rangeMode, setRangeMode] = useState('all'); // 'all' | 'custom'
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(25);
  const [activeBatch, setActiveBatch] = useState([]);
  const canvasContainerRef = useRef(null);

  if (!isOpen) return null;

  // Filter valid records
  const validRecords = (records || []).filter(r => r && (r.name || r.id));
  const targetRecords = selectedPointFilter === 'ALL'
    ? validRecords
    : validRecords.filter(r => (r.duty_place || '').trim() === selectedPointFilter);

  // 4 officers per legal sheet (4 front + 4 back = 8 cells)
  const CARDS_PER_LEGAL_SHEET = 4;
  const totalPossiblePages = Math.max(1, Math.ceil(targetRecords.length / CARDS_PER_LEGAL_SHEET));

  const actualStart = rangeMode === 'custom' ? Math.max(1, parseInt(startPage) || 1) : 1;
  const actualEnd = rangeMode === 'custom' ? Math.min(totalPossiblePages, parseInt(endPage) || totalPossiblePages) : totalPossiblePages;
  const selectedSlicePages = Math.max(1, actualEnd - actualStart + 1);

  // Unique duty points
  const uniqueDutyPoints = Array.from(
    new Set(validRecords.map(r => (r.duty_place || '').trim()).filter(Boolean))
  ).sort();

  // -------------------------------------------------------------------------
  // ACTION 1: PRINT LEGAL PAGE VIA WINDOW.PRINT()
  // -------------------------------------------------------------------------
  const handlePrintLegalPage = () => {
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
      layoutMode: 4,
      paperSize: 'legal',
      includeCoForce: false,
      includeBackSide: true,
      cardFormat: 'id_badge',
      theme: 'bw'
    });
  };

  // -------------------------------------------------------------------------
  // ACTION 2: DOWNLOAD DIRECT HIGH-RES LEGAL PDF VIA JSPDF
  // -------------------------------------------------------------------------
  const handleDownloadPdf = async () => {
    if (targetRecords.length === 0) {
      alert('डाउनलोड करने हेतु कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    try {
      setIsGenerating(true);
      if (document.fonts) {
        await document.fonts.ready;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'legal',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const pageStartIdx = (actualStart - 1) * CARDS_PER_LEGAL_SHEET;
      const pageEndIdx = actualEnd * CARDS_PER_LEGAL_SHEET;
      const recordsToProcess = targetRecords.slice(pageStartIdx, pageEndIdx);
      const totalBatches = Math.ceil(recordsToProcess.length / CARDS_PER_LEGAL_SHEET);

      for (let p = 0; p < totalBatches; p++) {
        const batch = recordsToProcess.slice(p * CARDS_PER_LEGAL_SHEET, (p + 1) * CARDS_PER_LEGAL_SHEET);

        // 8 slots (4 Front + 4 Back side-by-side)
        const eightSlots = [];
        for (let i = 0; i < 4; i++) {
          const off = batch[i] || null;
          eightSlots.push(off); // Slot 2*i: Front
          eightSlots.push(off); // Slot 2*i+1: Back
        }

        setActiveBatch(eightSlots);
        setProgress({
          current: Math.min((p + 1) * CARDS_PER_LEGAL_SHEET, recordsToProcess.length),
          total: recordsToProcess.length,
          page: p + 1,
          totalPages: totalBatches
        });

        await new Promise((res) => setTimeout(res, 60));

        const element = canvasContainerRef.current;
        if (element) {
          const canvas = await html2canvas(element, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.90);

          if (p > 0) {
            pdf.addPage('legal', 'portrait');
          }

          // 10mm margins as per specification
          const marginX = 10;
          const marginY = 10;
          const printW = pdfWidth - (marginX * 2);
          const printH = (canvas.height * printW) / canvas.width;
          pdf.addImage(imgData, 'JPEG', marginX, marginY, printW, Math.min(printH, pdfHeight - (marginY * 2)));
        }
      }

      const safeTitle = (eventTitle || 'AyodhyaPolice').replace(/\s+/g, '_');
      pdf.save(`Legal_BW_DutyCards_${safeTitle}_Pages_${actualStart}_to_${actualEnd}.pdf`);
      onClose();
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert(`PDF जनरेशन त्रुटि: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------------------
  // REACT RENDERER: FRONT SIDE (CLEAN BLACK & WHITE THEME)
  // -------------------------------------------------------------------------
  const renderBwFrontReact = (duty, idx, isPreview = false) => {
    if (!duty) {
      return (
        <div key={idx} style={{ border: '1.5px dashed #000000', borderRadius: '4px', minHeight: isPreview ? '140px' : '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>
          स्थान रिक्त
        </div>
      );
    }

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

    const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName) || 'आरक्षी';
    const displayCleanName = stripRankFromName(cleanOfficerName);

    const qrData = JSON.stringify({
      id: duty.id || 'DUTY',
      name: duty.name || '',
      duty_place: duty.duty_place || '',
      mobile: duty.mobile || '',
      auth: "AYODHYA_POLICE_SECURE_VERIFIED"
    });

    const passIdText = `ID: ${cleanPno || duty.id || 'DUTY-0001'}`;

    return (
      <div
        key={idx}
        style={{
          border: '1.5px solid #000000',
          borderRadius: '4px',
          padding: 0,
          backgroundColor: '#ffffff',
          color: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          fontSize: isPreview ? '8px' : '9px',
          lineHeight: '1.15',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {/* 1. Top Black Header Banner */}
        <div style={{ backgroundColor: '#000000', color: '#ffffff', padding: isPreview ? '2.5px 5px' : '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', borderBottom: '1.5px solid #000000' }}>
          <img src="/badge.png" alt="Badge" style={{ width: isPreview ? '18px' : '22px', height: isPreview ? '18px' : '22px', objectFit: 'contain', filter: 'grayscale(100%) contrast(150%)', flexShrink: 0 }} />
          <div style={{ textAlign: 'center', flex: 1, minWidth: 0, lineHeight: 1.1 }}>
            <div style={{ fontSize: isPreview ? '6px' : '6.5px', fontWeight: '800', color: '#e2e8f0', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              उत्तर प्रदेश पुलिस • जनपद अयोध्या
            </div>
            <div style={{ fontSize: isPreview ? '9.5px' : '11px', fontWeight: '900', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.5px' }}>
              {eventTitle}
            </div>
            <div style={{ fontSize: isPreview ? '6.5px' : '7px', fontWeight: '800', color: '#cbd5e1' }}>
              {eventSubtitle}
            </div>
          </div>
          <img src="/badge.png" alt="Badge" style={{ width: isPreview ? '18px' : '22px', height: isPreview ? '18px' : '22px', objectFit: 'contain', filter: 'grayscale(100%) contrast(150%)', flexShrink: 0 }} />
        </div>

        {/* 2. Main Body Container */}
        <div style={{ padding: isPreview ? '2.5px 5px' : '3.5px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '2.5px', boxSizing: 'border-box' }}>
          {/* Officer Details Strip: Photo + Metadata */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '5px', border: '1px solid #000000', borderRadius: '3px', padding: isPreview ? '2px 4px' : '2.5px 5px', backgroundColor: '#ffffff' }}>
            {/* Photo Box */}
            <div style={{ width: isPreview ? '26px' : '30px', height: isPreview ? '34px' : '38px', border: '1px solid #000000', borderRadius: '2px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {duty.photo ? (
                <img src={duty.photo} alt={duty.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%)' }} />
              ) : (
                <div style={{ fontSize: '5.5px', fontWeight: '900', color: '#000000', textAlign: 'center', lineHeight: 1 }}>
                  फोटो
                </div>
              )}
            </div>

            {/* Metadata */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3.5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: isPreview ? '9.5px' : '10.5px', fontWeight: '900', color: '#000000', lineHeight: 1.15 }}>
                    {displayCleanName || duty.name}
                  </span>
                  <span style={{ backgroundColor: '#000000', color: '#ffffff', padding: '0.5px 3.5px', borderRadius: '2px', fontSize: isPreview ? '6px' : '6.8px', fontWeight: '900', lineHeight: 1 }}>
                    [ {effectiveRank} ]
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: isPreview ? '7px' : '8px', color: '#000000', marginTop: '1px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: isPreview ? '8px' : '9px', fontWeight: '900' }}>
                    मो०: {duty.mobile || '-'}
                  </span>
                  {cleanPno && (
                    <span style={{ fontFamily: 'monospace', fontSize: isPreview ? '6.5px' : '7.2px' }}>
                      PNO: <strong>{cleanPno}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: isPreview ? '6.2px' : '6.8px', color: '#000000', borderTop: '0.8px solid #000000', paddingTop: '1px', lineHeight: 1.1 }}>
                मूल तैनाती: <strong>{duty.posting || duty.posting_place || duty.thana || (duty.district ? `जनपद ${duty.district}` : '-')}</strong>
              </div>
            </div>
          </div>

          {/* 3. Prominent Assigned Duty Point Box (कर्तव्य स्थल) */}
          <div style={{ border: '1.5px solid #000000', borderRadius: '3px', padding: isPreview ? '2px 4px' : '2.5px 5px', textAlign: 'center', backgroundColor: '#ffffff' }}>
            <div style={{ fontSize: isPreview ? '6px' : '6.5px', fontWeight: '900', color: '#ffffff', backgroundColor: '#000000', padding: '1px 3px', borderRadius: '1px', letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: '1px' }}>
              🚩 कर्तव्य स्थल (ASSIGNED DUTY POINT)
            </div>
            <div style={{ fontSize: isPreview ? '10.5px' : '12px', fontWeight: '900', color: '#000000', lineHeight: 1.2 }}>
              {duty.duty_place || '-'}
            </div>
          </div>

          {/* 4. Footer Row: QR Code, Pass ID, and Right-Aligned Signature */}
          <div style={{ borderTop: '1px solid #000000', paddingTop: '1.5px', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left: QR Code + Pass ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '0.8px solid #000000', borderRadius: '2px', padding: '0.5px' }}>
                <QRCodeSVG value={qrData} size={isPreview ? 18 : 22} level="M" fgColor="#000000" bgColor="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '5.5px', fontWeight: '900', color: '#ffffff', backgroundColor: '#000000', padding: '0.5px 3px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                  ✓ सत्यापित पास
                </div>
                <div style={{ fontSize: '6px', fontFamily: 'monospace', color: '#000000', fontWeight: '900', marginTop: '0.5px' }}>
                  {passIdText}
                </div>
              </div>
            </div>

            {/* Right: Signature */}
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              {signatureImg ? (
                <img src={signatureImg} alt="Sign" style={{ height: isPreview ? '12px' : '15px', maxWidth: '60px', objectFit: 'contain', filter: 'grayscale(100%) contrast(150%)' }} />
              ) : (
                <div style={{ fontSize: '6px', fontStyle: 'italic', color: '#000000', fontWeight: 'bold' }}>(हस्ताक्षरित)</div>
              )}
              <div style={{ fontSize: isPreview ? '6px' : '6.5px', fontWeight: '900', color: '#000000', lineHeight: 1, marginTop: '1px' }}>
                {signatoryText}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Bottom Black Footer Banner: DESIGN AND DEVELOPED BY SMART CELL AYODHYA */}
        <div style={{ backgroundColor: '#000000', color: '#ffffff', textAlign: 'center', fontSize: isPreview ? '5.2px' : '5.8px', fontWeight: '900', letterSpacing: '0.6px', padding: '1.5px 4px', borderTop: '1px solid #000000', textTransform: 'uppercase' }}>
          DESIGN AND DEVELOPED BY SMART CELL AYODHYA
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // REACT RENDERER: BACK SIDE (CLEAN BLACK & WHITE THEME)
  // Specification: NO TOP HEADER. Sequential fields: Zone, Zonal Command,
  // Sector, Sector Incharge with mobile, Duty Time, Special Note.
  // -------------------------------------------------------------------------
  const renderBwBackReact = (duty, idx, isPreview = false) => {
    if (!duty) {
      return (
        <div key={idx} style={{ border: '1.5px dashed #000000', borderRadius: '4px', minHeight: isPreview ? '140px' : '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>
          स्थान रिक्त
        </div>
      );
    }

    const activeNoteText = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');

    // Extract Clean Zone & Zonal Incharge
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
    }
    if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
      cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
    }

    // Extract Clean Sector & Sector Incharge
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
      duty['प्रभारी'] ||
      ''
    ).trim();
    if (cleanSectorIncharge === '-') cleanSectorIncharge = '';

    if (!cleanSectorIncharge && cleanSector.includes('/')) {
      const parts = cleanSector.split('/');
      cleanSector = parts[0].trim();
      cleanSectorIncharge = parts.slice(1).join('/').trim();
    }
    if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
      cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
    }

    const shiftTime = duty.shift || 'दिनांक 16.11.2026 से 19.11.2026 (प्रथम पाली: 22:00 से 09:30 बजे तक)';

    return (
      <div
        key={idx}
        style={{
          border: '1.5px solid #000000',
          borderRadius: '4px',
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
          overflow: 'hidden'
        }}
      >
        {/* 1. Top Header Bar: Solid black background with crisp white text */}
        <div style={{ backgroundColor: '#000000', color: '#ffffff', padding: isPreview ? '2.5px 5px' : '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1.5px solid #000000', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: isPreview ? '6px' : '6.5px', fontWeight: '800', color: '#e2e8f0', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या
            </div>
            <div style={{ fontSize: isPreview ? '8.5px' : '9.5px', fontWeight: '900', color: '#ffffff', marginTop: '0.5px' }}>
              ड्यूटी नियंत्रण एवं महत्वपूर्ण निर्देश
            </div>
          </div>
        </div>

        {/* 2. Main Body Container: Sequential Fields */}
        <div style={{ padding: isPreview ? '3px 5px' : '4px 6px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '2.5px', boxSizing: 'border-box' }}>
          {/* Sequential Field 1: Zone (जोन) */}
          <div style={{ border: '1px solid #000000', borderRadius: '2px', padding: isPreview ? '1.5px 3.5px' : '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isPreview ? '6.5px' : '7.2px', lineHeight: 1.2 }}>
            <span style={{ fontWeight: '900', color: '#000000', whiteSpace: 'nowrap' }}>1. जोन:</span>
            <span style={{ color: '#000000', fontWeight: '700', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
              {cleanZone || '-'}
            </span>
          </div>

          {/* Sequential Field 2: Zonal Command (जोनल कमान) */}
          <div style={{ border: '1px solid #000000', borderRadius: '2px', padding: isPreview ? '1.5px 3.5px' : '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isPreview ? '6.5px' : '7.2px', lineHeight: 1.2 }}>
            <span style={{ fontWeight: '900', color: '#000000', whiteSpace: 'nowrap' }}>2. जोनल कमान:</span>
            <span style={{ color: '#000000', fontWeight: '900', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
              {cleanZonalIncharge || '-'}
            </span>
          </div>

          {/* Sequential Field 3: Sector (सेक्टर) */}
          <div style={{ border: '1px solid #000000', borderRadius: '2px', padding: isPreview ? '1.5px 3.5px' : '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isPreview ? '6.5px' : '7.2px', lineHeight: 1.2 }}>
            <span style={{ fontWeight: '900', color: '#000000', whiteSpace: 'nowrap' }}>3. सेक्टर:</span>
            <span style={{ color: '#000000', fontWeight: '700', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
              {cleanSector || '-'}
            </span>
          </div>

          {/* Sequential Field 4: Sector Incharge with mobile (सेक्टर प्रभारी) */}
          <div style={{ border: '1px solid #000000', borderRadius: '2px', padding: isPreview ? '1.5px 3.5px' : '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isPreview ? '6.5px' : '7.2px', lineHeight: 1.2 }}>
            <span style={{ fontWeight: '900', color: '#000000', whiteSpace: 'nowrap' }}>4. सेक्टर प्रभारी:</span>
            <span style={{ color: '#000000', fontWeight: '900', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
              {cleanSectorIncharge || '-'}
            </span>
          </div>

          {/* Sequential Field 5: Duty Time (ड्यूटी समय) */}
          <div style={{ border: '1.2px solid #000000', backgroundColor: '#f1f5f9', borderRadius: '2px', padding: isPreview ? '1.5px 3.5px' : '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: isPreview ? '6.5px' : '7.2px', lineHeight: 1.2 }}>
            <span style={{ fontWeight: '900', color: '#000000', whiteSpace: 'nowrap' }}>5. ड्यूटी समय:</span>
            <span style={{ color: '#000000', fontWeight: '800', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
              {shiftTime}
            </span>
          </div>

          {/* Sequential Field 6: Special Note (विशेष नोट) */}
          <div style={{ border: '1.2px solid #000000', borderRadius: '3px', padding: isPreview ? '2px 4px' : '2.5px 5px', fontSize: isPreview ? '6.2px' : '6.8px', lineHeight: 1.2, backgroundColor: '#ffffff' }}>
            <div style={{ fontWeight: '900', color: '#000000', borderBottom: '0.8px solid #000000', paddingBottom: '1px', marginBottom: '1.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>6. विशेष नोट:</span>
              <span style={{ fontSize: '5.2px', fontWeight: '900', backgroundColor: '#000000', color: '#ffffff', padding: '0.2px 3px', borderRadius: '2px' }}>अनिवार्य अनुपालन</span>
            </div>
            <div style={{ fontWeight: '600', color: '#000000' }}>
              {activeNoteText || 'कृपया आवंटित ड्यूटी पॉइंट पर समय से रिपोर्ट करें एवं सतर्कतापूर्वक कर्तव्यों का निर्वहन करें।'}
            </div>
          </div>
        </div>

        {/* Bottom Black Footer Banner: DESIGN AND DEVELOPED BY SMART CELL AYODHYA */}
        <div style={{ backgroundColor: '#000000', color: '#ffffff', textAlign: 'center', fontSize: isPreview ? '5.2px' : '5.8px', fontWeight: '900', letterSpacing: '0.6px', padding: '1.5px 4px', borderTop: '1px solid #000000', textTransform: 'uppercase' }}>
          DESIGN AND DEVELOPED BY SMART CELL AYODHYA
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Modal Dialog */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 font-devanagari no-print">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="bg-black text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white leading-tight">
                  लीगल प्रिंट मॉड्यूल (B&W 4-इन-1 ID कार्ड)
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  Legal (8.5 × 14 inches) • 10mm मार्जिन • 2x4 ग्रिड (4 फ्रंट + 4 बैक)
                </p>
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

          {/* Body */}
          <div className="p-5 space-y-4 text-slate-900 text-xs max-h-[75vh] overflow-y-auto">
            
            {/* Specification Badge */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-black flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-black" />
                  <span>क्लीन ब्लैक एंड व्हाइट लेजर प्रिंट प्रारूप</span>
                </span>
                <span className="text-[9.5px] font-bold bg-black text-white px-2 py-0.5 rounded">
                  Legal (8.5 x 14 in)
                </span>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                • <strong>1 लीगल पेज = 4 जवानों के पूरे कार्ड (8 ब्लॉक):</strong> बायीं ओर फ्रंट, दायीं ओर बैक।<br />
                • <strong>हाई-स्पीड मोनोक्रोम ऑप्टिमाइज़्ड:</strong> सॉलिड ब्लैक हेडर, शार्प 1.5px बॉर्डर्स, कोई ग्रे स्मज नहीं।<br />
                • <strong>स्मार्ट सेल फूटर:</strong> दोनों साइड नीचे <em>"DESIGN AND DEVELOPED BY SMART CELL AYODHYA"</em>।
              </p>
            </div>

            {/* Live Sample Preview (Front + Center Fold Line + Back) */}
            {targetRecords[0] && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-black">
                  <span>लाइव कार्ड नमूना (Front व Back पास-पास):</span>
                  <span className="text-[10px] text-slate-500 font-bold">1 कार्ड = 1 जवान</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 p-2 rounded-xl border border-slate-300">
                  <div className="bg-white rounded border border-black p-1 flex flex-col">
                    <div className="text-[9px] font-black text-white bg-black px-2 py-0.5 rounded text-center mb-1">
                      1. मुख पृष्ठ (FRONT SIDE)
                    </div>
                    {renderBwFrontReact(targetRecords[0], 0, true)}
                  </div>
                  <div className="bg-white rounded border border-black p-1 flex flex-col">
                    <div className="text-[9px] font-black text-black bg-slate-200 border border-black px-2 py-0.5 rounded text-center mb-1">
                      2. पृष्ठ भाग (BACK SIDE - No Header)
                    </div>
                    {renderBwBackReact(targetRecords[0], 1, true)}
                  </div>
                </div>

                <div className="text-[9.5px] text-center text-slate-700 font-bold">
                  ✂️ 3 सीधे कट लगाएं और 📄 बीच से मोड़कर गले के पॉलीबैग / पाउच में रखें
                </div>
              </div>
            )}

            {/* Duty Point Filter */}
            {uniqueDutyPoints.length > 1 && !isGenerating && (
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 text-xs">
                  ड्यूटी पॉइंट फ़िल्टर:
                </label>
                <select
                  value={selectedPointFilter}
                  onChange={(e) => setSelectedPointFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
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

            {/* Records Summary */}
            <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-bold">कुल कार्ड:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-black text-white font-black">
                  {targetRecords.length} जवान
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 font-bold">कुल लीगल शीट:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-slate-200 text-black font-black">
                  {totalPossiblePages} पेज (4 कार्ड / शीट)
                </span>
              </div>
            </div>

            {/* Page Range Selector for PDF */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs">पेज चयन (PDF):</span>
                <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    onClick={() => setRangeMode('all')}
                    className={`px-2 py-0.5 rounded-md transition ${rangeMode === 'all' ? 'bg-white shadow text-black font-black' : 'text-slate-600'}`}
                  >
                    सभी पेज
                  </button>
                  <button
                    onClick={() => setRangeMode('custom')}
                    className={`px-2 py-0.5 rounded-md transition ${rangeMode === 'custom' ? 'bg-white shadow text-black font-black' : 'text-slate-600'}`}
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
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* PRIMARY ACTION 1: PRINT LEGAL PAGE */}
              <button
                onClick={handlePrintLegalPage}
                disabled={isGenerating || targetRecords.length === 0}
                className="w-full py-3 bg-black hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>प्रिंट लीगल पेज (Print Legal Page - window.print)</span>
              </button>

              {/* PRIMARY ACTION 2: DOWNLOAD PDF */}
              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating || targetRecords.length === 0}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>PDF तैयार हो रही है ({progress.page}/{progress.totalPages} पेज)...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF डाउनलोड (Download PDF File - {selectedSlicePages} पेज)</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-mono font-bold">@page &#123; size: legal; margin: 10mm; &#125;</span>
            {!isGenerating && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-200 text-black font-bold cursor-pointer transition"
              >
                बंद करें
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* CANVAS RENDERING CONTAINER (Fixed in DOM, opacity 0 for jsPDF)             */}
      {/* 2 Columns x 4 Rows = 8 Cells (4 Officers per sheet) on Legal Paper        */}
      {/* ========================================================================= */}
      <div
        ref={canvasContainerRef}
        style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          zIndex: -999,
          opacity: 0,
          pointerEvents: 'none',
          width: '740px',
          minHeight: '1268px',
          height: '1268px',
          backgroundColor: '#ffffff',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: '8px 10px',
          padding: '8px',
          boxSizing: 'border-box',
          fontFamily: "'Mukta', 'Poppins', sans-serif"
        }}
      >
        {activeBatch.map((duty, idx) => {
          return (idx % 2 === 0)
            ? renderBwFrontReact(duty, idx, false)
            : renderBwBackReact(duty, idx, false);
        })}
      </div>
    </>
  );
}
