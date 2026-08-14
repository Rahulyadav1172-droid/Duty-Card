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
  Grid
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { printLegalBulk } from '../utils/printLegalBulk';

export default function BulkLegalPdfModal({
  isOpen,
  onClose,
  records = [],
  eventTitle = 'श्रावण झूला मेला',
  eventSubtitle = 'ड्यूटी कार्ड अयोध्या-2026',
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
  const [layoutMode, setLayoutMode] = useState(6); // 4 or 6 cards per page
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
  // METHOD 1: ULTRA-FAST ISOLATED LEGAL PRINT / SAVE AS PDF (1 SECOND)
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
      layoutMode
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

      // Legal Paper dimensions in mm: 215.9mm x 355.6mm (8.5 x 14 inches)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'legal',
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
          pdf.addPage('legal', 'portrait');
        }

        const marginX = 5;
        const marginY = 5;
        const printW = pdfWidth - (marginX * 2);
        const printH = (canvas.height * printW) / canvas.width;

        pdf.addImage(imgData, 'JPEG', marginX, marginY, printW, Math.min(printH, pdfHeight - (marginY * 2)));
      }

      const safeTitle = (eventTitle || 'DutyPass').replace(/\s+/g, '_');
      pdf.save(`Bulk_Duty_Cards_Legal_${layoutMode}in1_${safeTitle}_Pages_${actualStart}_to_${actualEnd}.pdf`);
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

    const qrData = JSON.stringify({
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
          border: '1.5px solid #000000',
          borderRadius: '8px',
          padding: '6px 8px',
          backgroundColor: '#ffffff',
          color: '#000000',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          fontSize: '9.5px',
          lineHeight: '1.25'
        }}
      >
        {/* Card Top Header */}
        <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/badge.png" alt="Badge" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'center', flex: 1, padding: '0 4px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: '900', color: '#000000', lineHeight: '1.2' }}>
              {eventTitle}
            </div>
            <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#333333' }}>
              {eventSubtitle}
            </div>
          </div>
          <img src="/badge.png" alt="Badge" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
        </div>

        {/* Officer Photo & Info Row */}
        <div style={{ display: 'flex', gap: '6px', border: '1px solid #94a3b8', padding: '4px', borderRadius: '6px', backgroundColor: '#f8fafc', margin: '3px 0' }}>
          <div style={{ width: '44px', height: '56px', border: '1px dashed #64748b', borderRadius: '4px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexShrink: 0, overflow: 'hidden' }}>
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
              <div style={{ fontSize: '7.5px', fontWeight: 'bold', color: '#64748b' }}>अधिकारी / कर्मचारी:</div>
              <div style={{ fontSize: '10px', fontWeight: '900', color: '#000000', lineHeight: '1.2' }}>
                {duty.name || '-'}
              </div>
              <div style={{ fontSize: '8.5px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' }}>
                📱 {duty.mobile || '-'}
              </div>
            </div>
            <div style={{ fontSize: '7.5px', color: '#334155', borderTop: '1px solid #cbd5e1', paddingTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
              <span>P.No: <strong>{duty.id || '-'}</strong></span>
              <span>तैनाती: <strong>{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}</span>
            </div>
          </div>
        </div>

        {/* Duty Details Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px', border: '1px solid #cbd5e1', margin: '2px 0' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={{ width: '35%', backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '2px 4px', borderRight: '1px solid #cbd5e1' }}>स्थान</td>
              <td style={{ padding: '2px 4px', fontWeight: '900', color: '#000000', backgroundColor: '#fffbeb' }}>{duty.duty_place || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '2px 4px', borderRight: '1px solid #cbd5e1' }}>दिनाँक व समय</td>
              <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{duty.shift || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '2px 4px', borderRight: '1px solid #cbd5e1' }}>जोन / प्रभारी</td>
              <td style={{ padding: '2px 4px' }}>{duty.zone || '-'} / {duty.zonal_incharge || duty.zonal || '-'}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '2px 4px', borderRight: '1px solid #cbd5e1' }}>सेक्टर / प्रभारी</td>
              <td style={{ padding: '2px 4px' }}>{duty.sector || '-'} / {duty.sector_incharge || '-'}</td>
            </tr>
            {activeBriefingText && (
              <tr style={{ borderBottom: '1px solid #cbd5e1', backgroundColor: '#fffbeb' }}>
                <td style={{ backgroundColor: '#fef3c7', fontWeight: '900', padding: '2px 4px', borderRight: '1px solid #cbd5e1' }}>ब्रीफिंग</td>
                <td style={{ padding: '2px 4px', fontWeight: 'bold' }}>{activeBriefingText}</td>
              </tr>
            )}
            {activeNoteText && (
              <tr style={{ backgroundColor: '#fffbeb' }}>
                <td style={{ backgroundColor: '#fef3c7', fontWeight: '900', padding: '2px 4px', borderRight: '1px solid #cbd5e1' }}>नोट</td>
                <td style={{ padding: '2px 4px', fontWeight: 'bold', fontSize: '7.5px' }}>{activeNoteText}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Footer Authority & QR Code */}
        <div style={{ borderTop: '1.5px solid #000000', paddingTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <QRCodeSVG value={qrData} size={28} level="M" />
            <div>
              <div style={{ fontSize: '6.5px', fontWeight: '900', color: '#065f46' }}>✓ सत्यापित पास</div>
              <div style={{ fontSize: '6.5px', fontFamily: 'monospace' }}>ID: {duty.id || '-'}</div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            {signatureImg ? (
              <img src={signatureImg} alt="Sign" style={{ height: '17px', maxWidth: '65px', objectFit: 'contain', marginLeft: 'auto' }} />
            ) : (
              <div style={{ fontSize: '7.5px', fontStyle: 'italic' }}>(हस्ताक्षरित)</div>
            )}
            <div style={{ fontSize: '7.5px', fontWeight: '900', lineHeight: '1.1' }}>
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
                  बल्क ड्यूटी पास प्रिंट / PDF (Legal Paper)
                </h3>
                <p className="text-xs text-amber-400 font-bold mt-0.5">
                  Legal Size (8.5 × 14 inch) - 4-इन-1 या 6-इन-1 लेआउट
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

          {/* Content Body */}
          <div className="p-5 space-y-4 text-slate-800 text-xs max-h-[75vh] overflow-y-auto">
            {/* 🌟 LAYOUT TOGGLE (4-IN-1 VS 6-IN-1) */}
            <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-300 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLayoutMode(6)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  layoutMode === 6
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-transparent text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>6 कार्ड / Legal पेज (2x3)</span>
                {layoutMode === 6 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode(4)}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  layoutMode === 4
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-transparent text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>4 कार्ड / Legal पेज (2x2)</span>
                {layoutMode === 4 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>

            {/* FAST OPTION 1: 1-CLICK INSTANT PRINT / SAVE AS PDF */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500/50 rounded-2xl space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600 fill-emerald-500" />
                  <strong className="text-emerald-950 text-sm">
                    ⚡ 1-सेकंड सुपरफास्ट प्रिंट ({layoutMode}-इन-1):
                  </strong>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                सीधे ब्राउज़र के नेटिव प्रिंट इंजन से <strong>सभी {targetRecords.length} कार्ड ({totalPossiblePages} लीगल पेज)</strong> मात्र 2 सेकंड में "Save as PDF" या सीधे प्रिंट करें।
              </p>
              <button
                onClick={handleInstantBrowserPrint}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl shadow flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ तुरंत प्रिंट / Save PDF ({layoutMode} कार्ड प्रति Legal पेज)</span>
              </button>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-slate-600 font-semibold border-b border-slate-200 pb-2">
                <span>इवेंट:</span>
                <strong className="text-slate-900">{eventTitle}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>कुल पास / जवान:</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black">
                  {targetRecords.length} कार्ड
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>कुल लीगल पेज (Legal Pages):</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black">
                  {totalPossiblePages} पेज ({layoutMode} कार्ड / पेज)
                </span>
              </div>
            </div>

            {/* Filter by Duty Point Option */}
            {uniqueDutyPoints.length > 1 && !isGenerating && (
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  ड्यूटी पॉइंट फ़िल्टर (वैकल्पिक):
                </label>
                <select
                  value={selectedPointFilter}
                  onChange={(e) => setSelectedPointFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
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

            {/* DIRECT FILE DOWNLOAD SECTION WITH BATCH RANGE */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">📥 डायरेक्ट PDF फाइल डाउनलोड ({layoutMode}-इन-1):</span>
                <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    onClick={() => setRangeMode('all')}
                    className={`px-2 py-1 rounded-md transition ${rangeMode === 'all' ? 'bg-white shadow text-slate-950 font-black' : 'text-slate-600'}`}
                  >
                    सभी
                  </button>
                  <button
                    onClick={() => setRangeMode('custom')}
                    className={`px-2 py-1 rounded-md transition ${rangeMode === 'custom' ? 'bg-white shadow text-slate-950 font-black' : 'text-slate-600'}`}
                  >
                    पेज रेंज
                  </button>
                </div>
              </div>

              {rangeMode === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-bold block">शुरुआती पेज:</label>
                    <input
                      type="number"
                      min={1}
                      max={totalPossiblePages}
                      value={startPage}
                      onChange={(e) => setStartPage(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
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
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Progress Indicator */}
              {isGenerating && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-center">
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
                className="w-full py-2.5 bg-[#0b132b] hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>डाउनलोड हो रहा है ({progress.current}/{progress.total})...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-amber-400" />
                    <span>📥 PDF फ़ाइल बनाएं ({selectedSlicePages} लीगल पेज / {selectedSlicePages * layoutMode} कार्ड)</span>
                  </>
                )}
              </button>
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
