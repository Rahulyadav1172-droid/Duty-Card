import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Vote,
  Shield,
  Users,
  Building,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit,
  ArrowLeftRight,
  RefreshCw,
  Sparkles,
  FileSpreadsheet,
  FileDown,
  Upload,
  UserCheck,
  Phone,
  Printer,
  ChevronRight,
  Info,
  Check,
  X,
  SlidersHorizontal,
  FolderCheck,
  Eye,
  Layers,
  Tag,
  CheckSquare,
  Square
} from 'lucide-react';
import * as XLSX from 'xlsx';
import DutyReplacementModal from './DutyReplacementModal';
import { logReplacementToAuditTrail } from '../utils/aamadSync';
import { ELECTION_2D_BOOTH_NORMS, ELECTION_LAW_ORDER_MANAK } from '../data/electionStandardData';

// Standard UP Police & ECI Default Norms by Category
const DEFAULT_CATEGORY_NORMS = {
  'सामान्य': { si: 0, hc: 1, cp: 1, wcp: 0, hg: 1, capf: 0, label: 'सामान्य बूथ (Normal)', color: 'blue', desc: 'मानक: 1 हे०का० + 1 का० + 1 होमगार्ड' },
  'संवेदनशील': { si: 1, hc: 1, cp: 1, wcp: 0, hg: 2, capf: 0, label: 'संवेदनशील बूथ (Sensitive)', color: 'amber', desc: 'मानक: 1 उ०नि० (प्रभारी) + 1 हे०का० + 1 का० + 2 होमगार्ड' },
  'अति-संवेदनशील': { si: 1, hc: 1, cp: 2, wcp: 0, hg: 2, capf: 0, label: 'अति-संवेदनशील बूथ (Hyper-Sensitive)', color: 'rose', desc: 'मानक: 1 उ०नि० + 1 हे०का० + 2 सशस्त्र का० + 2 होमगार्ड' },
  'क्रिटिकल': { si: 1, hc: 1, cp: 2, wcp: 0, hg: 2, capf: 1, label: 'क्रिटिकल / वल्नरेबल (Critical)', color: 'purple', desc: 'मानक: 1 उ०नि० + 1 हे०का० + 2 का० + 2 होमगार्ड + 1 CAPF' },
  'पिंक': { si: 1, hc: 1, cp: 2, wcp: 2, hg: 2, capf: 0, label: 'पिंक बूथ (All-Women Station)', color: 'pink', desc: 'मानक: 1 महिला उ०नि० + 1 महिला हे०का० + 2 महिला का० + 2 महिला होमगार्ड' }
};

// Default sample booths for fresh start
const DEFAULT_SAMPLE_BOOTHS = [
  { id: 'EB-1', vidhanSabha: '134-अयोध्या', sector: 'सेक्टर 01 (कोतवाली)', sectorOfficer: 'उ०नि० रमेश कुमार यादव', sectorMobile: '9454401201', centerName: 'प्राथमिक विद्यालय सआदतगंज', boothNo: '141', category: 'सामान्य' },
  { id: 'EB-2', vidhanSabha: '134-अयोध्या', sector: 'सेक्टर 01 (कोतवाली)', sectorOfficer: 'उ०नि० रमेश कुमार यादव', sectorMobile: '9454401201', centerName: 'प्राथमिक विद्यालय सआदतगंज', boothNo: '142', category: 'संवेदनशील' },
  { id: 'EB-3', vidhanSabha: '134-अयोध्या', sector: 'सेक्टर 01 (कोतवाली)', sectorOfficer: 'उ०नि० रमेश कुमार यादव', sectorMobile: '9454401201', centerName: 'राजकीय इंटर कॉलेज फैजाबाद', boothNo: '143', category: 'पिंक' },
  { id: 'EB-4', vidhanSabha: '134-अयोध्या', sector: 'सेक्टर 02 (कैंट)', sectorOfficer: 'उ०नि० दिनेश प्रताप सिंह', sectorMobile: '9454401202', centerName: 'कन्या पूर्व माध्यमिक विद्यालय नाका', boothNo: '144', category: 'अति-संवेदनशील' },
  { id: 'EB-5', vidhanSabha: '134-अयोध्या', sector: 'सेक्टर 02 (कैंट)', sectorOfficer: 'उ०नि० दिनेश प्रताप सिंह', sectorMobile: '9454401202', centerName: 'कन्या पूर्व माध्यमिक विद्यालय नाका', boothNo: '145', category: 'क्रिटिकल' }
];

export default function ElectionBoothDutyHub({
  masterForce = [],
  activeEvent,
  onUpdateEventRecords,
  onUpdateAllocationData,
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  onOpenBooklet
}) {
  const [activeSubTab, setActiveSubTab] = useState('booths'); // 'booths' | 'norms' | 'allocate' | 'upload'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('ALL');
  const [autoStrategy, setAutoStrategy] = useState('vacancies_only'); // 'vacancies_only' | 'fresh_reallocate'
  const [normViewTab, setNormViewTab] = useState('2d_matrix'); // '2d_matrix' | 'category' | 'law_order'
  const [successToast, setSuccessToast] = useState(null);

  // Multi-selection for bulk operations
  const [selectedBoothIds, setSelectedBoothIds] = useState(new Set());
  const [bulkTargetCategory, setBulkTargetCategory] = useState('संवेदनशील');

  // Storage keys
  const boothsStorageKey = `police_election_booths_${activeEventId || 'default'}`;
  const normsStorageKey = `police_election_norms_${activeEventId || 'default'}`;

  // State: Booths List
  const [booths, setBooths] = useState(() => {
    try {
      const saved = localStorage.getItem(boothsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SAMPLE_BOOTHS;
  });

  // State: Category Norms
  const [categoryNorms, setCategoryNorms] = useState(() => {
    try {
      const saved = localStorage.getItem(normsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return { ...DEFAULT_CATEGORY_NORMS, ...parsed };
      }
    } catch (e) {}
    return DEFAULT_CATEGORY_NORMS;
  });

  // Dynamic Categories list
  const allCategories = useMemo(() => {
    return Object.keys(categoryNorms);
  }, [categoryNorms]);

  // Modals state
  const [isAddBoothOpen, setIsAddBoothOpen] = useState(false);
  const [editingBooth, setEditingBooth] = useState(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapFirstOfficer, setSwapFirstOfficer] = useState(null);
  const [swapSecondOfficer, setSwapSecondOfficer] = useState(null);

  // Dedicated Category Update Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTargetBooth, setCategoryModalTargetBooth] = useState(null); // null means bulk update
  const [modalSelectedCategory, setModalSelectedCategory] = useState('संवेदनशील');

  // Add New Custom Category Modal
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatSI, setNewCatSI] = useState(1);
  const [newCatHC, setNewCatHC] = useState(1);
  const [newCatCP, setNewCatCP] = useState(2);
  const [newCatWCP, setNewCatWCP] = useState(0);
  const [newCatHG, setNewCatHG] = useState(2);
  const [newCatCAPF, setNewCatCAPF] = useState(0);

  // Edit Existing Category Modal State
  const [editingCatKey, setEditingCatKey] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatLabel, setEditCatLabel] = useState('');
  const [editCatSI, setEditCatSI] = useState(0);
  const [editCatHC, setEditCatHC] = useState(0);
  const [editCatCP, setEditCatCP] = useState(0);
  const [editCatWCP, setEditCatWCP] = useState(0);
  const [editCatHG, setEditCatHG] = useState(0);
  const [editCatCAPF, setEditCatCAPF] = useState(0);

  // Duty Replacement Modal
  const [isReplacementModalOpen, setIsReplacementModalOpen] = useState(false);
  const [replacementTarget, setReplacementTarget] = useState(null);

  // Quick Add Force Modal
  const [isAddForceModalOpen, setIsAddForceModalOpen] = useState(false);
  const [targetBoothForAdd, setTargetBoothForAdd] = useState(null);
  const [selectedForceToAdd, setSelectedForceToAdd] = useState(null);

  // Form State for Add/Edit Booth
  const [boothForm, setBoothForm] = useState({
    vidhanSabha: '134-अयोध्या',
    sector: 'सेक्टर 01',
    sectorOfficer: '',
    sectorMobile: '',
    centerName: '',
    boothNo: '',
    category: 'सामान्य',
    shift: 'मतदान दिवस (प्रातः 05:30 बजे से मतदान समाप्ति तक)'
  });

  const fileInputRef = useRef(null);
  const eventRecords = activeEvent?.records || [];

  // Helper to categorize officer rank
  const getOfficerCategory = (person) => {
    const rank = (person.rank || '').toLowerCase();
    const name = (person.name || '').toLowerCase();

    if (rank.includes('महिला') || rank.includes('म०का') || rank.includes('wcp') || name.includes('महिला') || person.gender === 'F') {
      return 'female';
    }
    if (rank.includes('उ०नि') || rank.includes('उ0नि') || rank.includes('si') || rank.includes('निरीक्षक') || rank.includes('inspector')) {
      return 'si';
    }
    if (rank.includes('हे०का') || rank.includes('हे0का') || rank.includes('hc') || rank.includes('head')) {
      return 'hc';
    }
    if (rank.includes('होमगार्ड') || rank.includes('हो०गा') || rank.includes('hg')) {
      return 'hg';
    }
    return 'constable';
  };

  // Sync booths & norms when activeEventId or activeEvent changes
  useEffect(() => {
    if (!activeEvent) return;

    if (activeEvent.allocationData?.electionBooths && Array.isArray(activeEvent.allocationData.electionBooths)) {
      setBooths(activeEvent.allocationData.electionBooths);
    } else {
      try {
        const saved = localStorage.getItem(boothsStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBooths(parsed);
          } else {
            setBooths(DEFAULT_SAMPLE_BOOTHS);
          }
        } else {
          setBooths(DEFAULT_SAMPLE_BOOTHS);
        }
      } catch (e) {
        setBooths(DEFAULT_SAMPLE_BOOTHS);
      }
    }

    if (activeEvent.allocationData?.electionNorms && typeof activeEvent.allocationData.electionNorms === 'object') {
      setCategoryNorms({ ...DEFAULT_CATEGORY_NORMS, ...activeEvent.allocationData.electionNorms });
    } else {
      try {
        const saved = localStorage.getItem(normsStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setCategoryNorms({ ...DEFAULT_CATEGORY_NORMS, ...parsed });
          } else {
            setCategoryNorms(DEFAULT_CATEGORY_NORMS);
          }
        } else {
          setCategoryNorms(DEFAULT_CATEGORY_NORMS);
        }
      } catch (e) {
        setCategoryNorms(DEFAULT_CATEGORY_NORMS);
      }
    }
  }, [activeEventId, activeEvent, boothsStorageKey, normsStorageKey]);

  // Global Escape key handler to close all open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAddBoothOpen(false);
        setIsSwapModalOpen(false);
        setIsCategoryModalOpen(false);
        setIsAddCategoryOpen(false);
        setEditingCatKey(null);
        setIsReplacementModalOpen(false);
        setIsAddForceModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save booths & persist (both localStorage and cloud event state)
  const saveBooths = (newBooths) => {
    setBooths(newBooths);
    try {
      localStorage.setItem(boothsStorageKey, JSON.stringify(newBooths));
    } catch (e) {}
    if (typeof onUpdateAllocationData === 'function') {
      onUpdateAllocationData({ electionBooths: newBooths });
    }
  };

  // Save norms & persist (both localStorage and cloud event state)
  const saveNorms = (newNorms) => {
    setCategoryNorms(newNorms);
    try {
      localStorage.setItem(normsStorageKey, JSON.stringify(newNorms));
    } catch (e) {}
    if (typeof onUpdateAllocationData === 'function') {
      onUpdateAllocationData({ electionNorms: newNorms });
    }
  };

  // Deployed counts by booth
  const deployedByBooth = useMemo(() => {
    const map = new Map();
    eventRecords.forEach(r => {
      const place = (r.duty_place || '').trim();
      const boothNo = (r.booth_no || '').trim();
      booths.forEach(b => {
        const fullPlace = `${b.centerName} (बूथ सं० ${b.boothNo})`.trim();
        if (
          (b.boothNo && boothNo && b.boothNo === boothNo) ||
          place === fullPlace ||
          place.includes(`बूथ सं० ${b.boothNo}`) ||
          place === b.centerName
        ) {
          if (!map.has(b.id)) map.set(b.id, []);
          map.get(b.id).push(r);
        }
      });
    });
    return map;
  }, [eventRecords, booths]);

  // Master force breakdown
  const masterStats = useMemo(() => {
    const stats = { si: 0, hc: 0, constable: 0, female: 0, hg: 0, total: masterForce.length };
    masterForce.forEach(p => {
      const cat = getOfficerCategory(p);
      if (cat === 'female') stats.female++;
      else if (cat === 'si') stats.si++;
      else if (cat === 'hc') stats.hc++;
      else if (cat === 'hg') stats.hg++;
      else stats.constable++;
    });
    return stats;
  }, [masterForce]);

  // Demand calculations based on current booth categories & norms
  const demandStats = useMemo(() => {
    const demand = { si: 0, hc: 0, constable: 0, female: 0, hg: 0, total: 0 };
    booths.forEach(b => {
      const norm = categoryNorms[b.category] || categoryNorms['सामान्य'] || { si: 0, hc: 1, cp: 1, wcp: 0, hg: 1 };
      demand.si += Number(norm.si) || 0;
      demand.hc += Number(norm.hc) || 0;
      demand.constable += Number(norm.cp) || 0;
      demand.female += Number(norm.wcp) || 0;
      demand.hg += Number(norm.hg) || 0;
    });
    demand.total = demand.si + demand.hc + demand.constable + demand.female + demand.hg;
    return demand;
  }, [booths, categoryNorms]);

  // Shortage analysis
  const shortageStats = useMemo(() => {
    return {
      si: Math.max(0, demandStats.si - masterStats.si),
      hc: Math.max(0, demandStats.hc - masterStats.hc),
      constable: Math.max(0, demandStats.constable - masterStats.constable),
      female: Math.max(0, demandStats.female - masterStats.female),
      hg: Math.max(0, demandStats.hg - masterStats.hg)
    };
  }, [demandStats, masterStats]);

  // Group booths by centerName to calculate official UP Police 2D centre-based requirements
  const centreGroupingStats = useMemo(() => {
    const centresMap = new Map();
    booths.forEach(b => {
      const cname = (b.centerName || 'अज्ञात केंद्र').trim();
      if (!centresMap.has(cname)) {
        centresMap.set(cname, { centerName: cname, booths: [], category: 'सामान्य' });
      }
      const entry = centresMap.get(cname);
      entry.booths.push(b);
      // Centre category is the highest sensitivity among its booths
      if (b.category === 'क्रिटिकल' || b.category === 'अति-संवेदनशील') entry.category = 'क्रिटिकल';
      else if (b.category === 'संवेदनशील' && entry.category !== 'क्रिटिकल') entry.category = 'संवेदनशील';
    });

    const breakdownByBoothCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, more: 0 };
    const requiredForce = { si: 0, armed_cp: 0, unarmed_cp: 0, hg: 0, capf: 0 };

    centresMap.forEach(c => {
      const bCount = Math.min(c.booths.length, 7);
      if (c.booths.length <= 7) {
        breakdownByBoothCount[bCount] = (breakdownByBoothCount[bCount] || 0) + 1;
      } else {
        breakdownByBoothCount.more = (breakdownByBoothCount.more || 0) + 1;
      }

      // Lookup in ELECTION_2D_BOOTH_NORMS
      const normByCount = ELECTION_2D_BOOTH_NORMS[String(bCount)] || ELECTION_2D_BOOTH_NORMS["1"];
      const catKey = c.category === 'क्रिटिकल' ? 'क्रिटिकल' : (c.category === 'संवेदनशील' ? 'संवेदनशील' : 'सामान्य');
      const catNorm = normByCount ? (normByCount[catKey] || normByCount['सामान्य']) : { si: 0, armed_cp: 1, unarmed_cp: 0, hg: 2, capf: 0 };

      requiredForce.si += catNorm.si || 0;
      requiredForce.armed_cp += catNorm.armed_cp || 0;
      requiredForce.unarmed_cp += catNorm.unarmed_cp || 0;
      requiredForce.hg += catNorm.hg || 0;
      requiredForce.capf += catNorm.capf || 0;
    });

    return {
      totalCentres: centresMap.size,
      breakdownByBoothCount,
      requiredForce,
      centresList: Array.from(centresMap.values())
    };
  }, [booths]);

  // Unique sectors for filtering
  const allSectors = useMemo(() => {
    return Array.from(new Set(booths.map(b => b.sector).filter(Boolean)));
  }, [booths]);

  // Filtered Booths
  const filteredBooths = useMemo(() => {
    return booths.filter(b => {
      if (selectedCategoryFilter !== 'ALL' && b.category !== selectedCategoryFilter) return false;
      if (selectedSectorFilter !== 'ALL' && b.sector !== selectedSectorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchText = `${b.centerName} ${b.boothNo} ${b.sector} ${b.vidhanSabha} ${b.category}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }
      return true;
    });
  }, [booths, selectedCategoryFilter, selectedSectorFilter, searchQuery]);

  // =========================================================
  // MULTI-SELECTION HANDLERS FOR BULK ACTIONS
  // =========================================================
  const handleToggleSelectBooth = (boothId) => {
    const updated = new Set(selectedBoothIds);
    if (updated.has(boothId)) updated.delete(boothId);
    else updated.add(boothId);
    setSelectedBoothIds(updated);
  };

  const handleSelectAllFiltered = () => {
    if (selectedBoothIds.size === filteredBooths.length) {
      setSelectedBoothIds(new Set());
    } else {
      setSelectedBoothIds(new Set(filteredBooths.map(b => b.id)));
    }
  };

  // =========================================================
  // 1. UPDATE BOOTH CATEGORY HANDLERS (SINGLE & BULK)
  // =========================================================
  const handleChangeBoothCategory = (boothId, newCategory) => {
    const updatedBooths = booths.map(b => b.id === boothId ? { ...b, category: newCategory } : b);
    saveBooths(updatedBooths);

    // Also update category on deployed records of this booth
    const targetBooth = booths.find(b => b.id === boothId);
    if (targetBooth) {
      const fullPlaceName = `${targetBooth.centerName} (बूथ सं० ${targetBooth.boothNo})`;
      const updatedRecords = eventRecords.map(r => {
        if (
          (r.duty_place || '').trim() === fullPlaceName ||
          (r.booth_no && r.booth_no === targetBooth.boothNo)
        ) {
          return { ...r, category: newCategory };
        }
        return r;
      });
      onUpdateEventRecords(updatedRecords);
    }
    setSuccessToast(`बूथ संख्या ${targetBooth?.boothNo || ''} की श्रेणी बदलकर '${newCategory}' कर दी गई!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleExecuteBulkCategoryUpdate = (newCategory) => {
    if (selectedBoothIds.size === 0) {
      alert('कृपया पहले उन मतदेय स्थलों (बूथों) का चयन करें जिनकी श्रेणी बदलनी है।');
      return;
    }

    const targetSet = new Set(selectedBoothIds);
    const updatedBooths = booths.map(b => targetSet.has(b.id) ? { ...b, category: newCategory } : b);
    saveBooths(updatedBooths);

    // Update records in active event
    const updatedRecords = eventRecords.map(r => {
      const matchedBooth = updatedBooths.find(b =>
        b.boothNo === r.booth_no ||
        r.duty_place === `${b.centerName} (बूथ सं० ${b.boothNo})`
      );
      if (matchedBooth && targetSet.has(matchedBooth.id)) {
        return { ...r, category: newCategory };
      }
      return r;
    });

    onUpdateEventRecords(updatedRecords);
    const count = selectedBoothIds.size;
    setSelectedBoothIds(new Set());
    setIsCategoryModalOpen(false);
    setCategoryModalTargetBooth(null);
    setSuccessToast(`सफलतापूर्वक ${count} मतदेय स्थलों (बूथों) की श्रेणी '${newCategory}' में अपडेट कर दी गई!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleOpenCategoryModal = (singleBooth = null) => {
    setCategoryModalTargetBooth(singleBooth);
    if (singleBooth) {
      setModalSelectedCategory(singleBooth.category || 'संवेदनशील');
    } else {
      setModalSelectedCategory('संवेदनशील');
    }
    setIsCategoryModalOpen(true);
  };

  // Add Custom Category to Norms
  const handleAddNewCategory = (e) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) {
      alert('कृपया श्रेणी का नाम अवश्य भरें।');
      return;
    }
    if (categoryNorms[cleanName]) {
      alert(`श्रेणी '${cleanName}' पहले से मौजूद है।`);
      return;
    }

    const updated = {
      ...categoryNorms,
      [cleanName]: {
        si: Number(newCatSI) || 0,
        hc: Number(newCatHC) || 0,
        cp: Number(newCatCP) || 0,
        wcp: Number(newCatWCP) || 0,
        hg: Number(newCatHG) || 0,
        capf: Number(newCatCAPF) || 0,
        label: newCatLabel.trim() || `${cleanName} बूथ`,
        color: 'indigo',
        desc: `कस्टम मानक: SI: ${newCatSI}, HC: ${newCatHC}, CP: ${newCatCP}`
      }
    };

    saveNorms(updated);
    setIsAddCategoryOpen(false);
    setNewCatName('');
    setNewCatLabel('');
    setSuccessToast(`नई श्रेणी '${cleanName}' सफलतापूर्वक जोड़ी गई!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Delete Custom Category
  const handleDeleteCategory = (catName) => {
    if (['सामान्य', 'संवेदनशील', 'अति-संवेदनशील', 'क्रिटिकल', 'पिंक'].includes(catName)) {
      alert('मूल डिफॉल्ट श्रेणियों को हटाया नहीं जा सकता।');
      return;
    }
    if (!window.confirm(`क्या आप श्रेणी '${catName}' को हटाना चाहते हैं?`)) return;

    const updated = { ...categoryNorms };
    delete updated[catName];
    saveNorms(updated);

    // Fallback any booths in this category to 'सामान्य'
    const updatedBooths = booths.map(b => b.category === catName ? { ...b, category: 'सामान्य' } : b);
    saveBooths(updatedBooths);
    setSuccessToast(`श्रेणी '${catName}' हटा दी गई।`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Open Edit Existing Category Modal
  const handleOpenEditCategory = (catKey) => {
    const norm = categoryNorms[catKey] || {};
    setEditingCatKey(catKey);
    setEditCatName(catKey);
    setEditCatLabel(norm.label || `${catKey} बूथ`);
    setEditCatSI(norm.si ?? 0);
    setEditCatHC(norm.hc ?? 0);
    setEditCatCP(norm.cp ?? 0);
    setEditCatWCP(norm.wcp ?? 0);
    setEditCatHG(norm.hg ?? 0);
    setEditCatCAPF(norm.capf ?? 0);
  };

  // Save Edited Category (with automatic booth renaming support)
  const handleSaveEditedCategory = (e) => {
    e.preventDefault();
    if (!editingCatKey) return;
    const cleanName = editCatName.trim();
    if (!cleanName) {
      alert('कृपया श्रेणी का नाम अवश्य भरें।');
      return;
    }

    const updatedNorms = { ...categoryNorms };
    const oldNorm = updatedNorms[editingCatKey] || {};

    const newNormData = {
      ...oldNorm,
      si: Number(editCatSI) || 0,
      hc: Number(editCatHC) || 0,
      cp: Number(editCatCP) || 0,
      wcp: Number(editCatWCP) || 0,
      hg: Number(editCatHG) || 0,
      capf: Number(editCatCAPF) || 0,
      label: editCatLabel.trim() || `${cleanName} बूथ`,
      desc: `मानक: SI: ${editCatSI}, HC: ${editCatHC}, CP: ${editCatCP}, HG: ${editCatHG}`
    };

    // If category name was renamed:
    if (cleanName !== editingCatKey) {
      delete updatedNorms[editingCatKey];
      updatedNorms[cleanName] = newNormData;

      // Automatically rename category on all booths in this category
      const updatedBooths = booths.map(b => b.category === editingCatKey ? { ...b, category: cleanName } : b);
      saveBooths(updatedBooths);

      // Automatically rename category on all deployed records in this category
      const updatedRecords = eventRecords.map(r => r.category === editingCatKey ? { ...r, category: cleanName } : r);
      onUpdateEventRecords(updatedRecords);
    } else {
      updatedNorms[cleanName] = newNormData;
    }

    saveNorms(updatedNorms);
    setEditingCatKey(null);
    setSuccessToast(`श्रेणी '${cleanName}' के मानक व विवरण सफलतापूर्वक सुरक्षित हो गए!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // =========================================================
  // 2. AUTOMATIC ALLOCATION ENGINE (ECI/Police Category Norms)
  // =========================================================
  const handleRunElectionAutoAllocation = () => {
    if (masterForce.length === 0) {
      alert('कृपया पहले मास्टर फ़ोर्स में पुलिस जवानों की सूची लोड या सिंक करें।');
      return;
    }
    if (booths.length === 0) {
      alert('कृपया पहले निर्वाचन मतदेय स्थलों (बूथों) की सूची जोड़ें या एक्सेल से अपलोड करें।');
      return;
    }

    let currentAssigned = autoStrategy === 'vacancies_only' ? [...eventRecords] : [];

    const assignedIds = new Set(currentAssigned.map(r => r.pno || r.mobile || r.id).filter(Boolean));
    const assignedMobiles = new Set(currentAssigned.map(r => r.mobile).filter(Boolean));

    let availablePool = masterForce.filter(p => {
      const pid = p.pno || p.mobile || p.id;
      return !assignedIds.has(pid) && !assignedMobiles.has(p.mobile);
    });

    let siPool = availablePool.filter(p => getOfficerCategory(p) === 'si');
    let hcPool = availablePool.filter(p => getOfficerCategory(p) === 'hc');
    let femalePool = availablePool.filter(p => getOfficerCategory(p) === 'female');
    let hgPool = availablePool.filter(p => getOfficerCategory(p) === 'hg');
    let constablePool = availablePool.filter(p => getOfficerCategory(p) === 'constable');

    let newlyAllocatedCount = 0;

    booths.forEach(booth => {
      const norm = categoryNorms[booth.category] || categoryNorms['सामान्य'] || { si: 0, hc: 1, cp: 1, wcp: 0, hg: 1 };
      const fullPlaceName = `${booth.centerName} (बूथ सं० ${booth.boothNo})`;

      const deployedHere = currentAssigned.filter(r =>
        (r.duty_place || '').trim() === fullPlaceName ||
        (r.booth_no && r.booth_no === booth.boothNo)
      );

      const countsHere = { si: 0, hc: 0, female: 0, hg: 0, constable: 0 };
      deployedHere.forEach(r => {
        const cat = getOfficerCategory(r);
        countsHere[cat] = (countsHere[cat] || 0) + 1;
      });

      const quotaItems = [
        { cat: 'si', req: norm.si, defRank: 'उ०नि०', pool: siPool, fallbackPool: hcPool, role: 'बूथ सुरक्षा प्रभारी' },
        { cat: 'hc', req: norm.hc, defRank: 'हे०का०', pool: hcPool, fallbackPool: constablePool, role: 'मतदेय स्थल सुरक्षा' },
        { cat: 'female', req: norm.wcp, defRank: 'म०का०', pool: femalePool, fallbackPool: constablePool, role: 'महिला कतार सुरक्षा' },
        { cat: 'constable', req: norm.cp, defRank: 'का०', pool: constablePool, fallbackPool: hcPool, role: 'ईवीएम व कतार व्यवस्था' },
        { cat: 'hg', req: norm.hg, defRank: 'हो०गा०', pool: hgPool, fallbackPool: constablePool, role: 'प्रवेश द्वार सहायता' }
      ];

      quotaItems.forEach(item => {
        const need = autoStrategy === 'vacancies_only'
          ? Math.max(0, (Number(item.req) || 0) - (countsHere[item.cat] || 0))
          : (Number(item.req) || 0);

        for (let i = 0; i < need; i++) {
          let chosen = null;
          if (item.pool.length > 0) {
            chosen = item.pool.shift();
          } else if (item.fallbackPool && item.fallbackPool.length > 0) {
            chosen = item.fallbackPool.shift();
          } else if (constablePool.length > 0) {
            chosen = constablePool.shift();
          }

          if (chosen) {
            const startNum = currentAssigned.length + 1;
            const newRecord = {
              id: `DUTY-ELEC-${Date.now()}-${startNum}`,
              pno: chosen.pno || `PN-${Date.now()}-${startNum}`,
              name: chosen.name,
              rank: chosen.rank || item.defRank,
              mobile: chosen.mobile || '',
              posting: chosen.posting || 'पुलिस लाइन',
              district: chosen.district || 'अयोध्या',
              zone: booth.vidhanSabha || 'विधानसभा',
              sector: booth.sector || 'सेक्टर 01',
              sector_incharge: booth.sectorOfficer || '',
              sector_mobile: booth.sectorMobile || '',
              duty_place: fullPlaceName,
              booth_no: booth.boothNo,
              vehicle_no: booth.vehicleNo || '',
              center_name: booth.centerName,
              category: booth.category,
              duty_type: 'election',
              shift: booth.shift || 'मतदान दिवस (प्रातः 05:30 बजे से मतदान समाप्ति तक)',
              role: item.role,
              photo: chosen.photo || ''
            };
            currentAssigned.push(newRecord);
            newlyAllocatedCount++;
          }
        }
      });
    });

    onUpdateEventRecords(currentAssigned);
    setSuccessToast(
      autoStrategy === 'vacancies_only'
        ? `सफलतापूर्वक ${newlyAllocatedCount} जवानों की ड्यूटी रिक्त बूथों पर श्रेणी अनुसार आवंटित हो गई!`
        : `सफलतापूर्वक ${currentAssigned.length} जवानों की निर्वाचन बूथ ड्यूटी नए सिरे से आवंटित हो गई!`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // =========================================================
  // 3. ONE-CLICK SWAP HANDLER (अदला-बदली)
  // =========================================================
  const handleExecuteSwap = () => {
    if (!swapFirstOfficer || !swapSecondOfficer) {
      alert('कृपया अदला-बदली के लिए दोनों जवानों का चयन करें।');
      return;
    }

    const updated = eventRecords.map(r => {
      if ((r.id && r.id === swapFirstOfficer.id) || (r.pno && r.pno === swapFirstOfficer.pno)) {
        return {
          ...r,
          duty_place: swapSecondOfficer.duty_place,
          booth_no: swapSecondOfficer.booth_no,
          center_name: swapSecondOfficer.center_name,
          category: swapSecondOfficer.category,
          zone: swapSecondOfficer.zone,
          sector: swapSecondOfficer.sector,
          sector_incharge: swapSecondOfficer.sector_incharge,
          sector_mobile: swapSecondOfficer.sector_mobile
        };
      }
      if ((r.id && r.id === swapSecondOfficer.id) || (r.pno && r.pno === swapSecondOfficer.pno)) {
        return {
          ...r,
          duty_place: swapFirstOfficer.duty_place,
          booth_no: swapFirstOfficer.booth_no,
          center_name: swapFirstOfficer.center_name,
          category: swapFirstOfficer.category,
          zone: swapFirstOfficer.zone,
          sector: swapFirstOfficer.sector,
          sector_incharge: swapFirstOfficer.sector_incharge,
          sector_mobile: swapFirstOfficer.sector_mobile
        };
      }
      return r;
    });

    onUpdateEventRecords(updated);
    setIsSwapModalOpen(false);
    setSwapFirstOfficer(null);
    setSwapSecondOfficer(null);
    setSuccessToast('जवानों की बूथ ड्यूटी सफलतापूर्वक आपस में बदल (Swap) दी गई!');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // =========================================================
  // 4. REMOVE OFFICER FROM BOOTH
  // =========================================================
  const handleRemoveOfficer = (officerRecord) => {
    if (!window.confirm(`क्या आप ${officerRecord.name} (${officerRecord.rank}) को इस बूथ ड्यूटी से हटाकर रिज़र्व पूल में वापस भेजना चाहते हैं?`)) {
      return;
    }
    const filtered = eventRecords.filter(r => {
      if (officerRecord.id && r.id === officerRecord.id) return false;
      if (officerRecord.pno && r.pno === officerRecord.pno) return false;
      return true;
    });
    onUpdateEventRecords(filtered);
    setSuccessToast(`${officerRecord.name} को बूथ ड्यूटी से हटा दिया गया।`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // =========================================================
  // 5. ADD QUICK EXTRA FORCE TO BOOTH
  // =========================================================
  const handleConfirmAddForce = () => {
    if (!targetBoothForAdd || !selectedForceToAdd) {
      alert('कृपया जवान का चयन करें।');
      return;
    }

    const startNum = eventRecords.length + 1;
    const fullPlaceName = `${targetBoothForAdd.centerName} (बूथ सं० ${targetBoothForAdd.boothNo})`;

    const newRecord = {
      id: `DUTY-ELEC-${Date.now()}-${startNum}`,
      pno: selectedForceToAdd.pno || `PN-${Date.now()}-${startNum}`,
      name: selectedForceToAdd.name,
      rank: selectedForceToAdd.rank || 'का०',
      mobile: selectedForceToAdd.mobile || '',
      posting: selectedForceToAdd.posting || 'पुलिस लाइन',
      district: selectedForceToAdd.district || 'अयोध्या',
      zone: targetBoothForAdd.vidhanSabha || 'विधानसभा',
      sector: targetBoothForAdd.sector || 'सेक्टर 01',
      sector_incharge: targetBoothForAdd.sectorOfficer || '',
      sector_mobile: targetBoothForAdd.sectorMobile || '',
      duty_place: fullPlaceName,
      booth_no: targetBoothForAdd.boothNo,
      vehicle_no: targetBoothForAdd.vehicleNo || '',
      center_name: targetBoothForAdd.centerName,
      category: targetBoothForAdd.category,
      duty_type: 'election',
      shift: targetBoothForAdd.shift || 'मतदान दिवस (प्रातः 05:30 बजे से मतदान समाप्ति तक)',
      role: 'अतिरिक्त मतदेय स्थल सुरक्षा',
      photo: selectedForceToAdd.photo || ''
    };

    onUpdateEventRecords([...eventRecords, newRecord]);
    setIsAddForceModalOpen(false);
    setTargetBoothForAdd(null);
    setSelectedForceToAdd(null);
    setSuccessToast(`जवान ${selectedForceToAdd.name} को सफलतापूर्वक बूथ पर तैनात कर दिया गया।`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Available force in reserve for adding
  const availableReserveForce = useMemo(() => {
    const assignedIds = new Set(eventRecords.map(r => r.pno || r.mobile || r.id).filter(Boolean));
    return masterForce.filter(p => !assignedIds.has(p.pno || p.mobile || p.id));
  }, [masterForce, eventRecords]);

  // =========================================================
  // 6. EXCEL TEMPLATE DOWNLOAD & UPLOAD
  // =========================================================
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'विधानसभा_क्षेत्र': '134-अयोध्या',
        'सेक्टर_संख्या': 'सेक्टर 01',
        'सेक्टर_प्रभारी': 'उ०नि० रमेश कुमार यादव',
        'सेक्टर_मोबाइल': '9454401201',
        'मतदान_केंद्र_का_नाम': 'प्राथमिक विद्यालय सआदतगंज',
        'मतदेय_स्थल_संख्या': '141',
        'बूथ_श्रेणी': 'सामान्य'
      },
      {
        'विधानसभा_क्षेत्र': '134-अयोध्या',
        'सेक्टर_संख्या': 'सेक्टर 01',
        'सेक्टर_प्रभारी': 'उ०नि० रमेश कुमार यादव',
        'सेक्टर_मोबाइल': '9454401201',
        'मतदान_केंद्र_का_नाम': 'प्राथमिक विद्यालय सआदतगंज',
        'मतदेय_स्थल_संख्या': '142',
        'बूथ_श्रेणी': 'संवेदनशील'
      },
      {
        'विधानसभा_क्षेत्र': '134-अयोध्या',
        'सेक्टर_संख्या': 'सेक्टर 02',
        'सेक्टर_प्रभारी': 'उ०नि० दिनेश प्रताप सिंह',
        'सेक्टर_मोबाइल': '9454401202',
        'मतदान_केंद्र_का_नाम': 'राजकीय इंटर कॉलेज फैजाबाद',
        'मतदेय_स्थल_संख्या': '143',
        'बूथ_श्रेणी': 'पिंक'
      },
      {
        'विधानसभा_क्षेत्र': '134-अयोध्या',
        'सेक्टर_संख्या': 'सेक्टर 02',
        'सेक्टर_प्रभारी': 'उ०नि० दिनेश प्रताप सिंह',
        'सेक्टर_मोबाइल': '9454401202',
        'मतदान_केंद्र_का_नाम': 'कन्या पूर्व माध्यमिक विद्यालय नाका',
        'मतदेय_स्थल_संख्या': '144',
        'बूथ_श्रेणी': 'अति-संवेदनशील'
      },
      {
        'विधानसभा_क्षेत्र': '134-अयोध्या',
        'सेक्टर_संख्या': 'सेक्टर 03',
        'सेक्टर_प्रभारी': 'उ०नि० सुनील तिवारी',
        'सेक्टर_मोबाइल': '9454401203',
        'मतदान_केंद्र_का_नाम': 'कन्या पूर्व माध्यमिक विद्यालय नाका',
        'मतदेय_स्थल_संख्या': '145',
        'बूथ_श्रेणी': 'क्रिटिकल'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Election_Booths_Template');
    XLSX.writeFile(workbook, 'Election_Polling_Booths_Sample_Template.xlsx');
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          alert('एक्सेल फाइल में कोई डेटा प्राप्त नहीं हुआ।');
          return;
        }

        const parsedBooths = data.map((row, idx) => {
          const vs = row['विधानसभा_क्षेत्र'] || row['विधानसभा'] || row['विधान सभा'] || row['assembly'] || '134-अयोध्या';
          const sec = row['सेक्टर_संख्या'] || row['सेक्टर'] || row['सेक्टर सं0'] || row['sector'] || 'सेक्टर 01';
          const so = row['सेक्टर_प्रभारी'] || row['sector_officer'] || row['प्रभारी'] || row['थाना'] || '';
          const sm = row['सेक्टर_मोबाइल'] || row['sector_mobile'] || row['मोबाइल'] || '';
          const center = row['मतदान_केंद्र_का_नाम'] || row['मतदान_केंद्र'] || row['मतदान केन्द्र का नाम व संख्या'] || row['मतदान केन्द्र का नाम'] || row['center'] || row['station'] || `मतदान केंद्र ${idx + 1}`;
          const bno = String(row['मतदेय_स्थल_संख्या'] || row['मतदेय स्थल की संख्या'] || row['बूथ_संख्या'] || row['बूथ सं०'] || row['booth'] || row['booth_no'] || row['क्र0सं0/मतदान केन्द्र नं0'] || idx + 1);
          const vehicleNo = String(row['वा0 सं0'] || row['वाहन सं०'] || row['वाहन_संख्या'] || row['बस नं०'] || row['bus_no'] || '').trim();
          let cat = String(row['बूथ_श्रेणी'] || row['श्रेणी'] || row['category'] || row['क्रिटिकल / सामान्य'] || 'सामान्य').trim();

          if (!allCategories.includes(cat)) {
            if (cat.includes('अति')) cat = 'अति-संवेदनशील';
            else if (cat.includes('संवेदन')) cat = 'संवेदनशील';
            else if (cat.includes('पिंक') || cat.includes('महिला')) cat = 'पिंक';
            else if (cat.includes('क्रिटिकल') || cat.includes('वल्न')) cat = 'क्रिटिकल';
            else cat = 'सामान्य';
          }

          return {
            id: `EB-IMP-${Date.now()}-${idx + 1}`,
            vidhanSabha: String(vs).trim(),
            sector: String(sec).trim(),
            sectorOfficer: String(so).trim(),
            sectorMobile: String(sm).trim(),
            centerName: String(center).trim(),
            boothNo: String(bno).trim(),
            vehicleNo: vehicleNo,
            category: cat,
            shift: 'मतदान दिवस (प्रातः 05:30 बजे से मतदान समाप्ति तक)'
          };
        });

        saveBooths(parsedBooths);
        setActiveSubTab('booths');
        setSuccessToast(`सफलतापूर्वक ${parsedBooths.length} निर्वाचन मतदेय स्थल (बूथ) एक्सेल से लोड हो गए!`);
        setTimeout(() => setSuccessToast(null), 5000);
      } catch (err) {
        alert('एक्सेल फाइल पढ़ने में त्रुटि: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Add / Edit Manual Booth Form Submit
  const handleSaveBoothForm = (e) => {
    e.preventDefault();
    if (!boothForm.centerName.trim() || !boothForm.boothNo.trim()) {
      alert('कृपया मतदान केंद्र का नाम एवं मतदेय स्थल (बूथ संख्या) अवश्य भरें।');
      return;
    }

    if (editingBooth) {
      const updated = booths.map(b => b.id === editingBooth.id ? { ...b, ...boothForm } : b);
      saveBooths(updated);
      setEditingBooth(null);
    } else {
      const newB = {
        id: `EB-${Date.now()}`,
        ...boothForm
      };
      saveBooths([...booths, newB]);
    }

    setIsAddBoothOpen(false);
    setBoothForm({
      vidhanSabha: '134-अयोध्या',
      sector: 'सेक्टर 01',
      sectorOfficer: '',
      sectorMobile: '',
      centerName: '',
      boothNo: '',
      category: 'सामान्य',
      shift: 'मतदान दिवस (प्रातः 05:30 बजे से मतदान समाप्ति तक)'
    });
  };

  const handleDeleteBooth = (boothId) => {
    const targetBooth = booths.find(b => b.id === boothId);
    if (!targetBooth) return;
    if (!window.confirm(`क्या आप मतदेय स्थल (बूथ सं० ${targetBooth.boothNo}) को हटाना चाहते हैं? इसके तैनात जवानों का आवंटन भी स्वतः निरस्त हो जाएगा।`)) return;

    const updatedBooths = booths.filter(b => b.id !== boothId);
    saveBooths(updatedBooths);

    // Also remove any deployed force records assigned to this deleted booth
    const fullPlaceName = `${targetBooth.centerName} (बूथ सं० ${targetBooth.boothNo})`;
    const updatedRecords = eventRecords.filter(r =>
      !(
        (r.booth_no && targetBooth.boothNo && String(r.booth_no).trim() === String(targetBooth.boothNo).trim()) ||
        (r.duty_place || '').trim() === fullPlaceName ||
        (r.duty_place || '').trim() === targetBooth.centerName
      )
    );
    if (updatedRecords.length !== eventRecords.length) {
      onUpdateEventRecords(updatedRecords);
    }
    setSuccessToast(`बूथ सं० ${targetBooth.boothNo} और उसकी तैनाती हटा दी गई।`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleClearAllBooths = () => {
    if (booths.length === 0) return;
    if (!window.confirm(`क्या आप सभी ${booths.length} मतदेय स्थलों को हटाना चाहते हैं? इससे सभी बूथों का आवंटन भी निरस्त हो जाएगा।`)) return;
    saveBooths([]);
    const remainingRecords = eventRecords.filter(r => r.duty_type !== 'election' && !r.booth_no);
    onUpdateEventRecords(remainingRecords);
    setSuccessToast('सभी मतदेय स्थल और निर्वाचन आवंटन हटा दिए गए हैं।');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleResetSampleBooths = () => {
    if (!window.confirm('क्या आप डिफ़ॉल्ट सैंपल बूथ (5 आदर्श मतदेय स्थल) लोड करना चाहते हैं?')) return;
    saveBooths(DEFAULT_SAMPLE_BOOTHS);
    setSuccessToast('डिफ़ॉल्ट सैंपल बूथ सफलतापूर्वक लोड किए गए।');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleExportFullAllocationToExcel = () => {
    if (booths.length === 0) {
      alert('एक्सपोर्ट के लिए कोई बूथ उपलब्ध नहीं है।');
      return;
    }

    const exportRows = [];
    booths.forEach((booth, bIdx) => {
      const assigned = deployedByBooth.get(booth.id) || [];
      if (assigned.length === 0) {
        exportRows.push({
          'क्रमांक': bIdx + 1,
          'विधानसभा': booth.vidhanSabha || '',
          'सेक्टर': booth.sector || '',
          'सेक्टर प्रभारी': booth.sectorOfficer || '',
          'सेक्टर मोबाइल': booth.sectorMobile || '',
          'मतदान केंद्र': booth.centerName || '',
          'मतदेय स्थल (बूथ सं०)': booth.boothNo || '',
          'बूथ श्रेणी': booth.category || 'सामान्य',
          'तैनात जवान का नाम': '— रिक्त (कोई जवान नहीं) —',
          'पद (Rank)': '',
          'PNO': '',
          'मोबाइल नंबर': '',
          'आवंटित दायित्व': '',
          'मूल तैनाती/थाना': '',
          'शिफ्ट': booth.shift || ''
        });
      } else {
        assigned.forEach((officer) => {
          exportRows.push({
            'क्रमांक': bIdx + 1,
            'विधानसभा': booth.vidhanSabha || '',
            'सेक्टर': booth.sector || '',
            'सेक्टर प्रभारी': booth.sectorOfficer || '',
            'सेक्टर मोबाइल': booth.sectorMobile || '',
            'मतदान केंद्र': booth.centerName || '',
            'मतदेय स्थल (बूथ सं०)': booth.boothNo || '',
            'बूथ श्रेणी': booth.category || 'सामान्य',
            'तैनात जवान का नाम': officer.name || '',
            'पद (Rank)': officer.rank || '',
            'PNO': officer.pno || '',
            'मोबाइल नंबर': officer.mobile || '',
            'आवंटित दायित्व': officer.role || 'मतदेय स्थल सुरक्षा',
            'मूल तैनाती/थाना': officer.posting || '',
            'शिफ्ट': officer.shift || booth.shift || ''
          });
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Election_Booth_Deployment');
    const safeTitle = (activeEvent?.title || activeEvent?.name || 'Election_Duty').replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '_');
    XLSX.writeFile(workbook, `${safeTitle}_Booth_Deployment_Roster.xlsx`);
  };

  // Helper for category badge styling (Clean Enterprise Chips)
  const getCategoryBadgeClass = (category) => {
    if (category === 'संवेदनशील') return 'bg-amber-50 text-amber-700 border-amber-200/80 font-semibold';
    if (category === 'अति-संवेदनशील') return 'bg-orange-50 text-orange-700 border-orange-200/80 font-semibold';
    if (category === 'क्रिटिकल') return 'bg-rose-50 text-rose-700 border-rose-200/80 font-semibold';
    if (category === 'पिंक') return 'bg-pink-50 text-pink-700 border-pink-200/80 font-semibold';
    return 'bg-blue-50 text-blue-700 border-blue-200/80 font-semibold';
  };

  return (
    <div className="space-y-5 select-none font-devanagari max-w-7xl mx-auto pb-16">
      {/* 1. Header Card (Title, Actions, KPI Metrics & Tabs in Single Baseline Box) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">
                  निर्वाचन मतदेय स्थल (बूथ) ड्यूटी आवंटन
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  ECI एवं पुलिस मानक
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ECI मानक अनुसार बूथवार पुलिस बल परिनियोजन
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenCategoryModal(null)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 transition border border-slate-200 text-xs font-medium cursor-pointer"
              title="चयनित या विशिष्ट बूथों की श्रेणी अपडेट करें"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>श्रेणी अपडेट</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingBooth(null);
                setBoothForm({
                  vidhanSabha: '134-अयोध्या',
                  sector: 'सेक्टर 01',
                  sectorOfficer: '',
                  sectorMobile: '',
                  centerName: '',
                  boothNo: '',
                  category: 'सामान्य',
                  shift: 'मतदान दिवस (प्रातः 05:30 बजे से मतदान समाप्ति तक)'
                });
                setIsAddBoothOpen(true);
              }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 transition text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ नया बूथ जोड़ें</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('upload')}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 transition border border-slate-200 text-xs font-medium cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              <span>एक्सेल अपलोड</span>
            </button>
          </div>
        </div>

        {/* 4-Metric Grid inside bordered box */}
        <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200/80 bg-slate-50/40 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80 p-4">
          <div className="px-3 py-1">
            <div className="text-xs text-slate-500">कुल मतदेय स्थल</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">{booths.length}</span>
              <span className="text-xs text-slate-500">बूथ</span>
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="text-xs text-slate-500">मास्टर फ़ोर्स (उपलब्ध)</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">{masterForce.length}</span>
              <span className="text-xs text-slate-500">जवान</span>
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="text-xs text-slate-500">कुल बल की मांग</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900">{demandStats.total}</span>
              <span className="text-xs text-slate-500">मांग</span>
            </div>
          </div>

          <div className="px-3 py-1">
            <div className="text-xs text-slate-500">वर्तमान में तैनात जवान</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-600">{eventRecords.length}</span>
              <span className="text-xs text-slate-500">तैनात</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-1 bg-slate-100 rounded-xl inline-flex items-center gap-1 border border-slate-200/60 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab('booths')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'booths'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>1. बूथ एवं तैनाती ग्रिड</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('norms')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'norms'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>2. श्रेणी मानक सेटिंग्स</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('allocate')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'allocate'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. स्मार्ट ऑटो-आवंटन</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('upload')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'upload'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>4. एक्सेल अपलोड/टेम्पलेट</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-sm font-bold">✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: BOOTHS & DEPLOYMENT GRID                           */}
      {/* ========================================================= */}
      {activeSubTab === 'booths' && (
        <div className="space-y-4">
          {/* Filters & Actions Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="मतदान केंद्र, बूथ संख्या या सेक्टर खोजें..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:border-slate-400"
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs cursor-pointer focus:outline-none focus:border-slate-400"
                >
                  <option value="ALL">सभी श्रेणियां ({booths.length})</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat} ({booths.filter(b => b.category === cat).length})</option>
                  ))}
                </select>

                {allSectors.length > 0 && (
                  <select
                    value={selectedSectorFilter}
                    onChange={(e) => setSelectedSectorFilter(e.target.value)}
                    className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs cursor-pointer focus:outline-none focus:border-slate-400"
                  >
                    <option value="ALL">सभी सेक्टर ({allSectors.length})</option>
                    {allSectors.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200/90 text-xs shadow-2xs"
                  title="सभी प्रदर्शित बूथों को चुनें/हटाएं"
                >
                  {selectedBoothIds.size === filteredBooths.length && filteredBooths.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-slate-900" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>सभी चुनें</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCategoryModal(null)}
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200/90 text-xs shadow-2xs"
                >
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span>श्रेणी अपडेट</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(true)}
                  className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs shadow-xs"
                  title="दो जवानों या बूथों की ड्यूटी आपस में बदलें"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>अदला-बदली (Swap)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFullAllocationToExcel}
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200/90 text-xs shadow-2xs"
                  title="संपूर्ण मतदेय स्थल एवं तैनात पुलिसकर्मियों का विवरण एक्सेल में डाउनलोड करें"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>एक्सेल रोस्टर</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSampleBooths}
                  className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200/90 text-xs shadow-2xs"
                  title="डिफ़ॉल्ट 5 सैंपल बूथ लोड करें"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>सैंपल</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllBooths}
                  className="h-9 px-3 bg-white hover:bg-rose-50 text-rose-600 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border border-rose-200 shadow-2xs text-xs"
                  title="सभी मतदेय स्थल एवं आवंटन हटाएं"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>सभी हटाएं</span>
                </button>
              </div>
            </div>
          </div>

          {/* BULK CATEGORY UPDATE ACTION BAR */}
          {selectedBoothIds.size > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-2.5">
                <Tag className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                <span>चयनित <strong className="text-amber-300 font-mono text-sm sm:text-base">{selectedBoothIds.size} मतदेय स्थलों</strong> की श्रेणी अपडेट करें:</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <select
                  value={bulkTargetCategory}
                  onChange={(e) => setBulkTargetCategory(e.target.value)}
                  className="h-9 px-3 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-semibold cursor-pointer focus:outline-none flex-1 sm:flex-initial"
                >
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleExecuteBulkCategoryUpdate(bulkTargetCategory)}
                  className="h-9 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition active:scale-95"
                >
                  लागू करें (Apply)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBoothIds(new Set())}
                  className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  title="चयन रद्द करें"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Booth Cards Grid */}
          {filteredBooths.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <div className="font-bold text-slate-800 text-base">कोई मतदेय स्थल (बूथ) नहीं मिला!</div>
              <p className="text-xs text-slate-500 mt-1">कोई बूथ नहीं मिला। नया बूथ जोड़ने हेतु '+ नया बूथ जोड़ें' पर क्लिक करें।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBooths.map(booth => {
                const isSelected = selectedBoothIds.has(booth.id);
                const deployed = deployedByBooth.get(booth.id) || [];
                const norm = categoryNorms[booth.category] || categoryNorms['सामान्य'] || { si: 0, hc: 1, cp: 1, wcp: 0, hg: 1 };
                const requiredTotal = (Number(norm.si) || 0) + (Number(norm.hc) || 0) + (Number(norm.cp) || 0) + (Number(norm.wcp) || 0) + (Number(norm.hg) || 0);
                const isFull = deployed.length >= requiredTotal;

                const catBadge = getCategoryBadgeClass(booth.category);

                return (
                  <div
                    key={booth.id}
                    className={`bg-white rounded-xl border p-4 flex flex-col justify-between shadow-xs transition-all ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleSelectBooth(booth.id)}
                            className="mt-0.5 text-slate-400 hover:text-slate-900 cursor-pointer shrink-0 transition"
                            title="चुनें"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white shadow-2xs">
                                बूथ #{booth.boothNo}
                              </span>

                              <span className={`text-xs px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${catBadge}`}>
                                {booth.category}
                              </span>

                              <span className="text-xs text-slate-500 font-medium">
                                {booth.sector}
                              </span>
                            </div>

                            <h3 className="font-semibold text-slate-900 text-sm sm:text-base mt-1.5 truncate">
                              {booth.centerName}
                            </h3>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>विधानसभा: <strong className="text-slate-700 font-medium">{booth.vidhanSabha}</strong></span>
                              {booth.sectorOfficer && (
                                <span>• सेक्टर अधिकारी: <strong className="text-slate-700 font-medium">{booth.sectorOfficer}</strong> ({booth.sectorMobile || '-'})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions on Top Right (Clean icon buttons) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenCategoryModal(booth)}
                            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                            title="क्लिक करके श्रेणी बदलें"
                          >
                            <Tag className="w-3 h-3 text-slate-500" />
                            <span>श्रेणी</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingBooth(booth);
                              setBoothForm({ ...booth });
                              setIsAddBoothOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="संपादित करें"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteBooth(booth.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Deployment Standard vs Current Banner */}
                      <div className="mt-3 flex items-center justify-between text-xs bg-slate-50/80 px-3 py-1.5 rounded-lg border border-slate-200/60 font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-400">मानक:</span>
                          <span className="text-slate-700">
                            {norm.si ? `उ०नि०: ${norm.si} ` : ''}{norm.hc ? `हे०का०: ${norm.hc} ` : ''}{norm.cp ? `का०: ${norm.cp} ` : ''}{norm.wcp ? `म०का०: ${norm.wcp} ` : ''}{norm.hg ? `हो०गा०: ${norm.hg}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <span className="text-slate-400 font-sans">तैनात:</span>
                          <span className={`font-semibold ${isFull ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {deployed.length} / {requiredTotal}
                          </span>
                          {isFull ? (
                            <span className="text-xs text-emerald-600">✓</span>
                          ) : (
                            <span className="text-xs text-amber-600">⚠️</span>
                          )}
                        </div>
                      </div>

                      {/* Deployed Personnel List */}
                      <div className="mt-3 space-y-1.5">
                        {deployed.length === 0 ? (
                          <div className="p-3 rounded-lg bg-amber-50/50 border border-dashed border-amber-200 flex items-center justify-between gap-2 text-xs">
                            <span className="text-amber-800">तैनाती प्रतीक्षित ({requiredTotal} जवानों की आवश्यकता)</span>
                            <button
                              type="button"
                              onClick={() => setActiveSubTab('allocate')}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                            >
                              ऑटो-आवंटन करें →
                            </button>
                          </div>
                        ) : (
                          deployed.map((rec, rIdx) => (
                            <div
                              key={rec.id || rIdx}
                              className="p-2 rounded-lg bg-slate-50/60 hover:bg-slate-100/70 border border-slate-200/50 flex items-center justify-between gap-2 text-xs transition-colors"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="w-5 h-5 rounded bg-slate-200/70 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 font-mono">
                                  {rIdx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                    <span>{rec.name}</span>
                                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                                      {rec.rank || 'जवान'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    <span>{rec.pno ? `PNO: ${rec.pno}` : `मो०: ${rec.mobile || '-'}`}</span>
                                    {rec.role && <span className="text-slate-600 font-sans ml-1">({rec.role})</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplacementTarget(rec);
                                    setIsReplacementModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded text-xs border border-slate-200 transition cursor-pointer shadow-2xs font-medium"
                                  title="रिज़र्व से बदलें"
                                >
                                  बदलें
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOfficer(rec)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                  title="ड्यूटी से हटाएं"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Bottom Action: Add Force */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          setTargetBoothForAdd(booth);
                          setIsAddForceModalOpen(true);
                        }}
                        className="font-medium text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>अतिरिक्त जवान जोड़ें</span>
                      </button>

                      <span className="text-[11px] text-slate-400">
                        शिफ्ट: मतदान दिवस (05:30 से समाप्ति तक)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CATEGORY NORMS CONFIGURATOR                        */}
      {/* ========================================================= */}
      {activeSubTab === 'norms' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                <span>बूथ श्रेणी अनुसार पुलिस सुरक्षा मानक (ECI Norms)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                प्रति बूथ आवश्यक पुलिस बल संख्या निर्धारण
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>नई श्रेणी जोड़ें</span>
              </button>

              <button
                onClick={() => saveNorms(DEFAULT_CATEGORY_NORMS)}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-200 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>डिफ़ॉल्ट रीसेट</span>
              </button>
            </div>
          </div>

          {/* Norms Mode Switcher (2D Matrix vs Category vs Law & Order) */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setNormViewTab('2d_matrix')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer ${
                normViewTab === '2d_matrix'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Building className="w-4 h-4 text-amber-400" />
              <span>आधिकारिक 2D मानक (1 से 7 मतदेय स्थल)</span>
            </button>

            <button
              type="button"
              onClick={() => setNormViewTab('category')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer ${
                normViewTab === 'category'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              <span>श्रेणीवार एकल बूथ मानक</span>
            </button>

            <button
              type="button"
              onClick={() => setNormViewTab('law_order')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer ${
                normViewTab === 'law_order'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>कानून-व्यवस्था मानक (18 बिंदु)</span>
            </button>
          </div>

          {/* VIEW 1: OFFICIAL UP POLICE 2D MATRIX (1 to 7 Booths) */}
          {normViewTab === '2d_matrix' && (
            <div className="space-y-6">
              {/* Centre-Based Force Calculation Cards */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-amber-600" />
                    <span className="font-black text-slate-950 text-sm sm:text-base">
                      जनपद मतदान केन्द्र क्लस्टरिंग एवं आवश्यक बल आकलन (2D Standard Audit)
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-900">
                    कुल मतदान केंद्र: {centreGroupingStats.totalCentres} • कुल मतदेय स्थल: {booths.length}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-500">उ०नि० (SI) आवश्यकता</div>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">
                      {centreGroupingStats.requiredForce.si}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-500">सशस्त्र का० (Armed CP)</div>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">
                      {centreGroupingStats.requiredForce.armed_cp}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-500">निःशस्त्र का० (Unarmed CP)</div>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">
                      {centreGroupingStats.requiredForce.unarmed_cp}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-500">होमगार्ड (HG)</div>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">
                      {centreGroupingStats.requiredForce.hg}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-slate-500">CPMF सेक्शन (अर्धसैनिक)</div>
                    <div className="text-xl font-black text-purple-900 font-mono mt-1">
                      {centreGroupingStats.requiredForce.capf} Sec
                    </div>
                  </div>
                </div>

                {/* Breakdown by booth count per centre */}
                <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-700">
                  <span className="font-bold text-slate-900">केंद्रों का आकार:</span>
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <span key={num} className="px-2 py-0.5 rounded-md bg-white border border-amber-200 font-mono">
                      {num}-बूथ केंद्र: <strong>{centreGroupingStats.breakdownByBoothCount[num] || 0}</strong>
                    </span>
                  ))}
                  {centreGroupingStats.breakdownByBoothCount.more > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-700 font-mono">
                      7+ बूथ केंद्र: <strong>{centreGroupingStats.breakdownByBoothCount.more}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* 2D Norms Table (1 to 7 Booths) */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-center">
                      <th className="p-3 text-left w-28">केन्द्र पर बूथ संख्या</th>
                      <th className="p-3 border-l border-slate-700" colSpan={5}>सामान्य मतदेय स्थल मानक</th>
                      <th className="p-3 border-l border-slate-700" colSpan={5}>संवेदनशील मतदेय स्थल मानक</th>
                      <th className="p-3 border-l border-slate-700" colSpan={5}>क्रिटिकल मतदेय स्थल मानक</th>
                    </tr>
                    <tr className="bg-slate-100 text-slate-700 font-bold text-[11px] text-center border-b border-slate-200">
                      <th className="p-2 text-left">संख्या</th>
                      <th className="p-2 border-l border-slate-200">उ०नि०</th>
                      <th className="p-2">सश०का०</th>
                      <th className="p-2">निः०का०</th>
                      <th className="p-2">हो०गा०</th>
                      <th className="p-2">CPMF</th>
                      <th className="p-2 border-l border-slate-200">उ०नि०</th>
                      <th className="p-2">सश०का०</th>
                      <th className="p-2">निः०का०</th>
                      <th className="p-2">हो०गा०</th>
                      <th className="p-2">CPMF</th>
                      <th className="p-2 border-l border-slate-200">उ०नि०</th>
                      <th className="p-2">सश०का०</th>
                      <th className="p-2">निः०का०</th>
                      <th className="p-2">हो०गा०</th>
                      <th className="p-2">CPMF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-center font-bold">
                    {Object.entries(ELECTION_2D_BOOTH_NORMS).map(([count, row]) => (
                      <tr key={count} className="hover:bg-amber-50/50">
                        <td className="p-3 text-left font-black text-slate-950 bg-slate-50">
                          {count} मतदेय स्थल
                        </td>
                        {/* Normal */}
                        <td className="p-2.5 border-l border-slate-200 font-mono text-slate-900">{row['सामान्य'].si}</td>
                        <td className="p-2.5 font-mono text-slate-900">{row['सामान्य'].armed_cp}</td>
                        <td className="p-2.5 font-mono text-slate-900">{row['सामान्य'].unarmed_cp}</td>
                        <td className="p-2.5 font-mono text-slate-900">{row['सामान्य'].hg}</td>
                        <td className="p-2.5 font-mono text-slate-900">{row['सामान्य'].capf || '-'}</td>
                        {/* Sensitive */}
                        <td className="p-2.5 border-l border-slate-200 font-mono text-amber-950 bg-amber-50/30">{row['संवेदनशील'].si}</td>
                        <td className="p-2.5 font-mono text-amber-950 bg-amber-50/30">{row['संवेदनशील'].armed_cp}</td>
                        <td className="p-2.5 font-mono text-amber-950 bg-amber-50/30">{row['संवेदनशील'].unarmed_cp}</td>
                        <td className="p-2.5 font-mono text-amber-950 bg-amber-50/30">{row['संवेदनशील'].hg}</td>
                        <td className="p-2.5 font-mono text-purple-900 bg-amber-50/30">{row['संवेदनशील'].capf ? `${row['संवेदनशील'].capf} Sec` : '-'}</td>
                        {/* Critical */}
                        <td className="p-2.5 border-l border-slate-200 font-mono text-purple-950 bg-purple-50/30">{row['क्रिटिकल'].si}</td>
                        <td className="p-2.5 font-mono text-purple-950 bg-purple-50/30">{row['क्रिटिकल'].armed_cp}</td>
                        <td className="p-2.5 font-mono text-purple-950 bg-purple-50/30">{row['क्रिटिकल'].unarmed_cp}</td>
                        <td className="p-2.5 font-mono text-purple-950 bg-purple-50/30">{row['क्रिटिकल'].hg}</td>
                        <td className="p-2.5 font-mono text-purple-950 bg-purple-50/30">{row['क्रिटिकल'].capf ? `${row['क्रिटिकल'].capf} Sec` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: 18 LAW & ORDER STANDARDS */}
          {normViewTab === 'law_order' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-950">
                    उत्तर प्रदेश पुलिस निर्वाचन कानून-व्यवस्था मानक (18 आधिकारिक बिंदु)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    थाना मोबाइल, क्यूआरटी, जोनल/सेक्टर मजिस्ट्रेट हमराह, एफएसटी, एसएसटी व स्ट्रॉन्ग रूम सुरक्षा मानक
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ELECTION_LAW_ORDER_MANAK.map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-amber-300 transition shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                        {idx + 1}. {item.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {item.id}
                      </span>
                    </div>

                    <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs font-bold text-amber-950">
                      मानक: {item.desc}
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                      <div className="p-1 bg-white rounded border border-slate-200">
                        <span className="text-slate-400 block text-[9px]">उ०नि०</span>
                        <strong className="text-slate-900">{item.si}</strong>
                      </div>
                      <div className="p-1 bg-white rounded border border-slate-200">
                        <span className="text-slate-400 block text-[9px]">सशस्त्र</span>
                        <strong className="text-slate-900">{item.armed_cp}</strong>
                      </div>
                      <div className="p-1 bg-white rounded border border-slate-200">
                        <span className="text-slate-400 block text-[9px]">निःशस्त्र</span>
                        <strong className="text-slate-900">{item.unarmed_cp}</strong>
                      </div>
                      <div className="p-1 bg-white rounded border border-slate-200">
                        <span className="text-slate-400 block text-[9px]">हो०गा०</span>
                        <strong className="text-slate-900">{item.hg}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 2: CATEGORY-WISE EDITABLE SINGLE BOOTH NORMS */}
          {normViewTab === 'category' && (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold text-center border-b border-slate-200">
                  <th className="p-2.5 text-left">बूथ की श्रेणी</th>
                  <th className="p-2.5">उ०नि० (SI)</th>
                  <th className="p-2.5">हे०का० (HC)</th>
                  <th className="p-2.5">आरक्षी (CP)</th>
                  <th className="p-2.5">म० आरक्षी (WCP)</th>
                  <th className="p-2.5">होमगार्ड (HG)</th>
                  <th className="p-3">सीएपीएफ/पीएसी</th>
                  <th className="p-3">प्रति बूथ कुल बल</th>
                  <th className="p-3 rounded-r-xl">कार्रवाई</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-bold">
                {allCategories.map(cat => {
                  const norm = categoryNorms[cat] || DEFAULT_CATEGORY_NORMS[cat];
                  const total = (Number(norm.si) || 0) + (Number(norm.hc) || 0) + (Number(norm.cp) || 0) + (Number(norm.wcp) || 0) + (Number(norm.hg) || 0) + (Number(norm.capf) || 0);
                  const boothCount = booths.filter(b => b.category === cat).length;
                  const isDefault = ['सामान्य', 'संवेदनशील', 'अति-संवेदनशील', 'क्रिटिकल', 'पिंक'].includes(cat);

                  return (
                    <tr key={cat} className="hover:bg-amber-50/40 text-center">
                      <td className="p-3.5 text-left font-black text-slate-950">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <span>{cat} बूथ</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          वर्तमान में {boothCount} बूथ इस श्रेणी में हैं
                        </div>
                      </td>

                      {/* SI */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={norm.si}
                          onChange={(e) => {
                            const updated = { ...categoryNorms, [cat]: { ...norm, si: Number(e.target.value) || 0 } };
                            saveNorms(updated);
                          }}
                          className="w-14 h-9 text-center bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* HC */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={norm.hc}
                          onChange={(e) => {
                            const updated = { ...categoryNorms, [cat]: { ...norm, hc: Number(e.target.value) || 0 } };
                            saveNorms(updated);
                          }}
                          className="w-14 h-9 text-center bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* CP */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={norm.cp}
                          onChange={(e) => {
                            const updated = { ...categoryNorms, [cat]: { ...norm, cp: Number(e.target.value) || 0 } };
                            saveNorms(updated);
                          }}
                          className="w-14 h-9 text-center bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* WCP */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={norm.wcp}
                          onChange={(e) => {
                            const updated = { ...categoryNorms, [cat]: { ...norm, wcp: Number(e.target.value) || 0 } };
                            saveNorms(updated);
                          }}
                          className="w-14 h-9 text-center bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* HG */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={norm.hg}
                          onChange={(e) => {
                            const updated = { ...categoryNorms, [cat]: { ...norm, hg: Number(e.target.value) || 0 } };
                            saveNorms(updated);
                          }}
                          className="w-14 h-9 text-center bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* CAPF */}
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={norm.capf || 0}
                          onChange={(e) => {
                            const updated = { ...categoryNorms, [cat]: { ...norm, capf: Number(e.target.value) || 0 } };
                            saveNorms(updated);
                          }}
                          className="w-14 h-9 text-center bg-slate-50 border border-slate-300 rounded-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>

                      {/* Total */}
                      <td className="p-2 font-mono font-black text-slate-900 text-sm">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-950 rounded-lg">
                          {total} जवान
                        </span>
                      </td>

                      {/* Action buttons: Edit for all categories + Delete for custom */}
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCategory(cat)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="इस श्रेणी के मानक व नाम संपादित करें"
                          >
                            <Edit className="w-3.5 h-3.5 text-indigo-600" />
                            <span>संपादित करें</span>
                          </button>
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                              title="श्रेणी हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Bar below Table with Guidance and Save All Button */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>मानक संख्या सीधे इनपुट में बदलें या "संपादित करें" दबाएं।</span>
            </div>
            <button
              type="button"
              onClick={() => {
                saveNorms({ ...categoryNorms });
                setSuccessToast('सभी श्रेणियों के मानक सफलतापूर्वक सुरक्षित कर लिए गए!');
                setTimeout(() => setSuccessToast(null), 3500);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition text-xs sm:text-sm"
            >
              <Check className="w-4 h-4" />
              <span>सभी मानक सहेजें (Save All)</span>
            </button>
          </div>
        </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SMART AUTO-ALLOCATION ENGINE                       */}
      {/* ========================================================= */}
      {activeSubTab === 'allocate' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>स्मार्ट ऑटो-बूथ ड्यूटी आवंटन (Auto-Allocation)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                मास्टर फ़ोर्स से मानक अनुसार स्वतः आवंटन
              </p>
            </div>
          </div>

          {/* Demand vs Availability Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              मांग बनाम उपलब्ध पुलिस बल विश्लेषण (Deficit Audit)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'उप-निरीक्षक (SI)', demand: demandStats.si, avail: masterStats.si, shortage: shortageStats.si },
                { label: 'हेड कांस्टेबल (HC)', demand: demandStats.hc, avail: masterStats.hc, shortage: shortageStats.hc },
                { label: 'आरक्षी (Constable)', demand: demandStats.constable, avail: masterStats.constable, shortage: shortageStats.constable },
                { label: 'महिला आरक्षी (WCP)', demand: demandStats.female, avail: masterStats.female, shortage: shortageStats.female },
                { label: 'होमगार्ड (HG)', demand: demandStats.hg, avail: masterStats.hg, shortage: shortageStats.hg }
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200/90 text-sm">
                  <div className="font-bold text-slate-800 truncate">{item.label}</div>
                  <div className="mt-2 flex items-baseline justify-between font-mono">
                    <span className="text-slate-900 font-black text-sm">मांग: {item.demand}</span>
                    <span className="text-slate-500 font-bold text-xs">पूल: {item.avail}</span>
                  </div>
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">स्थिति:</span>
                    {item.shortage > 0 ? (
                      <span className="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                        -{item.shortage} कमी
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                        पर्याप्त
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Allocation Strategy Selector */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-sm font-bold text-slate-900">आवंटन नीति (Strategy) चुनें:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <label className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                autoStrategy === 'vacancies_only'
                  ? 'bg-indigo-50/60 border-indigo-600 shadow-xs font-bold text-indigo-950'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="election_auto_strat"
                  checked={autoStrategy === 'vacancies_only'}
                  onChange={() => setAutoStrategy('vacancies_only')}
                  className="accent-indigo-600 w-4 h-4"
                />
                <div>
                  <div className="font-bold">केवल रिक्त स्थानों पर ड्यूटी लगाएं (Vacancies Only)</div>
                  <div className="text-xs text-slate-500 font-medium">
                    पहले से तैनात जवानों की ड्यूटी यथावत रहेगी
                  </div>
                </div>
              </label>

              <label className={`p-3.5 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition ${
                autoStrategy === 'fresh_reallocate'
                  ? 'bg-indigo-50/60 border-indigo-600 shadow-xs font-bold text-indigo-950'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="election_auto_strat"
                  checked={autoStrategy === 'fresh_reallocate'}
                  onChange={() => setAutoStrategy('fresh_reallocate')}
                  className="accent-indigo-600 w-4 h-4"
                />
                <div>
                  <div className="font-bold">नए सिरे से संपूर्ण आवंटन करें (Fresh Reallocation)</div>
                  <div className="text-xs text-slate-500 font-medium">
                    मौजूदा रोस्टर साफ करके नया आवंटन होगा
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            <button
              onClick={handleRunElectionAutoAllocation}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>ऑटो-आवंटन लागू करें (ECI Norms)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: EXCEL UPLOAD & TEMPLATE                            */}
      {/* ========================================================= */}
      {activeSubTab === 'upload' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>मतदेय स्थल (बूथ सूची) एक्सेल अपलोड</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                एक्सेल (.xlsx/.xls) द्वारा बूथ सूची अपलोड
              </p>
            </div>

            <button
              onClick={handleDownloadSampleTemplate}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>सैंपल टेम्पलेट</span>
            </button>
          </div>

          {/* Enterprise Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 sm:p-10 border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl bg-slate-50/40 text-center cursor-pointer transition-all space-y-3 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
              <Upload className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm sm:text-base">
                एक्सेल या CSV फ़ाइल यहाँ चुनें
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                फ़ॉर्मेट: विधानसभा, सेक्टर, मतदान केंद्र, बूथ सं०, श्रेणी
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DEDICATED BOOTH CATEGORY UPDATE MODAL               */}
      {/* ========================================================= */}
      {isCategoryModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCategoryModalOpen(false);
              setCategoryModalTargetBooth(null);
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-base text-slate-950">
                  {categoryModalTargetBooth ? (
                    <span>बूथ #{categoryModalTargetBooth.boothNo} की श्रेणी अपडेट करें</span>
                  ) : selectedBoothIds.size > 0 ? (
                    <span>चयनित ({selectedBoothIds.size}) बूथों की श्रेणी अपडेट करें</span>
                  ) : (
                    <span>बूथ श्रेणी अपडेट करें (Update Booth Category)</span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setCategoryModalTargetBooth(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {categoryModalTargetBooth && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-black text-slate-900">{categoryModalTargetBooth.centerName}</div>
                <div className="text-slate-500">
                  बूथ संख्या: <strong className="text-slate-900 font-mono">{categoryModalTargetBooth.boothNo}</strong> • वर्तमान श्रेणी: <strong className="text-amber-800">{categoryModalTargetBooth.category}</strong>
                </div>
              </div>
            )}

            {!categoryModalTargetBooth && selectedBoothIds.size === 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                कृपया उस बूथ का चयन करें जिसकी श्रेणी आप बदलना चाहते हैं:
                <select
                  onChange={(e) => {
                    const found = booths.find(b => b.id === e.target.value);
                    if (found) setCategoryModalTargetBooth(found);
                  }}
                  className="w-full h-10 px-3 bg-white border border-amber-300 rounded-xl mt-2 text-xs font-bold text-slate-900 cursor-pointer"
                >
                  <option value="">-- मतदेय स्थल (बूथ) चुनें ({booths.length}) --</option>
                  {booths.map(b => (
                    <option key={b.id} value={b.id}>
                      बूथ #{b.boothNo} - {b.centerName} (वर्तमान: {b.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Category Choices */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-800 block">
                नई सुरक्षा श्रेणी (Select Security Category):
              </label>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {allCategories.map(cat => {
                  const norm = categoryNorms[cat];
                  const isChecked = modalSelectedCategory === cat;
                  const catClass = getCategoryBadgeClass(cat);

                  return (
                    <div
                      key={cat}
                      onClick={() => setModalSelectedCategory(cat)}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="radio"
                          name="category_choice"
                          checked={isChecked}
                          onChange={() => setModalSelectedCategory(cat)}
                          className="accent-indigo-600 w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${catClass}`}>
                              {cat}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{norm?.label || `${cat} बूथ`}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                            {norm?.desc || `मानक: SI: ${norm?.si || 0}, HC: ${norm?.hc || 0}, CP: ${norm?.cp || 0}, HG: ${norm?.hg || 0}`}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono font-black text-slate-800 px-2 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                        {(Number(norm?.si) || 0) + (Number(norm?.hc) || 0) + (Number(norm?.cp) || 0) + (Number(norm?.wcp) || 0) + (Number(norm?.hg) || 0)} बल
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setCategoryModalTargetBooth(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold text-xs"
              >
                रद्द करें
              </button>

              <button
                type="button"
                onClick={() => {
                  if (categoryModalTargetBooth) {
                    handleChangeBoothCategory(categoryModalTargetBooth.id, modalSelectedCategory);
                    setIsCategoryModalOpen(false);
                    setCategoryModalTargetBooth(null);
                  } else if (selectedBoothIds.size > 0) {
                    handleExecuteBulkCategoryUpdate(modalSelectedCategory);
                  } else {
                    alert('कृपया कम से कम एक बूथ का चयन करें।');
                  }
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs transition active:scale-95"
              >
                श्रेणी अपडेट करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD CUSTOM CATEGORY MODAL                          */}
      {/* ========================================================= */}
      {isAddCategoryOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddCategoryOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-950 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>+ नई बूथ सुरक्षा श्रेणी जोड़ें (Add Custom Category)</span>
              </h3>
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewCategory} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-slate-700">श्रेणी का नाम (उदा. वल्नरेबल, मॉडल बूथ, विशेष):</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900"
                  placeholder="उदा. वल्नरेबल"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700">विवरण / उपनाम:</label>
                <input
                  type="text"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900"
                  placeholder="उदा. वल्नरेबल मतदेय स्थल (अतिरिक्त पिकेट)"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700">उ०नि० (SI):</label>
                  <input
                    type="number"
                    min="0"
                    value={newCatSI}
                    onChange={(e) => setNewCatSI(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-700">हे०का० (HC):</label>
                  <input
                    type="number"
                    min="0"
                    value={newCatHC}
                    onChange={(e) => setNewCatHC(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-700">आरक्षी (CP):</label>
                  <input
                    type="number"
                    min="0"
                    value={newCatCP}
                    onChange={(e) => setNewCatCP(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700">म० आरक्षी (WCP):</label>
                  <input
                    type="number"
                    min="0"
                    value={newCatWCP}
                    onChange={(e) => setNewCatWCP(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-700">होमगार्ड (HG):</label>
                  <input
                    type="number"
                    min="0"
                    value={newCatHG}
                    onChange={(e) => setNewCatHG(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-700">सीएपीएफ / पीएसी:</label>
                  <input
                    type="number"
                    min="0"
                    value={newCatCAPF}
                    onChange={(e) => setNewCatCAPF(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs transition active:scale-95"
                >
                  श्रेणी जोड़ें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT BOOTH MODAL                             */}
      {/* ========================================================= */}
      {isAddBoothOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddBoothOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-950">
                {editingBooth ? 'मतदेय स्थल (बूथ) विवरण संपादित करें' : '+ नया मतदेय स्थल (बूथ) जोड़ें'}
              </h3>
              <button
                onClick={() => setIsAddBoothOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBoothForm} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-slate-700">विधानसभा क्षेत्र:</label>
                <input
                  type="text"
                  value={boothForm.vidhanSabha}
                  onChange={(e) => setBoothForm({ ...boothForm, vidhanSabha: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900"
                  placeholder="उदा. 134-अयोध्या"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700">सेक्टर संख्या / नाम:</label>
                  <input
                    type="text"
                    value={boothForm.sector}
                    onChange={(e) => setBoothForm({ ...boothForm, sector: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900"
                    placeholder="उदा. सेक्टर 01"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700">बूथ की श्रेणी:</label>
                  <select
                    value={boothForm.category}
                    onChange={(e) => setBoothForm({ ...boothForm, category: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900 cursor-pointer"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700">मतदान केंद्र का नाम (Polling Center):</label>
                <input
                  type="text"
                  value={boothForm.centerName}
                  onChange={(e) => setBoothForm({ ...boothForm, centerName: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900"
                  placeholder="उदा. प्राथमिक विद्यालय सआदतगंज"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700">मतदेय स्थल / बूथ संख्या:</label>
                  <input
                    type="text"
                    value={boothForm.boothNo}
                    onChange={(e) => setBoothForm({ ...boothForm, boothNo: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900 font-mono"
                    placeholder="उदा. 142"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700">सेक्टर पुलिस अधिकारी का नाम:</label>
                  <input
                    type="text"
                    value={boothForm.sectorOfficer}
                    onChange={(e) => setBoothForm({ ...boothForm, sectorOfficer: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900"
                    placeholder="उदा. उ०नि० रमेश कुमार"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700">सेक्टर पुलिस अधिकारी मोबाइल:</label>
                <input
                  type="text"
                  value={boothForm.sectorMobile}
                  onChange={(e) => setBoothForm({ ...boothForm, sectorMobile: e.target.value })}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900 font-mono"
                  placeholder="उदा. 9454401234"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBoothOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs transition active:scale-95"
                >
                  {editingBooth ? 'सहेजें' : 'जोड़ें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SWAP DUTY MODAL (अदला-बदली)                         */}
      {/* ========================================================= */}
      {isSwapModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSwapModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-950 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-600" />
                <span>बूथ ड्यूटी परस्पर अदला-बदली (1-Click Swap)</span>
              </h3>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              किन्हीं दो बूथों पर तैनात जवानों का चयन करें, वे एक-दूसरे के स्थान पर तुरंत स्थानांतरित हो जाएंगे।
            </p>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="text-slate-800">प्रथम जवान (Officer 1):</label>
                <select
                  value={swapFirstOfficer?.id || ''}
                  onChange={(e) => {
                    const found = eventRecords.find(r => r.id === e.target.value);
                    setSwapFirstOfficer(found || null);
                  }}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900 cursor-pointer"
                >
                  <option value="">-- प्रथम जवान चुनें --</option>
                  {eventRecords.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.rank}) • {r.duty_place}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-800">द्वितीय जवान (Officer 2):</label>
                <select
                  value={swapSecondOfficer?.id || ''}
                  onChange={(e) => {
                    const found = eventRecords.find(r => r.id === e.target.value);
                    setSwapSecondOfficer(found || null);
                  }}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900 cursor-pointer"
                >
                  <option value="">-- द्वितीय जवान चुनें --</option>
                  {eventRecords.filter(r => r.id !== swapFirstOfficer?.id).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.rank}) • {r.duty_place}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {swapFirstOfficer && swapSecondOfficer && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-bold space-y-1">
                <div>🔁 <strong>{swapFirstOfficer.name}</strong> ➔ {swapSecondOfficer.duty_place}</div>
                <div>🔁 <strong>{swapSecondOfficer.name}</strong> ➔ {swapFirstOfficer.duty_place}</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold text-xs"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleExecuteSwap}
                disabled={!swapFirstOfficer || !swapSecondOfficer}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs transition active:scale-95"
              >
                आपस में बदलें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: QUICK ADD FORCE TO BOOTH MODAL                     */}
      {/* ========================================================= */}
      {isAddForceModalOpen && targetBoothForAdd && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddForceModalOpen(false);
              setTargetBoothForAdd(null);
              setSelectedForceToAdd(null);
            }
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-950">
                + {targetBoothForAdd.centerName} (बूथ {targetBoothForAdd.boothNo}) पर जवान जोड़ें
              </h3>
              <button
                onClick={() => setIsAddForceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              मास्टर रिज़र्व पूल में से उपलब्ध जवान का चयन करें:
            </p>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="text-slate-800">उपलब्ध जवान (Reserve Pool):</label>
                <select
                  value={selectedForceToAdd?.id || selectedForceToAdd?.pno || ''}
                  onChange={(e) => {
                    const found = availableReserveForce.find(p => (p.id || p.pno) === e.target.value);
                    setSelectedForceToAdd(found || null);
                  }}
                  className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900 cursor-pointer"
                >
                  <option value="">-- उपलब्ध जवान चुनें ({availableReserveForce.length}) --</option>
                  {availableReserveForce.map(p => (
                    <option key={p.id || p.pno} value={p.id || p.pno}>
                      {p.name} ({p.rank || 'जवान'}) • PNO: {p.pno || '-'} • मूल: {p.posting || 'पुलिस लाइन'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddForceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold text-xs"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmAddForce}
                disabled={!selectedForceToAdd}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer text-xs shadow-xs transition active:scale-95"
              >
                बूथ पर तैनात करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RESERVE REPLACEMENT MODAL                           */}
      {/* ========================================================= */}
      {isReplacementModalOpen && replacementTarget && (
        <DutyReplacementModal
          isOpen={isReplacementModalOpen}
          onClose={() => {
            setIsReplacementModalOpen(false);
            setReplacementTarget(null);
          }}
          targetRecord={replacementTarget}
          masterForce={masterForce}
          eventRecords={eventRecords}
          onConfirmReplacement={(replacedItem) => {
            const updated = eventRecords.map(r => {
              if ((replacementTarget.id && r.id === replacementTarget.id) || (replacementTarget.pno && r.pno === replacementTarget.pno)) {
                return replacedItem;
              }
              return r;
            });
            onUpdateEventRecords(updated);
            logReplacementToAuditTrail({
              original: replacementTarget,
              replacement: replacedItem,
              timestamp: new Date().toISOString()
            });
            setIsReplacementModalOpen(false);
            setReplacementTarget(null);
            setSuccessToast('जवान को सफलतापूर्वक रिज़र्व से प्रतिस्थापित (Replace) कर दिया गया!');
            setTimeout(() => setSuccessToast(null), 4000);
          }}
        />
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT EXISTING CATEGORY & NORMS MODAL               */}
      {/* ========================================================= */}
      {editingCatKey && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCatKey(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-950 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <span>श्रेणी विवरण व मानक संपादित करें ({editingCatKey} बूथ)</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCatKey(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedCategory} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-slate-700">श्रेणी का नाम (Category Name):</label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900 font-black"
                  required
                />
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  यदि आप नाम बदलते हैं, तो इस श्रेणी के सभी मतदेय स्थल (बूथ) स्वतः नए नाम पर अपडेट हो जाएंगे।
                </p>
              </div>

              <div>
                <label className="text-slate-700">उपनाम / विवरण (Subtitle / Description):</label>
                <input
                  type="text"
                  value={editCatLabel}
                  onChange={(e) => setEditCatLabel(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl mt-1 text-slate-900"
                  placeholder="उदा. संवेदनशील मतदेय स्थल (उप-निरीक्षक सुरक्षा प्रभारी)"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700">उ०नि० (SI):</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editCatSI}
                    onChange={(e) => setEditCatSI(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1 font-black"
                  />
                </div>
                <div>
                  <label className="text-slate-700">हे०का० (HC):</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editCatHC}
                    onChange={(e) => setEditCatHC(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1 font-black"
                  />
                </div>
                <div>
                  <label className="text-slate-700">आरक्षी (CP):</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editCatCP}
                    onChange={(e) => setEditCatCP(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1 font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-700">म० आरक्षी (WCP):</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editCatWCP}
                    onChange={(e) => setEditCatWCP(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1 font-black"
                  />
                </div>
                <div>
                  <label className="text-slate-700">होमगार्ड (HG):</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editCatHG}
                    onChange={(e) => setEditCatHG(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1 font-black"
                  />
                </div>
                <div>
                  <label className="text-slate-700">सीएपीएफ / पीएसी:</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editCatCAPF}
                    onChange={(e) => setEditCatCAPF(e.target.value)}
                    className="w-full h-9 text-center bg-slate-50 border border-slate-300 rounded-lg mt-1 font-black"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-slate-800 text-xs flex items-center justify-between font-bold">
                <span>प्रति बूथ कुल सुरक्षा बल:</span>
                <strong className="text-sm font-mono text-amber-950">
                  {(Number(editCatSI) || 0) + (Number(editCatHC) || 0) + (Number(editCatCP) || 0) + (Number(editCatWCP) || 0) + (Number(editCatHG) || 0) + (Number(editCatCAPF) || 0)} जवान
                </strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCatKey(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl cursor-pointer shadow-md transition active:scale-95"
                >
                  सहेजें (Save Changes)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
