import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Archive,
  ArrowRight,
  Shield,
  Users,
  Check,
  X,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';

export default function EventManager({
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onToggleEventStatus
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    startDate: '16.08.2026 से अग्रिम आदेश तक',
    signatoryText: 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
    note: '',
    briefing: ''
  });

  const handleOpenModal = (eventObj = null) => {
    if (eventObj) {
      setEditingEvent(eventObj);
      setFormData({
        title: eventObj.title || '',
        subtitle: eventObj.subtitle || '',
        startDate: eventObj.startDate || eventObj.created_at || '16.08.2026 से अग्रिम आदेश तक',
        signatoryText: eventObj.signatoryText || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
        note: eventObj.note || '',
        briefing: eventObj.briefing || ''
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        subtitle: 'ड्यूटी कार्ड अयोध्या-2026',
        startDate: '16.08.2026 से अग्रिम आदेश तक',
        signatoryText: 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
        note: '',
        briefing: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('कृपया इवेंट / मेला का शीर्षक अवश्य भरें।');
      return;
    }

    if (editingEvent) {
      onUpdateEvent(editingEvent.id, {
        ...editingEvent,
        ...formData
      });
    } else {
      const newId = `event-${Date.now()}`;
      onCreateEvent({
        id: newId,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        startDate: formData.startDate.trim() || '16.08.2026 से अग्रिम आदेश तक',
        status: 'active',
        created_at: new Date().toLocaleDateString('hi-IN'),
        signatoryText: formData.signatoryText.trim(),
        note: formData.note.trim(),
        briefing: formData.briefing.trim(),
        records: [],
        attendanceMap: {}
      });
    }

    setIsModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              इवेंट्स एवं हेड्स मैनेजर (Multi-Event Manager)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              विभिन्न मेलों, वीआईपी दौरों व सुरक्षा व्यवस्थाओं के लिए अलग-अलग डेटाबेस बनाएं व प्रबंधित करें
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal(null)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ नया इवेंट / हेड बनाएं</span>
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(events || [])
          .filter((evt) => evt.id !== 'global-pdf-booklets' && !String(evt.id).startsWith('global-'))
          .map((evt) => {
            const isActive = evt.id === activeEventId;
            const isArchived = evt.status === 'archived';
            const headcount = evt.records?.length || 0;
            const reportedCount = Object.keys(evt.attendanceMap || {}).length;
            const attendancePercent = headcount > 0 ? Math.round((reportedCount / headcount) * 100) : 0;

          return (
            <div
              key={evt.id}
              className={`bg-white rounded-2xl p-5 border transition shadow-sm space-y-4 relative ${
                isActive
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header & Status Badge */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                        isArchived
                          ? 'bg-slate-200 text-slate-700 border border-slate-300'
                          : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'}`} />
                      {isArchived ? '📦 आर्काइव्ड (Archived)' : '🟢 सक्रिय (Active)'}
                    </span>

                    {isActive && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-xs">
                        वर्तमान चयनित कार्यक्षेत्र ✓
                      </span>
                    )}
                  </div>

                  <h3 className={`text-base sm:text-lg font-black leading-tight ${isArchived ? 'text-slate-700' : 'text-slate-900'}`}>
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {evt.subtitle || 'सुरक्षा व्यवस्था'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(evt)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="संशोधित करें"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {events.length > 1 && (
                    <button
                      onClick={() => onDeleteEvent(evt.id, evt.title)}
                      className="p-1.5 text-rose-400 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                      title="इवेंट हटाएं"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Event Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-500">कुल बल (सुरक्षित)</div>
                  <div className="text-sm sm:text-base font-black text-slate-900 font-mono mt-0.5">{headcount}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500">उपस्थिति</div>
                  <div className="text-sm sm:text-base font-black text-emerald-800 font-mono mt-0.5">{reportedCount}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500">उपस्थिति %</div>
                  <div className="text-sm sm:text-base font-black text-slate-900 font-mono mt-0.5">{attendancePercent}%</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onToggleEventStatus(evt.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                    isArchived
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                  title={isArchived ? 'इसे पुनः सक्रिय करें' : 'इसे आर्काइव में डालें'}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{isArchived ? 'पुनः सक्रिय करें' : 'आर्काइव करें'}</span>
                </button>

                {!isActive ? (
                  <button
                    onClick={() => onSelectActiveEvent(evt.id)}
                    className="px-3.5 py-1.5 bg-[#0b132b] hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span>इस इवेंट पर स्विच करें</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                ) : (
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    वर्तमान कार्यक्षेत्र
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-devanagari animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {editingEvent ? 'इवेंट / हेड संशोधित करें' : '+ नया इवेंट / हेड बनाएं'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs sm:text-sm font-bold">
              <div>
                <label className="block text-slate-700 mb-1">
                  मुख्य शीर्षक (Event Main Name) *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. मुख्यमंत्री वीआईपी सुरक्षा व्यवस्था 2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  उप-शीर्षक (Sub Heading / District)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. ड्यूटी कार्ड जनपद अयोध्या"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  इवेंट प्रारंभ दिनांक / अवधि (Event Start Date / Duration) *
                </label>
                <input
                  type="text"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  placeholder="e.g. 16.08.2026 से अग्रिम आदेश तक"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  हस्ताक्षरकर्ता पदनाम (Designation Text)
                </label>
                <input
                  type="text"
                  value={formData.signatoryText}
                  onChange={(e) => setFormData({ ...formData, signatoryText: e.target.value })}
                  placeholder="e.g. वरिष्ठ पुलिस अधीक्षक, अयोध्या"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">
                  विशेष नोट (Optional Briefing Note)
                </label>
                <textarea
                  rows={2}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="विशेष दिशा-निर्देश यदि कोई हों..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs"
                >
                  {editingEvent ? 'संशोधन सहेजें' : 'इवेंट बनाएं'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
