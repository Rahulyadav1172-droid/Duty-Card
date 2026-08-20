import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users,
  MapPin,
  Clock,
  Shield,
  Search,
  CheckCircle2,
  Plus,
  Trash2,
  UserCheck,
  Zap,
  Filter,
  ArrowRight,
  Check,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  UserPlus,
  Sliders,
  FolderCheck,
  Info,
  MoveRight,
  ArrowLeftRight,
  Edit,
  Grid,
  Upload,
  FileSpreadsheet,
  FileDown,
  Building,
  Flag,
  FolderTree,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Printer,
  FileText
} from 'lucide-react';
import { parseDutyFile } from '../utils/fileParser';
import * as XLSX from 'xlsx';
import ForceDeploymentMatrix from './ForceDeploymentMatrix';

export default function DutyAllocationHub({
  masterForce = [],
  activeEvent,
  onUpdateEventRecords,
  onUpdateAllocationData,
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  onOpenBooklet
}) {
  const [allocationMode, setAllocationMode] = useState('manual'); // 'manual' | 'auto' | 'hierarchy_upload' | 'zone_manager'
  const [masterSubTab, setMasterSubTab] = useState('zones'); // 'zones' | 'sectors' | 'points'
  const eventRecords = activeEvent?.records || [];

  const zonesStorageKey = `police_master_zones_${activeEventId || 'default'}`;
  const sectorsStorageKey = `police_master_sectors_${activeEventId || 'default'}`;
  const pointsStorageKey = `police_master_points_${activeEventId || 'default'}`;

  // ==========================================
  // MASTER INDEPENDENT ZONES, SECTORS & POINTS
  // ==========================================
  const [masterZones, setMasterZones] = useState(() => {
    if (activeEvent?.allocationData?.zones && Array.isArray(activeEvent.allocationData.zones) && activeEvent.allocationData.zones.length > 0) {
      return activeEvent.allocationData.zones;
    }
    try {
      const saved = localStorage.getItem(zonesStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Extract unique zones from actual uploaded event records
    const zonesSet = new Map();
    (activeEvent?.records || []).forEach((r, idx) => {
      const zName = (r.zone || '').trim();
      if (zName && !zonesSet.has(zName)) {
        zonesSet.set(zName, {
          id: `Z-${idx + 1}`,
          name: zName,
          incharge: r.zonal_incharge || r.zonal || '',
          mobile: r.zonal_mobile || ''
        });
      }
    });
    return Array.from(zonesSet.values());
  });

  const [masterSectors, setMasterSectors] = useState(() => {
    if (activeEvent?.allocationData?.sectors && Array.isArray(activeEvent.allocationData.sectors) && activeEvent.allocationData.sectors.length > 0) {
      return activeEvent.allocationData.sectors;
    }
    try {
      const saved = localStorage.getItem(sectorsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Extract unique sectors from actual uploaded event records
    const sectorsSet = new Map();
    (activeEvent?.records || []).forEach((r, idx) => {
      const sName = (r.sector || '').trim();
      const zName = (r.zone || '').trim();
      if (sName && !sectorsSet.has(sName)) {
        sectorsSet.set(sName, {
          id: `S-${idx + 1}`,
          name: sName,
          zone: zName,
          incharge: r.sector_incharge || '',
          mobile: r.sector_mobile || ''
        });
      }
    });
    return Array.from(sectorsSet.values());
  });

  const [masterPoints, setMasterPoints] = useState(() => {
    if (activeEvent?.allocationData?.points && Array.isArray(activeEvent.allocationData.points) && activeEvent.allocationData.points.length > 0) {
      return activeEvent.allocationData.points;
    }
    try {
      const saved = localStorage.getItem(pointsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Extract unique duty points from actual uploaded event records
    const pointsSet = new Map();
    (activeEvent?.records || []).forEach((r, idx) => {
      const pName = (r.duty_place || '').trim();
      if (pName && !pointsSet.has(pName)) {
        pointsSet.set(pName, {
          id: `P-${idx + 1}`,
          name: pName,
          zone: (r.zone || '').trim(),
          sector: (r.sector || '').trim(),
          shift: (r.shift || 'प्रातः 08:00 बजे से 20:30 बजे तक').trim(),
          reqSI: 1,
          reqHC: 2,
          reqConstable: 4,
          reqFemale: 1
        });
      }
    });
    return Array.from(pointsSet.values());
  });

  const zoneFileInputRef = useRef(null);
  const sectorFileInputRef = useRef(null);
  const pointFileInputRef = useRef(null);

  // Persistence helpers with Cloud Sync
  const saveZones = (list) => {
    setMasterZones(list);
    try { localStorage.setItem(zonesStorageKey, JSON.stringify(list)); } catch (e) {}
    if (onUpdateAllocationData) {
      onUpdateAllocationData({
        zones: list,
        sectors: masterSectors,
        points: masterPoints
      });
    }
  };
  const saveSectors = (list) => {
    setMasterSectors(list);
    try { localStorage.setItem(sectorsStorageKey, JSON.stringify(list)); } catch (e) {}
    if (onUpdateAllocationData) {
      onUpdateAllocationData({
        zones: masterZones,
        sectors: list,
        points: masterPoints
      });
    }
  };
  const savePoints = (list) => {
    setMasterPoints(list);
    try { localStorage.setItem(pointsStorageKey, JSON.stringify(list)); } catch (e) {}
    if (onUpdateAllocationData) {
      onUpdateAllocationData({
        zones: masterZones,
        sectors: masterSectors,
        points: list
      });
    }
  };

  // ==========================================
  // 1. MANUAL ASSIGNMENT STATE (CASCADING)
  // ==========================================
  const [targetZone, setTargetZone] = useState('');
  const [targetSector, setTargetSector] = useState('');
  const [targetPoint, setTargetPoint] = useState('');
  const [targetShift, setTargetShift] = useState('प्रातः 08:00 बजे से 20:30 बजे तक');

  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('available'); // 'available' | 'all'
  const [selectedPnos, setSelectedPnos] = useState(new Set());
  const [successToast, setSuccessToast] = useState(null);

  // Modals for creation
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);

  const [zoneForm, setZoneForm] = useState({ name: '', incharge: '', mobile: '' });
  const [sectorForm, setSectorForm] = useState({ name: '', zone: '', incharge: '', mobile: '' });
  const [pointForm, setPointForm] = useState({ name: '', zone: '', sector: '', shift: 'प्रातः 08:00 बजे से 20:30 बजे तक', reqSI: 1, reqHC: 2, reqConstable: 4, reqFemale: 2 });

  // Relocate Modal State
  const [relocatePointName, setRelocatePointName] = useState('');
  const [newZoneForPoint, setNewZoneForPoint] = useState('');
  const [newSectorForPoint, setNewSectorForPoint] = useState('');
  const [isRelocateModalOpen, setIsRelocateModalOpen] = useState(false);

  // Master Table Search Query
  const [masterSearch, setMasterSearch] = useState('');

  // Combined Unique Lists
  const allZoneNames = useMemo(() => {
    const list = new Set([...masterZones.map(z => z.name), ...eventRecords.map(r => r.zone).filter(Boolean)]);
    return Array.from(list).sort();
  }, [masterZones, eventRecords]);

  // Cascading Sectors
  const availableSectorsForZone = useMemo(() => {
    if (!targetZone) return masterSectors.map(s => s.name);
    const filtered = masterSectors.filter(s => s.zone === targetZone).map(s => s.name);
    const fromRecords = eventRecords.filter(r => r.zone === targetZone).map(r => r.sector).filter(Boolean);
    const set = new Set([...filtered, ...fromRecords]);
    return Array.from(set).sort();
  }, [masterSectors, targetZone, eventRecords]);

  // Cascading Points
  const availablePointsForSector = useMemo(() => {
    let pts = masterPoints;
    if (targetZone) pts = pts.filter(p => p.zone === targetZone);
    if (targetSector) pts = pts.filter(p => p.sector === targetSector);
    const filtered = pts.map(p => p.name);
    const fromRecords = eventRecords
      .filter(r => (!targetZone || r.zone === targetZone) && (!targetSector || r.sector === targetSector))
      .map(r => r.duty_place).filter(Boolean);
    const set = new Set([...filtered, ...fromRecords]);
    return Array.from(set).sort();
  }, [masterPoints, targetZone, targetSector, eventRecords]);

  // Default dropdown selections
  useEffect(() => {
    if (allZoneNames.length > 0 && !targetZone) setTargetZone(allZoneNames[0]);
  }, [allZoneNames]);

  useEffect(() => {
    if (availableSectorsForZone.length > 0 && !availableSectorsForZone.includes(targetSector)) {
      setTargetSector(availableSectorsForZone[0]);
    }
  }, [targetZone, availableSectorsForZone]);

  useEffect(() => {
    if (availablePointsForSector.length > 0 && !availablePointsForSector.includes(targetPoint)) {
      setTargetPoint(availablePointsForSector[0]);
    }
  }, [targetSector, availablePointsForSector]);

  // Map assigned PNOs
  const assignedPnoMap = useMemo(() => {
    const map = {};
    eventRecords.forEach(rec => {
      if (rec.mobile) map[rec.mobile] = rec;
      if (rec.pno) map[rec.pno] = rec;
      if (rec.name) map[rec.name] = rec;
    });
    return map;
  }, [eventRecords]);

  // Filtered Master Force
  const filteredForce = useMemo(() => {
    let list = masterForce;
    if (availabilityFilter === 'available') {
      list = list.filter(p => !assignedPnoMap[p.pno] && !assignedPnoMap[p.mobile] && !assignedPnoMap[p.name]);
    }
    if (rankFilter !== 'ALL') {
      list = list.filter(p => (p.rank || '').toLowerCase().includes(rankFilter.toLowerCase()));
    }
    if (districtFilter !== 'ALL') {
      list = list.filter(p => (p.district || '').toLowerCase().includes(districtFilter.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.mobile || '').includes(q) ||
        (p.pno || '').toLowerCase().includes(q) ||
        (p.posting || '').toLowerCase().includes(q) ||
        (p.district || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [masterForce, availabilityFilter, rankFilter, districtFilter, searchQuery, assignedPnoMap]);

  const uniqueRanks = useMemo(() => Array.from(new Set(masterForce.map(p => (p.rank || '').trim()).filter(Boolean))), [masterForce]);
  const uniqueDistricts = useMemo(() => Array.from(new Set(masterForce.map(p => (p.district || '').trim()).filter(Boolean))), [masterForce]);

  const handleTogglePno = (pno) => {
    const next = new Set(selectedPnos);
    if (next.has(pno)) next.delete(pno);
    else next.add(pno);
    setSelectedPnos(next);
  };

  // Perform Assignment
  const handleAssignSelected = () => {
    if (selectedPnos.size === 0) {
      alert('कृपया कम से कम एक पुलिसकर्मी का चयन करें।');
      return;
    }
    if (!targetPoint.trim()) {
      alert('कृपया ड्यूटी स्थल का नाम अवश्य चुनें या लिखें।');
      return;
    }

    const selectedPersonnelList = masterForce.filter(p => selectedPnos.has(p.pno) || selectedPnos.has(p.mobile));
    if (selectedPersonnelList.length === 0) return;

    const newAllocations = selectedPersonnelList.map((p, idx) => ({
      id: `DUTY-${String(eventRecords.length + idx + 1).padStart(4, '0')}`,
      pno: p.pno || `PN-${Date.now()}-${idx}`,
      name: p.name,
      rank: p.rank || 'का0',
      mobile: p.mobile,
      posting: p.posting || 'थाना कोतवाली',
      district: p.district || 'अयोध्या',
      zone: targetZone.trim() || 'सामान्य जोन',
      sector: targetSector.trim() || 'सामान्य सेक्टर',
      duty_place: targetPoint.trim(),
      shift: targetShift.trim(),
      photo: p.photo || ''
    }));

    const selectedPnoSet = new Set(selectedPersonnelList.map(p => p.pno));
    const selectedMobSet = new Set(selectedPersonnelList.map(p => p.mobile));
    const cleanExisting = eventRecords.filter(r => !selectedPnoSet.has(r.pno) && !selectedMobSet.has(r.mobile));

    const updated = [...cleanExisting, ...newAllocations];
    onUpdateEventRecords(updated);

    setSelectedPnos(new Set());
    setSuccessToast(`🎉 सफलतापूर्वक ${newAllocations.length} जवानों को "${targetPoint}" पर तैनात किया गया!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleUnassignRecord = (recordId, name) => {
    if (window.confirm(`क्या आप ${name} को इस ड्यूटी पॉइंट से हटाना चाहते हैं?`)) {
      const updated = eventRecords.filter(r => r.id !== recordId);
      onUpdateEventRecords(updated);
    }
  };

  const targetPointPersonnel = useMemo(() => {
    if (!targetPoint) return [];
    return eventRecords.filter(r => (r.duty_place || '').trim() === targetPoint.trim());
  }, [eventRecords, targetPoint]);

  // Upload Handlers
  const handleUploadZonesExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const parsed = [];
      const seen = new Set();
      rows.forEach((r, i) => {
        const name = String(r['zone'] || r['Zone'] || r['जोन'] || r['name'] || '').trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          parsed.push({
            id: `Z-${Date.now()}-${i}`,
            name,
            incharge: String(r['incharge'] || r['zonal_incharge'] || r['प्रभारी'] || '').trim(),
            mobile: String(r['mobile'] || r['मोबाईल'] || '').trim()
          });
        }
      });
      if (parsed.length === 0) {
        alert('कृपया सुनिश्चित करें कि एक्सेल में "zone" या "जोन" कॉलम मौजूद है।');
        return;
      }
      saveZones([...parsed, ...masterZones.filter(z => !seen.has(z.name))]);
      setSuccessToast(`🎉 ${parsed.length} ज़ोन एक्सेल से सफलतापूर्वक अपलोड किए गए!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      alert(`ज़ोन अपलोड त्रुटि: ${err.message}`);
    } finally {
      if (zoneFileInputRef.current) zoneFileInputRef.current.value = '';
    }
  };

  const handleUploadSectorsExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const parsed = [];
      const seen = new Set();
      rows.forEach((r, i) => {
        const name = String(r['sector'] || r['Sector'] || r['सेक्टर'] || r['name'] || '').trim();
        const zone = String(r['zone'] || r['Zone'] || r['जोन'] || 'सामान्य जोन').trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          parsed.push({
            id: `S-${Date.now()}-${i}`,
            name,
            zone,
            incharge: String(r['incharge'] || r['sector_incharge'] || r['प्रभारी'] || '').trim(),
            mobile: String(r['mobile'] || r['मोबाईल'] || '').trim()
          });
        }
      });
      if (parsed.length === 0) {
        alert('कृपया सुनिश्चित करें कि एक्सेल में "sector" एवं "zone" कॉलम मौजूद हैं।');
        return;
      }
      saveSectors([...parsed, ...masterSectors.filter(s => !seen.has(s.name))]);
      setSuccessToast(`🎉 ${parsed.length} सेक्टर एक्सेल से सफलतापूर्वक अपलोड किए गए!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      alert(`सेक्टर अपलोड त्रुटि: ${err.message}`);
    } finally {
      if (sectorFileInputRef.current) sectorFileInputRef.current.value = '';
    }
  };

  const handleUploadPointsExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const parsed = [];
      const seen = new Set();
      rows.forEach((r, i) => {
        const name = String(r['duty_place'] || r['duty place'] || r['Duty Place'] || r['स्थान'] || r['point'] || r['Point'] || '').trim();
        const zone = String(r['zone'] || r['Zone'] || r['जोन'] || 'सामान्य जोन').trim();
        const sector = String(r['sector'] || r['Sector'] || r['सेक्टर'] || 'सामान्य सेक्टर').trim();
        const shift = String(r['shift'] || r['समय'] || r['समय/पाली'] || 'प्रातः 08:00 बजे से 20:30 बजे तक').trim();
        const reqSI = Number(r['req_si'] || r['SI']) || 1;
        const reqHC = Number(r['req_hc'] || r['HC']) || 2;
        const reqConstable = Number(r['req_constable'] || r['Constable']) || 4;
        const reqFemale = Number(r['req_female'] || r['Female']) || 2;

        if (name && !seen.has(name)) {
          seen.add(name);
          parsed.push({
            id: `P-${Date.now()}-${i}`,
            name,
            zone,
            sector,
            shift,
            reqSI,
            reqHC,
            reqConstable,
            reqFemale
          });
        }
      });
      if (parsed.length === 0) {
        alert('कृपया सुनिश्चित करें कि एक्सेल में "duty_place" या "स्थान" कॉलम मौजूद है।');
        return;
      }
      savePoints([...parsed, ...masterPoints.filter(p => !seen.has(p.name))]);
      setSuccessToast(`🎉 ${parsed.length} ड्यूटी पॉइंट्स एक्सेल से सफलतापूर्वक अपलोड किए गए!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      alert(`ड्यूटी पॉइंट्स अपलोड त्रुटि: ${err.message}`);
    } finally {
      if (pointFileInputRef.current) pointFileInputRef.current.value = '';
    }
  };

  const handleDownloadSample = (type) => {
    let rows = [];
    let filename = '';
    if (type === 'zones') {
      rows = [
        { 'zone': 'मंदिर जोन', 'incharge': 'श्री राजेश कुमार (क्षेत्राधिकारी)', 'mobile': '9454401201' },
        { 'zone': 'घाट जोन', 'incharge': 'श्री वीरेन्द्र सिंह (क्षेत्राधिकारी)', 'mobile': '9454401202' }
      ];
      filename = 'Zones_Master_Sample.xlsx';
    } else if (type === 'sectors') {
      rows = [
        { 'sector': 'मंदिर सेक्टर-01', 'zone': 'मंदिर जोन', 'incharge': 'प्र0नि0 कोतवाली नगर', 'mobile': '9454401301' },
        { 'sector': 'घाट सेक्टर-01', 'zone': 'घाट जोन', 'incharge': 'प्र0नि0 नयाघाट चौकी', 'mobile': '9454401303' }
      ];
      filename = 'Sectors_Master_Sample.xlsx';
    } else {
      rows = [
        { 'duty_place': 'हनुमानगढ़ी मुख्य प्रवेश द्वार', 'zone': 'मंदिर जोन', 'sector': 'मंदिर सेक्टर-01', 'shift': 'प्रातः 08:00 बजे से 20:30 बजे तक', 'req_si': 1, 'req_hc': 2, 'req_constable': 6, 'req_female': 2 },
        { 'duty_place': 'पक्काघाट पीपल पेड़ के पास', 'zone': 'घाट जोन', 'sector': 'घाट सेक्टर-01', 'shift': 'प्रातः 08:00 बजे से 20:30 बजे तक', 'req_si': 1, 'req_hc': 2, 'req_constable': 4, 'req_female': 1 }
      ];
      filename = 'Duty_Points_Sample.xlsx';
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample');
    XLSX.writeFile(wb, filename);
  };

  // Relocate Handlers
  const handleOpenRelocateModal = (ptName) => {
    const pt = ptName || targetPoint;
    if (!pt) return;
    const match = masterPoints.find(p => p.name === pt) || eventRecords.find(r => r.duty_place === pt);
    setRelocatePointName(pt);
    setNewZoneForPoint(match?.zone || targetZone || '');
    setNewSectorForPoint(match?.sector || targetSector || '');
    setIsRelocateModalOpen(true);
  };

  const handleExecuteRelocatePoint = (e) => {
    e.preventDefault();
    if (!relocatePointName.trim() || !newZoneForPoint.trim() || !newSectorForPoint.trim()) return;

    const updatedRecords = eventRecords.map(r => {
      if ((r.duty_place || '').trim() === relocatePointName.trim()) {
        return { ...r, zone: newZoneForPoint.trim(), sector: newSectorForPoint.trim() };
      }
      return r;
    });
    onUpdateEventRecords(updatedRecords);

    const updatedPoints = masterPoints.map(p => {
      if (p.name.trim() === relocatePointName.trim()) {
        return { ...p, zone: newZoneForPoint.trim(), sector: newSectorForPoint.trim() };
      }
      return p;
    });
    savePoints(updatedPoints);

    setIsRelocateModalOpen(false);
    if (targetPoint === relocatePointName) {
      setTargetZone(newZoneForPoint.trim());
      setTargetSector(newSectorForPoint.trim());
    }
    setSuccessToast(`🎉 ड्यूटी पॉइंट "${relocatePointName}" को ज़ोन "${newZoneForPoint}" / सेक्टर "${newSectorForPoint}" में स्थानांतरित कर दिया गया!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-devanagari text-slate-900">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE DARK COMMAND HERO & PILL NAVIGATION                           */}
      {/* ========================================================================= */}
      <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-800 space-y-5">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Shield className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white leading-tight">
                  पुलिस ड्यूटी आवंटन एवं ज़ोन-सेक्टर कमान केंद्र
                </h1>
                <span className="inline-flex px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30 shrink-0">
                  लाइव कमान
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                इवेंट: <strong className="text-amber-400 font-black">{activeEvent?.title || 'सक्रिय सुरक्षा व्यवस्था'}</strong> | बल प्रबंधन, ज़ोन पदानुक्रम व ड्यूटी पास आवंटन
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-stretch xl:self-auto justify-end shrink-0">
            {/* Direct Booklet Button */}
            {onOpenBooklet && (
              <button
                type="button"
                onClick={onOpenBooklet}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer shrink-0"
                title="आधिकारिक ड्यूटी बुकलेट देखें एवं A4 PDF प्रिंट करें"
              >
                <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                <span>📖 बुकलेट देखें / Print A4</span>
              </button>
            )}

            {/* Event Selector Dropdown */}
            {events.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-inner">
                <span className="text-xs font-bold text-slate-400 shrink-0">इवेंट:</span>
                <select
                  value={activeEventId}
                  onChange={(e) => onSelectActiveEvent?.(e.target.value)}
                  className="bg-transparent text-amber-400 text-xs sm:text-sm font-black focus:outline-none cursor-pointer pr-2"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id} className="bg-slate-900 text-white font-bold">
                      {evt.title} ({evt.records?.length || 0} जवान)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 5-Tab Sleek Pill-Style Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-black">
          <button
            onClick={() => setAllocationMode('manual')}
            className={`py-3 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              allocationMode === 'manual'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black scale-[1.01]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="truncate">1. टीम आवंटन</span>
          </button>

          <button
            onClick={() => setAllocationMode('auto')}
            className={`py-3 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              allocationMode === 'auto'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black scale-[1.01]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="truncate">2. ऑटो-एलोकेशन</span>
          </button>

          <button
            onClick={() => setAllocationMode('matrix')}
            className={`py-3 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              allocationMode === 'matrix'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black scale-[1.01]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="truncate">3. समरी मैट्रिक्स</span>
          </button>

          <button
            onClick={() => setAllocationMode('hierarchy_upload')}
            className={`py-3 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              allocationMode === 'hierarchy_upload'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black scale-[1.01]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FolderTree className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="truncate">4. ज़ोन/पॉइंट्स</span>
          </button>

          <button
            onClick={() => setAllocationMode('zone_manager')}
            className={`py-3 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
              allocationMode === 'zone_manager'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-black scale-[1.01]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="truncate">5. स्थानांतरण ({masterPoints.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED 4 CLEAN STAT & METRIC CARDS                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-slate-900">
        {/* Card 1: Master Force Pool */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">मास्टर फ़ोर्स पूल</div>
            <div className="text-xl sm:text-2xl font-black text-slate-950 font-mono tracking-tight mt-0.5">
              {masterForce.length} <span className="text-xs font-bold text-slate-500">जवान</span>
            </div>
          </div>
        </div>

        {/* Card 2: Deployed Force */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">वर्तमान में तैनात बल</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono tracking-tight mt-0.5">
              {eventRecords.length} <span className="text-xs font-bold text-emerald-700">जवान</span>
            </div>
          </div>
        </div>

        {/* Card 3: Zones & Sectors Master */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-700 flex items-center justify-center shrink-0">
            <Building className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">ज़ोन एवं सेक्टर मास्टर</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-950 font-mono tracking-tight mt-0.5">
              {masterZones.length} <span className="text-xs font-bold text-indigo-600">ज़ोन</span> / {masterSectors.length} <span className="text-xs font-bold text-indigo-600">सेक्टर</span>
            </div>
          </div>
        </div>

        {/* Card 4: Duty Points */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200/80 text-violet-700 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500">सक्रिय ड्यूटी स्थल</div>
            <div className="text-xl sm:text-2xl font-black text-violet-950 font-mono tracking-tight mt-0.5">
              {masterPoints.length} <span className="text-xs font-bold text-violet-600">पॉइंट्स</span>
            </div>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-950 border border-emerald-300 font-black text-xs sm:text-sm flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-950 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: MANUAL TEAM ALLOCATION (CASCADING & ULTRA-CLEAN)                  */}
      {/* ========================================================================= */}
      {allocationMode === 'manual' && (
        <div className="space-y-6">
          {/* STEP 1: DESTINATION CARD */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
                  1
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-950">
                    ड्यूटी स्थल, ज़ोन, सेक्टर एवं समय (Shift) निर्धारित करें
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    स्थान चुनते ही उसके संबंधित सेक्टर, ज़ोन एवं समय स्वतः लोड हो जाते हैं
                  </p>
                </div>
              </div>

              {targetPoint && (
                <button
                  onClick={() => handleOpenRelocateModal(targetPoint)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
                  <span>पॉइंट का ज़ोन/सेक्टर बदलें</span>
                </button>
              )}
            </div>

            {/* 4 Cascading Clean Selectors with uniform height and focus */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-xs font-bold">
              {/* 1. Zone */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-black text-slate-900">1. ज़ोन (Zone):</span>
                  <button type="button" onClick={() => setIsZoneModalOpen(true)} className="text-[11px] text-amber-700 hover:text-amber-800 font-bold cursor-pointer">+ नया</button>
                </div>
                <select
                  value={targetZone}
                  onChange={(e) => setTargetZone(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer text-xs"
                >
                  {allZoneNames.map(z => <option key={z} value={z}>🛡️ {z}</option>)}
                </select>
              </div>

              {/* 2. Sector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-black text-slate-900">2. सेक्टर (Sector):</span>
                  <button type="button" onClick={() => setIsSectorModalOpen(true)} className="text-[11px] text-amber-700 hover:text-amber-800 font-bold cursor-pointer">+ नया</button>
                </div>
                <select
                  value={targetSector}
                  onChange={(e) => setTargetSector(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer text-xs"
                >
                  {availableSectorsForZone.map(s => <option key={s} value={s}>🚩 {s}</option>)}
                </select>
              </div>

              {/* 3. Duty Point */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-900 font-black">
                  <span className="font-black text-slate-900">3. ड्यूटी स्थल (Point) *:</span>
                  <button type="button" onClick={() => setIsPointModalOpen(true)} className="text-[11px] text-amber-700 hover:text-amber-800 font-bold cursor-pointer">+ नया</button>
                </div>
                <select
                  value={targetPoint}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetPoint(val);
                    const match = masterPoints.find(p => p.name === val);
                    if (match?.shift) setTargetShift(match.shift);
                  }}
                  className="w-full h-11 px-3.5 bg-amber-50/60 border-2 border-amber-400 rounded-xl font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer text-xs"
                >
                  {availablePointsForSector.map(p => <option key={p} value={p}>📍 {p}</option>)}
                </select>
              </div>

              {/* 4. Shift */}
              <div className="space-y-1.5">
                <div className="font-black text-slate-900">4. ड्यूटी समय / पाली:</div>
                <input
                  type="text"
                  value={targetShift}
                  onChange={(e) => setTargetShift(e.target.value)}
                  placeholder="e.g. 08:00 से 20:30 बजे तक"
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>
            </div>

            {/* Currently Deployed Chips */}
            {targetPoint && (
              <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>"{targetPoint}" पर वर्तमान तैनात बल:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400 font-mono font-black">
                      {targetPointPersonnel.length} जवान
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold">
                    ज़ोन: <strong>{targetZone}</strong> | सेक्टर: <strong>{targetSector}</strong>
                  </span>
                </div>

                {targetPointPersonnel.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 max-h-28 overflow-y-auto pt-1">
                    {targetPointPersonnel.map(r => (
                      <span key={r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 shadow-2xs">
                        <span>{r.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-950 rounded font-black border border-amber-300">{r.rank || 'जवान'}</span>
                        <button
                          onClick={() => handleUnassignRecord(r.id, r.name)}
                          className="text-rose-500 hover:text-rose-700 ml-1 cursor-pointer font-bold"
                          title="ड्यूटी से हटाएं"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    इस स्थल पर वर्तमान में कोई जवान तैनात नहीं है। नीचे से चयन कर तैनात करें।
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: MASTER FORCE SELECTION & DEPLOYMENT */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs">
                  2
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-950 flex items-center gap-2">
                    <span>मास्टर फ़ोर्स में से जवान चुनें</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 font-bold border border-amber-300">
                      {filteredForce.length} उपलब्ध
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    जवानों का चयन करें और नीचे "ड्यूटी पर तैनात करें" बटन दबाएं
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPnos(new Set(filteredForce.map(p => p.pno || p.mobile)))}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
                >
                  सभी चुनें ({filteredForce.length})
                </button>
                {selectedPnos.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPnos(new Set())}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
                  >
                    हटाएं ({selectedPnos.size})
                  </button>
                )}
              </div>
            </div>

            {/* Filter Toolbar with uniform height h-11 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="नाम, PNO, मोबाइल खोजें..."
                  className="w-full h-11 pl-10 pr-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>

              <div>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  <option value="available">🟢 केवल उपलब्ध / खाली जवान</option>
                  <option value="all">🌐 समस्त मास्टर फ़ोर्स (All Staff)</option>
                </select>
              </div>

              <div>
                <select
                  value={rankFilter}
                  onChange={(e) => setRankFilter(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  <option value="ALL">समस्त पद (All Ranks)</option>
                  {uniqueRanks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                >
                  <option value="ALL">समस्त जनपद (All Districts)</option>
                  {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Personnel Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredForce.map((p) => {
                const pnoKey = p.pno || p.mobile;
                const isSelected = selectedPnos.has(pnoKey);
                const assignedRecord = assignedPnoMap[p.pno] || assignedPnoMap[p.mobile] || assignedPnoMap[p.name];

                return (
                  <div
                    key={pnoKey}
                    onClick={() => handleTogglePno(pnoKey)}
                    className={`p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer flex items-start gap-3 text-xs select-none ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-md'
                        : assignedRecord
                        ? 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
                        : 'bg-white text-slate-800 hover:border-slate-300 hover:shadow-xs border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 mt-0.5 cursor-pointer shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-black truncate text-sm">{p.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-black shrink-0 ${
                          isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {p.rank || 'का0'}
                        </span>
                      </div>

                      <div className="text-[11px] opacity-90 truncate">
                        थाना: <strong>{p.posting || 'कोतवाली'}</strong> ({p.district || 'अयोध्या'})
                      </div>

                      <div className="text-[11px] font-mono opacity-80 flex items-center justify-between pt-0.5">
                        <span>PNO: {p.pno || '-'}</span>
                        <span>📱 {p.mobile || '-'}</span>
                      </div>

                      {assignedRecord && (
                        <div className="text-[10px] text-rose-700 font-bold truncate mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                          ⚠️ तैनात: {assignedRecord.duty_place}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action Dock */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-bold text-slate-700">
                चयनित: <strong className="font-mono text-lg text-slate-950">{selectedPnos.size}</strong> पुलिसकर्मी
              </div>

              <button
                onClick={handleAssignSelected}
                disabled={selectedPnos.size === 0 || !targetPoint.trim()}
                className={`w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer ${
                  selectedPnos.size > 0 && targetPoint.trim()
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/25'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <UserCheck className="w-4 h-4 stroke-[2.5]" />
                <span>चयनित ({selectedPnos.size}) जवानों को "{targetPoint || 'स्थान'}" पर तैनात करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SMART AUTO-ALLOCATION ENGINE (LIVE CONNECTED WITH OFFICIAL BOOKLET) */}
      {/* ========================================================================= */}
      {allocationMode === 'auto' && (() => {
        // Helper to categorize officer rank
        const getOfficerCategory = (rec) => {
          const r = (rec.rank || '').toLowerCase();
          const isFem = rec.gender === 'F' || rec.gender === 'महिला' ||
            /^(म0|महिला|कु0|श्रीमती|सुश्री|w\/o|d\/o|wcp|wsi)/i.test(rec.name || '') ||
            /^(म0|महिला|wcp|wsi)/i.test(rec.rank || '');

          if (isFem) return 'female';
          if (r.includes('निरीक्षक') || r.includes('insp') || r.includes('उ०नि') || r.includes('उ0नि') || r.includes('si') || r.includes('sub')) {
            return 'si';
          }
          if (r.includes('हे०का') || r.includes('हे0का') || r.includes('hc') || r.includes('head')) {
            return 'hc';
          }
          return 'constable';
        };

        const totalMaster = masterForce.length;
        const totalDeployed = eventRecords.length;
        const availablePool = masterForce.filter(p => !assignedPnoMap[p.pno] && !assignedPnoMap[p.mobile] && !assignedPnoMap[p.name]);
        const totalReserve = availablePool.length;

        // Rank-wise deployed breakdown
        const deployedStats = { si: 0, hc: 0, constable: 0, female: 0 };
        eventRecords.forEach(r => {
          const cat = getOfficerCategory(r);
          deployedStats[cat] = (deployedStats[cat] || 0) + 1;
        });

        // Rank-wise reserve breakdown
        const reserveStats = { si: 0, hc: 0, constable: 0, female: 0 };
        availablePool.forEach(r => {
          const cat = getOfficerCategory(r);
          reserveStats[cat] = (reserveStats[cat] || 0) + 1;
        });

        const totalDemanded = masterPoints.reduce((sum, t) => sum + ((Number(t.reqSI) || 0) + (Number(t.reqHC) || 0) + (Number(t.reqConstable) || 0) + (Number(t.reqFemale) || 0)), 0);

        // Live Quota Change Function (Increases/Decreases Live Force in Real Time!)
        const handleLiveQuotaChange = (idx, field, rawVal) => {
          const newCount = Math.max(0, parseInt(rawVal) || 0);
          const targetPoint = masterPoints[idx];
          if (!targetPoint) return;

          const currentCount = targetPoint[field] ?? (field === 'reqSI' ? 1 : field === 'reqHC' ? 2 : field === 'reqConstable' ? 4 : 1);
          const delta = newCount - currentCount;

          const targetCat = field === 'reqSI' ? 'si' : field === 'reqHC' ? 'hc' : field === 'reqFemale' ? 'female' : 'constable';

          let updatedRecords = [...eventRecords];

          if (delta < 0) {
            // REMOVE from duty point -> automatically returns to reserve pool!
            const toRemove = Math.abs(delta);
            const pointRecords = updatedRecords.filter(r => (r.duty_place || '').trim() === targetPoint.name.trim());
            const matchingRecords = pointRecords.filter(r => getOfficerCategory(r) === targetCat);

            const removeIds = new Set(matchingRecords.slice(-toRemove).map(r => r.id || r.pno || r.mobile));
            if (removeIds.size < toRemove) {
              const remainingNeed = toRemove - removeIds.size;
              const otherRecords = pointRecords.filter(r => !removeIds.has(r.id || r.pno || r.mobile));
              otherRecords.slice(-remainingNeed).forEach(r => removeIds.add(r.id || r.pno || r.mobile));
            }

            updatedRecords = updatedRecords.filter(r => !removeIds.has(r.id || r.pno || r.mobile));
          } else if (delta > 0) {
            // ADD to duty point from available reserve pool!
            const currentAvail = masterForce.filter(p => {
              const isAssigned = updatedRecords.some(r => r.pno === p.pno || r.mobile === p.mobile || (r.name === p.name && r.posting === p.posting));
              return !isAssigned;
            });

            const matchingAvailable = currentAvail.filter(p => getOfficerCategory(p) === targetCat);
            const fallbackAvailable = currentAvail.filter(p => getOfficerCategory(p) !== targetCat);
            const candidates = [...matchingAvailable, ...fallbackAvailable].slice(0, delta);

            if (candidates.length === 0) {
              alert(`मास्टर फ़ोर्स में इस पद (${targetCat.toUpperCase()}) का कोई भी जवान उपलब्ध नहीं है।`);
            } else {
              let startIdx = updatedRecords.length + 1;
              const newAssigned = candidates.map(s => ({
                id: `DUTY-${Date.now()}-${startIdx++}`,
                pno: s.pno || `PN-${Date.now()}-${startIdx}`,
                name: s.name,
                rank: s.rank || (targetCat === 'si' ? 'उ०नि०' : targetCat === 'hc' ? 'हे०का०' : targetCat === 'female' ? 'म०का०' : 'का०'),
                mobile: s.mobile,
                posting: s.posting || 'पुलिस लाइन',
                district: s.district || 'अयोध्या',
                zone: targetPoint.zone,
                sector: targetPoint.sector,
                duty_place: targetPoint.name,
                shift: targetPoint.shift || 'प्रातः 08:00 बजे से 20:30 बजे तक',
                photo: s.photo || ''
              }));
              updatedRecords = [...updatedRecords, ...newAssigned];
            }
          }

          // Update point template state
          const updatedPoints = [...masterPoints];
          updatedPoints[idx] = { ...updatedPoints[idx], [field]: newCount };
          savePoints(updatedPoints);

          // Update Event Records in Realtime (Syncs live with Official Booklet & Cloud)
          onUpdateEventRecords(updatedRecords);
        };

        // Smart Full Allocation
        const handleSmartAutoDistributeAll = () => {
          if (masterForce.length === 0) {
            alert('कृपया पहले मास्टर पुलिस बल सूची अपलोड या सिंक करें।');
            return;
          }

          let currentAssigned = [];
          let unassignedPool = [...masterForce];

          masterPoints.forEach(tpl => {
            const quotas = [
              { cat: 'si', count: Number(tpl.reqSI) || 0, defaultRank: 'उ०नि०' },
              { cat: 'hc', count: Number(tpl.reqHC) || 0, defaultRank: 'हे०का०' },
              { cat: 'female', count: Number(tpl.reqFemale) || 0, defaultRank: 'म०का०' },
              { cat: 'constable', count: Number(tpl.reqConstable) || 0, defaultRank: 'का०' }
            ];

            quotas.forEach(q => {
              for (let i = 0; i < q.count; i++) {
                // Find matching rank from unassigned
                let pIdx = unassignedPool.findIndex(p => getOfficerCategory(p) === q.cat);
                if (pIdx === -1 && unassignedPool.length > 0) {
                  pIdx = 0; // Fallback to any available personnel
                }

                if (pIdx !== -1) {
                  const person = unassignedPool.splice(pIdx, 1)[0];
                  const startNum = currentAssigned.length + 1;
                  currentAssigned.push({
                    id: `DUTY-${Date.now()}-${startNum}`,
                    pno: person.pno || `PN-${Date.now()}-${startNum}`,
                    name: person.name,
                    rank: person.rank || q.defaultRank,
                    mobile: person.mobile,
                    posting: person.posting || 'पुलिस लाइन',
                    district: person.district || 'अयोध्या',
                    zone: tpl.zone,
                    sector: tpl.sector,
                    duty_place: tpl.name,
                    shift: tpl.shift || 'प्रातः 08:00 बजे से 20:30 बजे तक',
                    photo: person.photo || ''
                  });
                }
              }
            });
          });

          onUpdateEventRecords(currentAssigned);
          setSuccessToast(`🎉 ${currentAssigned.length} जवानों की ड्यूटी सफलतापूर्वक स्वतः आवंटित हो गई! बुकलेट में तुरंत अपडेट हो गई है।`);
          setTimeout(() => setSuccessToast(null), 4000);
        };

        return (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
            {/* Header with Live Booklet Sync Indicator */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                  <Sparkles className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-950">
                      स्मार्ट ऑटो-ड्यूटी एलोकेशन (Live Force Distribution Matrix)
                    </h2>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black border border-emerald-300 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      <span>बुकलेट से लाइव कनेक्टेड</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    कोटा बदलते ही जवान तुरंत ड्यूटी से जुड़ेंगे/हटेंगे और बुकलेट में रियल-टाइम लाइव अपडेट होंगे।
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {onOpenBooklet && (
                  <button
                    type="button"
                    onClick={onOpenBooklet}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>📄 आधिकारिक बुकलेट में देखें</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSmartAutoDistributeAll}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>⚡ सभी पॉइंट्स पर एक साथ बल तैनात करें</span>
                </button>
              </div>
            </div>

            {/* REAL-TIME LIVE FORCE REPORT DASHBOARD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Master Total */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">कुल मास्टर पुलिस बल</div>
                <div className="text-2xl font-black text-slate-900 font-mono">{totalMaster} <span className="text-xs font-sans text-slate-500">जवान</span></div>
                <div className="text-[10px] text-slate-500 font-medium">डेटाबेस में कुल पंजीकृत बल</div>
              </div>

              {/* Card 2: Deployed Stats */}
              <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl space-y-1">
                <div className="text-[11px] font-black text-blue-900 uppercase tracking-wider flex items-center justify-between">
                  <span>🚨 वर्तमान तैनात बल</span>
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">{totalDeployed}</span>
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] font-bold text-blue-950 pt-1">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">उ०नि०: {deployedStats.si}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">हे०का०: {deployedStats.hc}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">कां०: {deployedStats.constable}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-rose-700">म०कां०: {deployedStats.female}</span>
                </div>
              </div>

              {/* Card 3: Reserve / Available Stats */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl space-y-1">
                <div className="text-[11px] font-black text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                  <span>🛡️ शेष उपलब्ध (रिजर्व फ़ोर्स)</span>
                  <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">{totalReserve}</span>
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] font-bold text-emerald-950 pt-1">
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">उ०नि०: {reserveStats.si}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">हे०का०: {reserveStats.hc}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">कां०: {reserveStats.constable}</span>
                  <span className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-rose-700">म०कां०: {reserveStats.female}</span>
                </div>
              </div>

              {/* Card 4: Demand vs Fulfilled */}
              <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                <div className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-between">
                  <span>🎯 कुल निर्धारित मांग</span>
                  <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">{totalDemanded}</span>
                </div>
                <div className="text-xs font-bold text-slate-700 pt-1">
                  पूर्ति दर: <strong className="text-slate-950 font-mono text-sm">{totalDemanded > 0 ? Math.min(100, Math.round((totalDeployed / totalDemanded) * 100)) : 100}%</strong>
                </div>
              </div>
            </div>

            {/* Matrix Table with Live Increment/Decrement */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-xs text-slate-900">
                <thead className="bg-slate-100 font-black text-slate-900 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 text-left">ड्यूटी स्थल (Point Name)</th>
                    <th className="p-3.5 text-left">जोन / सेक्टर</th>
                    <th className="p-3.5 text-center w-24">उ०नि० (SI)</th>
                    <th className="p-3.5 text-center w-24">हेकां (HC)</th>
                    <th className="p-3.5 text-center w-24">का० (Const.)</th>
                    <th className="p-3.5 text-center w-24">म०का० (Fem.)</th>
                    <th className="p-3.5 text-center w-24 bg-slate-200">कुल बल (तैनात)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {masterPoints.map((tpl, idx) => {
                    const reqSI = tpl.reqSI ?? 1;
                    const reqHC = tpl.reqHC ?? 2;
                    const reqConst = tpl.reqConstable ?? 4;
                    const reqFem = tpl.reqFemale ?? 1;
                    const totalReq = reqSI + reqHC + reqConst + reqFem;

                    // Count currently deployed at this point
                    const currentlyDeployed = eventRecords.filter(r => (r.duty_place || '').trim() === tpl.name.trim()).length;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-black text-slate-950">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>{tpl.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-medium text-[11px]">
                          {tpl.zone} / {tpl.sector}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={reqSI}
                            onChange={(e) => handleLiveQuotaChange(idx, 'reqSI', e.target.value)}
                            className="w-16 h-9 bg-slate-50 border border-slate-300 rounded-lg text-center font-black text-slate-900 focus:bg-amber-50 focus:border-amber-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={reqHC}
                            onChange={(e) => handleLiveQuotaChange(idx, 'reqHC', e.target.value)}
                            className="w-16 h-9 bg-slate-50 border border-slate-300 rounded-lg text-center font-black text-slate-900 focus:bg-amber-50 focus:border-amber-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={reqConst}
                            onChange={(e) => handleLiveQuotaChange(idx, 'reqConstable', e.target.value)}
                            className="w-16 h-9 bg-slate-50 border border-slate-300 rounded-lg text-center font-black text-slate-900 focus:bg-amber-50 focus:border-amber-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={reqFem}
                            onChange={(e) => handleLiveQuotaChange(idx, 'reqFemale', e.target.value)}
                            className="w-16 h-9 bg-slate-50 border border-slate-300 rounded-lg text-center font-black text-slate-900 focus:bg-amber-50 focus:border-amber-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-center font-mono font-black bg-slate-50">
                          <span className={`px-2.5 py-1 rounded-md text-xs ${
                            currentlyDeployed >= totalReq 
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {currentlyDeployed} / {totalReq}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-600 font-medium">
                मांग: <strong className="text-slate-950 font-mono text-sm">{totalDemanded}</strong> | तैनात: <strong className="text-emerald-700 font-mono text-sm">{totalDeployed}</strong> | रिजर्व: <strong className="text-blue-700 font-mono text-sm">{totalReserve}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('क्या आप सभी ड्यूटी पॉइंट्स की वर्तमान तैनाती को रीसेट करके जवानों को वापस रिजर्व में भेजना चाहते हैं?')) {
                      onUpdateEventRecords([]);
                      setSuccessToast('सभी जवान वापस उपलब्ध रिजर्व पूल में भेज दिए गए हैं।');
                      setTimeout(() => setSuccessToast(null), 3000);
                    }
                  }}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
                >
                  🔄 सभी ड्यूटी खाली करें (वापस रिजर्व में भेजें)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODE: FORCE DEPLOYMENT MATRIX (EXECUTIVE SUMMARY)                         */}
      {/* ========================================================================= */}
      {allocationMode === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  📊 उच्चाधिकारी बल तैनाती समरी शीट (Force Deployment Matrix)
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  ज़ोन-वार निरीक्षक, उ०नि०, हे०का०, आरक्षी, महिला पुलिस, यातायात व होमगार्ड का विस्तृत विवरण
                </p>
              </div>
              {onOpenBooklet && (
                <button
                  type="button"
                  onClick={onOpenBooklet}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <span>📖 बुकलेट में प्रिंट करें</span>
                </button>
              )}
            </div>

            <ForceDeploymentMatrix records={eventRecords} eventTitle={activeEvent?.title} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: UNIFIED MASTER COMMAND TABLE (ZONES / SECTORS / POINTS)          */}
      {/* ========================================================================= */}
      {allocationMode === 'hierarchy_upload' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
          {/* Header & Sub-Tab Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <FolderTree className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-950">
                  ज़ोन, सेक्टर एवं ड्यूटी पॉइंट मास्टर रजिस्ट्री
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  तीनों स्तरों को अलग-अलग एक्सेल द्वारा अपलोड करें या स्वतंत्र रूप से जोड़ें
                </p>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setMasterSubTab('zones')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                  masterSubTab === 'zones' ? 'bg-white text-slate-950 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. ज़ोन ({masterZones.length})
              </button>
              <button
                onClick={() => setMasterSubTab('sectors')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                  masterSubTab === 'sectors' ? 'bg-white text-slate-950 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. सेक्टर ({masterSectors.length})
              </button>
              <button
                onClick={() => setMasterSubTab('points')}
                className={`px-4 py-2 rounded-xl transition cursor-pointer ${
                  masterSubTab === 'points' ? 'bg-white text-slate-950 font-black shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. ड्यूटी पॉइंट्स ({masterPoints.length})
              </button>
            </div>
          </div>

          {/* Action Toolbar with uniform height h-11 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                placeholder="खोजें..."
                className="w-full h-11 pl-10 pr-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadSample(masterSubTab)}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                title="सैंपल एक्सेल डाउनलोड"
              >
                <FileDown className="w-4 h-4 text-slate-700" />
                <span>सैंपल</span>
              </button>

              {masterSubTab === 'zones' && (
                <>
                  <input ref={zoneFileInputRef} type="file" accept=".xlsx,.xls,.docx,.json" onChange={handleUploadZonesExcel} className="hidden" id="tab-zone-file" />
                  <label htmlFor="tab-zone-file" className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow transition active:scale-95">
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>ज़ोन Excel अपलोड</span>
                  </label>
                  <button onClick={() => setIsZoneModalOpen(true)} className="h-11 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow transition active:scale-95">
                    + नया ज़ोन
                  </button>
                </>
              )}

              {masterSubTab === 'sectors' && (
                <>
                  <input ref={sectorFileInputRef} type="file" accept=".xlsx,.xls,.docx,.json" onChange={handleUploadSectorsExcel} className="hidden" id="tab-sector-file" />
                  <label htmlFor="tab-sector-file" className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow transition active:scale-95">
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>सेक्टर Excel अपलोड</span>
                  </label>
                  <button onClick={() => setIsSectorModalOpen(true)} className="h-11 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow transition active:scale-95">
                    + नया सेक्टर
                  </button>
                </>
              )}

              {masterSubTab === 'points' && (
                <>
                  <input ref={pointFileInputRef} type="file" accept=".xlsx,.xls,.docx,.json" onChange={handleUploadPointsExcel} className="hidden" id="tab-point-file" />
                  <label htmlFor="tab-point-file" className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-black rounded-xl cursor-pointer flex items-center gap-1.5 shadow transition active:scale-95">
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>पॉइंट्स Excel अपलोड</span>
                  </label>
                  <button onClick={() => setIsPointModalOpen(true)} className="h-11 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow transition active:scale-95">
                    + नया पॉइंट
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Unified High Density Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[420px]">
            <table className="w-full text-xs text-slate-900 text-left">
              <thead className="bg-slate-50 font-black text-slate-900 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-12 text-center">क्र०</th>
                  {masterSubTab === 'zones' && (
                    <>
                      <th className="p-3.5">ज़ोन का नाम</th>
                      <th className="p-3.5">प्रभारी अधिकारी</th>
                      <th className="p-3.5 font-mono">मोबाईल नंबर</th>
                      <th className="p-3.5 text-center">सेक्टर संख्या</th>
                      <th className="p-3.5 text-center w-16">हटाएं</th>
                    </>
                  )}
                  {masterSubTab === 'sectors' && (
                    <>
                      <th className="p-3.5">सेक्टर का नाम</th>
                      <th className="p-3.5">संबंधित ज़ोन</th>
                      <th className="p-3.5">प्रभारी अधिकारी</th>
                      <th className="p-3.5 font-mono">मोबाईल नंबर</th>
                      <th className="p-3.5 text-center w-16">हटाएं</th>
                    </>
                  )}
                  {masterSubTab === 'points' && (
                    <>
                      <th className="p-3.5">ड्यूटी स्थल का नाम</th>
                      <th className="p-3.5">ज़ोन</th>
                      <th className="p-3.5">सेक्टर</th>
                      <th className="p-3.5 font-mono">समय / पाली</th>
                      <th className="p-3.5 text-center w-16">हटाएं</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {masterSubTab === 'zones' && masterZones
                  .filter(z => (z.name || '').toLowerCase().includes(masterSearch.toLowerCase()))
                  .map((z, idx) => {
                    const sectorCount = masterSectors.filter(s => s.zone === z.name).length;
                    return (
                      <tr key={z.id || idx} className="hover:bg-slate-50/80">
                        <td className="p-3.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3.5 font-black text-slate-950">🛡️ {z.name}</td>
                        <td className="p-3.5 text-slate-700">{z.incharge || '-'}</td>
                        <td className="p-3.5 font-mono text-slate-700">{z.mobile || '-'}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-amber-800">{sectorCount} सेक्टर</td>
                        <td className="p-3.5 text-center">
                          <button onClick={() => saveZones(masterZones.filter(x => x.name !== z.name))} className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {masterSubTab === 'sectors' && masterSectors
                  .filter(s => (s.name || '').toLowerCase().includes(masterSearch.toLowerCase()) || (s.zone || '').toLowerCase().includes(masterSearch.toLowerCase()))
                  .map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50/80">
                      <td className="p-3.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3.5 font-black text-slate-950">🚩 {s.name}</td>
                      <td className="p-3.5 font-bold text-slate-700">🛡️ {s.zone}</td>
                      <td className="p-3.5 text-slate-700">{s.incharge || '-'}</td>
                      <td className="p-3.5 font-mono text-slate-700">{s.mobile || '-'}</td>
                      <td className="p-3.5 text-center">
                        <button onClick={() => saveSectors(masterSectors.filter(x => x.name !== s.name))} className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                {masterSubTab === 'points' && masterPoints
                  .filter(p => (p.name || '').toLowerCase().includes(masterSearch.toLowerCase()) || (p.zone || '').toLowerCase().includes(masterSearch.toLowerCase()) || (p.sector || '').toLowerCase().includes(masterSearch.toLowerCase()))
                  .map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/80">
                      <td className="p-3.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3.5 font-black text-slate-950">📍 {p.name}</td>
                      <td className="p-3.5 font-bold text-slate-700">{p.zone}</td>
                      <td className="p-3.5 text-slate-700">{p.sector}</td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-600">{p.shift}</td>
                      <td className="p-3.5 text-center">
                        <button onClick={() => savePoints(masterPoints.filter(x => x.name !== p.name))} className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: POINT RELOCATION & ZONE MANAGER                                   */}
      {/* ========================================================================= */}
      {allocationMode === 'zone_manager' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-950">
                ज़ोन एवं सेक्टर प्रबंधन तथा स्वतंत्र पॉइंट स्थानांतरण
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                किसी भी ड्यूटी पॉइंट को अपनी इच्छानुसार किसी भी ज़ोन या सेक्टर में तुरंत स्थानांतरित करें
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
            {masterPoints.map((pt) => {
              const ptRecords = eventRecords.filter(r => (r.duty_place || '').trim() === pt.name.trim());

              return (
                <div key={pt.id || pt.name} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between gap-3.5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-black text-sm text-slate-950">
                        <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{pt.name}</span>
                      </div>
                      <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-200 text-slate-800 shrink-0">
                        {ptRecords.length} जवान तैनात
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 font-mono text-[11px]">
                        🛡️ {pt.zone}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 font-mono text-[11px]">
                        🚩 {pt.sector}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <button
                      onClick={() => handleOpenRelocateModal(pt.name)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>ज़ोन / सेक्टर बदलें</span>
                    </button>

                    <button
                      onClick={() => {
                        setTargetZone(pt.zone);
                        setTargetSector(pt.sector);
                        setTargetPoint(pt.name);
                        setAllocationMode('manual');
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
                    >
                      <span>बल तैनात करें →</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: ADD SINGLE ZONE, SECTOR, POINT, RELOCATE                          */}
      {/* ========================================================================= */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-black text-base">
              <span>+ नया ज़ोन जोड़ें</span>
              <button onClick={() => setIsZoneModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!zoneForm.name.trim()) return;
              const newZ = { id: `Z-${Date.now()}`, name: zoneForm.name.trim(), incharge: zoneForm.incharge.trim(), mobile: zoneForm.mobile.trim() };
              saveZones([newZ, ...masterZones]);
              setTargetZone(newZ.name);
              setIsZoneModalOpen(false);
              setZoneForm({ name: '', incharge: '', mobile: '' });
            }} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="text-slate-800">ज़ोन का नाम *:</label>
                <input type="text" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="e.g. मंदिर जोन" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1" required />
              </div>
              <div>
                <label className="text-slate-800">ज़ोनल प्रभारी अधिकारी:</label>
                <input type="text" value={zoneForm.incharge} onChange={(e) => setZoneForm({ ...zoneForm, incharge: e.target.value })} placeholder="e.g. क्षेत्राधिकारी" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-slate-800">प्रभारी मोबाईल नंबर:</label>
                <input type="tel" value={zoneForm.mobile} onChange={(e) => setZoneForm({ ...zoneForm, mobile: e.target.value })} placeholder="10-अंकीय नंबर" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-mono mt-1" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsZoneModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer">रद्द करें</button>
                <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow cursor-pointer">सहेजें</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-black text-base">
              <span>+ नया सेक्टर जोड़ें</span>
              <button onClick={() => setIsSectorModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!sectorForm.name.trim()) return;
              const newS = { id: `S-${Date.now()}`, name: sectorForm.name.trim(), zone: sectorForm.zone.trim() || targetZone || 'सामान्य जोन', incharge: sectorForm.incharge.trim(), mobile: sectorForm.mobile.trim() };
              saveSectors([newS, ...masterSectors]);
              setTargetSector(newS.name);
              setIsSectorModalOpen(false);
              setSectorForm({ name: '', zone: '', incharge: '', mobile: '' });
            }} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="text-slate-800">संबंधित ज़ोन चुनें *:</label>
                <select value={sectorForm.zone || targetZone} onChange={(e) => setSectorForm({ ...sectorForm, zone: e.target.value })} className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1">
                  {allZoneNames.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-800">सेक्टर का नाम *:</label>
                <input type="text" value={sectorForm.name} onChange={(e) => setSectorForm({ ...sectorForm, name: e.target.value })} placeholder="e.g. मंदिर सेक्टर-01" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1" required />
              </div>
              <div>
                <label className="text-slate-800">सेक्टर प्रभारी अधिकारी:</label>
                <input type="text" value={sectorForm.incharge} onChange={(e) => setSectorForm({ ...sectorForm, incharge: e.target.value })} placeholder="e.g. प्र0नि0 कोतवाली" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-slate-800">प्रभारी मोबाईल नंबर:</label>
                <input type="tel" value={sectorForm.mobile} onChange={(e) => setSectorForm({ ...sectorForm, mobile: e.target.value })} placeholder="10-अंकीय नंबर" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-mono mt-1" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsSectorModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer">रद्द करें</button>
                <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow cursor-pointer">सहेजें</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPointModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-black text-base">
              <span>+ नया ड्यूटी पॉइंट जोड़ें</span>
              <button onClick={() => setIsPointModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!pointForm.name.trim()) return;
              const newP = {
                id: `P-${Date.now()}`,
                name: pointForm.name.trim(),
                zone: pointForm.zone.trim() || targetZone || 'सामान्य जोन',
                sector: pointForm.sector.trim() || targetSector || 'सामान्य सेक्टर',
                shift: pointForm.shift.trim(),
                reqSI: Number(pointForm.reqSI) || 1,
                reqHC: Number(pointForm.reqHC) || 2,
                reqConstable: Number(pointForm.reqConstable) || 4,
                reqFemale: Number(pointForm.reqFemale) || 2
              };
              savePoints([newP, ...masterPoints]);
              setTargetPoint(newP.name);
              setIsPointModalOpen(false);
              setPointForm({ name: '', zone: '', sector: '', shift: 'प्रातः 08:00 बजे से 20:30 बजे तक', reqSI: 1, reqHC: 2, reqConstable: 4, reqFemale: 2 });
            }} className="space-y-3.5 text-xs font-bold">
              <div>
                <label className="text-slate-800">संबंधित ज़ोन:</label>
                <select value={pointForm.zone || targetZone} onChange={(e) => setPointForm({ ...pointForm, zone: e.target.value })} className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1">
                  {allZoneNames.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-800">संबंधित सेक्टर:</label>
                <select value={pointForm.sector || targetSector} onChange={(e) => setPointForm({ ...pointForm, sector: e.target.value })} className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1">
                  {availableSectorsForZone.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-800 font-black">ड्यूटी स्थल का नाम *:</label>
                <input type="text" value={pointForm.name} onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })} placeholder="e.g. हनुमानगढ़ी मुख्य द्वार" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1" required />
              </div>
              <div>
                <label className="text-slate-800">ड्यूटी समय / पाली:</label>
                <input type="text" value={pointForm.shift} onChange={(e) => setPointForm({ ...pointForm, shift: e.target.value })} placeholder="e.g. प्रातः 08:00 बजे से 20:30 बजे तक" className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1" />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsPointModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold cursor-pointer">रद्द करें</button>
                <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow cursor-pointer">सहेजें</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRelocateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-black text-base">
              <span>ड्यूटी पॉइंट का ज़ोन/सेक्टर बदलें</span>
              <button onClick={() => setIsRelocateModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleExecuteRelocatePoint} className="space-y-4 text-xs font-bold">
              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
                <div className="text-[11px] text-amber-900 font-bold">चयनित ड्यूटी पॉइंट:</div>
                <div className="text-sm font-black text-slate-950 mt-0.5">📍 {relocatePointName}</div>
              </div>
              <div>
                <label className="text-slate-800">नया ज़ोन चुनें या लिखें:</label>
                <input type="text" list="relocate-zones" value={newZoneForPoint} onChange={(e) => setNewZoneForPoint(e.target.value)} className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1" required />
                <datalist id="relocate-zones">{allZoneNames.map(z => <option key={z} value={z} />)}</datalist>
              </div>
              <div>
                <label className="text-slate-800">नया सेक्टर चुनें या लिखें:</label>
                <input type="text" list="relocate-sectors" value={newSectorForPoint} onChange={(e) => setNewSectorForPoint(e.target.value)} className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl font-bold mt-1" required />
                <datalist id="relocate-sectors">{availableSectorsForZone.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsRelocateModalOpen(false)} className="px-4 py-2.5 bg-slate-100 rounded-xl font-bold cursor-pointer">रद्द करें</button>
                <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow cursor-pointer">स्थानांतरित करें</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
