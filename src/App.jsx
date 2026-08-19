import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileSpreadsheet,
  Smartphone,
  AlertTriangle,
  Printer,
  Shield,
  BookOpen,
  Lock,
  LogOut,
  KeyRound,
  MapPin,
  UserCheck,
  Users,
  LogIn,
  Calendar,
  Layers,
  Menu,
  ChevronDown,
  ShieldCheck,
  Globe,
  Moon,
  Sun
} from 'lucide-react';

import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import SidebarNavigation from './components/SidebarNavigation';
import SearchSection from './components/SearchSection';
import DutyCard from './components/DutyCard';
import PrintTemplate from './components/PrintTemplate';
import AdminUpload from './components/AdminUpload';
import BookletSection from './components/BookletSection';
import SingleWindowLogin from './components/SingleWindowLogin';
import DutyPointFilterSection from './components/DutyPointFilterSection';
import MasterForceManager from './components/MasterForceManager';
import EventManager from './components/EventManager';
import DutyAllocationHub from './components/DutyAllocationHub';
import ForceAamadManager from './components/ForceAamadManager';
import ChangePasswordModal from './components/ChangePasswordModal';

import initialData from './data/duty_data.json';
import {
  fetchEventsFromSupabase,
  upsertEventToSupabase,
  deleteEventFromSupabase,
  subscribeToEventsRealtime
} from './utils/supabaseSync';

const EVENTS_STORAGE_KEY = 'police_portal_events_v3';
const ACTIVE_EVENT_ID_KEY = 'police_portal_active_event_id';
const FORCE_STORAGE_KEY = 'police_master_force_records';
const ROLE_SESSION_KEY = 'police_portal_user_role';

// Helper to seed initial default event
function getInitialEvents() {
  try {
    const saved = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}

  // Initial Real Event Default
  return [
    {
      id: 'event-shravan-2026',
      title: 'श्रावण झूला मेला',
      subtitle: 'ड्यूटी कार्ड अयोध्या-2026',
      status: 'active',
      created_at: '16.08.2026 से अग्रिम आदेश तक',
      signatoryText: 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
      signatureImg: '',
      note: '',
      isNoteEnabled: false,
      briefing: '',
      isBriefingEnabled: false,
      records: [],
      attendanceMap: {}
    }
  ];
}

export default function App() {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();

  // Multi-Event State
  const [events, setEvents] = useState(getInitialEvents);

  const [activeEventId, setActiveEventId] = useState(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);
      if (savedId) return savedId;
    } catch (e) {}
    return 'event-shravan-2026';
  });

  // Role Authentication State: 'guest' | 'senior' | 'admin'
  const [userRole, setUserRole] = useState(() => {
    try {
      return sessionStorage.getItem(ROLE_SESSION_KEY) || 'guest';
    } catch (e) {
      return 'guest';
    }
  });

  // Master Force Register State (Global) - Only Real Data
  const [forceRecords, setForceRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(FORCE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDuty, setActiveDuty] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Current Active Event Object (Guaranteed fallback, respects active status for public search)
  const activeEventsList = (Array.isArray(events) ? events : []).filter(e => e.status !== 'archived');

  const currentEvent = (() => {
    if (!Array.isArray(events) || events.length === 0) {
      return {
        id: 'event-shravan-2026',
        title: 'श्रावण झूला मेला',
        subtitle: 'ड्यूटी कार्ड अयोध्या-2026',
        status: 'active',
        signatoryText: 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
        signatureImg: '',
        note: '',
        isNoteEnabled: false,
        briefing: '',
        isBriefingEnabled: false,
        records: initialData || [],
        attendanceMap: {}
      };
    }

    if (userRole === 'admin' || userRole === 'senior') {
      return events.find(e => e.id === activeEventId) || events[0];
    }

    // For public guest searching duty cards: strictly pick an active event
    return activeEventsList.find(e => e.id === activeEventId) || activeEventsList[0] || events[0];
  })();

  // Load from Supabase on mount & subscribe to realtime changes
  useEffect(() => {
    let unsubscribe = () => {};

    async function initSupabase() {
      const cloudEvents = await fetchEventsFromSupabase();
      if (cloudEvents && cloudEvents.length > 0) {
        setEvents(cloudEvents);
        try {
          localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(cloudEvents));
        } catch (e) {}
      } else if (cloudEvents && cloudEvents.length === 0) {
        // Table exists but empty -> seed initial events to Supabase
        for (const evt of events) {
          upsertEventToSupabase(evt);
        }
      }

      unsubscribe = subscribeToEventsRealtime((freshEvents) => {
        if (freshEvents && freshEvents.length > 0) {
          setEvents(freshEvents);
          try {
            localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(freshEvents));
          } catch (e) {}
        }
      });
    }

    initSupabase();

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync events to localStorage and Supabase Cloud
  const saveEvents = (newEvents, affectedEvent = null) => {
    setEvents(newEvents);
    try {
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(newEvents));
    } catch (e) {}

    // Async sync to Supabase
    if (affectedEvent) {
      upsertEventToSupabase(affectedEvent);
    } else {
      newEvents.forEach(evt => upsertEventToSupabase(evt));
    }
  };

  // Event Management Handlers
  const handleSelectActiveEvent = (id) => {
    setActiveEventId(id);
    try {
      localStorage.setItem(ACTIVE_EVENT_ID_KEY, id);
    } catch (e) {}
    setActiveDuty(null);
    setSearchQuery('');
  };

  const handleCreateEvent = (newEvent) => {
    const updated = [newEvent, ...events];
    saveEvents(updated, newEvent);
    handleSelectActiveEvent(newEvent.id);
  };

  const handleUpdateEvent = (id, updatedEvent) => {
    const updated = events.map(e => e.id === id ? updatedEvent : e);
    saveEvents(updated, updatedEvent);
  };

  const handleDeleteEvent = (id, title) => {
    if (events.length <= 1) {
      alert('कम से कम एक इवेंट का रहना अनिवार्य है।');
      return;
    }
    if (window.confirm(`क्या आप इवेंट "${title}" और उसका संपूर्ण डेटा हटाना चाहते हैं?`)) {
      const filtered = events.filter(e => e.id !== id);
      setEvents(filtered);
      try {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(filtered));
      } catch (e) {}
      deleteEventFromSupabase(id);
      if (activeEventId === id) {
        handleSelectActiveEvent(filtered[0]?.id);
      }
    }
  };

  const handleToggleEventStatus = (id) => {
    let toggledObj = null;
    const updated = events.map(e => {
      if (e.id === id) {
        toggledObj = {
          ...e,
          status: e.status === 'archived' ? 'active' : 'archived'
        };
        return toggledObj;
      }
      return e;
    });

    // If active event was archived, switch activeEventId to the first remaining active event
    if (toggledObj?.status === 'archived' && activeEventId === id) {
      const firstActive = updated.find(e => e.status !== 'archived');
      if (firstActive) {
        setActiveEventId(firstActive.id);
        try {
          localStorage.setItem(ACTIVE_EVENT_ID_KEY, firstActive.id);
        } catch (e) {}
      }
    }

    saveEvents(updated, toggledObj);
  };

  // Update records for the currently active event
  const handleUpdateActiveEventRecords = (newRecords) => {
    const updatedObj = { ...currentEvent, records: newRecords };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleResetActiveEventToDefault = () => {
    const updatedObj = { ...currentEvent, records: initialData || [] };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleUpdateActiveEventHeadings = (newTitle, newSubtitle) => {
    const updatedObj = { ...currentEvent, title: newTitle, subtitle: newSubtitle };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleUpdateActiveEventSignature = (newImg, newText) => {
    const updatedObj = { ...currentEvent, signatureImg: newImg, signatoryText: newText };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleUpdateActiveEventNote = (newNote, enabled) => {
    const updatedObj = { ...currentEvent, note: newNote, isNoteEnabled: enabled };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleUpdateActiveEventBriefing = (newBriefing, enabled) => {
    const updatedObj = { ...currentEvent, briefing: newBriefing, isBriefingEnabled: enabled };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleMarkAttendance = (id, name, status = 'present', targetDate = null) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const dateKey = targetDate || todayStr;

    const now = new Date().toLocaleString('hi-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // 1. Date-wise attendance dictionary
    let allAttendanceByDate = { ...(currentEvent.attendanceByDate || {}) };
    let dateAttendance = { ...(allAttendanceByDate[dateKey] || {}) };

    // 2. Global current attendanceMap
    let newAttendance = { ...(currentEvent.attendanceMap || {}) };

    if (status === 'unmarked') {
      delete dateAttendance[id];
      if (dateKey === todayStr) {
        delete newAttendance[id];
      }
    } else {
      const record = {
        status: status, // 'present' | 'absent'
        reported: status === 'present',
        name: name,
        time: now,
        date: dateKey,
        markedBy: userRole === 'admin' ? 'सुपर एडमिन' : 'वरिष्ठ अधिकारी'
      };
      dateAttendance[id] = record;
      if (dateKey === todayStr) {
        newAttendance[id] = record;
      }
    }

    allAttendanceByDate[dateKey] = dateAttendance;

    const updatedObj = {
      ...currentEvent,
      attendanceMap: newAttendance,
      attendanceByDate: allAttendanceByDate
    };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleUpdateDutyPhoto = (id, base64Photo) => {
    const newRecords = (currentEvent.records || []).map(r => r.id === id ? { ...r, photo: base64Photo } : r);
    handleUpdateActiveEventRecords(newRecords);
  };

  const handleUpdateDutyRecord = (updatedRecord) => {
    const newRecords = (currentEvent.records || []).map(r => r.id === updatedRecord.id ? updatedRecord : r);
    handleUpdateActiveEventRecords(newRecords);
    setActiveDuty(updatedRecord);
  };

  const handleUpdateActiveEventCustomLabels = (newLabels) => {
    const updatedObj = { ...currentEvent, customLabels: newLabels };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleUpdateForce = (newForce) => {
    setForceRecords(newForce);
    try {
      localStorage.setItem(FORCE_STORAGE_KEY, JSON.stringify(newForce));
    } catch (e) {}
  };

  const handleLoginSuccess = (role) => {
    setUserRole(role);
    try {
      sessionStorage.setItem(ROLE_SESSION_KEY, role);
    } catch (e) {}
    setIsLoginModalOpen(false);

    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    } else if (role === 'admin') {
      setActiveTab('events');
    } else if (role === 'senior') {
      setActiveTab('filter');
    }
  };

  const handleLogout = () => {
    setUserRole('guest');
    try {
      sessionStorage.removeItem(ROLE_SESSION_KEY);
    } catch (e) {}
    setActiveTab('search');
  };

  const handleTabClick = (tabName) => {
    if ((tabName === 'force' || tabName === 'upload' || tabName === 'events') && userRole !== 'admin') {
      setPendingTab(tabName);
      setIsLoginModalOpen(true);
      return;
    }
    if ((tabName === 'filter' || tabName === 'booklet') && userRole === 'guest') {
      setPendingTab(tabName);
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tabName);
  };

  const handleRequestAdminAuth = (callback) => {
    if (userRole === 'admin' || userRole === 'senior') {
      callback();
    } else {
      setPendingTab('booklet');
      setIsLoginModalOpen(true);
    }
  };

  // Search in active event records
  useEffect(() => {
    if (!searchQuery.trim()) {
      setActiveDuty(null);
      setSearchAttempted(false);
      return;
    }

    const cleanQuery = searchQuery.replace(/\D/g, '');
    const textQuery = searchQuery.trim().toLowerCase();

    const activeRecords = currentEvent.records || [];
    const match = activeRecords.find(record => {
      const recordMob = (record.mobile || '').replace(/\D/g, '');
      const recordName = (record.name || '').toLowerCase();
      const recordId = (record.id || '').toLowerCase();

      if (cleanQuery.length >= 4 && recordMob.includes(cleanQuery)) return true;
      if (textQuery.length >= 2 && recordName.includes(textQuery)) return true;
      if (textQuery.length >= 3 && recordId.includes(textQuery)) return true;
      return false;
    });

    setActiveDuty(match || null);
    setSearchAttempted(true);
  }, [searchQuery, currentEvent]);

  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#080d1a] text-slate-900 dark:text-slate-100 flex font-sans selection:bg-amber-500 selection:text-slate-950 font-devanagari transition-colors duration-200">
      {/* 1. Responsive Sidebar Navigation */}
      <SidebarNavigation
        activeTab={activeTab}
        onSelectTab={handleTabClick}
        userRole={userRole}
        onLogout={handleLogout}
        onRequestAuth={(role, tab) => {
          if (tab) setPendingTab(tab);
          setIsLoginModalOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        eventTitle={currentEvent.title}
        totalPersonnelCount={currentEvent.records?.length || 0}
      />

      {/* 2. Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          userRole !== 'guest' ? (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64') : 'pl-0'
        }`}
      >
        {/* Modern Clean Top Header */}
        <header className="sticky top-0 z-20 bg-slate-900 text-white border-b border-slate-800 shadow-sm no-print">
          <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto w-full">
            {/* Left: Police Emblem & Title / Mobile Hamburger */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {userRole !== 'guest' ? (
                /* Mobile Hamburger for Logged In Officer */
                <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 md:hidden cursor-pointer"
                  title="मेनू खोलें"
                >
                  <Menu className="w-5 h-5" />
                </button>
              ) : (
                /* Police Emblem for Public / Guest */
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md shrink-0 flex items-center justify-center">
                  <img
                    src="/badge.png"
                    alt="Police Emblem"
                    className="w-7 h-7 object-contain filter drop-shadow"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Event Badge & Selector */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-sm font-black text-white truncate leading-tight">
                    {userRole === 'guest' ? 'अयोध्या पुलिस ड्यूटी पास पोर्टल' : currentEvent.title}
                  </h1>
                  <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shrink-0">
                    {currentEvent.title}
                  </span>
                </div>
                {userRole === 'guest' && (
                  <p className="text-[10px] text-slate-400 font-medium truncate">उत्तर प्रदेश पुलिस सुरक्षा व्यवस्था</p>
                )}
              </div>
            </div>

            {/* Right: Language Toggle, Night Mode Toggle, Cloud Sync & User Profile Dropdown */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Quick 1-Click Language Switcher (Always visible in Header) */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-white transition cursor-pointer shadow-xs active:scale-95 text-xs font-bold"
                title={language === 'hi' ? 'Switch to English' : 'हिन्दी में बदलें'}
              >
                <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono text-amber-300 font-extrabold uppercase">
                  {language === 'hi' ? 'EN' : 'हिन्दी'}
                </span>
              </button>

              {/* Quick Night Shift Mode Switcher (Always visible in Header) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-white transition cursor-pointer shadow-xs active:scale-95 text-xs font-bold"
                title={isDark ? (language === 'en' ? 'Day Mode' : 'दिन / डे मोड') : (language === 'en' ? 'Night Shift Mode' : 'नाईट ड्यूटी मोड')}
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />}
                <span className="hidden sm:inline text-xs font-bold text-slate-200">
                  {isDark ? (language === 'en' ? 'Day' : 'दिन') : (language === 'en' ? 'Night' : 'रात')}
                </span>
              </button>

              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>{t('cloudSyncActive', 'क्लाउड सिंक सक्रिय')}</span>
              </div>

              {userRole !== 'guest' ? (
                <div className="relative" ref={userMenuRef}>
                  {/* User Profile Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 text-white transition cursor-pointer shadow-xs active:scale-95"
                    title="यूज़र मेनू खोलें"
                  >
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        userRole === 'admin'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {userRole === 'admin' ? '👑' : '👮'}
                    </div>

                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-black text-white leading-tight">
                        {userRole === 'admin' ? t('superAdmin', 'सुपर एडमिन') : t('seniorOfficer', 'वरिष्ठ अधिकारी')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {userRole === 'admin' ? t('adminPortal', 'Admin Portal') : t('inspectionOfficer', 'Inspection Officer')}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isUserMenuOpen ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu Modal / Card */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 font-devanagari text-slate-200 p-2 space-y-2">
                      {/* User Info Card */}
                      <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/60 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            {t('activeSession', 'सक्रिय सत्र (Active Session)')}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="font-black text-sm text-white flex items-center gap-1.5">
                          <span>
                            {userRole === 'admin' ? t('superAdminTitle', '👑 सुपर एडमिनिस्ट्रेटर') : t('seniorOfficerTitle', '👮 वरिष्ठ पुलिस अधिकारी')}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-400 font-semibold truncate">
                          {currentEvent.title}
                        </div>
                      </div>

                      {/* Language Switcher Inside Profile Menu */}
                      <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-amber-400" />
                            <span>{t('switchLanguage', 'भाषा / Language')}</span>
                          </div>
                          <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">{language}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLanguage('hi')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              language === 'hi'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <span>🇮🇳 हिन्दी</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                              language === 'en'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-slate-700/70 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <span>🇬🇧 English</span>
                          </button>
                        </div>
                      </div>

                      {/* Night Shift Dark Mode Inside Profile Menu */}
                      <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs font-bold text-slate-300">
                        <div className="flex items-center gap-2">
                          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
                          <span>{language === 'en' ? 'Night Shift Mode' : 'नाईट ड्यूटी मोड'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleTheme}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isDark ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {isDark ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      {/* Menu Options */}
                      <div className="space-y-1 text-xs font-bold">
                        {/* 1. Change Password */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsChangePasswordOpen(true);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-amber-400 transition flex items-center gap-2.5 cursor-pointer text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <div>
                            <div>{language === 'en' ? 'Change Password' : 'पासवर्ड बदलें (Change Password)'}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{language === 'en' ? 'Update account security' : 'खाता सुरक्षा अपडेट करें'}</div>
                          </div>
                        </button>

                        {/* 2. Admin Quick Settings */}
                        {userRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              handleTabClick('upload');
                            }}
                            className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-amber-400 transition flex items-center gap-2.5 cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div>{language === 'en' ? 'Portal Settings' : 'पोर्टल सेटिंग्स (Portal Settings)'}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{language === 'en' ? 'Headings, Excel & Signatures' : 'हेडिंग्स, एक्सेल व हस्ताक्षर'}</div>
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-slate-800 my-1" />

                      {/* Logout Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition flex items-center justify-center gap-2 text-xs font-black cursor-pointer active:scale-95"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('logout', 'लॉग आउट करें')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setPendingTab('search');
                    setIsLoginModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('login', 'अधिकारी लॉगिन')}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        {/* PUBLICLY ACCESSIBLE SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="no-print">
              <SearchSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onSearchSubmit={() => {}}
                totalRecords={currentEvent.records?.length || 0}
                events={events}
                activeEventId={activeEventId}
                onSelectActiveEvent={handleSelectActiveEvent}
              />
            </div>

            {activeDuty ? (
              <DutyCard
                duty={activeDuty}
                allRecords={currentEvent.records || []}
                onPrintClick={handlePrintTrigger}
                customNote={currentEvent.note || ''}
                isNoteEnabled={currentEvent.isNoteEnabled}
                customBriefing={currentEvent.briefing || ''}
                isBriefingEnabled={currentEvent.isBriefingEnabled}
                attendanceMap={currentEvent.attendanceMap || {}}
                onMarkAttendance={handleMarkAttendance}
                eventTitle={currentEvent.title}
                eventSubtitle={currentEvent.subtitle}
                signatureImg={currentEvent.signatureImg || ''}
                signatoryText={currentEvent.signatoryText || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या'}
                onUpdateDutyPhoto={handleUpdateDutyPhoto}
                onUpdateDutyRecord={handleUpdateDutyRecord}
                userRole={userRole}
                onRequestAuth={(callback) => {
                  setPendingTab('search');
                  setIsLoginModalOpen(true);
                }}
                customLabels={currentEvent.customLabels || {}}
              />
            ) : searchAttempted && searchQuery.trim() ? (
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 text-center space-y-3 shadow-xs">
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">
                  {language === 'en' ? 'No Duty Record Found!' : 'कोई ड्यूटी रिकॉर्ड नहीं मिला!'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {language === 'en'
                    ? `No duty allocation found for "${searchQuery}" in ${currentEvent.title}.`
                    : `"${currentEvent.title}" में प्रविष्ट खोज "${searchQuery}" के लिए कोई ड्यूटी आवंटन प्राप्त नहीं हुआ।`}
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-7 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2.5 shadow-xs transition">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {language === 'en' ? 'Enter Mobile Number or Name' : 'अपना मोबाईल नंबर या नाम दर्ज करें'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-0.5">
                    {language === 'en'
                      ? 'Type your mobile number or name above to view your duty location, timing, and co-deployed colleagues.'
                      : 'अपनी ड्यूटी स्थान, सेक्टर, समय एवं साथ में तैनात अन्य पुलिसकर्मियों की सूची देखने के लिए ऊपर सर्च बॉक्स में नंबर लिखें।'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADMIN ONLY: DUTY ALLOCATION HUB */}
        {activeTab === 'allocation' && userRole === 'admin' && (
          <DutyAllocationHub
            masterForce={forceRecords}
            activeEvent={currentEvent}
            onUpdateEventRecords={handleUpdateActiveEventRecords}
            events={events}
            activeEventId={activeEventId}
            onSelectActiveEvent={handleSelectActiveEvent}
            onOpenBooklet={() => setActiveTab('booklet')}
          />
        )}

        {/* ADMIN ONLY: MULTI-EVENT MANAGER */}
        {activeTab === 'events' && (
          <EventManager
            events={events}
            activeEventId={activeEventId}
            onSelectActiveEvent={handleSelectActiveEvent}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onToggleEventStatus={handleToggleEventStatus}
          />
        )}

        {/* SENIOR OFFICER / ADMIN: DUTY POINT FILTER */}
        {activeTab === 'filter' && (
          <DutyPointFilterSection
            records={currentEvent.records || []}
            events={events}
            activeEventId={activeEventId}
            onSelectActiveEvent={handleSelectActiveEvent}
            eventTitle={currentEvent.title}
            eventSubtitle={currentEvent.subtitle}
            attendanceMap={currentEvent.attendanceMap || {}}
            attendanceByDate={currentEvent.attendanceByDate || {}}
            onMarkAttendance={handleMarkAttendance}
            userRole={userRole}
          />
        )}

        {/* SENIOR OFFICER / ADMIN: DUTY BOOKLET PDF */}
        {activeTab === 'booklet' && (
          <BookletSection
            records={currentEvent.records || []}
            isAdminAuthenticated={userRole === 'admin'}
            onRequestAdminAuth={handleRequestAdminAuth}
            events={events}
            activeEventId={activeEventId}
            onSelectActiveEvent={handleSelectActiveEvent}
            eventTitle={currentEvent.title}
            eventSubtitle={currentEvent.subtitle}
            eventStartDate={currentEvent.startDate || currentEvent.created_at || '16.08.2026 से अग्रिम आदेश तक'}
          />
        )}

        {/* ADMIN ONLY: FORCE AAMAD REGISTER */}
        {activeTab === 'aamad' && (
          <ForceAamadManager
            forceRecords={forceRecords}
            onUpdateForce={handleUpdateForce}
          />
        )}

        {/* ADMIN ONLY: MASTER FORCE REGISTER */}
        {activeTab === 'force' && (
          <MasterForceManager
            forceRecords={forceRecords}
            onUpdateForce={handleUpdateForce}
          />
        )}

        {/* ADMIN ONLY: EVENT-SCOPED BULK EXCEL UPLOAD & SETTINGS */}
        {activeTab === 'upload' && (
          <AdminUpload
            records={currentEvent.records || []}
            onUpdateRecords={handleUpdateActiveEventRecords}
            onResetToDefault={handleResetActiveEventToDefault}
            customNote={currentEvent.note || ''}
            isNoteEnabled={currentEvent.isNoteEnabled}
            onUpdateNote={handleUpdateActiveEventNote}
            customBriefing={currentEvent.briefing || ''}
            isBriefingEnabled={currentEvent.isBriefingEnabled}
            onUpdateBriefing={handleUpdateActiveEventBriefing}
            attendanceMap={currentEvent.attendanceMap || {}}
            eventTitle={currentEvent.title}
            eventSubtitle={currentEvent.subtitle}
            onUpdateEventHeadings={handleUpdateActiveEventHeadings}
            signatureImg={currentEvent.signatureImg || ''}
            signatoryText={currentEvent.signatoryText || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या'}
            onUpdateSignature={handleUpdateActiveEventSignature}
            events={events}
            activeEventId={activeEventId}
            onSelectActiveEvent={handleSelectActiveEvent}
            customLabels={currentEvent.customLabels || {}}
            onUpdateCustomLabels={handleUpdateActiveEventCustomLabels}
          />
        )}
      </main>

      {/* Single Window Login Modal */}
      <SingleWindowLogin
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPendingTab(null);
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* In-App Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userRole={userRole}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-4 text-center text-xs text-slate-500 space-y-0.5 mt-auto no-print">
        <p className="font-bold text-slate-700">अयोध्या पुलिस ड्यूटी व पास प्रबंधन प्रणाली © 2026</p>
        <p className="text-[11px] font-semibold text-slate-500">Designed & Developed by Smart Cell Ayodhya</p>
      </footer>
      </div>
    </div>
  );
}
