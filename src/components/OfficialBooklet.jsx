import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Shield, Calendar, Clock, MapPin, Users, Edit3, Plus, Trash2, FileText, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import ForceDeploymentMatrix from './ForceDeploymentMatrix';
import { printOfficialBookletDocument } from '../utils/printOfficialBooklet';
import DutyReplacementModal from './DutyReplacementModal';
import { logReplacementToAuditTrail } from '../utils/aamadSync';
import { resolvePoliceRank, stripRankFromName } from '../utils/rankResolver';
import {
  ELECTION_BOOKLET_CHAPTERS,
  ELECTION_SCHEDULE_AYODHYA_2024,
  ELECTION_VEHICLES_REQUIREMENT,
  ELECTION_OUTER_BARRIERS,
  ELECTION_INTER_BARRIERS,
  ELECTION_DUTY_CARD_INSTRUCTIONS,
  ELECTION_CUG_DIRECTORY,
  ELECTION_LAW_ORDER_MANAK
} from '../data/electionStandardData';

/**
 * Helper to clean raw name string by stripping duplicate mobile numbers,
 * trailing commas, and separating clean name from posting/district.
 */
function cleanOfficerName(rawName = '', posting = '', district = '', mobile = '') {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();

  // Remove any 10-digit mobile numbers from the name text
  cleaned = cleaned.replace(/\b[6-9]\d{9}\b/g, '');
  if (mobile) {
    const cleanMob = String(mobile).trim();
    if (cleanMob.length >= 5) {
      cleaned = cleaned.replace(new RegExp(`\\b${cleanMob}\\b`, 'g'), '');
    }
  }

  // Remove redundant parentheses with rank if already included
  cleaned = cleaned.replace(/\(\s*(?:का0|उ0नि0|हे0का0|नि0|म0का0|म0उ0नि0|का०|उ०नि०|हे०कां०|नि०|कां०|हेकां|जवान)\s*\)/gi, '');

  // If rawName is comma-separated, take first segment
  const commaParts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  if (commaParts.length > 1) {
    cleaned = commaParts[0];
  }

  // Remove double commas, trailing/leading commas & spaces
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').replace(/^[\s,]+/, '').trim();

  return cleaned || rawName;
}

/**
 * Helper to format ISO timestamp strings into clean Hindi dates
 */
function formatDisplayDate(rawDate) {
  if (!rawDate) return '16.08.2026 से अग्रिम आदेश तक';
  if (rawDate.includes('T') && rawDate.includes('-')) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return `${d.toLocaleDateString('hi-IN')} से कार्यक्रम समाप्ति तक`;
      }
    } catch (e) {}
  }
  return rawDate;
}

export default function OfficialBooklet({
  records = [],
  instructions,
  onBack,
  eventTitle = '',
  eventSubtitle = '',
  eventStartDate = '',
  masterForce = [],
  onUpdateEventRecords,
  activeEvent = null,
  onUpdateEvent = null
}) {
  const instructionsStorageKey = `OFFICIAL_BOOKLET_INSTRUCTIONS_${(eventTitle || 'default').replace(/\s+/g, '_')}`;

  const [patrankInput, setPatrankInput] = useState(() => {
    if (activeEvent?.patrank) return activeEvent.patrank;
    try {
      return localStorage.getItem('OFFICIAL_PATRANK_KEY') || 'सुरक्षा-2026/ड्यूटी-आदेश';
    } catch (e) {
      return 'सुरक्षा-2026/ड्यूटी-आदेश';
    }
  });

  useEffect(() => {
    if (activeEvent?.patrank && activeEvent.patrank !== patrankInput) {
      setPatrankInput(activeEvent.patrank);
    }
  }, [activeEvent?.patrank]);

  const [dateInput, setDateInput] = useState(() => new Date().toLocaleDateString('hi-IN'));

  // Election Booklet Mode Toggle
  const [isElectionBooklet, setIsElectionBooklet] = useState(() => {
    return (eventTitle && (eventTitle.includes('निर्वाचन') || eventTitle.includes('चुनाव') || eventTitle.includes('लोकसभा') || eventTitle.includes('विधानसभा'))) ||
      records.some(r => r.duty_type === 'election' || r.booth_no);
  });

  // Replacement Modal State & Handler
  const [replacementRecord, setReplacementRecord] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const handleConfirmReplacement = async ({ oldRecord, newRecord, replacementType, reason }) => {
    let updatedRecords = [...records];

    if (replacementType === 'INTERNAL_RESERVE_SWAP') {
      updatedRecords = updatedRecords.filter(r => (r.id !== oldRecord.id && r.pno !== oldRecord.pno));
      const startNum = updatedRecords.length + 1;
      updatedRecords.push({
        id: `DUTY-${Date.now()}-${startNum}`,
        pno: newRecord.pno || `PN-${Date.now()}-${startNum}`,
        name: newRecord.name,
        rank: newRecord.rank || 'का0',
        mobile: newRecord.mobile,
        posting: newRecord.posting || oldRecord.posting || '',
        district: newRecord.district || oldRecord.district || '',
        zone: oldRecord.zone,
        sector: oldRecord.sector,
        duty_place: oldRecord.duty_place,
        shift: oldRecord.shift,
        photo: newRecord.photo || ''
      });

      setToastMsg(`${oldRecord.name} के स्थान पर ${newRecord.name} की प्रतिस्थानी ड्यूटी लगा दी गई!`);
    } else if (replacementType === 'INTER_DISTRICT_SUBSTITUTION') {
      const idx = updatedRecords.findIndex(r => r.id === oldRecord.id || (r.pno && r.pno === oldRecord.pno));
      const updatedItem = {
        ...oldRecord,
        ...newRecord
      };

      if (idx !== -1) {
        updatedRecords[idx] = updatedItem;
      } else {
        updatedRecords.push(updatedItem);
      }

      setToastMsg(`गैर-जनपद आवक: ${newRecord.name} (PNO: ${newRecord.pno}) का विवरण बुकलेट में अपडेट हो गया!`);
    }

    if (onUpdateEventRecords) {
      onUpdateEventRecords(updatedRecords);
    }

    // Save to permanent Read-Only Audit Log
    logReplacementToAuditTrail({
      oldRecord,
      newRecord,
      replacementType,
      reason,
      adminName: 'सुपर एडमिन'
    });

    setReplacementRecord(null);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // =========================================================================
  // MULTI-LEVEL MANUAL INSTRUCTIONS STATE (ZONE / SECTOR / POINT / GENERAL)
  // =========================================================================
  const [manualInstructions, setManualInstructions] = useState(() => {
    if (activeEvent?.manualInstructions) return activeEvent.manualInstructions;
    try {
      const saved = localStorage.getItem(instructionsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      zones: {},
      sectors: {},
      points: {},
      generalEnd: instructions || `1. सभी अधिकारी/कर्मचारी ड्यूटी समय से 01 घंटे पूर्व अपने निर्धारित स्थान पर उपस्थित होंगे।
2. ड्यूटी के दौरान मोबाइल फोन का अनावश्यक उपयोग सख्त वर्जित है।
3. प्रत्येक पुलिसकर्मी अपने साथ यह डिजिटल पास / प्रिंट ड्यूटी कार्ड एवं आई-कार्ड अनिवार्य रूप से रखेगा।
4. किसी भी संदिग्ध गतिविधि की सूचना तत्काल कंट्रोल रूम एवं अपने प्रभारी अधिकारी को देंगे।`
    };
  });

  useEffect(() => {
    if (activeEvent?.manualInstructions) {
      setManualInstructions(activeEvent.manualInstructions);
    }
  }, [activeEvent?.manualInstructions]);

  const saveManualInstructions = (updated) => {
    setManualInstructions(updated);
    try {
      localStorage.setItem(instructionsStorageKey, JSON.stringify(updated));
    } catch (e) {}
    if (onUpdateEvent && activeEvent) {
      onUpdateEvent(activeEvent.id, {
        ...activeEvent,
        manualInstructions: updated
      });
    }
  };

  // Edit Instruction Modal State
  const [editModal, setEditModal] = useState({
    isOpen: false,
    level: '', // 'zone' | 'sector' | 'point' | 'general'
    targetKey: '',
    title: '',
    text: ''
  });

  const handleOpenEditModal = (level, targetKey, title) => {
    let currentText = '';
    if (level === 'zone') currentText = manualInstructions.zones?.[targetKey] || '';
    else if (level === 'sector') currentText = manualInstructions.sectors?.[targetKey] || '';
    else if (level === 'point') currentText = manualInstructions.points?.[targetKey] || '';
    else if (level === 'general') currentText = manualInstructions.generalEnd || '';
    else if (level === 'pratilipi') currentText = manualInstructions.pratilipi || '1. समस्त संबंधित अधिकारी/कर्मचारी।\n2. कंट्रोल रूम सुरक्षा व्यवस्था अयोध्या।';

    setEditModal({
      isOpen: true,
      level,
      targetKey,
      title,
      text: currentText
    });
  };

/**
 * Helper to add 1, 2, 3 numbering to non-empty lines
 */
function autoFormatNumberedList(rawText = '') {
  if (!rawText || !rawText.trim()) return '';
  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let counter = 1;
  const formattedLines = lines.map(line => {
    if (/^(नोट|note|विशेष|टिप्पणी|स्थान|दिनांक)\s*[:\-]/i.test(line)) {
      return line;
    }
    const cleanLine = line.replace(/^[\(]?[\d०-९]+[\.\)\-\:\s]+\s*/, '').trim();
    if (!cleanLine) return '';
    return `${counter++}. ${cleanLine}`;
  });

  return formattedLines.join('\n');
}

/**
 * Helper to remove 1, 2, 3 numbering from lines
 */
function stripNumbering(rawText = '') {
  if (!rawText || !rawText.trim()) return '';
  return rawText
    .split('\n')
    .map(line => line.replace(/^[\(]?[\d०-९]+[\.\)\-\:\s]+\s*/, '').trim())
    .join('\n');
}

  const handleSaveInstructionModal = (e) => {
    e.preventDefault();
    const { level, targetKey, text } = editModal;
    const updated = { ...manualInstructions };

    // Save exact user text without forced alteration
    const cleanText = text.trim();

    if (level === 'zone') {
      if (!updated.zones) updated.zones = {};
      if (cleanText) updated.zones[targetKey] = cleanText;
      else delete updated.zones[targetKey];
    } else if (level === 'sector') {
      if (!updated.sectors) updated.sectors = {};
      if (cleanText) updated.sectors[targetKey] = cleanText;
      else delete updated.sectors[targetKey];
    } else if (level === 'point') {
      if (!updated.points) updated.points = {};
      if (cleanText) updated.points[targetKey] = cleanText;
      else delete updated.points[targetKey];
    } else if (level === 'general') {
      updated.generalEnd = cleanText;
    } else if (level === 'pratilipi') {
      updated.pratilipi = cleanText;
    }

    saveManualInstructions(updated);
    setEditModal({ isOpen: false, level: '', targetKey: '', title: '', text: '' });
  };

  // Extract distinct duty times from records
  const dutyTimes = Array.from(new Set((records || []).map(r => (r.shift || '').trim()).filter(Boolean)));
  const displayShift = dutyTimes.length > 0 ? dutyTimes.join(' | ') : 'मेला / कार्यक्रम समयानुसार';
  const displayEventDate = formatDisplayDate(eventStartDate);

  // Group records by Zone -> Sector -> Duty Place
  const groupedData = {};

  records.forEach(rec => {
    const z = rec.zone || 'सामान्य जोन';
    const s = rec.sector || 'सामान्य सेक्टर';
    const p = rec.duty_place || 'सामान्य ड्यूटी स्थल';

    if (!groupedData[z]) groupedData[z] = {};
    if (!groupedData[z][s]) groupedData[z][s] = {};
    if (!groupedData[z][s][p]) groupedData[z][s][p] = [];

    groupedData[z][s][p].push(rec);
  });

  const handlePrint = () => {
    printOfficialBookletDocument({
      records: records,
      eventTitle: eventTitle,
      eventSubtitle: eventSubtitle,
      eventStartDate: eventStartDate,
      patrank: patrankInput,
      date: dateInput,
      manualInstructions: manualInstructions,
      isElectionBooklet: isElectionBooklet
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 font-devanagari">
      {/* Top Action Bar (hidden on print) with Patrank, Date & General Instructions input */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm no-print text-slate-900 space-y-3">
        {/* Tier 1: Primary Navigation & Print Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {onBack ? (
            <button
              onClick={onBack}
              className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-slate-300 cursor-pointer w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>वापस जाएं</span>
            </button>
          ) : <div />}

          <button
            onClick={handlePrint}
            className="h-9 px-4.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Printer className="w-4 h-4 text-amber-400 stroke-[2.5]" />
            <span>A4 लैंडस्केप बुकलेट प्रिंट करें</span>
          </button>
        </div>

        {/* Tier 2: Metadata Inputs & Instruction Modals */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {/* Manual Patrank Input Field */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 min-w-0">
            <Edit3 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <label className="text-xs font-bold text-slate-700 shrink-0">पत्रांक:</label>
            <input
              type="text"
              value={patrankInput}
              onChange={(e) => {
                setPatrankInput(e.target.value);
                try {
                  localStorage.setItem('OFFICIAL_PATRANK_KEY', e.target.value);
                } catch (err) {}
              }}
              onBlur={(e) => {
                if (onUpdateEvent && activeEvent) {
                  onUpdateEvent(activeEvent.id, {
                    ...activeEvent,
                    patrank: e.target.value
                  });
                }
              }}
              placeholder="पत्रांक दर्ज करें..."
              className="px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-36 sm:w-44"
            />
          </div>

          {/* Manual Date Input Field */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 min-w-0">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <label className="text-xs font-bold text-slate-700 shrink-0">दिनांक:</label>
            <input
              type="text"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              placeholder="दिनांक दर्ज करें..."
              className="px-2 py-0.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-28 sm:w-32 font-mono"
            />
          </div>

          {/* Edit General Instructions Button */}
          <button
            onClick={() => handleOpenEditModal('general', 'generalEnd', 'अंतिम / सामान्य सुरक्षा निर्देश')}
            className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>अंतिम निर्देश</span>
          </button>

          {/* Edit Pratilipi Button */}
          <button
            onClick={() => handleOpenEditModal('pratilipi', 'pratilipi', 'आधिकारिक प्रतिलिपि विवरण संशोधित करें')}
            className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
            <span>प्रतिलिपि बदलें</span>
          </button>

          {/* Toggle Election Booklet Mode */}
          <button
            type="button"
            onClick={() => setIsElectionBooklet(prev => !prev)}
            className={`h-8 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition border ${
              isElectionBooklet
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
            }`}
          >
            <span>🗳️</span>
            <span>{isElectionBooklet ? 'निर्वाचन बुकलेट मोड सक्रिय' : 'निर्वाचन बुकलेट मोड'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isElectionBooklet ? 'bg-black/20 text-slate-950 font-black' : 'bg-slate-200 text-slate-700'}`}>
              {isElectionBooklet ? '24 अध्याय' : 'सामान्य'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Official Document Layout (Landscape A4 Paper Layout) */}
      <div
        id="printable-official-booklet"
        className="bg-white text-black p-4 sm:p-8 rounded-2xl shadow-xl space-y-4 border border-gray-400 font-sans print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* ========================================================================= */}
        {/* PAGE 1: EXCLUSIVE FIRST PAGE COVER (HEADING, TITLE, PATRANK & DATE ONLY)  */}
        {/* ========================================================================= */}
        <div className="booklet-cover-page min-h-[520px] flex flex-col justify-between p-6 sm:p-10 border-4 border-double border-black rounded-xl bg-gradient-to-b from-amber-50/30 via-white to-amber-50/20 text-center relative break-after-page mb-6">
          {/* Top Corner Official Stamp Design */}
          <div className="flex justify-between items-start text-xs font-mono font-bold text-gray-800 border-b-2 border-black pb-3">
            <div className="text-left space-y-0.5">
              <div>पत्रांक सं०: <span className="font-extrabold text-black font-sans">{patrankInput || 'सुरक्षा-2026/ड्यूटी-आदेश'}</span></div>
              <div className="text-[11px] text-gray-600 font-sans">अयोध्या पुलिस सुरक्षा आदेश</div>
            </div>
            <div className="text-right space-y-0.5">
              <div>दिनांक: <span className="font-extrabold text-black font-sans">{dateInput}</span></div>
              <div className="text-[11px] text-gray-600 font-sans">जनपद: अयोध्या</div>
            </div>
          </div>

          {/* Central Official Emblem & Main Headings */}
          <div className="my-auto py-6 sm:py-8 space-y-5 sm:space-y-6">
            <div className="flex items-center justify-center gap-4">
              <img src="/badge.png" alt="Police Emblem" className="w-20 h-20 sm:w-24 sm:h-24 object-contain filter drop-shadow-md" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight uppercase text-black">
                कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या
              </h1>
              <h2 className="text-sm sm:text-base font-bold text-gray-800 tracking-wider">
                अयोध्या पुलिस • सुरक्षा एवं कानून व्यवस्था प्रकोष्ठ
              </h2>
            </div>

            {/* Central Prominent Event Title Box */}
            <div className="max-w-2xl mx-auto border-3 border-black rounded-2xl p-6 sm:p-8 bg-white shadow-lg space-y-3">
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-950 bg-amber-100/90 py-1.5 px-5 rounded-full inline-block border border-amber-300 shadow-2xs">
                आधिकारिक ड्यूटी आदेश पुस्तिका
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tight leading-tight">
                {eventTitle}
              </h2>

              <p className="text-base sm:text-lg font-extrabold text-gray-900">
                के पावन अवसर पर पुलिस प्रबन्ध एवं सुरक्षा व्यवस्था
              </p>

              <div className="pt-2 border-t-2 border-dashed border-gray-300 flex items-center justify-center gap-2 text-sm sm:text-base font-black text-black font-mono">
                <Calendar className="w-5 h-5 text-black shrink-0" />
                <span>समयावधि: {displayEventDate}</span>
              </div>
            </div>
          </div>

          {/* Bottom Cover Signature & Note */}
          <div className="pt-4 border-t-2 border-black flex justify-between items-end text-xs font-bold text-gray-900">
            <div className="text-left space-y-0.5">
              <div className="text-[11px] text-gray-700 font-bold">स्थान: अयोध्या पुलिस मुख्यालय, अयोध्या (उ०प्र०)</div>
              <div className="text-[10px] text-gray-500 font-mono">गोपनीय / केवल अधिकृत पुलिस बल हेतु</div>
            </div>

            <div className="text-center space-y-1">
              <div className="font-mono text-gray-500 italic text-[11px]">[ अधिकृत हस्ताक्षरित ]</div>
              <div className="font-extrabold text-sm border-t border-black pt-1">
                ( वरिष्ठ पुलिस अधीक्षक )
              </div>
              <div className="text-[11px] text-gray-800">जनपद अयोध्या</div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAGE 2: EXCLUSIVE EXECUTIVE FORCE SUMMARY MATRIX (LANDSCAPE DEDICATED)    */}
        {/* ========================================================================= */}
        <div className="break-after-page mb-6">
          <ForceDeploymentMatrix records={records} eventTitle={eventTitle} />
        </div>

        {/* ========================================================================= */}
        {/* ELECTION STANDARD CHAPTERS PREVIEW (PAGES 3 to 7)                         */}
        {/* ========================================================================= */}
        {isElectionBooklet && (
          <div className="space-y-6">
            {/* 1. Anukramanika (Table of Contents) */}
            <div className="break-after-page mb-6 border-2 border-black rounded-xl p-4 bg-white">
              <div className="border-b-2 border-black pb-2 mb-3 text-center">
                <h3 className="text-base sm:text-lg font-black uppercase text-black">कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या</h3>
                <p className="text-xs font-bold text-gray-700">📋 अनुक्रमणिका (TABLE OF CONTENTS) • निर्वाचन सुरक्षा आदेश पुस्तिका</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-black">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="border border-black py-1.5 px-3 w-16 text-center">अध्याय</th>
                      <th className="border border-black py-1.5 px-3 text-left">विवरण / विषय सामग्री</th>
                      <th className="border border-black py-1.5 px-3 w-24 text-center">पृष्ठ संदर्भ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ELECTION_BOOKLET_CHAPTERS.map(ch => (
                      <tr key={ch.no} className="border-b border-gray-300 hover:bg-slate-50 font-semibold">
                        <td className="border border-gray-300 py-1.5 px-2 text-center font-mono font-bold bg-slate-50">{ch.no}</td>
                        <td className="border border-gray-300 py-1.5 px-3 text-black">{ch.title}</td>
                        <td className="border border-gray-300 py-1.5 px-2 text-center font-mono text-gray-600">{ch.page}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Schedule & SOP */}
            <div className="break-after-page mb-6 border-2 border-black rounded-xl p-4 bg-white">
              <div className="border-b-2 border-black pb-2 mb-3 text-center">
                <h3 className="text-base sm:text-lg font-black uppercase text-black">कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या</h3>
                <p className="text-xs font-bold text-gray-700">🗳️ निर्वाचन कार्यक्रम (SCHEDULE) एवं पुलिस आचार संहिता निर्देश (SOP)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    अध्याय-1: निर्वाचन कार्यक्रम (Lok Sabha Schedule)
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {ELECTION_SCHEDULE_AYODHYA_2024.map((s, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="py-2 px-3 font-bold bg-slate-50 w-1/2">{s.event}</td>
                          <td className="py-2 px-3 font-semibold text-black">
                            {s.date}<br/><span className="text-[11px] text-gray-600 font-normal">{s.time}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-black rounded-lg overflow-hidden flex flex-col">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    अध्याय-3: पुलिस कर्तव्य एवं आचरण नियमावली (16 बिंदु)
                  </div>
                  <div className="p-3 text-xs space-y-2 overflow-y-auto max-h-[420px] leading-relaxed">
                    {ELECTION_DUTY_CARD_INSTRUCTIONS.map((inst, idx) => (
                      <div key={idx} className="pb-1.5 border-b border-dashed border-gray-200">
                        <strong className="text-slate-950">{inst.slice(0, inst.indexOf('.') + 1)}</strong>
                        <span className="text-gray-800">{inst.slice(inst.indexOf('.') + 1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Vehicles & Outer Barriers */}
            <div className="break-after-page mb-6 border-2 border-black rounded-xl p-4 bg-white">
              <div className="border-b-2 border-black pb-2 mb-3 text-center">
                <h3 className="text-base sm:text-lg font-black uppercase text-black">कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या</h3>
                <p className="text-xs font-bold text-gray-700">🚐 वाहनों की आवश्यकता चार्ट एवं 20 सीमावर्ती वाह्य बैरियर विवरण</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    अध्याय-18: वाहनों की आवश्यकता विवरण चार्ट
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 font-bold border-b border-gray-300 text-center">
                        <th className="py-1.5 px-2 text-left">ड्यूटी मद</th>
                        <th className="py-1.5 px-2">हल्के</th>
                        <th className="py-1.5 px-2">मिनीबस</th>
                        <th className="py-1.5 px-2">बस</th>
                        <th className="py-1.5 px-2">ट्रक</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ELECTION_VEHICLES_REQUIREMENT.map((v, idx) => (
                        <tr key={idx} className="border-b border-gray-200 font-semibold text-center">
                          <td className="py-1 px-2 text-left text-black font-bold">{v.title}</td>
                          <td className="py-1 px-2 font-mono">{v.light || '-'}</td>
                          <td className="py-1 px-2 font-mono">{v.minibus || '-'}</td>
                          <td className="py-1 px-2 font-mono">{v.bus || '-'}</td>
                          <td className="py-1 px-2 font-mono">{v.truck || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    अध्याय-11: सीमावर्ती (वाह्य) 20 बैरियर विवरण
                  </div>
                  <div className="overflow-y-auto max-h-[420px]">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-gray-300">
                          <th className="py-1 px-2 text-center w-8">क्र०</th>
                          <th className="py-1 px-2 text-left">बैरियर का नाम</th>
                          <th className="py-1 px-2 text-left">मार्ग / बॉर्डर</th>
                          <th className="py-1 px-2 text-left">थाना</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ELECTION_OUTER_BARRIERS.map(ob => (
                          <tr key={ob.sr} className="border-b border-gray-200">
                            <td className="py-1 px-2 text-center font-mono font-bold bg-slate-50">{ob.sr}</td>
                            <td className="py-1 px-2 font-bold text-black">{ob.barrier_name}</td>
                            <td className="py-1 px-2 text-gray-700">{ob.route} ({ob.border_district})</td>
                            <td className="py-1 px-2 font-semibold">{ob.thana}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Inter Barriers & Law-Order Standards */}
            <div className="break-after-page mb-6 border-2 border-black rounded-xl p-4 bg-white">
              <div className="border-b-2 border-black pb-2 mb-3 text-center">
                <h3 className="text-base sm:text-lg font-black uppercase text-black">कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या</h3>
                <p className="text-xs font-bold text-gray-700">🚧 28 आन्तरिक बैरियर/पिकेट्स एवं 18 कानून-व्यवस्था मानक विवरण</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    अध्याय-12: आन्तरिक बैरियर एवं सुरक्षा पिकेट्स (28 स्थान)
                  </div>
                  <div className="overflow-y-auto max-h-[420px]">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-gray-300">
                          <th className="py-1 px-2 text-center w-8">क्र०</th>
                          <th className="py-1 px-2 text-left">स्थल</th>
                          <th className="py-1 px-2 text-left">थाना</th>
                          <th className="py-1 px-2 text-left">विधानसभा</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ELECTION_INTER_BARRIERS.map(ib => (
                          <tr key={ib.sr} className="border-b border-gray-200">
                            <td className="py-1 px-2 text-center font-mono font-bold bg-slate-50">{ib.sr}</td>
                            <td className="py-1 px-2 font-bold text-black">{ib.barrier_name}</td>
                            <td className="py-1 px-2 font-semibold">{ib.thana}</td>
                            <td className="py-1 px-2 text-gray-700">{ib.vidhansabha}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    अध्याय-13, 14, 15: 18 कानून-व्यवस्था मानक (Manak)
                  </div>
                  <div className="overflow-y-auto max-h-[420px]">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-gray-300">
                          <th className="py-1 px-2 text-left">ड्यूटी पद / हेड</th>
                          <th className="py-1 px-2 text-left">आधिकारिक बल मानक</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ELECTION_LAW_ORDER_MANAK.map((lo, idx) => (
                          <tr key={idx} className="border-b border-gray-200 font-semibold">
                            <td className="py-1.5 px-2 text-black font-bold">{lo.title}</td>
                            <td className="py-1.5 px-2 text-gray-700">{lo.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. CUG Telephone Directory */}
            <div className="break-after-page mb-6 border-2 border-black rounded-xl p-4 bg-white">
              <div className="border-b-2 border-black pb-2 mb-3 text-center">
                <h3 className="text-base sm:text-lg font-black uppercase text-black">कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या</h3>
                <p className="text-xs font-bold text-gray-700">📞 अध्याय-19: महत्वपूर्ण प्रशासनिक एवं पुलिस टेलीफोन निर्देशिका (CUG)</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    उच्चाधिकारीगण एवं नियंत्रण कक्ष
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      {ELECTION_CUG_DIRECTORY.higher_officers.map((ho, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className="py-1.5 px-3 font-bold text-black">{ho.designation}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-emerald-800 text-right">{ho.mobile}</td>
                        </tr>
                      ))}
                      {ELECTION_CUG_DIRECTORY.control_rooms.map((cr, idx) => (
                        <tr key={idx} className="border-b border-gray-200 bg-amber-50">
                          <td className="py-1.5 px-3 font-bold text-amber-900">{cr.name}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-amber-900 text-right">{cr.mobile}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-black rounded-lg overflow-hidden">
                  <div className="bg-slate-900 text-white font-black text-xs py-1.5 px-3">
                    समस्त 18 थाना प्रभारी CUG सीयूजी नंबर
                  </div>
                  <div className="overflow-y-auto max-h-[420px]">
                    <table className="w-full text-xs border-collapse">
                      <tbody>
                        {ELECTION_CUG_DIRECTORY.thanas.map((th, idx) => (
                          <tr key={idx} className="border-b border-gray-200 font-semibold">
                            <td className="py-1 px-3 text-black font-bold">{th.thana}</td>
                            <td className="py-1 px-3 font-mono font-bold text-emerald-800 text-right">{th.mobile}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3 ONWARDS: GROUPED FIELD DEPLOYMENT TABLES (ZONE -> SECTOR -> DUTY)   */}
        {/* ========================================================================= */}
        <div className="space-y-4">

          {/* Grouped Zone -> Sector -> Duty Place Tables with Hierarchical Instructions */}
          {Object.keys(groupedData).map((zoneName, zIdx) => {
            const zoneInstruction = manualInstructions.zones?.[zoneName];
            const sampleZoneRec = (records || []).find(r => (r.zone || '').trim() === zoneName.trim() && (r.zonal_incharge || r.zonal));
            const zonalIncharge = sampleZoneRec?.zonal_incharge || sampleZoneRec?.zonal || '';
            const zonalSahyogarth = sampleZoneRec?.zonal_sahyogarth || sampleZoneRec?.zonal_assistant || '';

            return (
              <div key={zIdx} className="space-y-3 page-break-zone">
                {/* Zone Header Banner with Inline Add Instruction Button & Incharges */}
                <div className="bg-slate-900 text-white px-4 py-2.5 rounded-lg border border-black flex items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-black text-sm sm:text-base tracking-wide text-white uppercase">जोन: {zoneName}</span>
                    </div>
                    {(zonalIncharge || zonalSahyogarth) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-medium">
                        {zonalIncharge && (
                          <span className="flex items-center gap-1">
                            <span className="text-amber-400 font-black">ज़ोनल प्रभारी:</span>
                            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{zonalIncharge}</span>
                          </span>
                        )}
                        {zonalSahyogarth && (
                          <span className="flex items-center gap-1">
                            <span className="text-emerald-400 font-black">सहयोगार्थ:</span>
                            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{zonalSahyogarth}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal('zone', zoneName, `ज़ोन निर्देश: ${zoneName}`)}
                      className="no-print text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-md cursor-pointer transition flex items-center gap-1 shadow-2xs"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>{zoneInstruction ? 'संशोधित करें' : '+ निर्देश जोड़ें'}</span>
                    </button>
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider">OFFICIAL ZONE</span>
                  </div>
                </div>

                {/* Zone-Level Printed Instruction Box (if present) */}
                {zoneInstruction && (
                  <div className="bg-amber-50 border border-amber-500/80 border-l-4 border-l-amber-600 p-3 rounded-lg text-xs font-medium text-slate-900 space-y-1 shadow-2xs">
                    <div className="font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-1">
                      <span>विशेष ज़ोन निर्देश ({zoneName}):</span>
                    </div>
                    <div className="whitespace-pre-line leading-relaxed text-slate-950 font-semibold">{zoneInstruction}</div>
                  </div>
                )}

                {Object.keys(groupedData[zoneName]).map((sectorName, sIdx) => {
                  const sectorInstruction = manualInstructions.sectors?.[sectorName];
                  const sampleSectorRec = (records || []).find(r => {
                    if (!r) return false;
                    const sMatch = (r.sector || '').trim().toLowerCase() === sectorName.trim().toLowerCase();
                    const inc = (
                      r.sector_incharge || 
                      r.sector_officer || 
                      r.sectorOfficer || 
                      r.sectorIncharge || 
                      r.sector_magistrate || 
                      r.incharge || 
                      r['सेक्टर प्रभारी'] ||
                      r['सेक्टर अधिकारी'] ||
                      r['सेक्टर मजिस्ट्रेट'] ||
                      r['प्रभारी'] ||
                      ''
                    ).trim();
                    return sMatch && inc && inc !== '-';
                  });
                  const sectorIncharge = (
                    sampleSectorRec?.sector_incharge || 
                    sampleSectorRec?.sector_officer || 
                    sampleSectorRec?.sectorOfficer || 
                    sampleSectorRec?.sectorIncharge || 
                    sampleSectorRec?.sector_magistrate || 
                    sampleSectorRec?.incharge || 
                    sampleSectorRec?.['सेक्टर प्रभारी'] || 
                    sampleSectorRec?.['सेक्टर अधिकारी'] || 
                    sampleSectorRec?.['सेक्टर मजिस्ट्रेट'] || 
                    sampleSectorRec?.['प्रभारी'] || 
                    ''
                  ).trim();
                  const sectorSahyogarth = (sampleSectorRec?.sector_sahyogarth || sampleSectorRec?.sector_assistant || '').trim();

                  return (
                    <div key={sIdx} className="space-y-2.5">
                      {/* Sector Header Banner with Inline Add Instruction Button & Incharges */}
                      <div className="bg-slate-100 border border-slate-300 border-l-4 border-l-blue-700 px-3 py-2 rounded-lg flex items-center justify-between gap-2 shadow-2xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-950">
                            <span>सेक्टर: {sectorName}</span>
                          </div>
                          {(sectorIncharge || sectorSahyogarth) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 font-semibold pt-0.5">
                              {sectorIncharge && (
                                <span className="flex items-center gap-1">
                                  <span className="text-blue-800 font-black">सेक्टर प्रभारी:</span>
                                  <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs">{sectorIncharge}</span>
                                </span>
                              )}
                              {sectorSahyogarth && (
                                <span className="flex items-center gap-1">
                                  <span className="text-emerald-800 font-black">सहयोगार्थ:</span>
                                  <span className="font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs">{sectorSahyogarth}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenEditModal('sector', sectorName, `सेक्टर निर्देश: ${sectorName}`)}
                          className="no-print shrink-0 text-[11px] bg-white hover:bg-amber-100 text-slate-800 font-bold px-2.5 py-1 rounded-md border border-slate-300 cursor-pointer transition flex items-center gap-1 shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3 text-amber-600" />
                          <span>{sectorInstruction ? 'संशोधित करें' : '+ निर्देश जोड़ें'}</span>
                        </button>
                      </div>

                      {/* Sector-Level Printed Instruction Box (if present) */}
                      {sectorInstruction && (
                        <div className="bg-blue-50 border border-blue-400 border-l-4 border-l-blue-600 p-3 rounded-lg text-xs font-medium text-slate-900 space-y-1 shadow-2xs">
                          <div className="font-black text-blue-900 flex items-center gap-1.5 border-b border-blue-200 pb-1">
                            <span>सेक्टर सुरक्षा निर्देश ({sectorName}):</span>
                          </div>
                          <div className="whitespace-pre-line leading-relaxed text-slate-950 font-semibold">{sectorInstruction}</div>
                        </div>
                      )}

                      {/* Grouped by Duty Place */}
                      {Object.keys(groupedData[zoneName][sectorName]).map((placeName, pIdx) => {
                        const placeRecords = groupedData[zoneName][sectorName][placeName];
                        const placeShift = placeRecords[0]?.shift || displayShift;
                        const pointInstruction = manualInstructions.points?.[placeName];

                        return (
                          <div
                            key={pIdx}
                            className="bg-white rounded-lg border-2 border-black overflow-hidden break-inside-avoid print:mb-3 shadow-xs"
                          >
                            {/* Compact 2-Row Official Duty Point Header with Point Instruction Button */}
                            <div className="bg-slate-100 px-3 py-1.5 border-b-2 border-black space-y-0.5">
                              {/* Row 1: Duty Place Name + Total Personnel Badge + Instruction Button */}
                              <div className="flex items-start sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-black flex-wrap">
                                  <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
                                  <span><strong>ड्यूटी स्थल:</strong> {placeName}</span>
                                  {placeRecords[0]?.booth_no && (
                                    <span className="ml-1 px-2 py-0.5 bg-slate-900 text-white rounded text-[11px] font-bold">
                                      बूथ सं० {placeRecords[0].booth_no}
                                    </span>
                                  )}
                                  {placeRecords[0]?.category && (
                                    <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[11px] font-bold">
                                      {placeRecords[0].category}
                                    </span>
                                  )}
                                  {placeRecords[0]?.vehicle_no && (
                                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded text-[11px] font-mono font-bold">
                                      🚌 बस नं० {placeRecords[0].vehicle_no}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleOpenEditModal('point', placeName, `ड्यूटी स्थल निर्देश: ${placeName}`)}
                                    className="no-print text-[10px] bg-white hover:bg-amber-200 border border-slate-400 text-slate-900 font-bold px-1.5 py-0.5 rounded cursor-pointer transition flex items-center gap-1"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                    <span>{pointInstruction ? 'निर्देश बदलें' : '+ स्थल निर्देश'}</span>
                                  </button>
                                  <span className="font-mono text-xs font-black bg-black text-white px-2.5 py-0.5 rounded shrink-0">
                                    तैनात बल: {placeRecords.length}
                                  </span>
                                </div>
                              </div>

                              {/* Row 2: Clean Duty Shift & Time */}
                              {placeShift && (
                                <div className="flex items-center gap-1 text-[11px] font-bold text-gray-800">
                                  <Clock className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                                  <span><strong>समय / पाली:</strong> {placeShift}</span>
                                </div>
                              )}
                            </div>

                            {/* Point-Level Printed Instruction Box (if present) */}
                            {pointInstruction && (
                              <div className="bg-amber-50/70 border-b border-amber-300 px-3 py-1.5 text-[11px] font-bold text-amber-950">
                                <strong>विशेष स्थल हिदायत / निर्देश:</strong> <span className="font-medium text-black">{pointInstruction}</span>
                              </div>
                            )}

                            {/* Wide 5-Column Landscape Table Layout: S.No | Rank/Name | Mobile | Posting | District */}
                            <div className="p-0 bg-white overflow-x-auto">
                              <table className="w-full text-sm border-collapse border-0 text-left">
                                <thead>
                                  <tr className="bg-slate-200 text-slate-900 border-b border-black font-extrabold text-xs sm:text-sm">
                                    <th className="border-r border-black py-2 px-2.5 w-14 text-center">क्र०सं०</th>
                                    <th className="border-r border-black py-2 px-3.5 w-72">नाम एवं पदनाम</th>
                                    <th className="border-r border-black py-2 px-3 font-mono w-44 text-center">मोबाईल नंबर</th>
                                    <th className="border-r border-black py-2 px-3.5">मूल तैनाती / थाना</th>
                                    <th className="py-2 px-3.5 w-44">गृह जनपद</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {placeRecords.map((row, rIdx) => {
                                    const cleanName = cleanOfficerName(row.name, row.posting, row.district, row.mobile);
                                    const displayCleanName = stripRankFromName(cleanName);
                                    const fullOfficerTitle = displayCleanName;

                                    return (
                                      <tr key={rIdx} className="border-b border-gray-300 hover:bg-gray-50 last:border-b-0 text-xs sm:text-sm">
                                        <td className="border-r border-gray-300 py-2.5 px-2.5 text-center font-mono font-bold bg-slate-50/70">{rIdx + 1}</td>
                                        <td className="border-r border-gray-300 py-2 px-3.5 font-black text-slate-950">
                                          <div className="flex items-center justify-between gap-1">
                                            <span>{fullOfficerTitle}</span>
                                            {onUpdateEventRecords && (
                                              <button
                                                type="button"
                                                onClick={() => setReplacementRecord(row)}
                                                className="no-print opacity-60 hover:opacity-100 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded px-1.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer shrink-0 transition"
                                                title="जवान बदलें (प्रतिस्थानी)"
                                              >
                                                <RefreshCw className="w-2.5 h-2.5" />
                                                <span>रिप्लेस</span>
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td className="border-r border-gray-300 py-2.5 px-3 font-mono font-black text-slate-900 text-center">
                                          {row.mobile || '-'}
                                        </td>
                                        <td className="border-r border-gray-300 py-2.5 px-3.5 text-slate-800 font-bold">
                                          {row.posting || '-'}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-slate-800 font-bold">
                                          {row.district || '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Global Official Instructions / Briefing Notes (At End of Booklet) - Hides completely if empty */}
        {manualInstructions.generalEnd && manualInstructions.generalEnd.trim() ? (
          <div className="border-2 border-black rounded-lg p-3.5 space-y-1.5 bg-gray-50 break-inside-avoid relative">
            <div className="flex items-center justify-between border-b border-black pb-1">
              <div className="font-extrabold text-xs sm:text-sm text-black uppercase">
                महत्वपूर्ण सामान्य सुरक्षा निर्देश एवं दिशा-निर्देश:
              </div>
              <button
                onClick={() => handleOpenEditModal('general', 'generalEnd', 'अंतिम सामान्य सुरक्षा निर्देश')}
                className="no-print text-[10px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>संशोधित करें</span>
              </button>
            </div>
            <div className="text-xs leading-relaxed text-gray-900 whitespace-pre-line font-medium">
              {manualInstructions.generalEnd}
            </div>
          </div>
        ) : (
          <div className="no-print p-3 border-2 border-dashed border-slate-300 rounded-xl text-center">
            <button
              onClick={() => handleOpenEditModal('general', 'generalEnd', 'अंतिम सामान्य सुरक्षा निर्देश')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>+ बुकलेट के अंत में सामान्य सुरक्षा निर्देश जोड़ें (वैकल्पिक)</span>
            </button>
          </div>
        )}

        {/* Senior Officer Signature & Customizable Pratilipi Block */}
        <div className="pt-8 flex justify-between items-end text-xs font-bold break-inside-avoid border-t border-slate-300">
          <div className="text-left space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <div className="font-extrabold text-xs sm:text-sm text-black">
                प्रतिलिपि: निम्नलिखित को सूचनार्थ एवं आवश्यक कार्यवाही हेतु प्रेषित:-
              </div>
              <button
                onClick={() => handleOpenEditModal('pratilipi', 'pratilipi', 'आधिकारिक प्रतिलिपि विवरण संशोधित करें')}
                className="no-print text-[10px] bg-slate-100 hover:bg-amber-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-300 cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Edit3 className="w-3 h-3 text-blue-600" />
                <span>प्रतिलिपि बदलें</span>
              </button>
            </div>
            <div className="text-xs sm:text-sm text-gray-900 whitespace-pre-line font-medium leading-relaxed">
              {manualInstructions.pratilipi || '1. समस्त संबंधित अधिकारी/कर्मचारी।\n2. कंट्रोल रूम सुरक्षा व्यवस्था अयोध्या।'}
            </div>
          </div>
          <div className="text-center space-y-1 shrink-0">
            <div className="h-6 flex items-end justify-center font-mono text-gray-400 italic text-[10px]">
              [ Digitally Signed ]
            </div>
            <div className="font-extrabold text-sm sm:text-base border-t border-black pt-1">
              ( वरिष्ठ पुलिस अधीक्षक )
            </div>
            <div className="text-xs text-gray-800">जनपद अयोध्या</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INSTRUCTION EDIT MODAL                                                    */}
      {/* ========================================================================= */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 font-devanagari text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-black text-base text-slate-950">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>{editModal.title}</span>
              </div>
              <button onClick={() => setEditModal({ ...editModal, isOpen: false })} className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveInstructionModal} className="space-y-4 text-xs font-bold">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <label className="text-slate-800 font-black">
                    निर्देश / प्रतिलिपि विवरण दर्ज करें:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditModal(prev => ({
                          ...prev,
                          text: autoFormatNumberedList(prev.text)
                        }));
                      }}
                      className="text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 border border-amber-300 cursor-pointer shadow-2xs"
                    >
                      <span>1, 2, 3 नंबर लगाएं</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditModal(prev => ({
                          ...prev,
                          text: stripNumbering(prev.text)
                        }));
                      }}
                      className="text-[11px] bg-slate-150 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 border border-slate-300 cursor-pointer shadow-2xs"
                    >
                      <span>नंबर हटाएं</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows="8"
                  value={editModal.text}
                  onChange={(e) => setEditModal({ ...editModal, text: e.target.value })}
                  placeholder="अपना मनचाहा विवरण यहाँ लिखें...\nआप जैसा लिखेंगे, ठीक वैसा ही बुकलेट में दिखेगा।"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed text-xs sm:text-sm font-devanagari"
                />
                <div className="text-[11px] text-slate-500">
                  <em>टिप: आप अपनी इच्छानुसार लाइन में बदलाव कर सकते हैं, सेव करने पर आपका लिखा टेक्स्ट ही सुरक्षित होगा।</em>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditModal({ ...editModal, text: '' });
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>साफ़ करें</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModal({ ...editModal, isOpen: false })}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3] text-emerald-400" />
                    <span>बुकलेट में सहेजें</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Duty Replacement & Substitution Modal */}
      {replacementRecord && (
        <DutyReplacementModal
          isOpen={Boolean(replacementRecord)}
          onClose={() => setReplacementRecord(null)}
          targetRecord={replacementRecord}
          masterForce={masterForce}
          eventRecords={records}
          onConfirmReplacement={handleConfirmReplacement}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Print Media CSS for perfect A4 Landscape paper formatting */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
            min-height: 92vh !important;
          }
          .page-break-zone {
            page-break-before: auto;
          }
          table {
            page-break-inside: auto;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
