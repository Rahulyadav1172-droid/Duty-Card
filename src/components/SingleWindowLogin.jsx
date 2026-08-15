import React, { useState, useEffect } from 'react';
import { Lock, UserCheck, KeyRound, Eye, EyeOff, X, AlertTriangle, User, ShieldAlert, CheckCircle2, RotateCcw, HelpCircle } from 'lucide-react';
import { verifyCredentials, resetPasswordWithRecoveryPin, getAuthConfig } from '../utils/authManager';

export const SENIOR_USER = 'senior';
export const SENIOR_PASS = 'senior123';
export const ADMIN_USER = 'admin';
export const ADMIN_PASS = 'admin123';

export default function SingleWindowLogin({ isOpen, onClose, onLoginSuccess }) {
  const [viewMode, setViewMode] = useState('login'); // 'login' | 'reset'
  const [selectedRole, setSelectedRole] = useState('senior'); // 'senior' | 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Reset Specific State
  const [recoveryPin, setRecoveryPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Security: Failed Attempts Lockout Protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (lockoutTimer > 0) {
      setErrorMsg(`⚠️ सुरक्षा कारणों से लॉगिन ${lockoutTimer} सेकंड हेतु अवरुद्ध है।`);
      return;
    }

    const isValid = verifyCredentials(selectedRole, username, password);

    if (isValid) {
      setFailedAttempts(0);
      onLoginSuccess(selectedRole);
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutTimer(30);
        setErrorMsg('🛑 5 बार गलत प्रयास! सुरक्षा कारणों से 30 सेकंड का लॉक लगाया गया है।');
      } else {
        setErrorMsg(`⚠️ क्रेडेंशियल गलत है! (शेष प्रयास: ${5 - nextAttempts})`);
      }
    }
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('⚠️ नया पासवर्ड कम से कम 6 अक्षरों का होना आवश्यक है!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('⚠️ नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते!');
      return;
    }

    const res = resetPasswordWithRecoveryPin(selectedRole, recoveryPin, newPassword);

    if (res.success) {
      setSuccessMsg(res.message);
      setRecoveryPin('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setViewMode('login');
        setPassword('');
        setErrorMsg('');
      }, 1800);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-devanagari animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 relative text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          title="बंद करें"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-1 pt-1">
          <div className="flex items-center justify-center mb-1">
            <img src="/badge.png" alt="Police Badge" className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {viewMode === 'login' ? 'पोर्टल सुरक्षित लॉगिन' : 'पासवर्ड रीसेट प्रबंधन'}
          </h2>
          <p className="text-xs font-semibold text-slate-500">
            {viewMode === 'login'
              ? 'उत्तर प्रदेश पुलिस सुरक्षा ड्यूटी प्रबंधन प्रणाली'
              : 'मास्टर रिकवरी पिन द्वारा पासवर्ड रीसेट करें'}
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('senior');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'admin'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            मुख्य एडमिन
          </button>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: STANDARD LOGIN FORM                                               */}
        {/* ========================================================================= */}
        {viewMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    पासवर्ड (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('reset');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                  >
                    🔑 पासवर्ड भूल गए / रीसेट?
                  </button>
                </div>

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
                disabled={lockoutTimer > 0}
                className={`w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-sm transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer ${
                  lockoutTimer > 0 ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>{lockoutTimer > 0 ? `अवरुद्ध (${lockoutTimer}s)` : 'सुरक्षित लॉगिन करें'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: FORGOT / RESET PASSWORD WORKFLOW (WITH MASTER RECOVERY PIN)       */
          /* ========================================================================= */
          <form onSubmit={handleResetSubmit} className="space-y-3.5">
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-950 font-medium space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <ShieldAlert className="w-3.5 h-3.5" />
                सुरक्षा सत्यापन (Master Recovery PIN)
              </div>
              <p>
                {selectedRole === 'admin' ? 'मुख्य एडमिन' : 'वरिष्ठ अधिकारी'} का पासवर्ड रीसेट करने हेतु अधिकृत मास्टर रिकवरी पिन दर्ज करें (डिफ़ॉल्ट: <code className="font-mono font-bold bg-amber-200/60 px-1 rounded">UPPOLICE@2026</code>)।
              </p>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  मास्टर सुरक्षा रिकवरी पिन (Master Security PIN) *
                </label>
                <input
                  type="password"
                  value={recoveryPin}
                  onChange={(e) => setRecoveryPin(e.target.value)}
                  placeholder="UPPOLICE@2026"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  नया पासवर्ड दर्ज करें (New Password) *
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="न्यूनतम 6 अक्षर..."
                    className="w-full px-3.5 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  नए पासवर्ड की पुनः पुष्टि करें (Confirm Password) *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="पुनः नया पासवर्ड लिखें..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                वापस लॉगिन पर जाएं
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>पासवर्ड रीसेट करें</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
