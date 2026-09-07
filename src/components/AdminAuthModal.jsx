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
      setErrorMsg('पासवर्ड अमान्य है! कृपया सही पासवर्ड दर्ज करें।');
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    const currentPass = getAdminPassword();

    if (passwordInput !== currentPass) {
      setErrorMsg('वर्तमान पासवर्ड गलत है!');
      return;
    }
    if (!newPass || newPass.length < 4) {
      setErrorMsg('नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए!');
      return;
    }
    if (newPass !== confirmPass) {
      setErrorMsg('नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!');
      return;
    }

    setAdminPassword(newPass);
    setSuccessMsg('पासवर्ड सफलतापूर्वक बदल दिया गया है!');
    setErrorMsg('');
    setTimeout(() => {
      setIsChangingPass(false);
      onSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 font-devanagari animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 relative text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          title="बंद करें"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-950">
            वरिष्ठ अधिकारी व एडमिन एक्सेस
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isChangingPass
              ? 'पासवर्ड बदलने के लिए वर्तमान एवं नया पासवर्ड दर्ज करें'
              : 'प्रशासनिक संपादन एवं डेटा अपलोड के लिए पासवर्ड दर्ज करें'}
          </p>
        </div>

        {/* Form Body */}
        {!isChangingPass ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                एडमिन पासवर्ड
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="पासवर्ड दर्ज करें..."
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-xs transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>सत्यापित कर आगे बढ़ें</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsChangingPass(true);
                  setErrorMsg('');
                }}
                className="w-full py-1.5 text-slate-500 hover:text-amber-700 text-xs font-bold transition cursor-pointer"
              >
                पासवर्ड बदलना चाहते हैं?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 text-xs font-bold">
            <div>
              <label className="block text-slate-700 mb-1">वर्तमान पासवर्ड:</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="वर्तमान पासवर्ड दर्ज करें..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1">नया पासवर्ड:</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="नया पासवर्ड दर्ज करें..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 mb-1">नए पासवर्ड की पुनः पुष्टि करें:</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="पुष्टि हेतु पुनः दर्ज करें..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsChangingPass(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer"
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
