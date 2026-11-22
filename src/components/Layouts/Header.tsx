/**
 * Header.tsx – App-wide top navigation bar.
 * Features:
 * - Global search
 * - Currency switcher
 * - Dark/Light theme toggle
 * - Live Notifications bell (Supabase Realtime on `activities` table):
 *     - Fetches latest 10 activities on mount
 *     - Realtime subscription prepends new inserts and increments unreadCount
 *     - Red dot badge shows unreadCount; cleared when dropdown opens
 * - Messages popover (placeholder)
 * - User profile menu with closed-deal stats
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  Calendar,
  ChevronDown,
  Globe,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Palette,
  Phone,
  Plus,
  Search,
  Sun,
  UserCog,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import { supabase } from '../../lib/supabaseClient';
import { useTheme, Theme } from '../../lib/hooks/useTheme';
import { useCurrency, CURRENCY_CONFIGS, SupportedCurrency, formatMoney } from '../../config/regional';
import { ProfileSettingsModal } from '../Modals/ProfileSettingsModal';

const THEME_OPTIONS: { id: Theme; name: string; color: string }[] = [
  { id: 'emerald', name: 'Emerald', color: '#005d42' },
  { id: 'ocean', name: 'Ocean', color: '#0284c7' },
  { id: 'royal', name: 'Royal', color: '#7c3aed' },
  { id: 'dark', name: 'Dark', color: '#10b981' },
];

interface HeaderProps {
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onOpenNewTransaction: () => void;
  onOpenMobileMenu: () => void;
  onOpenProfileSettings?: () => void;
  onOpenChat: () => void;
}

// Matches the `activities` table schema (supabase_step3_leads.sql)
interface NotificationItem {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change' | string;
  title: string;
  description?: string | null;
  lead_id?: string | null;
  org_id?: string | null;
  created_at: string;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const now = new Date().getTime();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'call':
      return <Phone className="w-3.5 h-3.5 text-[#005d42]" />;
    case 'email':
      return <Mail className="w-3.5 h-3.5 text-[#0284c7]" />;
    case 'meeting':
      return <Calendar className="w-3.5 h-3.5 text-[#7c3aed]" />;
    case 'stage_change':
      return <ChevronDown className="w-3.5 h-3.5 text-[#d97706]" />;
    default:
      return <Bell className="w-3.5 h-3.5 text-[#6e7a73]" />;
  }
}

export const Header: React.FC<HeaderProps> = ({
  globalSearch,
  onGlobalSearchChange,
  onOpenNewTransaction,
  onOpenMobileMenu,
  onOpenProfileSettings,
  onOpenChat,
}) => {
  const { user, orgId } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { theme, setTheme } = useTheme();
  const [currency, setCurrency] = useCurrency();

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationsRef = useRef<NotificationItem[]>([]);
  notificationsRef.current = notifications;

  // Real user details
  const fullName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Agent Associate';

  const initials = useMemo(() => {
    return (
      fullName
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AA'
    );
  }, [fullName]);

  const role = user?.user_metadata?.role || 'Senior Broker Associate';
  const dreNumber = user?.user_metadata?.dre_number;

  // User stats
  const [userClosedVolume, setUserClosedVolume] = useState<number | null>(null);
  const [userDealsCount, setUserDealsCount] = useState<number>(0);

  useEffect(() => {
    if (!user?.id || !orgId) return;
    async function fetchUserDeals() {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('budget, stage_id')
          .eq('org_id', orgId)
          .eq('assigned_to', user!.id);
        if (!error && data) {
          const closed = data.filter((l: any) => {
            const s = String(l.stage_id || '').toLowerCase();
            return s.includes('clos') || s.includes('won');
          });
          if (closed.length > 0) {
            const vol = closed.reduce((sum: number, l: any) => sum + (Number(l.budget) || 0), 0);
            setUserClosedVolume(vol);
            setUserDealsCount(closed.length);
          } else {
            setUserClosedVolume(null);
            setUserDealsCount(0);
          }
        }
      } catch {
        setUserClosedVolume(null);
      }
    }
    fetchUserDeals();
  }, [user, orgId]);

  // Notifications: initial fetch + Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    let isMounted = true;

    async function fetchNotifications() {
      setLoadingNotifications(true);
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('id, type, title, description, lead_id, org_id, created_at')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (isMounted) {
            if (!error && data) {
              setNotifications(data as NotificationItem[]);
              // Only count activities from TODAY as unread; older ones are historical
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const todayUnread = (data as NotificationItem[]).filter(
                (n) => new Date(n.created_at) >= todayStart
              ).length;
              setUnreadCount(Math.min(todayUnread, 9));
            } else {
              setNotifications([]);
              setUnreadCount(0);
            }
          }
      } catch {
        if (isMounted) { setNotifications([]); setUnreadCount(0); }
      } finally {
        if (isMounted) setLoadingNotifications(false);
      }
    }

    fetchNotifications();

    const channel = supabase
      .channel(`header-notifications-${orgId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (!isMounted) return;
          const newItem = payload.new as NotificationItem;
          setNotifications((prev) => [newItem, ...prev].slice(0, 10));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  const handleToggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    setShowMessages(false);
    setShowProfileMenu(false);
    setShowCurrencyMenu(false);
    setShowThemeMenu(false);
    if (next) setUnreadCount(0);
  };

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[var(--header-bg)] text-[var(--text-main)] backdrop-blur-md border-b border-slate-200/80 z-30">
      <div className="w-full h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Hamburger + Global Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-[#3e4943] hover:bg-[#eff4ff] transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-full flex items-center gap-2.5 bg-[#eff4ff] px-3.5 py-2 rounded-lg focus-within:ring-2 focus-within:ring-[#047857]/30 transition-all">
            <Search className="w-4 h-4 text-[#6e7a73] shrink-0" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Search properties, deals, clients, MLS ID..."
              className="w-full bg-transparent border-0 outline-none text-[var(--text-main)] placeholder:text-[#6e7a73] text-[13px]"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => onGlobalSearchChange('')}
                className="text-[#6e7a73] hover:text-[var(--text-main)] cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Primary Action + Popovers + Broker Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Currency Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCurrencyMenu(!showCurrencyMenu);
                setShowMessages(false);
                setShowNotifications(false);
                setShowProfileMenu(false);
                setShowThemeMenu(false);
              }}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-[var(--header-bg)] hover:bg-[#eff4ff] text-[var(--text-main)] text-[12px] font-semibold transition-colors cursor-pointer shadow-2xs"
              aria-label="Change currency"
            >
              <Globe className="w-3.5 h-3.5 text-[#005d42]" />
              <span className="sm:hidden">{CURRENCY_CONFIGS[currency]?.symbol || currency}</span>
              <span className="hidden sm:inline">{CURRENCY_CONFIGS[currency]?.label || currency}</span>
              <ChevronDown className="w-3 h-3 text-[#6e7a73]" />
            </button>
            {showCurrencyMenu && (
              <div className="absolute right-0 top-10 w-48 bg-[var(--header-bg)] rounded-xl shadow-lg border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Select Currency</div>
                {(['PKR', 'USD', 'AED', 'EUR', 'GBP'] as SupportedCurrency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCurrency(c); setShowCurrencyMenu(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors text-left cursor-pointer ${
                      currency === c ? 'bg-[#eff4ff] text-[#005d42] font-bold' : 'text-[var(--text-main)] hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span>{CURRENCY_CONFIGS[c].name}</span>
                    <span className="font-mono text-[11px] text-slate-500 font-semibold">{CURRENCY_CONFIGS[c].symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowMessages(false);
                setShowNotifications(false);
                setShowProfileMenu(false);
                setShowCurrencyMenu(false);
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#3e4943] hover:bg-[#eff4ff] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              aria-label="Change color theme"
              title="Theme Color"
            >
              <Palette className="w-[18px] h-[18px] text-[var(--primary)]" />
            </button>
            {showThemeMenu && (
              <div className="absolute right-0 top-10 w-40 bg-[var(--header-bg)] rounded-xl shadow-lg border border-slate-200 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Select Theme
                </div>
                {THEME_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] transition-colors text-left cursor-pointer ${
                      theme === t.id
                        ? 'bg-[#eff4ff] text-[var(--primary)] font-bold'
                        : 'text-[var(--text-main)] hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                        style={{ backgroundColor: t.color }}
                      />
                      <span>{t.name}</span>
                    </div>
                    {theme === t.id && (
                      <span className="text-[10px] font-semibold text-[var(--primary)]">Active</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages & Notifications */}
          <div className="relative hidden sm:flex items-center gap-1">
            {/* Messages */}
            <button
              type="button"
              onClick={onOpenChat}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative cursor-pointer text-[#3e4943] hover:bg-[#eff4ff] hover:text-[#0b1c30]"
              aria-label="Open team chat"
              title="Team Chat"
            >
              <MessageSquare className="w-[18px] h-[18px]" />
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              id="notifications-bell"
              onClick={handleToggleNotifications}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#3e4943] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors relative cursor-pointer"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-[#ba1a1a] ring-2 ring-white text-white text-[9px] font-bold leading-none px-0.5 animate-in zoom-in-75 duration-150">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>



            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 top-11 w-[340px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-[#f8fafc] to-white">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#005d42]" />
                    <span className="font-display font-bold text-[13px] text-[#0b1c30]">Notifications</span>
                    <span className="text-[10px] font-medium text-[#6e7a73] bg-slate-100 px-1.5 py-0.5 rounded-full">Live</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5 rounded-md hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-50">
                  {loadingNotifications ? (
                    <div className="py-10 text-center">
                      <div className="w-5 h-5 border-2 border-[#005d42] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-[11px] text-slate-400">Loading notifications&hellip;</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-[#f0fdf4] flex items-center justify-center mb-1">
                        <Bell className="w-5 h-5 text-[#005d42]" />
                      </div>
                      <p className="text-[13px] font-semibold text-[#0b1c30]">You&apos;re all caught up!</p>
                      <p className="text-[11px] text-slate-400">No new notifications right now.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const displayTitle =
                        notif.title ||
                        (notif.type ? `${notif.type.replace('_', ' ')} logged` : 'Activity Update');
                      const timeStr = formatRelativeTime(notif.created_at);
                      return (
                        <div key={notif.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors">
                          <div className="w-7 h-7 rounded-full bg-[#f0fdf4] border border-[#dcfce7] flex items-center justify-center shrink-0 mt-0.5">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[12px] font-semibold text-[#0b1c30] leading-snug line-clamp-1">{displayTitle}</p>
                              {timeStr && (
                                <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">{timeStr}</span>
                              )}
                            </div>
                            {notif.description && (
                              <p className="text-[11px] text-[#6e7a73] mt-0.5 line-clamp-2 leading-relaxed">{notif.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-[#f8fafc]">
                    <p className="text-[11px] text-slate-400 text-center">
                      Showing last {notifications.length} activities &middot; Powered by Supabase Realtime
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block h-6 w-px bg-[#dce9ff]" />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowProfileMenu(!showProfileMenu); setShowMessages(false); setShowNotifications(false); setShowCurrencyMenu(false); }}
              className="flex items-center gap-2.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-[#eff4ff] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden ring-1 ring-slate-200">
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[12px] font-semibold text-[#0b1c30] leading-tight whitespace-nowrap">{fullName}</span>
                <span className="text-[11px] text-[#3e4943] leading-tight whitespace-nowrap">{role}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[#6e7a73] hidden sm:block" />
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[12px] font-semibold text-[#0b1c30]">{fullName}</p>
                  {dreNumber && <p className="text-[11px] text-[#6e7a73]">DRE #{dreNumber}</p>}
                </div>
                {userClosedVolume !== null && (
                  <div className="py-1 flex flex-col">
                    <span className="px-3 py-1.5 text-[12px] text-[#3e4943]">
                      Deals Closed: <strong className="text-[#005d42] tabular-nums">{userDealsCount}</strong>
                    </span>
                    <span className="px-3 py-1.5 text-[12px] text-[#3e4943]">
                      Closed Volume: <strong className="text-[#0b1c30] tabular-nums">{formatMoney(userClosedVolume, { compact: true, currency })}</strong>
                    </span>
                  </div>
                )}
                <div className="py-1 border-t border-slate-100 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onOpenProfileSettings) {
                        onOpenProfileSettings();
                      } else {
                        setShowProfileModal(true);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-[#0b1c30] hover:bg-[#eff4ff] hover:text-[#005d42] rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <UserCog className="w-4 h-4 text-[#005d42]" />
                    <span>Profile &amp; Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProfileModal && (
        <ProfileSettingsModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </header>
  );
};
