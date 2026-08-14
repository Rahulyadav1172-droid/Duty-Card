import React, { useState, useEffect } from 'react';
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
  Layers
} from 'lucide-react';

import SearchSection from './components/SearchSection';
import DutyCard from './components/DutyCard';
import PrintTemplate from './components/PrintTemplate';
import AdminUpload from './components/AdminUpload';
import BookletSection from './components/BookletSection';
import SingleWindowLogin from './components/SingleWindowLogin';
import DutyPointFilterSection from './components/DutyPointFilterSection';
import MasterForceManager from './components/MasterForceManager';
import EventManager from './components/EventManager';

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

  // Fallback / Initial Seed Event
  return [
    {
      id: 'event-shravan-2026',
      title: 'श्रावण झूला मेला',
      subtitle: 'ड्यूटी कार्ड अयोध्या-2026',
      status: 'active',
      created_at: new Date().toLocaleDateString('hi-IN'),
      signatoryText: 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
      signatureImg: '',
      note: '',
      isNoteEnabled: false,
      briefing: '',
      isBriefingEnabled: false,
      records: initialData || [],
      attendanceMap: {}
    },
    {
      id: 'event-cm-visit-2026',
      title: 'मुख्यमंत्री वीआईपी सुरक्षा व्यवस्था 2026',
      subtitle: 'जनपद अयोध्या विशेष ड्यूटी पास',
      status: 'active',
      created_at: new Date().toLocaleDateString('hi-IN'),
      signatoryText: 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
      signatureImg: '',
      note: 'समस्त अधिकारी समय से 02 घंटे पूर्व ब्रीफिंग स्थल पर उपस्थित रहें।',
      isNoteEnabled: true,
      briefing: 'कंट्रोल रूम अयोध्या',
      isBriefingEnabled: true,
      records: (initialData || []).slice(0, 3).map((r, i) => ({
        ...r,
        id: `VIP-00${i + 1}`,
        duty_place: i === 0 ? 'हेलीपैड सुरक्षा व्यवस्था' : 'मुख्य मंच प्रवेश द्वार',
        shift: 'प्रातः 08:00 बजे से कार्यक्रम समाप्ति तक'
      })),
      attendanceMap: {}
    }
  ];
}

export default function App() {
  // Multi-Event State
  const [events, setEvents] = useState(getInitialEvents);

  const [activeEventId, setActiveEventId] = useState(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_EVENT_ID_KEY);
      if (savedId) return savedId;
    } catch (e) {}
    return 'event-shravan-2026';
  });

  // Current Active Event Object (Guaranteed fallback)
  const currentEvent = (Array.isArray(events) && events.find(e => e.id === activeEventId)) || (Array.isArray(events) && events[0]) || {
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

  // Master Force Register State (Global)
  const [forceRecords, setForceRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(FORCE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return (initialData || []).map(d => ({
      pno: d.id || `PN-${Math.floor(100000 + Math.random() * 900000)}`,
      name: d.name,
      rank: d.rank || 'का0',
      mobile: d.mobile,
      posting: d.posting || 'थाना कोतवाली',
      district: d.district || 'अयोध्या'
    }));
  });

  // Role Authentication State: 'guest' | 'senior' | 'admin'
  const [userRole, setUserRole] = useState(() => {
    try {
      return sessionStorage.getItem(ROLE_SESSION_KEY) || 'guest';
    } catch (e) {
      return 'guest';
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDuty, setActiveDuty] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  const handleMarkAttendance = (id, name) => {
    const now = new Date().toLocaleString('hi-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const newAttendance = {
      ...(currentEvent.attendanceMap || {}),
      [id]: {
        reported: true,
        name: name,
        time: now
      }
    };

    const updated = events.map(e => e.id === currentEvent.id ? { ...e, attendanceMap: newAttendance } : e);
    saveEvents(updated);
  };

  const handleUpdateDutyPhoto = (id, base64Photo) => {
    const newRecords = (currentEvent.records || []).map(r => r.id === id ? { ...r, photo: base64Photo } : r);
    handleUpdateActiveEventRecords(newRecords);
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
    setIsPrintModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 font-devanagari">
      {/* Top Header - Deep Navy & Gold Accent Touch */}
      <header className="sticky top-0 z-40 bg-[#0b132b] text-white border-b border-slate-800 shadow-md">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src="/badge.png" alt="Badge" className="w-8 h-8 sm:w-10 sm:h-10 object-contain drop-shadow-md shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-white leading-tight flex items-center gap-1.5 sm:gap-2">
                <span className="truncate">अयोध्या पुलिस ड्यूटी पास</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black truncate max-w-[110px] sm:max-w-[160px] shrink-0">
                  {currentEvent.title}
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium truncate">उत्तर प्रदेश पुलिस सुरक्षा व्यवस्था</p>
            </div>
          </div>

          {/* Login / Logout Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {userRole !== 'guest' ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 flex items-center gap-1">
                  {userRole === 'admin' ? <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  <span>{userRole === 'admin' ? 'एडमिन' : 'अधिकारी'}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  title="लॉग आउट करें"
                >
                  <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">लॉग आउट</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                लॉगिन
              </button>
            )}
          </div>
        </div>

        {/* Logged in Navigation Bar (Horizontally scrollable for mobile) */}
        {userRole !== 'guest' && (
          <div className="border-t border-slate-800/80 bg-slate-900/95 px-2 sm:px-4 py-1">
            <div className="max-w-5xl mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => handleTabClick('search')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'search' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white font-bold'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                कार्ड खोजें
              </button>

              <button
                onClick={() => handleTabClick('filter')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'filter' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white font-bold'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                पॉइंट फ़िल्टर
              </button>

              <button
                onClick={() => handleTabClick('booklet')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer shrink-0 ${
                  activeTab === 'booklet' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white font-bold'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                बुकलेट PDF
              </button>

              {userRole === 'admin' && (
                <button
                  onClick={() => handleTabClick('events')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer shrink-0 ${
                    activeTab === 'events' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white font-bold'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  इवेंट्स मैनेजर
                </button>
              )}

              {userRole === 'admin' && (
                <button
                  onClick={() => handleTabClick('force')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer shrink-0 ${
                    activeTab === 'force' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white font-bold'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  मास्टर फ़ोर्स
                </button>
              )}

              {userRole === 'admin' && (
                <button
                  onClick={() => handleTabClick('upload')}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-xs whitespace-nowrap cursor-pointer shrink-0 ${
                    activeTab === 'upload' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white font-bold'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  अपलोड / सेटिंग्स
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-5 sm:space-y-6">
        {/* PUBLICLY ACCESSIBLE SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="max-w-xl mx-auto space-y-5">
            <SearchSection
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearchSubmit={() => {}}
              totalRecords={currentEvent.records?.length || 0}
              events={events}
              activeEventId={activeEventId}
              onSelectActiveEvent={handleSelectActiveEvent}
            />

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
              />
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
              <div className="bg-white p-7 rounded-2xl border border-slate-200 text-center space-y-2.5 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    अपना मोबाईल नंबर या नाम दर्ज करें
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                    अपनी ड्यूटी स्थान, सेक्टर, समय एवं साथ में तैनात अन्य पुलिसकर्मियों की सूची देखने के लिए ऊपर सर्च बॉक्स में नंबर लिखें।
                  </p>
                </div>
              </div>
            )}
          </div>
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
          />
        )}

        {/* SENIOR OFFICER / ADMIN: DUTY BOOKLET PDF */}
        {activeTab === 'booklet' && (
          <BookletSection
            records={currentEvent.records || []}
            isAdminAuthenticated={userRole === 'admin' || userRole === 'senior'}
            onRequestAdminAuth={handleRequestAdminAuth}
            events={events}
            activeEventId={activeEventId}
            onSelectActiveEvent={handleSelectActiveEvent}
            eventTitle={currentEvent.title}
            eventSubtitle={currentEvent.subtitle}
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

      {/* Print Overlay Modal */}
      {isPrintModalOpen && activeDuty && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto p-4 flex flex-col items-center justify-center no-print">
          <div className="bg-white border border-slate-300 p-4 rounded-2xl max-w-lg w-full space-y-4 mb-4 shadow-2xl">
            <div className="flex items-center justify-between text-slate-900 font-bold text-sm">
              <span>प्रिंट प्रीव्यू (Print Preview)</span>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs cursor-pointer"
              >
                बंद करें
              </button>
            </div>
            
            <div className="bg-white rounded-lg p-2 text-black border border-slate-200">
              <PrintTemplate
                duty={activeDuty}
                customNote={currentEvent.note || ''}
                isNoteEnabled={currentEvent.isNoteEnabled}
                customBriefing={currentEvent.briefing || ''}
                isBriefingEnabled={currentEvent.isBriefingEnabled}
                eventTitle={currentEvent.title}
                eventSubtitle={currentEvent.subtitle}
                signatureImg={currentEvent.signatureImg || ''}
                signatoryText={currentEvent.signatoryText || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या'}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                अभी प्रिंट करें (Print Now)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print only template */}
      <div className="hidden print:block">
        <PrintTemplate
          duty={activeDuty}
          customNote={currentEvent.note || ''}
          isNoteEnabled={currentEvent.isNoteEnabled}
          customBriefing={currentEvent.briefing || ''}
          isBriefingEnabled={currentEvent.isBriefingEnabled}
          eventTitle={currentEvent.title}
          eventSubtitle={currentEvent.subtitle}
          signatureImg={currentEvent.signatureImg || ''}
          signatoryText={currentEvent.signatoryText || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या'}
        />
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-4 text-center text-xs text-slate-500 space-y-0.5 mt-auto">
        <p className="font-bold text-slate-700">अयोध्या पुलिस ड्यूटी व पास प्रबंधन प्रणाली © 2026</p>
        <p className="text-[11px] text-slate-400">उत्तर प्रदेश पुलिस सुरक्षा व्यवस्था</p>
      </footer>
    </div>
  );
}
