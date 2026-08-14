import React, { useState } from 'react';
import { Lock, Eye, EyeOff, KeyRound, ShieldAlert, Check, X } from 'lucide-react';

export const ADMIN_PASS_KEY = 'police_portal_admin_password';
export const DEFAULT_ADMIN_PASS = 'police123';

export function getAdminPassword() {
  try {
    return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_ADMIN_PASS;
  } catch (e) {
    return DEFAULT_ADMIN_PASS;
  }
}

export function setAdminPassword(newPass) {
  try {
    localStorage.setItem(ADMIN_PASS_KEY, newPass);
  } catch (e) {}
}

export default function AdminAuthModal({ isOpen, onClose, onSuccess }) {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const currentPass = getAdminPassword();

    if (passwordInput === currentPass) {
      setErrorMsg('');
      onSuccess();
    } else {
      setErrorMsg('⚠️ पासवर्ड अमान्य है! सही पासवर्ड दर्ज करें। (Default: police123)');
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    const currentPass = getAdminPassword();

    if (passwordInput !== currentPass) {
      setErrorMsg('⚠️ वर्तमान पासवर्ड गलत है!');
      return;
    }
    if (!newPass || newPass.length < 4) {
      setErrorMsg('⚠️ नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए!');
      return;
    }
    if (newPass !== confirmPass) {
      setErrorMsg('⚠️ नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!');
      return;
    }

    setAdminPassword(newPass);
    setSuccessMsg('✅ पासवर्ड सफलतापूर्वक बदल दिया गया है!');
    setErrorMsg('');
    setTimeout(() => {
      setIsChangingPass(false);
      onSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-devanagari animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-100">
            वरिष्ठ अधिकारी / एडमिन एक्सेस 🔐
          </h2>
          <p className="text-xs text-slate-400">
            {isChangingPass
              ? 'पासवर्ड बदलने के लिए वर्तमान एवं नया पासवर्ड दर्ज करें'
              : 'एक्सेल डेटा या बुकलेट अपलोड करने के लिए एडमिन पासवर्ड दर्ज करें'}
          </p>
        </div>

        {/* Form Body */}
        {!isChangingPass ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                एडमिन पासवर्ड (Admin Password):
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="पासवर्ड दर्ज करें (e.g. police123)"
                  className="w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-amber-400 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                * डिफ़ॉल्ट पासवर्ड (Default Password): <span className="text-amber-400 font-bold">police123</span>
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 transition active:scale-98 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                लॉग इन करें (Verify & Unlock)
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsChangingPass(true);
                  setErrorMsg('');
                }}
                className="w-full py-2 text-slate-400 hover:text-amber-300 text-xs font-bold transition"
              >
                पासवर्ड बदलना चाहते हैं? (Change Password)
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">वर्तमान पासवर्ड:</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="वर्तमान पासवर्ड (police123)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">नया पासवर्ड:</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="नया पासवर्ड दर्ज करें"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">नया पासवर्ड पुनः दर्ज करें:</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="पुष्टि के लिए पुनः दर्ज करें"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsChangingPass(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                रद्द करें (Back)
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow"
              >
                पासवर्ड सहेजें
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
