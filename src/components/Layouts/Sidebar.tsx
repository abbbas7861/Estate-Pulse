import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Logo } from '../UI/Logo';
import {
  Bot,
  Building2,
  ChevronsUpDown,
  Contact,
  HelpCircle,
  Home,
  LayoutDashboard,
  LineChart,
  Settings,
  ShieldAlert,
  Users,
  X,
  UserCheck,
  Eye,
  Phone,
  FileText,
  Map,
  Receipt,
  Wallet,
  CreditCard,
  Briefcase,
  Calendar,
  Inbox,
} from 'lucide-react';
import { PageView } from '../../types/crm';
import { useAuth } from '../../lib/useAuth';
import { useSubscription } from '../../lib/hooks/useSubscription';

interface SidebarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  leadCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSettingsModal: (tab: 'support' | 'settings') => void;
}

const BRANCHES = [
  'Main Corporate Office',
  
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  leadCount,
  mobileOpen,
  onCloseMobile,
  onOpenSettingsModal,
}) => {
  const { orgName, orgId, user } = useAuth();
  const { isEnterprise } = useSubscription(orgId ?? null);
  const isAdmin = user?.email?.toLowerCase() === 'abbaspromo7861@gmail.com';
  const [selectedOfficeIdx, setSelectedOfficeIdx] = useState(0);
  const [hasWebsite, setHasWebsite] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('organizations')
      .select('has_public_website')
      .eq('id', orgId)
      .single()
      .then(({ data }) => setHasWebsite(data?.has_public_website || false));
  }, [orgId]);

  const cycleOffice = () => {
    setSelectedOfficeIdx((prev) => (prev + 1) % BRANCHES.length);
  };

  const companyName = orgName || 'My Brokerage';
  const currentBranch = BRANCHES[selectedOfficeIdx];

  const navItems: { id: PageView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
    },
    {
      id: 'ai-agent',
      label: 'AI Agent',
      icon: <Bot className="w-[18px] h-[18px]" />,
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: <Contact className="w-[18px] h-[18px]" />,
      badge: leadCount,
    },
    {
      id: 'inquiries',
      label: 'Inquiries',
      icon: <Inbox className="w-[18px] h-[18px]" />,
    },
    {
      id: 'properties',
      label: 'Properties',
      icon: <Home className="w-[18px] h-[18px]" />,
    },
    { id: 'deals', label: 'Deals', icon: <Briefcase className="w-[18px] h-[18px]" /> },
    { id: 'visits', label: 'Visits', icon: <Calendar className="w-[18px] h-[18px]" /> },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <Receipt className="w-[18px] h-[18px]" />,
    },
    {
      id: 'installments',
      label: 'Installments',
      icon: <CreditCard className="w-[18px] h-[18px]" />,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText className="w-[18px] h-[18px]" />,
    },
    {
      id: 'maps',
      label: 'Society Maps',
      icon: <Map className="w-[18px] h-[18px]" />,
    },
    {
      id: 'notes',
      label: 'Private Notes',
      icon: <FileText className="w-[18px] h-[18px]" />,
    },
    {
      id: 'commissions',
      label: 'Commissions',
      icon: <Wallet className="w-[18px] h-[18px]" />,
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

  const visibleNavItems = navItems.filter((item) => {
    if (item.id === 'inquiries' && !hasWebsite) return false;
    if (item.id === 'ai-agent' && !isEnterprise) return false;
    return true;
  });

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--sidebar-bg)] border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section: Logo & Nav (Scrollable) */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Logo Lockup */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <Logo size={32} className="shrink-0" />
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

          {/* Primary Navigation Links (Scrollable Area) */}
          <nav className="flex flex-col gap-1 px-4 mt-4 flex-1 overflow-y-auto min-h-0 pb-4 scrollbar-thin" aria-label="Main Navigation">
            {visibleNavItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[14px] font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[var(--primary)] text-white shadow-xs font-semibold'
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

                  {/* Sub-menu for pipeline stages under Leads */}
                  {item.id === 'leads' && (
                    <div className="flex flex-col gap-0.5 ml-4 pl-3 border-l border-slate-200/80 my-1">
                      {[
                        { id: 'leads-assigned' as PageView, label: 'Assigned', icon: <UserCheck className="w-3.5 h-3.5" /> },
                        { id: 'leads-awareness' as PageView, label: 'Awareness', icon: <Eye className="w-3.5 h-3.5" /> },
                        { id: 'leads-contacted' as PageView, label: 'Contacted', icon: <Phone className="w-3.5 h-3.5" /> },
                      ].map((sub) => {
                        const isSubActive = currentPage === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleNavClick(sub.id)}
                            aria-current={isSubActive ? 'page' : undefined}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all text-left ${
                              isSubActive
                                ? 'bg-[#005d42]/10 text-[#005d42] font-semibold'
                                : 'text-slate-500 hover:text-[#0b1c30] hover:bg-slate-100/70'
                            }`}
                          >
                            <span className={isSubActive ? 'text-[#005d42]' : 'text-slate-400'}>
                              {sub.icon}
                            </span>
                            <span className="truncate">{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Office Switcher & Support Controls (Fixed) */}
        <div className="flex flex-col gap-1 p-4 border-t border-slate-100 shrink-0 bg-[var(--sidebar-bg)]">
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
                  {companyName}
                </span>
                <span className="text-[11px] text-[#3e4943] truncate">{currentBranch}</span>
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
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavClick('super-admin')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors whitespace-nowrap ${
                  currentPage === 'super-admin'
                    ? 'bg-[#005d42] text-white shadow-xs'
                    : 'text-[#005d42] bg-[#eff4ff] hover:bg-[#e2edff]'
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Super Admin</span>
              </button>
            )}
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