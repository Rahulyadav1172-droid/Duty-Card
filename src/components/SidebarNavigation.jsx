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

  // Navigation Items strictly organized and role-guarded
  const allNavSections = [
    {
      title: language === 'en' ? 'Main Navigation' : 'मुख्य सेवाएं (Main Navigation)',
      items: [
        {
          id: 'search',
          label: language === 'en' ? 'Search Pass' : 'कार्ड खोजें',
          subLabel: language === 'en' ? 'Search Duty Pass' : 'Search Duty Pass',
          icon: Search,
          badge: null
        },
        {
          id: 'filter',
          label: language === 'en' ? 'Point Filter' : 'पॉइंट फ़िल्टर',
          subLabel: language === 'en' ? 'Duty Point & Inspection' : 'Duty Point & Inspection',
          icon: MapPin,
          badge: totalPersonnelCount > 0 ? `${totalPersonnelCount}` : null
        },
        {
          id: 'booklet',
          label: language === 'en' ? 'Booklet PDF' : 'बुकलेट PDF',
          subLabel: language === 'en' ? 'Roster Booklets' : 'Roster Booklets',
          icon: BookOpen,
          badge: null
        }
      ]
    },
    {
      title: language === 'en' ? 'Operations' : 'ड्यूटी ऑपरेशन्स (Operations)',
      allowedRoles: ['admin'],
      items: [
        {
          id: 'allocation',
          label: language === 'en' ? 'Duty Allocation' : 'ड्यूटी आवंटन',
          subLabel: language === 'en' ? 'Allocation & Change Hub' : 'Allocation & Change Hub',
          icon: ShieldAlert,
          allowedRoles: ['admin'],
          badge: 'Live'
        },
        {
          id: 'aamad',
          label: language === 'en' ? 'Force Arrival' : 'बल आमद',
          subLabel: language === 'en' ? 'Force Arrival Register' : 'Force Arrival Register',
          icon: UserCheck,
          allowedRoles: ['admin'],
          badge: null
        }
      ]
    },
    {
      title: language === 'en' ? 'Administration' : 'एडमिनिस्ट्रेशन (System Control)',
      allowedRoles: ['admin'],
      items: [
        {
          id: 'events',
          label: language === 'en' ? 'Event Manager' : 'इवेंट्स मैनेजर',
          subLabel: language === 'en' ? 'Event & Mela Setup' : 'Event & Mela Setup',
          icon: Calendar,
          allowedRoles: ['admin'],
          badge: null
        },
        {
          id: 'force',
          label: language === 'en' ? 'Master Force' : 'मास्टर फ़ोर्स',
          subLabel: language === 'en' ? 'Force Master Database' : 'Force Master Database',
          icon: Layers,
          allowedRoles: ['admin'],
          badge: null
        },
        {
          id: 'upload',
          label: language === 'en' ? 'Upload & Settings' : 'अपलोड / सेटिंग्स',
          subLabel: language === 'en' ? 'Excel, Labels & Sign' : 'Excel, Labels & Sign',
          icon: UploadCloud,
          allowedRoles: ['admin'],
          badge: null
        }
      ]
    }
  ];

  // Filter sections and items strictly based on current user role
  const navSections = allNavSections
    .filter(sec => !sec.allowedRoles || sec.allowedRoles.includes(userRole))
    .map(sec => ({
      ...sec,
      items: sec.items.filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole))
    }))
    .filter(sec => sec.items.length > 0);

  const handleItemClick = (item) => {
    onSelectTab(item.id);
    if (isMobileOpen) {
      onCloseMobile?.();
    }
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0b1329] text-slate-200 border-r border-slate-800/70 select-none font-devanagari">
      {/* Brand Header */}
      <div
        className={`p-4 border-b border-slate-800/80 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        } transition-all duration-200`}
      >
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

          {!isCollapsed && (
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
          )}
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

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1.5">
            {!isCollapsed ? (
              <div className="px-3 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                {sec.title}
              </div>
            ) : (
              <div className="h-px bg-slate-800/80 my-2 mx-1" />
            )}

            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    title={isCollapsed ? `${item.label} (${item.subLabel})` : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer relative group ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-[1.01]'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
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

                    {!isCollapsed && (
                      <div className="flex-1 text-left min-w-0 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <div className={`truncate ${isActive ? 'text-slate-950 font-black' : 'text-slate-200'}`}>
                            {item.label}
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              isActive ? 'text-slate-900/80 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {item.subLabel}
                          </div>
                        </div>

                        {/* Badge */}
                        {item.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black shrink-0 ${
                              isActive
                                ? 'bg-slate-950 text-amber-400'
                                : 'bg-slate-800/80 text-amber-400 border border-slate-700/60'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 hidden md:block">
        <button
          onClick={onToggleCollapse}
          className={`w-full py-2.5 px-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center justify-between text-xs font-bold cursor-pointer border border-slate-700/50 ${
            isCollapsed ? 'justify-center px-1' : ''
          }`}
          title={isCollapsed ? 'साइडबार विस्तृत करें' : 'साइडबार समेटें'}
        >
          {!isCollapsed && <span className="font-bold">साइडबार समेटें</span>}
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-amber-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-amber-400" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar Rail */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-200 ease-in-out shadow-xl ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
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
