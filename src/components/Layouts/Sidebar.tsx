import React, { useState } from 'react';
import {
  Building2,
  ChevronsUpDown,
  Contact,
  HelpCircle,
  Home,
  LayoutDashboard,
  LineChart,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { PageView } from '../../types/crm';

interface SidebarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  leadCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSettingsModal: (tab: 'support' | 'settings') => void;
}

const OFFICES = [
  { name: 'Prime Realty Group', branch: 'Main Corporate Office' },
  { name: 'Prime Realty Group', branch: 'Commercial Acquisition Desk' },
  { name: 'Prime Realty Group', branch: 'Private Clients Hub' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  leadCount,
  mobileOpen,
  onCloseMobile,
  onOpenSettingsModal,
}) => {
  const [selectedOfficeIdx, setSelectedOfficeIdx] = useState(0);

  const cycleOffice = () => {
    setSelectedOfficeIdx((prev) => (prev + 1) % OFFICES.length);
  };

  const navItems: { id: PageView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: <Contact className="w-[18px] h-[18px]" />,
      badge: leadCount,
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: <Home className="w-[18px] h-[18px]" />,
    },
    {
      id: 'team',
      label: 'Team',
      icon: <Users className="w-[18px] h-[18px]" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <LineChart className="w-[18px] h-[18px]" />,
    },
  ];

  const handleNavClick = (id: PageView) => {
    onNavigate(id);
    onCloseMobile();
  };

  const currentOffice = OFFICES[selectedOfficeIdx];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#0b1c30]/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200/80 z-50 flex flex-col justify-between transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Logo Lockup */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#047857]/10 border border-[#047857]/20 flex items-center justify-center text-[#005d42] shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[15px] text-[#0b1c30] leading-tight tracking-tight group-hover:text-[#005d42] transition-colors">
                  EstatePulse
                </span>
                <span className="text-[10px] font-semibold text-[#005d42] uppercase tracking-wider leading-tight">
                  Brokerage Pro
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="flex flex-col gap-1 px-4 mt-4" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[14px] font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#047857] text-white shadow-xs font-semibold'
                      : 'text-[#3e4943] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-white' : 'text-[#6e7a73]'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                        isActive
                          ? 'bg-[#99efe5] text-[#006f67]'
                          : 'bg-[#99efe5] text-[#006f67]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Office Switcher & Support Controls */}
        <div className="flex flex-col gap-1 p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={cycleOffice}
            title="Click to switch brokerage office"
            className="w-full bg-[#eff4ff] hover:bg-[#e5eeff] p-2.5 rounded-lg flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#d3e4fe] flex items-center justify-center shrink-0 text-[#005d42]">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col truncate">
                <span className="text-[12px] font-semibold text-[#0b1c30] truncate">
                  {currentOffice.name}
                </span>
                <span className="text-[11px] text-[#3e4943] truncate">{currentOffice.branch}</span>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-[#6e7a73] shrink-0" />
          </button>

          <div className="flex flex-col gap-0.5 pt-2">
            <button
              type="button"
              onClick={() => onOpenSettingsModal('support')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#3e4943] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors whitespace-nowrap"
            >
              <HelpCircle className="w-4 h-4 text-[#6e7a73]" />
              <span>Help &amp; Support</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSettingsModal('settings')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium text-[#3e4943] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors whitespace-nowrap"
            >
              <Settings className="w-4 h-4 text-[#6e7a73]" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
