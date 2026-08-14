import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Search,
  BookOpen,
  Phone,
  Shield,
  MapPin,
  Clock,
  UserCheck,
  Trash2,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Layers
} from 'lucide-react';
import { saveBookletPDF, getBookletPDF, deleteBookletPDF } from '../utils/pdfStorage';
import OfficialBooklet from './OfficialBooklet';

export default function BookletSection({
  records,
  isAdminAuthenticated,
  onRequestAdminAuth,
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  eventTitle = '',
  eventSubtitle = ''
}) {
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [viewMode, setViewMode] = useState('pdf');
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadStoredPDF() {
      try {
        const stored = await getBookletPDF();
        if (stored) {
          setPdfData(stored);
        }
      } catch (err) {
        console.error('Error loading PDF booklet:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStoredPDF();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setStatusMsg({ type: 'error', text: 'कृपया केवल वैध PDF फ़ाइल (.pdf) अपलोड करें।' });
      return;
    }

    if (!isAdminAuthenticated) {
      onRequestAdminAuth(() => {
        processUpload(file);
      });
      return;
    }

    processUpload(file);
  };

  const processUpload = async (file) => {
    try {
      setUploading(true);
      setStatusMsg(null);

      const metadata = {
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      await saveBookletPDF(file, metadata);
      const updated = await getBookletPDF();
      setPdfData(updated);

      setStatusMsg({
        type: 'success',
        text: `🎉 आधिकारिक ड्यूटी बुकलेट "${file.name}" सफलतापूर्वक अपलोड एवं सुरक्षित की गई!`
      });
    } catch (err) {
      console.error('Upload failed:', err);
      setStatusMsg({ type: 'error', text: `अपलोड विफल: ${err.message || 'त्रुटि उत्पन्न हुई।'}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePDF = async () => {
    if (!window.confirm('क्या आप अपलोड की गई आधिकारिक PDF बुकलेट को हटाना चाहते हैं?')) return;

    if (!isAdminAuthenticated) {
      onRequestAdminAuth(() => executeDelete());
      return;
    }

    executeDelete();
  };

  const executeDelete = async () => {
    try {
      await deleteBookletPDF();
      setPdfData(null);
      setStatusMsg({ type: 'success', text: 'अपलोड की गई बुकलेट PDF हटा दी गई है।' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'हटाने में विफल।' });
    }
  };

  const filteredRecords = records.filter(r =>
    (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.mobile || '').includes(searchQuery) ||
    (r.duty_place || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.zone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.sector || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* Event Selector for Senior Officers */}
      {events.length > 0 && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">ड्यूटी का प्रकार:</div>
              <div className="text-base font-black text-amber-400">{eventTitle || 'श्रावण झूला मेला'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-300 shrink-0">इवेंट चुनें:</label>
            <select
              value={activeEventId}
              onChange={(e) => onSelectActiveEvent?.(e.target.value)}
              className="bg-slate-800 text-white border border-slate-700 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto cursor-pointer"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.records?.length || 0} बल)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              आधिकारिक सुरक्षा ड्यूटी बुकलेट (Official Booklet Portal)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {eventTitle} — {eventSubtitle}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full md:w-auto">
          <button
            onClick={() => setViewMode('pdf')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'pdf' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            अपलोड की गई PDF
          </button>
          <button
            onClick={() => setViewMode('interactive')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === 'interactive' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            डायनेमिक बुकलेट ({records.length} बल)
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2 shadow-xs ${
          statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* VIEW MODE 1: OFFICIAL UPLOADED PDF BOOKLET */}
      {viewMode === 'pdf' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>मुख्यालय द्वारा जारी मूल PDF बुकलेट</span>
                  {pdfData && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                      VERIFIED PDF 🟢
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  वरिष्ठ अधिकारियों व जोनल प्रभारियों हेतु मूल पीडीएफ फाइल का ऑनलाइन पूर्वावलोकन
                </p>
              </div>

              {/* Upload Trigger */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="booklet-pdf-upload"
                />
                <label
                  htmlFor="booklet-pdf-upload"
                  className="cursor-pointer px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>{pdfData ? 'नई PDF बदलें' : 'PDF बुकलेट अपलोड करें'}</span>
                </label>

                {pdfData && (
                  <button
                    onClick={handleDeletePDF}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition cursor-pointer"
                    title="PDF हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* PDF Viewer / Empty State */}
            {pdfData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>{pdfData.name}</span>
                    <span className="text-slate-400 font-mono">({Math.round((pdfData.size || 0) / 1024)} KB)</span>
                  </div>

                  <a
                    href={pdfData.url}
                    download={pdfData.name}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>डाउनलोड करें</span>
                  </a>
                </div>

                <div className="w-full h-[650px] bg-slate-100 rounded-xl overflow-hidden border border-slate-300">
                  <iframe
                    src={pdfData.url}
                    title="Police Duty Booklet PDF"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ) : (
              <div className="p-10 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    कोई आधिकारिक PDF बुकलेट अपलोड नहीं है
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    वरिष्ठ अधिकारियों के अवलोकनार्थ पूरी 50-100 पेज की मूल सुरक्षा बुकलेट PDF यहाँ ऊपर अपलोड करें।
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: DYNAMIC DATABASE OFFICIAL BOOKLET */}
      {viewMode === 'interactive' && (
        <div className="space-y-6">
          <OfficialBooklet records={records} />
        </div>
      )}
    </div>
  );
}
