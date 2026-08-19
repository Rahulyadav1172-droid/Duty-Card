import React, { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, Shield, Phone, Building, UserCheck, Upload, Save, RefreshCw } from 'lucide-react';
import { parseDutyFile } from '../utils/fileParser';

export default function MasterForceManager({ forceRecords, onUpdateForce }) {
  const [filterQuery, setFilterQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  const [formData, setFormData] = useState({
    pno: '',
    name: '',
    rank: 'उ0नि0',
    mobile: '',
    posting: 'थाना कोतवाली',
    district: 'वाराणसी'
  });

  const handleOpenAddModal = (person = null) => {
    if (person) {
      setEditingPerson(person);
      setFormData(person);
    } else {
      setEditingPerson(null);
      setFormData({
        pno: `PN-${Math.floor(100000 + Math.random() * 900000)}`,
        name: '',
        rank: 'उ0नि0',
        mobile: '',
        posting: 'थाना कोतवाली',
        district: 'वाराणसी'
      });
    }
    setIsModalOpen(true);
  };

  const handleSavePerson = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      alert('कृपया पुलिसकर्मी का नाम एवं मोबाईल नंबर प्रविष्ट करें।');
      return;
    }

    if (editingPerson) {
      const updated = forceRecords.map(p => p.pno === editingPerson.pno ? formData : p);
      onUpdateForce(updated);
    } else {
      onUpdateForce([formData, ...forceRecords]);
    }

    setIsModalOpen(false);
    setEditingPerson(null);
  };

  const handleDeletePerson = (pno) => {
    if (window.confirm(`क्या आप पी.एन. नं. ${pno} को मास्टर डेटाबेस से हटाना चाहते हैं?`)) {
      const updated = forceRecords.filter(p => p.pno !== pno);
      onUpdateForce(updated);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseDutyFile(file);
      if (parsed && parsed.length > 0) {
        const newForce = parsed.map((item, idx) => ({
          pno: `PN-${Math.floor(100000 + idx * 17) % 900000 + 100000}`,
          name: item.name,
          rank: item.rank || 'का0',
          mobile: item.mobile,
          posting: item.posting || 'थाना कोतवाली',
          district: item.district || 'वाराणसी'
        }));
        onUpdateForce([...newForce, ...forceRecords]);
        alert(`सफलतापूर्वक ${newForce.length} पुलिसकर्मियों का मास्टर डेटाबेस अपलोड किया गया!`);
      }
    } catch (err) {
      alert(`फ़ाइल अपलोड त्रुटि: ${err.message}`);
    }
  };

  const filteredForce = forceRecords.filter(p =>
    (p.name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (p.mobile || '').includes(filterQuery) ||
    (p.pno || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (p.posting || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (p.rank || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* Header Banner (Light Theme) */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-600" />
            <h2 className="text-xl font-bold text-slate-900">कर्मचारी मास्टर डेटाबेस (Master Force Database)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            जनपद के समस्त पुलिसकर्मियों (P.No, नाम, पद, मोबाईल, थाना) का मास्टर रजिस्टर। यहाँ से ड्यूटी स्वतः ऑटो-फिल होती है।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAddModal(null)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + नया पुलिसकर्मी जोड़ें
          </button>

          <label className="cursor-pointer px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition">
            <Upload className="w-4 h-4 text-amber-600" />
            मास्टर एक्सेल अपलोड
            <input type="file" accept=".xlsx,.xls,.docx,.json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Force Table Box */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              पंजीकृत बल सूची ({forceRecords.length} कुल कर्मचारी)
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="P.No/नाम/मोबाईल/थाना से खोजें..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">P.No</th>
                <th className="p-3">नाम</th>
                <th className="p-3">पदनाम</th>
                <th className="p-3">मोबाईल</th>
                <th className="p-3">मूल तैनाती / थाना</th>
                <th className="p-3">जनपद</th>
                <th className="p-3 text-right">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredForce.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-amber-800 font-bold">{p.pno}</td>
                  <td className="p-3 font-bold text-slate-900">{p.name}</td>
                  <td className="p-3 text-amber-800 font-semibold">{p.rank}</td>
                  <td className="p-3 font-mono text-emerald-800 font-bold">{p.mobile}</td>
                  <td className="p-3">{p.posting}</td>
                  <td className="p-3 text-slate-500">{p.district}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenAddModal(p)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                        title="संशोधित करें"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePerson(p.pno)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                        title="हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Personnel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-slate-900">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
              {editingPerson ? 'पुलिसकर्मी विवरण संशोधित करें' : '+ नया मास्टर पुलिसकर्मी जोड़ें'}
            </h3>

            <form onSubmit={handleSavePerson} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">P.No (PNNO / पी.एन. नंबर)</label>
                <input
                  type="text"
                  value={formData.pno}
                  onChange={(e) => setFormData({ ...formData, pno: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-amber-800 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">पूरा नाम (Full Name)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. अमित कुमार"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">पदनाम (Rank)</label>
                <select
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-amber-800 font-bold"
                >
                  <option value="म0उ0नि0">म0उ0नि0 (महिला उप-निरीक्षक)</option>
                  <option value="म0नि0">म0नि0 (महिला निरीक्षक)</option>
                  <option value="म0हे0का0">म0हे0का0 (महिला हेड कान्स्टेबल)</option>
                  <option value="म0का0">म0का0 (महिला कान्स्टेबल)</option>
                  <option value="उ0नि0">उ0नि0 (उप-निरीक्षक)</option>
                  <option value="नि0">नि0 (निरीक्षक)</option>
                  <option value="हे0का0">हे0का0 (हेड कान्स्टेबल)</option>
                  <option value="का0">का0 (कान्स्टेबल)</option>
                  <option value="उ0नि0 (स0पु0)">उ0नि0 (स0पु0)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">मोबाईल नंबर (10 Digits)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">मूल तैनाती / थाना (Posting)</label>
                <input
                  type="text"
                  value={formData.posting}
                  onChange={(e) => setFormData({ ...formData, posting: e.target.value })}
                  placeholder="e.g. थाना कोतवाली"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">जनपद (District)</label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold border border-slate-300"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-black rounded-xl"
                >
                  सहेजें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
