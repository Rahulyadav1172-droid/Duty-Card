import React, { useState, useEffect } from 'react';
import { X, Save, Shield, User, Phone, Building, MapPin, Clock, Zap, Plus, Layers } from 'lucide-react';

const COMMON_DUTY_PLACES = [
  "गंगा द्वार - गेट नं. 1 बैरियर",
  "चौक चौराहा - ट्रैफिक कंट्रोल पॉइंट",
  "दशाश्वमेध घाट - VIP स्टेज परिसर",
  "काशी विश्वनाथ मंदिर - गेट नं. 2 चेकिंग प्वाइंट",
  "बीएचयू मुख्य गेट - बैरियर ड्यूटी",
  "सर्किट हाउस - मुख्य प्रवेश द्वार",
  "लाल बहादुर शास्त्री एयरपोर्ट - VIP लाउंज",
  "पुलिस लाइन्स हेलीपैड स्थल",
  "गोदौलिया चौराहा - पैदल गश्त पॉइंट"
];

const COMMON_ZONES = [
  "जोन-01 (मंदिर परिसर)",
  "जोन-02 (घाट क्षेत्र)",
  "जोन-03 (ट्रैफिक एवं यातायात मार्ग)",
  "जोन-04 (एयरपोर्ट एवं हेलीपैड)"
];

const COMMON_SECTORS = [
  "सेक्टर-01 (मुख्य प्रवेश द्वार)",
  "सेक्टर-02 (घाट व जल मार्ग)",
  "सेक्टर-03 (चौराहा व बैरियर)",
  "सेक्टर-04 (आउटर सुरक्षा)"
];

export default function DutyFormModal({ isOpen, onClose, onSave, initialData, masterForce = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    rank: 'उ0नि0',
    mobile: '',
    posting: '',
    district: 'वाराणसी',
    duty_place: '',
    zone: 'जोन-01 (मंदिर परिसर)',
    sector: 'सेक्टर-01 (मुख्य प्रवेश द्वार)',
    shift: '06:00 AM - 02:00 PM',
    event_name: 'मा0 मुख्यमंत्री उ0प्र0 आगमन सुरक्षा व्यवस्था 2026',
    status: 'Active'
  });

  const [autoMatchFound, setAutoMatchFound] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        rank: 'उ0नि0',
        mobile: '',
        posting: '',
        district: 'वाराणसी',
        duty_place: COMMON_DUTY_PLACES[0],
        zone: COMMON_ZONES[0],
        sector: COMMON_SECTORS[0],
        shift: '06:00 AM - 02:00 PM',
        event_name: 'मा0 मुख्यमंत्री उ0प्र0 आगमन सुरक्षा व्यवस्था 2026',
        status: 'Active'
      });
    }
    setAutoMatchFound(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleMobileOrPnoChange = (val) => {
    setFormData(prev => ({ ...prev, mobile: val }));
    setAutoMatchFound(null);

    const cleanVal = val.trim().toLowerCase();
    if (cleanVal.length >= 4 && masterForce && masterForce.length > 0) {
      const matched = masterForce.find(person => {
        const pMob = (person.mobile || '').replace(/\D/g, '');
        const pno = (person.pno || '').toLowerCase();
        return pMob.includes(cleanVal) || pno.includes(cleanVal);
      });

      if (matched) {
        setAutoMatchFound(matched);
        setFormData(prev => ({
          ...prev,
          name: matched.name || prev.name,
          rank: matched.rank || prev.rank,
          posting: matched.posting || prev.posting,
          district: matched.district || prev.district,
          mobile: matched.mobile || val
        }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      alert('कृपया पुलिसकर्मी का नाम एवं 10-अंकीय मोबाईल नंबर प्रविष्ट करें।');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-devanagari">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {initialData ? 'ड्यूटी प्रविष्टि संशोधित करें (Edit Duty)' : '+ नई पुलिस ड्यूटी प्रविष्टि जोड़ें'}
              </h3>
              <p className="text-xs text-slate-400">डायनामिक ड्यूटी स्थल, जोन एवं सेक्टर आवंटन</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto Match Notification Banner */}
        {autoMatchFound && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              मास्टर DB से मैच! नाम: <strong className="text-white">{autoMatchFound.name}</strong> ({autoMatchFound.rank}) - {autoMatchFound.posting}
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Event Title */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">कार्यक्रम / ड्यूटी नाम (Event Title)</label>
            <input
              type="text"
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              placeholder="e.g. मा0 मुख्यमंत्री उ0प्र0 आगमन सुरक्षा व्यवस्था"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mobile Number / PNO Search Trigger */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">मोबाईल नं0 या P.No (Auto-Fill)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => handleMobileOrPnoChange(e.target.value)}
                  placeholder="मोबाईल / P.No दर्ज करें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-amber-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Personnel Name */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">पुलिसकर्मी का नाम (Name)</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. अमित कुमार"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                  required
                />
              </div>
            </div>

            {/* Rank / Designation */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">पदनाम (Rank)</label>
              <select
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="उ0नि0">उ0नि0 (उप-निरीक्षक / Sub-Inspector)</option>
                <option value="नि0">नि0 (निरीक्षक / Inspector)</option>
                <option value="हे0का0">हे0का0 (हेड कान्स्टेबल / Head Constable)</option>
                <option value="का0">का0 (कान्स्टेबल / Constable)</option>
                <option value="म0का0">म0का0 (महिला कान्स्टेबल)</option>
                <option value="म0नि0">म0नि0 (महिला निरीक्षक)</option>
                <option value="अपर पुलिस अधीक्षक">अपर पुलिस अधीक्षक (Addl. SP)</option>
                <option value="क्षेत्राधिकारी">क्षेत्राधिकारी (CO / DySP)</option>
              </select>
            </div>

            {/* Posting Unit / Thana */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">मूल तैनाती / थाना (Posting)</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={formData.posting}
                  onChange={(e) => setFormData({ ...formData, posting: e.target.value })}
                  placeholder="e.g. थाना कोतवाली"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* District */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">जनपद (District)</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. वाराणसी"
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            {/* Dynamic Duty Place / Location Manager (Select or Type Custom) */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-slate-400 font-semibold flex items-center justify-between">
                <span>ड्यूटी स्थल / पॉइंट (Duty Place Location)</span>
                <span className="text-[10px] text-amber-400">ड्रॉपडाउन चुनें या नया टाइप करें</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-amber-400" />
                <input
                  type="text"
                  list="duty-places-list"
                  value={formData.duty_place}
                  onChange={(e) => setFormData({ ...formData, duty_place: e.target.value })}
                  placeholder="ड्यूटी पॉइंट चुनें या नया टाइप करें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-amber-500/60 rounded-xl text-amber-200 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <datalist id="duty-places-list">
                  {COMMON_DUTY_PLACES.map((dp, i) => (
                    <option key={i} value={dp} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Dynamic Zone Selector */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">जोन (Zone)</label>
              <input
                type="text"
                list="zones-list"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                placeholder="जोन चुनें या टाइप करें..."
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              <datalist id="zones-list">
                {COMMON_ZONES.map((z, i) => (
                  <option key={i} value={z} />
                ))}
              </datalist>
            </div>

            {/* Dynamic Sector Selector */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">सेक्टर (Sector)</label>
              <input
                type="text"
                list="sectors-list"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                placeholder="सेक्टर चुनें या टाइप करें..."
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              <datalist id="sectors-list">
                {COMMON_SECTORS.map((s, i) => (
                  <option key={i} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Shift Timing */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">ड्यूटी समय (Shift Timing)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                placeholder="e.g. 06:00 AM - 02:00 PM"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'अद्यतन करें (Update)' : 'ड्यूटी सहेजें'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
