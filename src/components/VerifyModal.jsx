import React from 'react';
import { ShieldCheck, CheckCircle2, MapPin, Calendar, Clock, Phone, X, Shield, Award } from 'lucide-react';

export default function VerifyModal({
  duty,
  isOpen,
  onClose,
  eventTitle = '',
  eventSubtitle = ''
}) {
  if (!isOpen || !duty) return null;

  const verificationTime = new Date().toLocaleString('hi-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-devanagari animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 relative text-slate-900 overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          title="बंद करें"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Verified Header Badge */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div className="space-y-0.5">
            <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 font-mono">
              OFFICIAL VERIFIED PASS 🟢
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-950 pt-1 leading-tight">
              {eventTitle}
            </h2>
            <p className="text-xs font-bold text-slate-500">
              {eventSubtitle}
            </p>
          </div>
        </div>

        {/* Officer Verified Details */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="font-bold text-slate-600">अधिकारी / जवान:</span>
            <span className="font-black text-slate-950">{duty.name} ({duty.rank || 'जवान'})</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="font-bold text-slate-600">पास ID:</span>
            <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">{duty.id}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="font-bold text-slate-600">मोबाइल:</span>
            <span className="font-mono font-bold text-slate-900">📱 {duty.mobile}</span>
          </div>

          <div className="flex items-start justify-between border-b border-slate-200 pb-1.5">
            <span className="font-bold text-slate-600">ड्यूटी स्थान:</span>
            <span className="font-black text-slate-950 text-right max-w-[200px] text-amber-900">{duty.duty_place}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span className="font-bold text-slate-600">जोन / सेक्टर:</span>
            <span className="font-bold text-slate-800">{duty.zone || '-'} / {duty.sector || '-'}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="font-bold text-slate-600">सत्यापन समय:</span>
            <span className="font-mono text-emerald-800 font-bold text-xs">{verificationTime}</span>
          </div>
        </div>

        {/* Security Certificate Footer */}
        <div className="text-center bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-0.5">
          <div className="font-black flex items-center justify-center gap-1 text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>डिजिटल रूप से प्रमाणित ड्यूटी पास</span>
          </div>
          <div className="text-[10px] text-emerald-700">
            कार्यालय वरिष्ठ पुलिस अधीक्षक, उत्तर प्रदेश पुलिस
          </div>
        </div>

        <div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
