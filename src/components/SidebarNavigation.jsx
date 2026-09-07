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
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  Sparkles
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

export default function SidebarNavigation({
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
      id: 'allocation',
      label: language === 'en' ? 'Duty Allocation' : 'ड्यूटी आवंटन',
      icon: ShieldAlert,
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

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0b1329] text-slate-200 border-r border-slate-800/70 select-none font-devanagari">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 shrink-0 flex items-center justify-center">
            <img
              src="/badge.png"
              alt="Police Emblem"
              className="w-7 h-7 object-contain filter drop-shadow"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-wide text-white truncate leading-tight">
                अयोध्या पुलिस
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-amber-400 font-bold truncate tracking-wide">
              सुरक्षा व ड्यूटी पास
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition md:hidden cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Clean Nav List (Single Unified Rail - No Section Dividers) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer relative group ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-[1.01]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-950/15 text-slate-950'
                    : 'bg-slate-800/60 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
              </div>

              <div className="flex-1 text-left min-w-0 flex items-center justify-between gap-2">
                <span className={`truncate text-xs ${isActive ? 'text-slate-950 font-black' : 'text-slate-200 font-bold'}`}>
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar Rail */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 z-30 w-64 shadow-xl">
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile Backdrop & Slide-over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
}
