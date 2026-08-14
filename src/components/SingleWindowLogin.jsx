import React, { useState } from 'react';
import { Lock, UserCheck, KeyRound, Eye, EyeOff, X, AlertTriangle, User } from 'lucide-react';

export const SENIOR_USER = 'senior';
export const SENIOR_PASS = 'senior123';
export const ADMIN_USER = 'admin';
export const ADMIN_PASS = 'admin123';

export default function SingleWindowLogin({ isOpen, onClose, onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState('senior'); // 'senior' | 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim().toLowerCase();

    if (selectedRole === 'senior') {
      if ((cleanUser === SENIOR_USER || cleanUser === 'officer') && password === SENIOR_PASS) {
        onLoginSuccess('senior');
      } else {
        setErrorMsg('⚠️ वरिष्ठ अधिकारी क्रेडेंशियल गलत है!');
      }
    } else if (selectedRole === 'admin') {
      if ((cleanUser === ADMIN_USER || cleanUser === 'policeadmin') && password === ADMIN_PASS) {
        onLoginSuccess('admin');
      } else {
        setErrorMsg('⚠️ मुख्य एडमिन क्रेडेंशियल गलत है!');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-devanagari animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 relative text-slate-900">
        {/* Clear Large Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          title="बंद करें"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="flex items-center justify-center mb-1">
            <img src="/badge.png" alt="Police Badge" className="w-14 h-14 object-contain drop-shadow-sm" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            पोर्टल लॉगिन
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            उत्तर प्रदेश पुलिस सुरक्षा ड्यूटी प्रबंधन प्रणाली
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('senior');
              setErrorMsg('');
              setUsername('');
              setPassword('');
            }}
            className={`py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'senior'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            वरिष्ठ अधिकारी
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('admin');
              setErrorMsg('');
              setUsername('');
              setPassword('');
            }}
            className={`py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            मुख्य एडमिन
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                यूजरनेम (Username)
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={selectedRole === 'senior' ? 'senior' : 'admin'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                पासवर्ड (Password)
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-sm transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              लॉगिन करें
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
