import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  History,
  Phone
} from 'lucide-react';

import { useLanguage } from './context/LanguageContext';
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
import AuditLogModal from './components/AuditLogModal';

import initialData from './data/duty_data.json';
import {
  fetchEventsFromSupabase,
  upsertEventToSupabase,
  deleteEventFromSupabase,
  subscribeToEventsRealtime,
  fetchMasterForceFromSupabase,
  saveMasterForceToSupabase,
  subscribeToMasterForceRealtime,
  fetchGlobalActiveEventId,
  saveGlobalActiveEventId,
  subscribeToActiveEventIdRealtime,
  checkSupabaseHealth,
  checkIfEventsUpdated
} from './utils/supabaseSync';
import {
  initCloudAuthConfig,
  validateSessionSignature,
  setAuthenticatedSession,
  clearAuthenticatedSession
} from './utils/authManager';

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
      helplineList: [
        { id: '1', title: 'पुलिस कंट्रोल रूम (अयोध्या)', number: '9454417465' },
        { id: '2', title: 'पुलिस सिटी कन्ट्रोल रुम (अयोध्या)', number: '9454402648' },
        { id: '3', title: 'मेला नियंत्रण कक्ष / ड्यूटी हेल्पडेस्क', number: '9454402655' }
      ],
      isHelplineEnabled: true,
      records: [],
      attendanceMap: {}
    }
  ];
}

export default function App() {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  // Multi-Event State
  const [events, setEvents] = useState(getInitialEvents);

  const [activeEventId, setActiveEventId] = useState(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);
      if (savedId) return savedId;
    } catch (e) {}
    return 'event-shravan-2026';
  });

  // Role Authentication State: 'guest' | 'senior' | 'admin' with cryptographic session signature validation
  const [userRole, setUserRole] = useState(() => {
    try {
      const savedRole = sessionStorage.getItem(ROLE_SESSION_KEY) || 'guest';
      const sig = sessionStorage.getItem('police_portal_session_sig');
      if (savedRole !== 'guest' && !validateSessionSignature(savedRole, sig)) {
        clearAuthenticatedSession();
        return 'guest';
      }
      return savedRole;
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
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('checking'); // 'checking' | 'connected' | 'error'
  const [cloudErrorDetail, setCloudErrorDetail] = useState(null);
  const [pendingTab, setPendingTab] = useState(null);

  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        return params.get('search') || params.get('id') || params.get('mobile') || params.get('pno') || '';
      }
    } catch (e) {}
    return '';
  });
  const [activeDuty, setActiveDuty] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
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

  // Current Active Event Object (Guaranteed fallback, respects active status everywhere)
  const activeEventsList = useMemo(() => {
    return (Array.isArray(events) ? events : []).filter(e => e.status !== 'archived');
  }, [events]);

  const currentEvent = useMemo(() => {
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

    // 1. If currently selected event exists and is not archived, use it
    const matched = events.find(e => e.id === activeEventId && e.status !== 'archived');
    if (matched) return matched;

    // 2. Otherwise default to first active non-archived event
    const firstActive = events.find(e => e.status !== 'archived');
    if (firstActive) return firstActive;

    // 3. Fallback to matched event or first event
    return events.find(e => e.id === activeEventId) || events[0];
  }, [events, activeEventId]);

  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Load from Supabase on mount & subscribe to realtime changes across all devices
  useEffect(() => {
    let unsubscribeEvents = () => {};
    let unsubscribeForce = () => {};
    let unsubscribeActiveEventId = () => {};

    async function initSupabase() {
      // 0. Verify Supabase Cloud connection status
      const health = await checkSupabaseHealth();
      if (health.ok) {
        setCloudStatus('connected');
        setCloudErrorDetail(null);
      } else {
        setCloudStatus('error');
        setCloudErrorDetail(health);
      }

      // 1. Initialize Auth Config from Cloud
      initCloudAuthConfig();

      // 2. Fetch Master Force Pool from Cloud
      const cloudForce = await fetchMasterForceFromSupabase();
      if (cloudForce && Array.isArray(cloudForce) && cloudForce.length > 0) {
        setForceRecords(cloudForce);
        try {
          localStorage.setItem(FORCE_STORAGE_KEY, JSON.stringify(cloudForce));
        } catch (e) {}
      }

      // 3. Fetch Events from Cloud
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

      // 4. Fetch Global Active Event ID from Cloud
      const cloudActiveId = await fetchGlobalActiveEventId();
      if (cloudActiveId) {
        setActiveEventId(cloudActiveId);
        try {
          localStorage.setItem(ACTIVE_EVENT_ID_KEY, cloudActiveId);
        } catch (e) {}
      }

      // Realtime Events Listener
      unsubscribeEvents = subscribeToEventsRealtime((freshEvents) => {
        if (freshEvents && freshEvents.length > 0) {
          setEvents(freshEvents);
          try {
            localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(freshEvents));
          } catch (e) {}
        }
      });

      // Realtime Master Force Listener
      unsubscribeForce = subscribeToMasterForceRealtime((freshForce) => {
        if (freshForce && Array.isArray(freshForce) && freshForce.length > 0) {
          setForceRecords(freshForce);
          try {
            localStorage.setItem(FORCE_STORAGE_KEY, JSON.stringify(freshForce));
          } catch (e) {}
        }
      });

      // Realtime Active Event ID Listener (Across all devices)
      unsubscribeActiveEventId = subscribeToActiveEventIdRealtime((freshActiveId) => {
        if (freshActiveId) {
          setActiveEventId(freshActiveId);
          try {
            localStorage.setItem(ACTIVE_EVENT_ID_KEY, freshActiveId);
          } catch (e) {}
        }
      });
    }

    initSupabase();

    // Quota-Safe Multi-Device Refresh: Uses lightweight timestamp check (~100 bytes) instead of downloading entire database
    let lastCheckTime = 0;
    const refreshCloudData = async (force = false) => {
      const now = Date.now();
      // Throttle focus checks to at most once per 30 seconds unless forced
      if (!force && (now - lastCheckTime) < 30000) {
        return;
      }
      lastCheckTime = now;

      try {
        // 1. Quota Guard: Only fetch full events if timestamps or event counts actually changed
        const hasEventUpdates = force ? true : await checkIfEventsUpdated(eventsRef.current || []);
        if (hasEventUpdates) {
          const cloudEvents = await fetchEventsFromSupabase();
          if (cloudEvents && cloudEvents.length > 0) {
            setEvents(cloudEvents);
            try {
              localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(cloudEvents));
            } catch (e) {}
          }
        }

        // 2. Active Event ID Check
        const cloudActiveId = await fetchGlobalActiveEventId();
        if (cloudActiveId && cloudActiveId !== activeEventId) {
          setActiveEventId(cloudActiveId);
          try {
            localStorage.setItem(ACTIVE_EVENT_ID_KEY, cloudActiveId);
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Cross-browser lightweight sync notice:', err);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshCloudData(false);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Heartbeat: Gentle 2-minute check, only when tab is actively visible (saves database API quota)
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshCloudData(false);
      }
    }, 120000);

    return () => {
      unsubscribeEvents();
      unsubscribeForce();
      unsubscribeActiveEventId();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(heartbeatInterval);
    };
  }, []);

  const recheckCloudConnection = async () => {
    setCloudStatus('checking');
    const health = await checkSupabaseHealth();
    if (health.ok) {
      setCloudStatus('connected');
      setCloudErrorDetail(null);
      const cloudEvents = await fetchEventsFromSupabase();
      if (cloudEvents && cloudEvents.length > 0) {
        setEvents(cloudEvents);
      }
    } else {
      setCloudStatus('error');
      setCloudErrorDetail(health);
    }
  };

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
    saveGlobalActiveEventId(id);
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

    // Sync Master Force deployed/reserve status
    if (Array.isArray(forceRecords) && forceRecords.length > 0) {
      const assignedPnos = new Set((newRecords || []).map(r => String(r.pno || '').trim()).filter(Boolean));
      const assignedMobiles = new Set((newRecords || []).map(r => String(r.mobile || '').trim()).filter(Boolean));
      let forceChanged = false;
      const updatedForce = forceRecords.map(f => {
        const isDeployed = (f.pno && assignedPnos.has(String(f.pno).trim())) || (f.mobile && assignedMobiles.has(String(f.mobile).trim()));
        const newStatus = isDeployed ? 'deployed' : 'reserve';
        if (f.status !== newStatus) {
          forceChanged = true;
          return { ...f, status: newStatus };
        }
        return f;
      });
      if (forceChanged) {
        handleUpdateForce(updatedForce);
      }
    }
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

  const handleUpdateActiveEventHelpline = (newList, enabled) => {
    const updatedObj = { ...currentEvent, helplineList: newList, isHelplineEnabled: enabled };
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

  const handleUpdateActiveEventAllocationData = (allocationData) => {
    const updatedObj = { ...currentEvent, allocationData: allocationData };
    const updated = events.map(e => e.id === currentEvent.id ? updatedObj : e);
    saveEvents(updated, updatedObj);
  };

  const handleUpdateForce = (newForce) => {
    setForceRecords(newForce);
    try {
      localStorage.setItem(FORCE_STORAGE_KEY, JSON.stringify(newForce));
    } catch (e) {}
    saveMasterForceToSupabase(newForce);
  };

  const handleRestoreDatabase = (restoredEvents, restoredForce = null) => {
    if (Array.isArray(restoredEvents) && restoredEvents.length > 0) {
      saveEvents(restoredEvents);
      setActiveEventId(restoredEvents[0].id);
    }
    if (Array.isArray(restoredForce) && restoredForce.length > 0) {
      handleUpdateForce(restoredForce);
    }
  };

  const handleLoginSuccess = (role) => {
    setUserRole(role);
    setAuthenticatedSession(role);
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
    clearAuthenticatedSession();
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
      setSearchResults([]);
      setSearchAttempted(false);
      return;
    }

    const cleanQuery = searchQuery.replace(/\D/g, '');
    const textQuery = searchQuery.trim().toLowerCase();

    const activeRecords = currentEvent.records || [];
    const matches = activeRecords.filter(record => {
      const recordMob = (record.mobile || '').replace(/\D/g, '');
      const recordName = (record.name || '').toLowerCase();
      const recordId = (record.id || '').toLowerCase();
      const recordPno = (record.pno || '').toLowerCase();

      if (cleanQuery.length >= 4 && recordMob.includes(cleanQuery)) return true;
      if (textQuery.length >= 2 && recordName.includes(textQuery)) return true;
      if (textQuery.length >= 3 && (recordId.includes(textQuery) || recordPno.includes(textQuery))) return true;
      return false;
    });

    setSearchResults(matches);
    if (matches.length === 1) {
      setActiveDuty(matches[0]);
    } else if (matches.length > 1) {
      // If currently selected duty is in matches, keep it, otherwise let user choose from list
      setActiveDuty(prev => (prev && matches.some(m => m.id === prev.id)) ? prev : null);
    } else {
      setActiveDuty(null);
    }
    setSearchAttempted(true);
  }, [searchQuery, currentEvent]);

  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex font-sans selection:bg-amber-500 selection:text-slate-950 font-devanagari">
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
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        eventTitle={currentEvent.title}
        totalPersonnelCount={currentEvent.records?.length || 0}
      />

      {/* 2. Main Content Wrapper */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-in-out ${
          userRole !== 'guest' ? 'md:pl-64' : 'pl-0'
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

              {/* Event Title */}
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-black text-white truncate leading-tight">
                  {userRole === 'guest' ? 'अयोध्या पुलिस ड्यूटी पास पोर्टल' : currentEvent.title}
                </h1>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {userRole === 'guest' ? 'उत्तर प्रदेश पुलिस सुरक्षा व्यवस्था' : (currentEvent.subtitle || 'उत्तर प्रदेश पुलिस')}
                </p>
              </div>
            </div>

            {/* Right: Language Toggle & User Profile Dropdown */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Subtle Live Sync Indicator (Clean, non-intrusive) */}
              <div
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-slate-300 select-none"
                title="सुरक्षित क्लाउड नेटवर्क से कनेक्टेड"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>लाइव सिंक</span>
              </div>

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
                      {userRole === 'admin' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </div>

                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-black text-white leading-tight">
                        {userRole === 'admin' ? t('superAdmin', 'सुपर एडमिन') : t('seniorOfficer', 'वरिष्ठ अधिकारी')}
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
                            {t('activeSession', 'सक्रिय सत्र')}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="font-black text-sm text-white flex items-center gap-1.5">
                          <span>
                            {userRole === 'admin' ? t('superAdminTitle', 'सुपर एडमिनिस्ट्रेटर') : t('seniorOfficerTitle', 'वरिष्ठ पुलिस अधिकारी')}
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
                            <span>{t('switchLanguage', 'भाषा')}</span>
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
                            <div>{language === 'en' ? 'Change Password' : 'पासवर्ड बदलें'}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{language === 'en' ? 'Update account security' : 'खाता सुरक्षा अपडेट करें'}</div>
                          </div>
                        </button>

                        {/* 2. System Audit Log */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsAuditLogModalOpen(true);
                          }}
                          className="w-full px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-amber-400 transition flex items-center gap-2.5 cursor-pointer text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <History className="w-4 h-4" />
                          </div>
                          <div>
                            <div>{language === 'en' ? 'Audit Log & History' : 'ऑडिट लॉग'}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{language === 'en' ? 'View deletion & security logs' : 'विलोपन व सुरक्षा रिकॉर्ड्स देखें'}</div>
                          </div>
                        </button>

                        {/* 3. Admin Quick Settings */}
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
                              <div>{language === 'en' ? 'Portal Settings' : 'पोर्टल सेटिंग्स'}</div>
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

            {searchResults.length > 1 && !activeDuty ? (
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900">
                      {searchResults.length} संबंधित जवान मिले (अपना कार्ड चुनें)
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {searchResults.map((rec) => (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => setActiveDuty(rec)}
                      className="p-3 bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition cursor-pointer flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 text-xs sm:text-sm group-hover:text-amber-900 truncate">
                          {rec.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {rec.rank || 'जवान'} • {rec.posting || 'थाना कोतवाली'} {rec.district ? `(${rec.district})` : ''}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">
                          {rec.pno ? `PNO: ${rec.pno}` : `मो०: ${rec.mobile || '-'}`}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 shrink-0">
                        कार्ड देखें
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : activeDuty ? (
              <div className="space-y-3">
                {searchResults.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveDuty(null)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>← अन्य {searchResults.length} परिणाम देखें</span>
                  </button>
                )}
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
              </div>
            ) : searchAttempted && searchQuery.trim() ? (
              <div className="p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-xs">
                <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-rose-700">
                  कोई ड्यूटी रिकॉर्ड नहीं मिला!
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  "{currentEvent.title}" में प्रविष्ट खोज "<span className="font-mono text-amber-900 font-bold">{searchQuery}</span>" के लिए कोई ड्यूटी आवंटन प्राप्त नहीं हुआ।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quick Emergency & Police Helpline Widget (Permanent 24x7 Display) */}
                {(() => {
                  const defaultHelplines = [
                    { id: '1', title: 'पुलिस कंट्रोल रूम (अयोध्या)', number: '9454417465' },
                    { id: '2', title: 'पुलिस सिटी कन्ट्रोल रुम (अयोध्या)', number: '9454402648' },
                    { id: '3', title: 'मेला नियंत्रण कक्ष / ड्यूटी हेल्पडेस्क', number: '9454402655' }
                  ];
                  const helplines = (Array.isArray(currentEvent.helplineList) && currentEvent.helplineList.length > 0)
                    ? currentEvent.helplineList
                    : defaultHelplines;

                  if (currentEvent.isHelplineEnabled === false) return null;

                  return (
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                              {language === 'en' ? 'Emergency & Duty Control Room' : 'आपातकालीन सहायता एवं ड्यूटी नियंत्रण कक्ष'}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {language === 'en' ? '24x7 Police Helpline Contacts' : '24x7 पुलिस ड्यूटी हेल्पलाइन संपर्क'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {language === 'en' ? 'Active 24x7' : '24x7 सक्रिय'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {helplines.map((contact, idx) => (
                          <a
                            key={contact.id || idx}
                            href={`tel:${String(contact.number || '').replace(/[^0-9+]/g, '')}`}
                            className="p-2.5 bg-slate-50 hover:bg-amber-50/70 border border-slate-200/90 hover:border-amber-300 rounded-xl transition flex items-center justify-between gap-2 group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-black text-slate-900 group-hover:text-amber-900 truncate">
                                {contact.title}
                              </div>
                              <div className="text-[11px] font-mono font-bold text-slate-600 group-hover:text-amber-800">
                                {contact.number}
                              </div>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center shrink-0 transition shadow-2xs">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}
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
            onUpdateAllocationData={handleUpdateActiveEventAllocationData}
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
            masterForce={forceRecords}
            onRestoreDatabase={handleRestoreDatabase}
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
            masterForce={forceRecords}
            onUpdateEventRecords={handleUpdateActiveEventRecords}
            activeEvent={currentEvent}
            onUpdateEvent={handleUpdateEvent}
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
            helplineList={currentEvent.helplineList || []}
            isHelplineEnabled={currentEvent.isHelplineEnabled !== false}
            onUpdateHelpline={handleUpdateActiveEventHelpline}
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

      {/* Transparency System Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditLogModalOpen}
        onClose={() => setIsAuditLogModalOpen(false)}
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
