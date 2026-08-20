import React, { useState, useMemo } from 'react';
import { RefreshCw, UserCheck, UserPlus, Shield, MapPin, Search, Check, AlertCircle, X, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DutyReplacementModal({
  isOpen,
  onClose,
  targetRecord,
  masterForce = [],
  eventRecords = [],
  onConfirmReplacement
}) {
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'inter_district'
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState('ALL');
  const [selectedNewOfficer, setSelectedNewOfficer] = useState(null);
  const [reason, setReason] = useState('');

  // Inter-district substitute form state
  const [newPno, setNewPno] = useState('');
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState('का0');
  const [newMobile, setNewMobile] = useState('');
  const [newPosting, setNewPosting] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [substituteRemark, setSubstituteRemark] = useState('');

  // Reset state when opened for a new record
  React.useEffect(() => {
    if (isOpen && targetRecord) {
      setSelectedNewOfficer(null);
      setReason('');
      setSearchQuery('');
      setRankFilter(targetRecord.rank || 'ALL');

      setNewPno('');
      setNewName('');
      setNewRank(targetRecord.rank || 'का0');
      setNewMobile('');
      setNewPosting(targetRecord.posting || '');
      setNewDistrict(targetRecord.district || '');
      setSubstituteRemark(`जनपद ${targetRecord.district || ''} से मूल आवंटित जवान (${targetRecord.name || ''}) के स्थान पर आगमन`);
    }
  }, [isOpen, targetRecord]);

  // Set of assigned PNOs
  const assignedPnoSet = useMemo(() => {
    const set = new Set();
    eventRecords.forEach(r => {
      if (r.pno) set.add(String(r.pno).trim());
      if (r.mobile) set.add(String(r.mobile).trim());
    });
    return set;
  }, [eventRecords]);

  // Unassigned available reserve pool
  const availablePool = useMemo(() => {
    return masterForce.filter(p => {
      const pno = String(p.pno || '').trim();
      const mob = String(p.mobile || '').trim();
      return (!pno || !assignedPnoSet.has(pno)) && (!mob || !assignedPnoSet.has(mob));
    });
  }, [masterForce, assignedPnoSet]);

  // Filtered available pool (Prioritizes same rank)
  const filteredAvailable = useMemo(() => {
    let list = availablePool;
    if (rankFilter !== 'ALL') {
      list = list.filter(p => (p.rank || '').toLowerCase().includes(rankFilter.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.pno || '').toLowerCase().includes(q) ||
        (p.mobile || '').includes(q) ||
        (p.district || '').toLowerCase().includes(q) ||
        (p.posting || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [availablePool, rankFilter, searchQuery]);

  if (!isOpen || !targetRecord) return null;

  const handleInternalSubmit = (e) => {
    e.preventDefault();
    if (!selectedNewOfficer) {
      alert('कृपया प्रतिस्थानी के रूप में तैनात करने हेतु एक नए जवान का चयन करें।');
      return;
    }
    if (!reason.trim()) {
      alert('कृपया रिप्लेसमेंट का आधिकारिक कारण / रिमार्क दर्ज करें।');
      return;
    }

    onConfirmReplacement({
      oldRecord: targetRecord,
      newRecord: {
        ...selectedNewOfficer,
        zone: targetRecord.zone,
        sector: targetRecord.sector,
        duty_place: targetRecord.duty_place,
        shift: targetRecord.shift
      },
      replacementType: 'INTERNAL_RESERVE_SWAP',
      reason: reason.trim()
    });

    onClose();
  };

  const handleInterDistrictSubmit = (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('कृपया नए उपस्थित जवान का नाम दर्ज करें।');
      return;
    }
    if (!newPno.trim()) {
      alert('कृपया नए उपस्थित जवान का PNO सं० दर्ज करें।');
      return;
    }

    onConfirmReplacement({
      oldRecord: targetRecord,
      newRecord: {
        id: `DUTY-SUB-${Date.now()}`,
        pno: newPno.trim(),
        name: newName.trim(),
        rank: newRank.trim() || 'का0',
        mobile: newMobile.trim(),
        posting: newPosting.trim() || targetRecord.posting || 'पुलिस लाइन',
        district: newDistrict.trim() || targetRecord.district || 'अयोध्या',
        zone: targetRecord.zone,
        sector: targetRecord.sector,
        duty_place: targetRecord.duty_place,
        shift: targetRecord.shift,
        photo: ''
      },
      replacementType: 'INTER_DISTRICT_SUBSTITUTION',
      reason: substituteRemark.trim() || 'गैर-जनपद प्रतिस्थानी आगमन'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 font-devanagari text-slate-900 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3 font-black text-base sm:text-lg text-slate-950">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
              <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="leading-tight">ड्यूटी प्रतिस्थानी प्रबंधन (Duty Replacement)</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                तैनात जवान को रिजर्व बल अथवा गैर-जनपद नए जवान से बदलें
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold text-sm cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Assigned Officer Summary Card */}
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2 border border-black shadow-xs">
          <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
            <span>🔴 वर्तमान में तैनात जवान (Original Deployed Officer)</span>
            <span className="bg-rose-600 text-white px-2 py-0.2 rounded font-sans text-[10px]">हटाया / बदला जा रहा है</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base text-white">{targetRecord.name}</span>
              <span className="text-xs bg-slate-800 text-amber-300 font-bold px-2 py-0.5 rounded border border-slate-700">
                {targetRecord.rank || 'का0'}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              PNO: <strong className="text-white font-bold">{targetRecord.pno || '-'}</strong> | मो०: <strong className="text-white font-bold">{targetRecord.mobile || '-'}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 border-t border-slate-800 pt-1.5">
            <span>📍 ड्यूटी स्थल: <strong className="text-amber-200">{targetRecord.duty_place}</strong></span>
            <span>🛡️ ज़ोन: <strong>{targetRecord.zone}</strong></span>
            <span>🚩 सेक्टर: <strong>{targetRecord.sector}</strong></span>
            <span>🏢 जनपद: <strong>{targetRecord.district || '-'}</strong></span>
          </div>
        </div>

        {/* 2-Way Tab Selector */}
        <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('internal')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'internal'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            <span>1. रिजर्व बल से बदलें (Reserve Swap)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inter_district')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'inter_district'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>2. गैर-जनपद नया जवान आवक (Arrival Substitute)</span>
          </button>
        </div>

        {/* TAB 1: INTERNAL RESERVE SWAP */}
        {activeTab === 'internal' && (
          <form onSubmit={handleInternalSubmit} className="space-y-3.5 flex-1 overflow-y-auto pr-1">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="रिजर्व जवान खोजें (नाम / PNO / मोबाइल)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="text-[11px] font-bold text-slate-500 shrink-0">पद फ़िल्टर:</span>
                <select
                  value={rankFilter}
                  onChange={(e) => setRankFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold px-2 py-2 rounded-xl text-slate-900"
                >
                  <option value="ALL">समस्त पद</option>
                  <option value="उ०नि">उ०नि० (SI)</option>
                  <option value="हे०का">हे०का० (HC)</option>
                  <option value="का0">आरक्षी (Const.)</option>
                  <option value="महिला">महिला आरक्षी (Fem.)</option>
                  <option value="यातायात">यातायात</option>
                </select>
              </div>
            </div>

            {/* List of Available Reserve Officers */}
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
              {filteredAvailable.length > 0 ? (
                filteredAvailable.map((officer, idx) => {
                  const isSelected = selectedNewOfficer?.pno === officer.pno || selectedNewOfficer?.mobile === officer.mobile;

                  return (
                    <div
                      key={officer.pno || idx}
                      onClick={() => setSelectedNewOfficer(officer)}
                      className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                        isSelected
                          ? 'bg-amber-50/90 border-l-4 border-l-amber-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-950">{officer.name}</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-bold text-slate-700 border border-slate-200">
                            {officer.rank || 'का0'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2">
                          <span>PNO: <strong className="font-mono text-slate-800">{officer.pno || '-'}</strong></span>
                          <span>मो०: <strong className="font-mono text-slate-800">{officer.mobile || '-'}</strong></span>
                          <span>थाना: <strong className="text-slate-800">{officer.posting || '-'}</strong></span>
                          <span>जनपद: <strong className="text-slate-800">{officer.district || '-'}</strong></span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                            ✓
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-bold px-2 py-1 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100">
                            चुनें
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 font-bold">
                  इस श्रेणी में कोई भी उपलब्ध रिजर्व जवान नहीं मिला।
                </div>
              )}
            </div>

            {/* Replacement Reason Field */}
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800">
                रिप्लेसमेंट का कारण / आधिकारिक रिमार्क (अनिवार्य):
              </label>
              <input
                type="text"
                required
                placeholder="e.g. आकस्मिक अवकाश / अस्वस्थता / प्रशासनिक आवश्यकतानुसार..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                disabled={!selectedNewOfficer || !reason.trim()}
                className={`px-5 py-2.5 font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                  selectedNewOfficer && reason.trim()
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>प्रतिस्थानी जवान तैनात करें</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: INTER-DISTRICT ARRIVAL SUBSTITUTION */}
        {activeTab === 'inter_district' && (
          <form onSubmit={handleInterDistrictSubmit} className="space-y-3.5 flex-1 overflow-y-auto pr-1">
            <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-1 text-xs text-blue-950 font-medium">
              <div className="font-black text-blue-900 flex items-center gap-1.5">
                <span>🏢 गैर-जनपद आवक स्पॉट प्रतिस्थानी (Spot Substitution)</span>
              </div>
              <p className="text-[11px] text-blue-800">
                यदि गैर-जनपद से मूल जवान के स्थान पर कोई दूसरा जवान आमद कराने आया है, तो उसका विवरण यहाँ दर्ज करें। उस सीट पर तुरंत नए जवान का कार्ड व ड्यूटी पास बन जाएगा।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">नया PNO सं० *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192251785"
                  value={newPno}
                  onChange={(e) => setNewPno(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">नया नाम (उपस्थित जवान) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. का० सुरेश सिंह"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">पदनाम (Rank)</label>
                <select
                  value={newRank}
                  onChange={(e) => setNewRank(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="उ०नि०">उ०नि० (Sub Inspector)</option>
                  <option value="म०उ०नि०">म०उ०नि० (WSI)</option>
                  <option value="हे०का०">हे०का० (Head Constable)</option>
                  <option value="का0">आरक्षी (Constable)</option>
                  <option value="म०का०">महिला आरक्षी (Lady Constable)</option>
                  <option value="यातायात">यातायात पुलिस</option>
                  <option value="होमगार्ड">होमगार्ड</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">मोबाइल नंबर</label>
                <input
                  type="tel"
                  placeholder="10 अंकों का मोबाइल नंबर..."
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">मूल तैनाती / थाना</label>
                <input
                  type="text"
                  placeholder="e.g. थाना कोतवाली"
                  value={newPosting}
                  onChange={(e) => setNewPosting(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800">गृह जनपद / आगमन जनपद</label>
                <input
                  type="text"
                  placeholder="e.g. हरदोई / सीतापुर"
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-800">आधिकारिक संदर्भ / रिमार्क</label>
              <input
                type="text"
                placeholder="e.g. जनपद हरदोई से का० रमेश के स्थान पर आगमन..."
                value={substituteRemark}
                onChange={(e) => setSubstituteRemark(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>गैर-जनपद प्रतिस्थानी दर्ज करें</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
