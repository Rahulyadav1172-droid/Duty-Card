import React, { useState, useEffect } from 'react';
import { X, Save, Shield, User, Phone, Building, MapPin, Clock, Zap } from 'lucide-react';

const COMMON_DUTY_PLACES = [
  "राम जन्मभूमि परिसर - मुख्य द्वार",
  "कनक भवन - मुख्य प्रवेश",
  "हनुमानगढ़ी - सीढ़ी एवं निकास मार्ग",
  "नया घाट - बैरियर चेकिंग पॉइंट",
  "राम की पैड़ी - जल पुलिस एवं घाट सुरक्षा",
  "सरयू आरती घाट - VIP स्टेज परिसर",
  "लता मंगेशकर चौक - ट्रैफिक रेगुलेशन",
  "टेढ़ी बाजार चौराहा - चेकिंग पिकेट",
  "धर्म पथ - सुरक्षा बैरियर",
  "राम पथ - पैदल गश्त पॉइंट"
];

const COMMON_ZONES = [
  "जोन-01 (मंदिर परिसर)",
  "जोन-02 (घाट क्षेत्र)",
  "जोन-03 (ट्रैफिक एवं यातायात मार्ग)",
  "जोन-04 (आउटर सुरक्षा)"
];

const COMMON_SECTORS = [
  "सेक्टर-01 (मुख्य प्रवेश द्वार)",
  "सेक्टर-02 (घाट व जल मार्ग)",
  "सेक्टर-03 (चौराहा व बैरियर)",
  "सेक्टर-04 (आउटर सुरक्षा)"
];

export default function DutyFormModal({ isOpen, onClose, onSave, initialData, masterForce = [], defaultEventName = 'अयोध्या सुरक्षा व्यवस्था' }) {
  const [formData, setFormData] = useState({
    name: '',
    rank: 'उ0नि0',
    mobile: '',
    posting: '',
    district: 'अयोध्या',
    duty_place: COMMON_DUTY_PLACES[0],
    zone: COMMON_ZONES[0],
    sector: COMMON_SECTORS[0],
    shift: '06:00 AM - 02:00 PM',
    event_name: defaultEventName,
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
        district: 'अयोध्या',
        duty_place: COMMON_DUTY_PLACES[0],
        zone: COMMON_ZONES[0],
        sector: COMMON_SECTORS[0],
        shift: '06:00 AM - 02:00 PM',
        event_name: defaultEventName,
        status: 'Active'
      });
    }
    setAutoMatchFound(null);
  }, [initialData, isOpen, defaultEventName]);

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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-devanagari">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950">
                {initialData ? 'ड्यूटी प्रविष्टि संशोधित करें' : 'नई पुलिस ड्यूटी प्रविष्टि जोड़ें'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">ड्यूटी स्थल, जोन एवं सेक्टर आवंटन</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto Match Notification Banner */}
        {autoMatchFound && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              मास्टर रिकॉर्ड मैच: <strong className="text-emerald-950 font-black">{autoMatchFound.name}</strong> ({autoMatchFound.rank}) - {autoMatchFound.posting}
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Event Title */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">सुरक्षा व्यवस्था / कार्यक्रम का नाम</label>
            <input
              type="text"
              value={formData.event_name}
              onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              placeholder="सुरक्षा व्यवस्था का नाम..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mobile Number / PNO Search Trigger */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">मोबाईल नं० या PNO</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-amber-600" />
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => handleMobileOrPnoChange(e.target.value)}
                  placeholder="मोबाईल या PNO दर्ज करें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Personnel Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">पुलिसकर्मी का नाम</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="नाम दर्ज करें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>
            </div>

            {/* Rank / Designation */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">पदनाम</label>
              <select
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="उ0नि0">उ0नि0 (उप-निरीक्षक)</option>
                <option value="नि0">नि0 (निरीक्षक)</option>
                <option value="हे0का0">हे0का0 (मुख्य आरक्षी)</option>
                <option value="का0">का0 (आरक्षी)</option>
                <option value="म0का0">म0का0 (महिला आरक्षी)</option>
                <option value="म0नि0">म0नि0 (महिला निरीक्षक)</option>
                <option value="अपर पुलिस अधीक्षक">अपर पुलिस अधीक्षक</option>
                <option value="क्षेत्राधिकारी">क्षेत्राधिकारी</option>
              </select>
            </div>

            {/* Posting Unit / Thana */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">मूल तैनाती / थाना</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.posting}
                  onChange={(e) => setFormData({ ...formData, posting: e.target.value })}
                  placeholder="थाना / इकाई..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* District */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">जनपद</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="जनपद..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                required
              />
            </div>

            {/* Duty Place / Location */}
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-slate-700 font-bold flex items-center justify-between">
                <span>ड्यूटी स्थल / पॉइंट</span>
                <span className="text-[11px] text-slate-500 font-medium">चुनें या नया लिखें</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-amber-600" />
                <input
                  type="text"
                  list="duty-places-list"
                  value={formData.duty_place}
                  onChange={(e) => setFormData({ ...formData, duty_place: e.target.value })}
                  placeholder="ड्यूटी पॉइंट चुनें या टाइप करें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <datalist id="duty-places-list">
                  {COMMON_DUTY_PLACES.map((dp, i) => (
                    <option key={i} value={dp} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Zone Selector */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">जोन</label>
              <input
                type="text"
                list="zones-list"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                placeholder="जोन चुनें या टाइप करें..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                required
              />
              <datalist id="zones-list">
                {COMMON_ZONES.map((z, i) => (
                  <option key={i} value={z} />
                ))}
              </datalist>
            </div>

            {/* Sector Selector */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">सेक्टर</label>
              <input
                type="text"
                list="sectors-list"
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                placeholder="सेक्टर चुनें या टाइप करें..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
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
            <label className="block text-slate-700 font-bold mb-1">ड्यूटी समय</label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 w-4 h-4 text-emerald-600" />
              <input
                type="text"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                placeholder="e.g. 06:00 AM - 02:00 PM"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{initialData ? 'अद्यतन करें' : 'ड्यूटी सहेजें'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
