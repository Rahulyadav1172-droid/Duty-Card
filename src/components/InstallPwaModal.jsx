import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Check, Shield } from 'lucide-react';

export default function InstallPwaModal() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('police_pwa_install_dismissed') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    // Check if running inside installed standalone app
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standaloneMode);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Android / Desktop Chrome PWA Install Prompt Listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Do not display banner if already installed in standalone mode
  if (isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowModal(false);
      }
    } else if (isIOS) {
      setShowModal(true);
    } else {
      setShowModal(true);
    }
  };

  const handleDismissBanner = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('police_pwa_install_dismissed', 'true');
    } catch (e) {}
  };

  return (
    <>
      {/* 1. Slim Top/Bottom Mobile Install Floating Pill (Non-intrusive) */}
      {!isDismissed && (
        <div className="fixed top-14 left-3 right-3 sm:left-auto sm:right-6 sm:top-16 z-30 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-3.5 py-2 rounded-2xl shadow-xl border border-indigo-500/30 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                फ़ोन में ऐप इंस्टॉल करें
              </p>
              <p className="text-[10px] text-slate-300 truncate">
                1-क्लिक से होम स्क्रीन पर जोड़ें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>इंस्टॉल</span>
            </button>
            <button
              onClick={handleDismissBanner}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="बंद करें"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. iOS / Generic Install Guide Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-slate-900 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-indigo-50 to-amber-50 border border-slate-200 rounded-2xl mx-auto flex items-center justify-center shadow-inner mb-3">
                <img
                  src="/badge.png"
                  alt="Police Emblem"
                  className="w-10 h-10 object-contain drop-shadow"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <h3 className="text-base font-black text-slate-900">
                अयोध्या पुलिस ड्यूटी पास
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                फोन में इंस्टॉल करने का सरल तरीका
              </p>
            </div>

            {isIOS ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">सफारी के शेयर बटन को दबाएं</p>
                    <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                      नीचे बार में <Share className="w-3.5 h-3.5 text-blue-600 inline" /> आइकन पर टैप करें।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">'होम स्क्रीन में जोड़ें' चुनें</p>
                    <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                      मेन्यू में <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> <strong>Add to Home Screen</strong> पर क्लिक करें।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-emerald-700">ऐप स्क्रीन पर आ जाएगा</p>
                    <p className="text-slate-500 mt-0.5">
                      अब सीधे होम स्क्रीन से 1-टैप में ऐप खोल सकेंगे।
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                <p>
                  ब्राउज़र मेन्यू (3 डॉट्स <span className="font-mono font-bold">⋮</span>) पर क्लिक करें और <strong>"Add to Home screen"</strong> या <strong>"Install App"</strong> चुनें।
                </p>
                {deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>अभी इंस्टॉल करें</span>
                  </button>
                )}
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              समझ गया
            </button>
          </div>
        </div>
      )}
    </>
  );
}
