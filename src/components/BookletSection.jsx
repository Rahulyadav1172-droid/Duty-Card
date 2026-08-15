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
  Layers,
  PlusCircle,
  Files
} from 'lucide-react';
import { saveBookletPDF, getAllBookletPDFs, deleteBookletPDFById } from '../utils/pdfStorage';
import OfficialBooklet from './OfficialBooklet';

export default function BookletSection({
  records,
  isAdminAuthenticated,
  onRequestAdminAuth,
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  eventTitle = '',
  eventSubtitle = '',
  eventStartDate = ''
}) {
  const [pdfList, setPdfList] = useState([]);
  const [selectedPdfId, setSelectedPdfId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [viewMode, setViewMode] = useState('pdf');
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadStoredPDFs() {
      try {
        const stored = await getAllBookletPDFs();
        if (stored && stored.length > 0) {
          setPdfList(stored);
          setSelectedPdfId(stored[0].id);
        } else {
          setPdfList([]);
          setSelectedPdfId(null);
        }
      } catch (err) {
        console.error('Error loading PDF booklets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStoredPDFs();
  }, []);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (validFiles.length === 0) {
      setStatusMsg({ type: 'error', text: 'कृपया केवल वैध PDF फ़ाइलें (.pdf) चुनें।' });
      return;
    }

    if (!isAdminAuthenticated) {
      onRequestAdminAuth(() => {
        processMultipleUpload(validFiles);
      });
      return;
    }

    processMultipleUpload(validFiles);
  };

  const processMultipleUpload = async (files) => {
    try {
      setUploading(true);
      setStatusMsg(null);

      let lastAddedId = null;
      for (const file of files) {
        const res = await saveBookletPDF(file);
        if (res && res.id) lastAddedId = res.id;
      }

      const updatedList = await getAllBookletPDFs();
      setPdfList(updatedList);
      if (lastAddedId) {
        setSelectedPdfId(lastAddedId);
      } else if (updatedList.length > 0) {
        setSelectedPdfId(updatedList[0].id);
      }

      setStatusMsg({
        type: 'success',
        text: `🎉 सफलता! ${files.length} आधिकारिक ड्यूटी बुकलेट PDF सुरक्षित की गईं!`
      });
    } catch (err) {
      console.error('Upload failed:', err);
      setStatusMsg({ type: 'error', text: `अपलोड विफल: ${err.message || 'त्रुटि उत्पन्न हुई।'}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePDFById = async (id, name) => {
    if (!window.confirm(`क्या आप PDF बुकलेट "${name}" को हटाना चाहते हैं?`)) return;

    if (!isAdminAuthenticated) {
      onRequestAdminAuth(() => executeDeleteById(id));
      return;
    }

    executeDeleteById(id);
  };

  const executeDeleteById = async (id) => {
    try {
      await deleteBookletPDFById(id);
      const updatedList = await getAllBookletPDFs();
      setPdfList(updatedList);
      if (updatedList.length > 0) {
        setSelectedPdfId(updatedList[0].id);
      } else {
        setSelectedPdfId(null);
      }
      setStatusMsg({ type: 'success', text: 'PDF बुकलेट हटा दी गई है।' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'हटाने में विफल।' });
    }
  };

  const activePdf = pdfList.find(p => p.id === selectedPdfId) || (pdfList.length > 0 ? pdfList[0] : null);

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
            अपलोड की गई PDF {pdfList.length > 0 && `(${pdfList.length})`}
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

      {/* VIEW MODE 1: OFFICIAL UPLOADED PDF BOOKLETS */}
      {viewMode === 'pdf' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>मुख्यालय द्वारा जारी मूल PDF बुकलेट</span>
                  {pdfList.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                      {pdfList.length} VERIFIED PDF 🟢
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  वरिष्ठ अधिकारियों व जोनल प्रभारियों हेतु मूल पीडीएफ फाइलों का ऑनलाइन पूर्वावलोकन
                </p>
              </div>

              {/* Upload Trigger: Only visible for Admin */}
              {isAdminAuthenticated && (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="booklet-pdf-upload"
                  />
                  <label
                    htmlFor="booklet-pdf-upload"
                    className="cursor-pointer px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{pdfList.length > 0 ? '+ और PDF जोड़ें' : 'PDF बुकलेट अपलोड करें'}</span>
                  </label>
                </div>
              )}
            </div>

            {/* Multiple PDF Selector Tabs / Badges */}
            {pdfList.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <Files className="w-3.5 h-3.5 text-amber-600" />
                  <span>उपलब्ध PDF बुकलेट चुनें ({pdfList.length} फाइलें):</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pdfList.map((pdf, idx) => {
                    const isSelected = activePdf?.id === pdf.id;
                    return (
                      <div
                        key={pdf.id || idx}
                        className={`group flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'
                        }`}
                        onClick={() => setSelectedPdfId(pdf.id)}
                      >
                        <FileText className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-rose-600'}`} />
                        <span className="truncate max-w-[200px] sm:max-w-xs">{pdf.name}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                          ({Math.round((pdf.size || 0) / 1024)} KB)
                        </span>

                        {isAdminAuthenticated && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePDFById(pdf.id, pdf.name);
                            }}
                            className={`p-1 rounded-md transition ${
                              isSelected
                                ? 'hover:bg-amber-600 text-slate-950'
                                : 'hover:bg-rose-100 text-rose-600'
                            }`}
                            title="यह PDF हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active PDF Viewer */}
            {activePdf ? (
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-black text-slate-950 truncate max-w-xs sm:max-w-md">{activePdf.name}</span>
                    <span className="text-slate-400 font-mono">({Math.round((activePdf.size || 0) / 1024)} KB)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(activePdf.url || activePdf.blobUrl, '_blank')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      title="नए टैब में पूरी स्क्रीन में देखें"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>पूर्ण स्क्रीन में देखें</span>
                    </button>

                    <a
                      href={activePdf.url || activePdf.blobUrl}
                      download={activePdf.name}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>डाउनलोड करें</span>
                    </a>
                  </div>
                </div>

                <div className="w-full h-[750px] bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-300 shadow-inner relative">
                  <object
                    key={activePdf.id || activePdf.url}
                    data={activePdf.url || activePdf.blobUrl}
                    type="application/pdf"
                    className="w-full h-full"
                  >
                    <iframe
                      src={activePdf.url || activePdf.blobUrl}
                      title="Police Duty Booklet PDF"
                      className="w-full h-full border-0"
                    >
                      <div className="p-8 text-center space-y-3">
                        <p className="text-sm font-bold text-slate-700">आपका ब्राउज़र सीधे PDF पूर्वावलोकन का समर्थन नहीं करता है।</p>
                        <a
                          href={activePdf.url || activePdf.blobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
                        >
                          <ExternalLink className="w-4 h-4" />
                          यहाँ क्लिक करके PDF खोलें
                        </a>
                      </div>
                    </iframe>
                  </object>
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
                    वरिष्ठ अधिकारियों के अवलोकनार्थ पूरी सुरक्षा बुकलेट PDF यहाँ ऊपर अपलोड करें।
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
          <OfficialBooklet
            records={records}
            eventTitle={eventTitle}
            eventSubtitle={eventSubtitle}
            eventStartDate={eventStartDate}
          />
        </div>
      )}
    </div>
  );
}
