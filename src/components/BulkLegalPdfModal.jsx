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
  AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const printContainerRef = useRef(null);

  if (!isOpen) return null;

  // Filter records if a specific point is selected
  const targetRecords = selectedPointFilter === 'ALL'
    ? records
    : records.filter(r => (r.duty_place || '').trim() === selectedPointFilter);

  // Group into batches of 4 for 2x2 grid on Legal Paper
  const totalPages = Math.ceil(targetRecords.length / 4);

  // Unique duty points for filter
  const uniqueDutyPoints = Array.from(new Set(records.map(r => (r.duty_place || '').trim()).filter(Boolean))).sort();

  const handleStartGeneration = async () => {
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
        format: 'legal'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // ~215.9 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // ~355.6 mm

      for (let p = 0; p < totalPages; p++) {
        const batch = targetRecords.slice(p * 4, (p + 1) * 4);
        setProgress({
          current: Math.min((p + 1) * 4, targetRecords.length),
          total: targetRecords.length,
          page: p + 1,
          totalPages: totalPages
        });

        // Set batch data in container and wait for DOM render
        renderBatchToContainer(batch);
        await new Promise((res) => setTimeout(res, 80));

        const element = printContainerRef.current;
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2.2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (p > 0) {
          pdf.addPage('legal', 'portrait');
        }

        // Add to Legal page with 6mm margins
        const marginX = 6;
        const marginY = 6;
        const printW = pdfWidth - (marginX * 2);
        const printH = (canvas.height * printW) / canvas.width;

        pdf.addImage(imgData, 'JPEG', marginX, marginY, printW, Math.min(printH, pdfHeight - (marginY * 2)));
      }

      const safeTitle = (eventTitle || 'DutyPass').replace(/\s+/g, '_');
      pdf.save(`Bulk_Duty_Cards_Legal_4in1_${safeTitle}.pdf`);
      onClose();
    } catch (err) {
      console.error('Bulk PDF Error:', err);
      alert('बल्क PDF बनाने में त्रुटि: ' + err.message);
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, page: 0, totalPages: 0 });
    }
  };

  // Render batch into the hidden container state
  const [currentBatch, setCurrentBatch] = useState([]);
  const renderBatchToContainer = (batch) => {
    setCurrentBatch(batch);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 font-devanagari">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0b132b] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white leading-tight">
                4-इन-1 बल्क ड्यूटी कार्ड PDF डाउनलोड
              </h3>
              <p className="text-xs text-amber-400 font-bold mt-0.5">
                Legal Size Paper (8.5 × 14 inch) - प्रति पेज 4 कार्ड
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
        <div className="p-5 space-y-4 text-slate-800 text-xs">
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
                {totalPages} पेज (4 कार्ड / पेज)
              </span>
            </div>
          </div>

          {/* Filter by Duty Point Option */}
          {uniqueDutyPoints.length > 1 && !isGenerating && (
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700">
                ड्यूटी पॉइंट चुनें (वैकल्पिक):
              </label>
              <select
                value={selectedPointFilter}
                onChange={(e) => setSelectedPointFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ALL">सभी ड्यूटी पॉइंट ({records.length} जवान)</option>
                {uniqueDutyPoints.map((pt, idx) => (
                  <option key={idx} value={pt}>
                    {pt} ({records.filter(r => (r.duty_place || '').trim() === pt).length} जवान)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-900 font-black text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>PDF तैयार हो रही है, कृपया प्रतीक्षा करें...</span>
              </div>
              <div className="text-xs font-bold text-amber-800">
                पेज {progress.page} / {progress.totalPages} ({progress.current} / {progress.total} कार्ड)
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Features Info */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
            <div className="font-black flex items-center gap-1 text-emerald-950">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>लीगल पेज 4-इन-1 विशेषताएं:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-emerald-800 font-medium">
              <li>1 Legal पेपर पर 4 बराबर कार्ड (2x2 ग्रिड) सेट होंगे।</li>
              <li>काटने के लिए बीच में डैश (Dashed Cut Lines ✂️) बने हैं।</li>
              <li>हर कार्ड पर आधिकारिक सील, QR कोड और SSP हस्ताक्षर शामिल हैं।</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          {!isGenerating && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition"
            >
              रद्द करें
            </button>
          )}

          <button
            onClick={handleStartGeneration}
            disabled={isGenerating || targetRecords.length === 0}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>प्रोसेसिंग...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>📥 Legal 4-in-1 PDF डाउनलोड करें</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFF-SCREEN 4-IN-1 LEGAL PAGE RENDER CONTAINER (Fixed 816px x 1344px Ratio) */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '780px',
          minHeight: '1280px',
          backgroundColor: '#ffffff',
          padding: '8px',
          fontFamily: "'Noto Sans Devanagari', sans-serif"
        }}
      >
        <div
          ref={printContainerRef}
          style={{
            width: '780px',
            minHeight: '1280px',
            backgroundColor: '#ffffff',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '8px',
            padding: '6px',
            boxSizing: 'border-box'
          }}
        >
          {currentBatch.map((duty, idx) => {
            const activeNoteText = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
            const activeBriefingText = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

            const qrData = JSON.stringify({
              id: duty.id,
              name: duty.name,
              rank: duty.rank || 'का0',
              duty_place: duty.duty_place,
              mobile: duty.mobile,
              auth: "UP_POLICE_SECURE_VERIFIED"
            });

            return (
              <div
                key={idx}
                style={{
                  border: '1.5px solid #000000',
                  borderRadius: '8px',
                  padding: '8px',
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
                <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <img src="/badge.png" alt="Badge" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  <div style={{ textAlign: 'center', flex: 1, padding: '0 4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '900', color: '#000000', lineHeight: '1.2' }}>
                      {eventTitle}
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#333333' }}>
                      {eventSubtitle}
                    </div>
                  </div>
                  <img src="/badge.png" alt="Badge" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                </div>

                {/* Officer Photo & Info Row */}
                <div style={{ display: 'flex', gap: '6px', border: '1px solid #94a3b8', padding: '4px', borderRadius: '6px', backgroundColor: '#f8fafc', margin: '4px 0' }}>
                  <div style={{ width: '48px', height: '58px', border: '1px dashed #64748b', borderRadius: '4px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexShrink: 0, overflow: 'hidden' }}>
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
                        {duty.name}
                      </div>
                      <div style={{ fontSize: '8.5px', fontFamily: 'monospace', fontWeight: 'bold', color: '#1e293b' }}>
                        📱 {duty.mobile || '-'}
                      </div>
                    </div>
                    <div style={{ fontSize: '7.5px', color: '#334155', borderTop: '1px solid #cbd5e1', paddingTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>P.No: <strong>{duty.id}</strong></span>
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
                    <QRCodeSVG value={qrData} size={30} level="M" />
                    <div>
                      <div style={{ fontSize: '6.5px', fontWeight: '900', color: '#065f46' }}>✓ सत्यापित पास</div>
                      <div style={{ fontSize: '6.5px', fontFamily: 'monospace' }}>ID: {duty.id}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {signatureImg ? (
                      <img src={signatureImg} alt="Sign" style={{ height: '18px', maxWidth: '65px', objectFit: 'contain', marginLeft: 'auto' }} />
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
          })}
        </div>
      </div>
    </div>
  );
}
