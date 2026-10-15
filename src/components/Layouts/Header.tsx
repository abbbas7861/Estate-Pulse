import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  MessageSquare,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import { supabase } from '../../lib/supabaseClient';

interface HeaderProps {
  globalSearch: string;
  onGlobalSearchChange: (val: string) => void;
  onOpenNewTransaction: () => void;
  onOpenMobileMenu: () => void;
}

interface MessageItem {
  id: string;
  sender_name?: string;
  body?: string;
  created_at?: string;
}

interface ActivityItem {
  id: string;
  action?: string;
  details?: string;
  created_at?: string;
}

export const Header: React.FC<HeaderProps> = ({
  globalSearch,
  onGlobalSearchChange,
  onOpenNewTransaction,
  onOpenMobileMenu,
}) => {
  const { user, orgId } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Real user details (FIX #15)
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

  // Real stats for user
  const [userClosedVolume, setUserClosedVolume] = useState<number | null>(null);
  const [userDealsCount, setUserDealsCount] = useState<number>(0);

  // Real messages (FIX #16)
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Real activities / alerts (FIX #17)
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (!user?.id || !orgId) return;

    // Fetch user closed deals
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

  // Fetch real messages on demand or mount
  useEffect(() => {
    if (!orgId) return;

    async function fetchMessages() {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, sender_name, body, created_at')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setMessages(data);
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
  }, [orgId]);

  // Fetch real activities on demand or mount
  useEffect(() => {
    if (!orgId) return;

    async function fetchActivities() {
      setLoadingActivities(true);
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('id, action, details, created_at')
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setActivities(data);
        } else {
          setActivities([]);
        }
      } catch {
        setActivities([]);
      } finally {
        setLoadingActivities(false);
      }
    }

    fetchActivities();
  }, [orgId]);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-30">
      <div className="w-full h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Hamburger + Global Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-[#3e4943] hover:bg-[#eff4ff] transition-colors"
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
              className="w-full bg-transparent border-0 outline-none text-[#0b1c30] placeholder:text-[#6e7a73] text-[13px]"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => onGlobalSearchChange('')}
                className="text-[#6e7a73] hover:text-[#0b1c30]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Primary Action + Quick Popovers + Broker Profile */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 bg-[#047857] hover:bg-[#005d42] text-white px-4 py-2 rounded-lg transition-colors text-[13px] font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Transaction</span>
          </button>

          {/* Messages & Notifications */}
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setShowMessages(!showMessages);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#3e4943] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors relative cursor-pointer"
              aria-label="Brokerage messages"
            >
              <MessageSquare className="w-[18px] h-[18px]" />
              {messages.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#006f67] ring-2 ring-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowMessages(false);
                setShowProfileMenu(false);
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#3e4943] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors relative cursor-pointer"
              aria-label="System notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              {activities.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ba1a1a] ring-2 ring-white" />
              )}
            </button>

            {/* Messages Popover (FIX #16) */}
            {showMessages && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="font-display font-semibold text-[13px] text-[#0b1c30]">
                    Brokerage Direct Messages
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMessages(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 mt-1 max-h-64 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-slate-400">
                      No new messages
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className="py-2.5 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-[#0b1c30]">
                            {m.sender_name || 'Team Member'}
                          </span>
                          <span className="text-[11px] text-[#6e7a73]">
                            {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#3e4943] line-clamp-2">
                          {m.body || 'No message content'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Notifications Popover (FIX #17) */}
            {showNotifications && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="font-display font-semibold text-[13px] text-[#0b1c30]">
                    Organization Activity Alerts
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100 mt-1 max-h-64 overflow-y-auto">
                  {activities.length === 0 ? (
                    <div className="py-6 text-center text-[12px] text-slate-400">
                      You're all caught up.
                    </div>
                  ) : (
                    activities.map((act) => (
                      <div key={act.id} className="py-2.5 flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold text-[#005d42] capitalize">
                          {act.action || 'Activity Alert'}
                        </span>
                        <p className="text-[12px] text-[#0b1c30] line-clamp-2">
                          {act.details || 'New activity logged in the organization.'}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:block h-6 w-px bg-[#dce9ff]" />

          {/* User Profile Menu (FIX #15) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowMessages(false);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 cursor-pointer py-1 px-1.5 rounded-lg hover:bg-[#eff4ff] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {initials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[12px] font-semibold text-[#0b1c30] leading-tight whitespace-nowrap">
                  {fullName}
                </span>
                <span className="text-[11px] text-[#3e4943] leading-tight whitespace-nowrap">
                  {role}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-[#6e7a73] hidden sm:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-11 w-56 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[12px] font-semibold text-[#0b1c30]">{fullName}</p>
                  {dreNumber && (
                    <p className="text-[11px] text-[#6e7a73]">DRE #{dreNumber}</p>
                  )}
                </div>
                {userClosedVolume !== null && (
                  <div className="py-1 flex flex-col">
                    <span className="px-3 py-1.5 text-[12px] text-[#3e4943]">
                      Deals Closed:{' '}
                      <strong className="text-[#005d42] tabular-nums">
                        {userDealsCount}
                      </strong>
                    </span>
                    <span className="px-3 py-1.5 text-[12px] text-[#3e4943]">
                      Closed Volume:{' '}
                      <strong className="text-[#0b1c30] tabular-nums">
                        {userClosedVolume >= 1_000_000
                          ? `$${(userClosedVolume / 1_000_000).toFixed(1)}M`
                          : `$${Math.round(userClosedVolume / 1000)}k`}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
