import React from 'react';
import {
  Search,
  MapPin,
  BookOpen,
  ShieldAlert,
  UserCheck,
  Calendar,
  Layers,
  UploadCloud,
  X,
  QrCode,
  Vote
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

function SidebarNavigation({
  activeTab,
  onSelectTab,
  userRole,
  onLogout,
  onRequestAuth,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  eventTitle = '',
  totalPersonnelCount = 0
}) {
  const { language } = useLanguage();
  const isAdmin = userRole === 'admin';
  const isSenior = userRole === 'senior';

  // Do not render sidebar for logged-out / public guest users
  if (userRole === 'guest' || !userRole) {
    return null;
  }

  // Navigation Items strictly organized and role-guarded in operational police workflow order
  const allNavItems = [
    {
      id: 'search',
      label: language === 'en' ? 'Search Pass' : 'कार्ड खोजें',
      icon: Search
    },
    {
      id: 'scan_qr',
      label: language === 'en' ? 'Scan Duty Pass' : 'ड्यूटी पास स्कैन करें',
      icon: QrCode,
      allowedRoles: ['admin', 'senior']
    },
    {
      id: 'filter',
      label: language === 'en' ? 'Points & Attendance' : 'पॉइंट्स व उपस्थिति',
      icon: MapPin
    },
    {
      id: 'booklet',
      label: language === 'en' ? 'Booklet PDF' : 'बुकलेट PDF',
      icon: BookOpen
    },
    {
      id: 'election_duty',
      label: language === 'en' ? 'Election Booth Duty' : 'निर्वाचन बूथ ड्यूटी',
      icon: Vote,
      badge: language === 'en' ? 'ECI Booth' : 'बूथ मानक',
      allowedRoles: ['admin']
    },
    {
      id: 'allocation',
      label: language === 'en' ? 'Law & Order Duty' : 'कानून-व्यवस्था ड्यूटी',
      icon: ShieldAlert,
      badge: language === 'en' ? 'Points' : 'बिंदु/सेक्टर',
      allowedRoles: ['admin']
    },
    {
      id: 'aamad',
      label: language === 'en' ? 'Force Arrival' : 'बल आमद',
      icon: UserCheck,
      allowedRoles: ['admin']
    },
    {
      id: 'force',
      label: language === 'en' ? 'Master Force' : 'मास्टर फ़ोर्स',
      icon: Layers,
      allowedRoles: ['admin']
    },
    {
      id: 'events',
      label: language === 'en' ? 'Event Manager' : 'इवेंट्स मैनेजर',
      icon: Calendar,
      allowedRoles: ['admin']
    },
    {
      id: 'upload',
      label: language === 'en' ? 'Data Upload & Settings' : 'डेटा अपलोड व सेटिंग्स',
      icon: UploadCloud,
      allowedRoles: ['admin']
    }
  ];

  // Filter items strictly based on current user role
  const navItems = allNavItems.filter(
    item => !item.allowedRoles || item.allowedRoles.includes(userRole)
  );

  const handleItemClick = (item) => {
    onSelectTab(item.id);
    if (isMobileOpen) {
      onCloseMobile?.();
    }
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#090d16] text-slate-200 border-r border-slate-800/80 select-none font-sans">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/80 p-1 shadow-xs shrink-0 flex items-center justify-center">
            <img
              src="/badge.png"
              alt="Police Emblem"
              className="w-6 h-6 object-contain filter drop-shadow"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold tracking-wide text-white truncate leading-tight font-devanagari">
                अयोध्या पुलिस
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate tracking-normal font-devanagari">
              सुरक्षा व ड्यूटी प्रबंधन
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition md:hidden cursor-pointer touch-manipulation"
            title="बंद करें"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer relative group touch-manipulation active:scale-[0.98] ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium'
              }`}
            >
              {/* Glowing 2px accent indicator */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-500 rounded-r shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}

              {/* Icon Container with Uniform 18px stroke icons */}
              <div
                className={`w-[18px] h-[18px] flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'text-blue-400'
                    : 'text-slate-500 group-hover:text-slate-300'
                }`}
              >
                <Icon className="w-[18px] h-[18px] stroke-[1.8]" />
              </div>

              <div className="flex-1 text-left min-w-0 flex items-center justify-between gap-1.5">
                <span className={`truncate text-xs ${isActive ? 'text-white font-semibold' : 'text-slate-300'}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/80 shrink-0"
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer info */}
      <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
        <span className="font-mono">v2.6 Enterprise</span>
        <span className="font-medium">स्मार्ट सेल अयोध्या</span>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar Rail */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 w-64 shadow-xl">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Backdrop */}
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      />

      {/* 3. Mobile Slide-over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] h-full shadow-2xl md:hidden transition-transform duration-200 ease-out transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        {renderSidebarContent(true)}
      </div>
    </>
  );
}

export default React.memo(SidebarNavigation);
