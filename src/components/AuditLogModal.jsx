import React from 'react';
import { History, Shield, AlertTriangle, FileSpreadsheet, X, Trash2, Clock, UserCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchAamadFromSupabase, saveAamadToSupabase, AAMAD_AUDIT_LOG_KEY } from '../utils/aamadSync';

export default function AuditLogModal({ isOpen, onClose }) {
  const { language } = useLanguage();

  const [auditLogs, setAuditLogs] = React.useState(() => {
    try {
      const saved = localStorage.getItem(AAMAD_AUDIT_LOG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Re-read from Supabase & local storage when opened
  React.useEffect(() => {
    if (isOpen) {
      async function loadLogs() {
        const cloudData = await fetchAamadFromSupabase();
        if (cloudData && Array.isArray(cloudData.auditLogs)) {
          setAuditLogs(cloudData.auditLogs);
        } else {
          try {
            const saved = localStorage.getItem(AAMAD_AUDIT_LOG_KEY);
            if (saved) setAuditLogs(JSON.parse(saved));
          } catch (e) {}
        }
      }
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearLogs = async () => {
    if (window.confirm(language === 'en' ? 'Are you sure you want to clear all audit logs?' : 'क्या आप समस्त ऑडिट लॉग मिटाना चाहते हैं?')) {
      setAuditLogs([]);
      try {
        localStorage.removeItem(AAMAD_AUDIT_LOG_KEY);
      } catch (e) {}
      const cloudData = await fetchAamadFromSupabase();
      if (cloudData) {
        await saveAamadToSupabase(cloudData.records || [], []);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5 font-black text-base text-slate-950">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-700 flex items-center justify-center shrink-0">
              <History className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="leading-tight">
                {language === 'en' ? 'System Audit & Activity Trail' : 'सिस्टम ऑडिट एवं एक्टिविटी लॉग (Audit Trail)'}
              </div>
              <div className="text-[10px] font-bold text-slate-500">
                {language === 'en' ? 'Transparency, deletion remarks & security events' : 'पारदर्शिता, विलोपन रिमार्क एवं सुरक्षा रिकॉर्ड्स'}
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logs List Container */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log.id || Math.random()} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 hover:border-slate-300 transition">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-black text-slate-950 text-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span>{log.deletedRecord?.name || 'अज्ञात पुलिसकर्मी'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                      {log.deletedRecord?.rank || 'का0'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{log.deletedAt}</span>
                  </span>
                </div>

                <div className="text-slate-600 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>PNO: <strong className="font-mono text-slate-900">{log.deletedRecord?.pno || '-'}</strong></span>
                  <span>मूल तैनाती: <strong className="text-slate-900">{log.deletedRecord?.posting || '-'}</strong></span>
                  <span>जनपद: <strong className="text-slate-900">{log.deletedRecord?.district || '-'}</strong></span>
                </div>

                <div className="bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/90 text-amber-950 font-bold text-[11px] space-y-0.5">
                  <div className="text-[10px] text-amber-800 uppercase tracking-wider font-extrabold">
                    📝 {language === 'en' ? 'Deletion Reason / Remark:' : 'हटाने का कारण / आधिकारिक रिमार्क:'}
                  </div>
                  <div className="text-slate-900 font-semibold">{log.remark || 'कोई रिमार्क दर्ज नहीं'}</div>
                </div>

                <div className="text-[10px] text-slate-500 text-right flex items-center justify-end gap-1">
                  <span>{language === 'en' ? 'Action by:' : 'कार्रवाई द्वारा:'}</span>
                  <strong className="text-slate-800">{log.deletedBy || 'Super Admin'}</strong>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center space-y-2 text-slate-400 font-bold">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Shield className="w-6 h-6" />
              </div>
              <div className="text-sm text-slate-700 font-black">
                {language === 'en' ? 'No Audit Logs Recorded' : 'कोई ऑडिट लॉग प्रविष्टि उपलब्ध नहीं है'}
              </div>
              <div className="text-xs text-slate-500 max-w-sm mx-auto">
                {language === 'en'
                  ? 'All security and deletion events are automatically tracked and logged here in real-time.'
                  : 'सिस्टम में की गई कोई भी आमद विलोपन या सुरक्षा गतिविधि यहाँ स्वतः रियल-टाइम में सुरक्षित दर्ज होती है।'}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          {auditLogs.length > 0 ? (
            <button
              onClick={handleClearLogs}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black rounded-xl border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Clear Logs' : 'लॉग साफ़ करें'}</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            {language === 'en' ? 'Close' : 'बंद करें (Close)'}
          </button>
        </div>
      </div>
    </div>
  );
}
