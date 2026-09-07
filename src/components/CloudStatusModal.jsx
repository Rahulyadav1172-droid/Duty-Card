import React, { useState } from 'react';
import { Cloud, CloudOff, AlertTriangle, CheckCircle, RefreshCw, KeyRound, ExternalLink, X, Save, RotateCcw } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig, resetSupabaseConfig } from '../utils/supabaseClient';
import { checkSupabaseHealth } from '../utils/supabaseSync';

export default function CloudStatusModal({
  isOpen,
  onClose,
  cloudStatus,
  cloudErrorDetail,
  onRecheck,
  userRole
}) {
  const [config, setConfig] = useState(getSupabaseConfig);
  const [inputUrl, setInputUrl] = useState(config.url || '');
  const [inputKey, setInputKey] = useState(config.key || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      alert('कृपया Supabase URL और Anon Key दोनों दर्ज करें।');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // Save to localStorage
    saveSupabaseConfig(inputUrl.trim(), inputKey.trim());

    // Test health
    const res = await checkSupabaseHealth();
    setIsTesting(false);
    setTestResult(res);

    if (res.ok) {
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    }
  };

  const handleReset = () => {
    if (window.confirm('क्या आप डिफ़ॉल्ट Supabase क्रेडेंशियल रीसेट करना चाहते हैं?')) {
      resetSupabaseConfig();
      const cfg = getSupabaseConfig();
      setInputUrl(cfg.url);
      setInputKey(cfg.key);
      window.location.reload();
    }
  };

  const isConnected = cloudStatus === 'connected';
  const isQuota = cloudErrorDetail?.isQuotaExceeded;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-900">
        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${
          isConnected
            ? 'bg-emerald-50 border-emerald-100'
            : isQuota
            ? 'bg-rose-50 border-rose-100'
            : 'bg-amber-50 border-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isConnected
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}>
              {isConnected ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isConnected ? 'क्लाउड लाइव सिंक सक्रिय' : 'क्लाउड सिंक स्थिति व डायग्नोस्टिक्स'}
              </h3>
              <p className="text-xs text-slate-600">
                {isConnected ? 'सभी डिवाइस पर डेटा लाइव अपडेट हो रहा है' : 'डेटा वर्तमान में केवल इस ब्राउज़र में सुरक्षित है'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Status Alert Banner */}
          {isConnected ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">सफलतापूर्वक कनेक्टेड!</span>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  आपके सभी इवेंट, ड्यूटी आवंटन, आमद और उपस्थिति रिकॉर्ड Supabase Cloud के साथ लाइव सिंक हो रहे हैं।
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-950">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-900">
                    {isQuota ? 'Supabase Egress Quota Exceeded (HTTP 402)' : 'क्लाउड डेटाबेस से संपर्क नहीं हो पा रहा है'}
                  </span>
                  <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                    {isQuota
                      ? 'वर्तमान Supabase प्रोजेक्ट का मासिक डाउनलोड कोटा (Bandwidth/Egress Quota) समाप्त हो चुका है। इसलिए डेटा केवल इस कंप्यूटर पर सेव हो रहा है, अन्य फोन/कंप्यूटर पर लाइव नहीं जा पा रहा।'
                      : cloudErrorDetail?.message || 'डेटाबेस कनेक्शन उपलब्ध नहीं है।'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200/70 text-[11px] text-rose-900">
                <strong>समाधान:</strong> supabase.com पर एक नया Free Project बनाएं, SQL Editor में <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-[10px]">schema.sql</code> चलाएं, और नीचे नया URL व Anon Key डालकर <strong>Save & Test</strong> दबाएं।
              </div>
            </div>
          )}

          {/* Re-check action */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-600 font-medium">लाइव कनेक्शन पुनः जांचें:</span>
            <button
              type="button"
              onClick={onRecheck}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>री-टेस्ट करें</span>
            </button>
          </div>

          {/* Admin Config Section */}
          {userRole === 'admin' && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Supabase क्लाउड क्रेडेंशियल (एडमिन)
                </span>
                {config.isCustom && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[10px] text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    डिफ़ॉल्ट पर रीसेट
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveAndTest} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="text"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                    required
                  />
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-lg border text-[11px] ${
                    testResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {testResult.ok
                      ? '✓ नया कनेक्शन सफल! पृष्ठ पुनः लोड हो रहा है...'
                      : `✕ कनेक्शन विफल: ${testResult.message}`}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-bold"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isTesting ? 'जांच जारी...' : 'सेव एवं लागू करें'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>अयोध्या पुलिस ड्यूटी क्लाउड आर्किटेक्चर</span>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-amber-600 hover:underline flex items-center gap-1 font-bold"
          >
            <span>Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
