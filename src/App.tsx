/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect, useCallback } from 'react';

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface EBState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0b1c30', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '2rem',
          fontFamily: 'monospace',
        }}>
          <div style={{
            background: '#1a2d42', border: '1px solid #ef4444', borderRadius: '12px',
            padding: '2rem', maxWidth: '640px', width: '100%',
          }}>
            <h1 style={{ color: '#ef4444', marginTop: 0 }}>⚠ Application Error</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
              The app crashed before it could render. Check the browser console for full details.
            </p>
            <pre style={{
              background: '#0b1c30', color: '#fca5a5', padding: '1rem',
              borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error?.message}
              {this.state.error?.stack ? '\n\n' + this.state.error.stack : ''}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem', padding: '0.5rem 1.25rem',
                background: '#047857', color: '#fff', border: 'none',
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Session, User } from '@supabase/supabase-js';
import { CheckCircle2, Copy, X, Loader2, Mail, Phone, ExternalLink, Globe2 } from 'lucide-react';
import { AppLayout } from './components/Layouts/AppLayout';
import { DashboardPage } from './components/Pages/DashboardPage';
import { LeadsKanbanPage } from './components/Pages/LeadsKanbanPage';
import { LeadsStageListPage } from './components/Pages/LeadsStageListPage';
import { InquiriesPage } from './components/Pages/InquiriesPage';
import { PropertyListingPage } from './components/Pages/PropertyListingPage';
import { ExpensesPage } from './components/Pages/ExpensesPage';
import { CommissionsPage } from './components/Pages/CommissionsPage';
import { InstallmentsPage } from './components/Pages/InstallmentsPage';
import { DocumentsPage } from './components/Pages/DocumentsPage';
import { MapsPage } from './components/Pages/MapsPage';
import { NotesPage } from './components/Pages/NotesPage';
import { TeamPage } from './components/Pages/TeamPage';
import { AnalyticsPage } from './components/Pages/AnalyticsPage';
import { BillingPage } from './components/Pages/BillingPage';
import { DealsPage } from './components/Pages/DealsPage';
import { VisitsPage } from './components/Pages/VisitsPage';
import { SuperAdminPage } from './components/Pages/SuperAdminPage';
import { AIAgentPage } from './components/Pages/AIAgentPage';
import { LandingPage } from './components/Pages/LandingPage';
import { TermsPage } from './components/Pages/TermsPage';
import { PrivacyPage } from './components/Pages/PrivacyPage';
import { LoginPage } from './components/Pages/LoginPage';
import { SignupPage } from './components/Pages/SignupPage';
import { PublicWebsitePage } from './components/Pages/PublicWebsitePage';
import {
  AddLeadModal,
} from './components/Modals/CrmModals';
import { PropertyFormModal } from './components/Modals/PropertyFormModal';
import { PropertyDetailModal } from './components/Modals/PropertyDetailModal';
import { LeadDetailDrawer } from './components/Modals/LeadDetailDrawer';
import { ProfileSettingsModal } from './components/Modals/ProfileSettingsModal';
import { PwaInstallPrompt } from './components/Widgets/PwaInstallPrompt';
import { OfflineBanner } from './components/Widgets/OfflineBanner';
import { useOrgUsers } from './lib/hooks/useOrgUsers';
import { useLeads } from './lib/hooks/useLeads';
import { useProperties } from './lib/hooks/useProperties';
import { AuthContext, AuthContextType, fetchOrgId } from './lib/useAuth';
import { supabase } from './lib/supabaseClient';
import { Lead, LeadStage, PageView, Property, PropertyStatus } from './types/crm';
import { REGION, areaUnitLabel, formatMoney } from './config/regional';

// ─── Auth guard wrapper ────────────────────────────────────────────────────────

type AuthView = 'login' | 'signup';

interface AuthScreenProps {
  onGoToLanding: () => void;
  initialView?: AuthView;
  invitedEmail?: string | null;
}

function AuthScreen({ onGoToLanding, initialView = 'login', invitedEmail }: AuthScreenProps) {
  const [view, setView] = useState<AuthView>(initialView);

  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  if (view === 'signup') {
    return <SignupPage onGoToLogin={() => setView('login')} invitedEmail={invitedEmail} />;
  }
  return <LoginPage onGoToSignup={() => setView('signup')} />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function AppInner() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/site/')) {
    return <PublicWebsitePage />;
  }

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── URL Invite handling ─────────────────────────────────────────────────────
  const [invitedEmail, setInvitedEmail] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite');
    }
    return null;
  });

  // ── Public page routing (before auth) ───────────────────────────────────────
  // 'app' = show auth/dashboard flow; 'landing'/'terms'/'privacy' = public pages
  type PublicView = 'landing' | 'terms' | 'privacy' | 'app';
  const [publicView, setPublicView] = useState<PublicView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (params.get('invite') || viewParam === 'login' || viewParam === 'signup') {
        return 'app';
      }
    }
    return 'landing';
  });

  const [initialAuthView, setInitialAuthView] = useState<AuthView>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'login' || viewParam === 'signup') {
        return viewParam as AuthView;
      }
      if (params.get('invite')) {
        return 'signup';
      }
    }
    return 'login';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get('invite');
      const viewParam = params.get('view');

      if (invite) {
        setInvitedEmail(invite);
        setPublicView('app');
        setInitialAuthView('signup');
      } else if (viewParam === 'login' || viewParam === 'signup') {
        setPublicView('app');
        setInitialAuthView(viewParam as 'login' | 'signup');
      }
    }
  }, []);

  const resolveOrgName = async (oid: string | null, currentUser: User | null): Promise<string | null> => {
    if (oid) {
      try {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', oid)
          .maybeSingle();

        if (orgData?.name) {
          return orgData.name;
        }
      } catch (err) {
        console.warn('[App] failed to fetch org name:', err);
      }
    }

    return (
      currentUser?.user_metadata?.brokerage_name ||
      currentUser?.user_metadata?.org_name ||
      null
    );
  };

  useEffect(() => {
    // Hydrate from existing session on mount
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const oid = await fetchOrgId(s.user.id);
        setOrgId(oid);
        const name = await resolveOrgName(oid, s.user);
        setOrgName(name);
        // If session exists already, go straight to app
        setPublicView('app');
      }
      setAuthLoading(false);
    });

    // Listen for future auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          const oid = await fetchOrgId(s.user.id);
          setOrgId(oid);
          const name = await resolveOrgName(oid, s.user);
          setOrgName(name);
          setPublicView('app');
        } else {
          setOrgId(null);
          setOrgName(null);
        }
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setPublicView('landing');
  };

  const refreshUser = async () => {
    try {
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if (refreshedUser) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('full_name, phone, avatar_url')
            .eq('id', refreshedUser.id)
            .maybeSingle();

          if (profile) {
            refreshedUser.user_metadata = {
              ...refreshedUser.user_metadata,
              full_name: profile.full_name || refreshedUser.user_metadata?.full_name,
              phone: profile.phone || refreshedUser.user_metadata?.phone,
              avatar_url: profile.avatar_url || refreshedUser.user_metadata?.avatar_url,
            };
          }
        } catch (dbErr) {
          console.warn('[App] profile sync error:', dbErr);
        }
        setUser({ ...refreshedUser });
        const name = await resolveOrgName(orgId, refreshedUser);
        setOrgName(name);
      }
    } catch (err) {
      console.warn('[App] failed to refresh user:', err);
    }
  };

  const authCtx: AuthContextType = {
    session,
    user,
    orgId,
    orgName,
    loading: authLoading,
    signOut,
    refreshUser,
  };

  // ── Full-screen loader while resolving session ───────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b1c30] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#97f5cc] animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Connecting to EstatePulse…</p>
        </div>
      </div>
    );
  }

  // ── Public: Terms ────────────────────────────────────────────────────────────
  if (publicView === 'terms') {
    return (
      <>
        <OfflineBanner />
        <TermsPage onBack={() => setPublicView('landing')} />
      </>
    );
  }

  // ── Public: Privacy ──────────────────────────────────────────────────────────
  if (publicView === 'privacy') {
    return (
      <>
        <OfflineBanner />
        <PrivacyPage onBack={() => setPublicView('landing')} />
      </>
    );
  }

  // ── Public: Landing ──────────────────────────────────────────────────────────
  if (publicView === 'landing') {
    return (
      <>
        <OfflineBanner />
        <PwaInstallPrompt />
        <LandingPage
          onGoToLogin={() => setPublicView('app')}
          onGoToSignup={() => setPublicView('app')}
          onGoToTerms={() => setPublicView('terms')}
          onGoToPrivacy={() => setPublicView('privacy')}
        />
      </>
    );
  }

  // ── App view: if not authenticated, show auth screens ───────────────────────
  if (!session || !user) {
    return (
      <AuthContext.Provider value={authCtx}>
        <OfflineBanner />
        <AuthScreen
          onGoToLanding={() => setPublicView('landing')}
          initialView={invitedEmail ? 'signup' : initialAuthView}
          invitedEmail={invitedEmail}
        />
      </AuthContext.Provider>
    );
  }

  // ── Authenticated dashboard ─────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={authCtx}>
      <OfflineBanner />
      <PwaInstallPrompt />
      <Dashboard orgId={orgId} user={user} onSignOut={signOut} />
    </AuthContext.Provider>
  );
}

// ─── Public Website Add-on Component ──────────────────────────────────────────

interface PublicWebsiteAddonProps {
  orgId: string | null;
  orgName: string | null;
  onNotify: (msg: string) => void;
}

function PublicWebsiteAddon({ orgId, onNotify }: PublicWebsiteAddonProps) {
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [addonCopied, setAddonCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [orgNameFromDb, setOrgNameFromDb] = useState<string | null>(null);

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 48);

  // Load current state from DB
  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('organizations')
      .select('name, website_slug')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOrgNameFromDb(data.name || null);
          setSlug(data.website_slug || null);
          setSlugInput(data.website_slug || generateSlug(data.name || 'brokerage'));
          setEnabled(!!data.website_slug);
        }
        setLoaded(true);
      });
  }, [orgId]);

  const handleToggle = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      if (enabled) {
        // Disable: clear slug
        const { error } = await supabase
          .from('organizations')
          .update({ website_slug: null, has_public_website: false })
          .eq('id', orgId);
        if (error) throw error;
        setSlug(null);
        setEnabled(false);
        onNotify('Public property portal disabled.');
      } else {
        // Enable: generate slug if not set
        const newSlug = slugInput.trim() ? generateSlug(slugInput) : generateSlug(orgNameFromDb || orgId);
        const { error } = await supabase
          .from('organizations')
          .update({ website_slug: newSlug, has_public_website: true })
          .eq('id', orgId);
        if (error) throw error;
        setSlug(newSlug);
        setSlugInput(newSlug);
        setEnabled(true);
        onNotify(`Public portal enabled at /site/${newSlug}`);
      }
    } catch (err: any) {
      onNotify(`Failed to update portal: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlug = async () => {
    if (!orgId) return;
    const cleanSlug = generateSlug(slugInput);
    if (!cleanSlug) {
      onNotify('Please enter a valid slug.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ website_slug: cleanSlug })
        .eq('id', orgId);
      if (error) throw error;
      setSlug(cleanSlug);
      setSlugInput(cleanSlug);
      onNotify(`Website URL updated to /site/${cleanSlug}`);
    } catch (err: any) {
      onNotify(`Failed to save slug: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const portalUrl = slug ? `${window.location.origin}/site/${slug}` : null;

  const handleCopyUrl = () => {
    if (portalUrl && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(portalUrl).catch(() => {});
    }
    setAddonCopied(true);
    setTimeout(() => setAddonCopied(false), 2000);
  };

  if (!loaded) return null;

  return (
    <div className="border border-slate-200 rounded-xl p-3.5 flex flex-col gap-3 bg-gradient-to-br from-emerald-50/60 to-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#005d42] flex items-center justify-center shrink-0 mt-0.5">
            <Globe2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-[13px] text-[#0b1c30]">
              Enable Public Property Portal ($30/mo)
            </p>
            <p className="text-[11px] text-[#6e7a73] mt-0.5">
              Live branded public property portal for buyer acquisition
            </p>
          </div>
        </div>
        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={saving}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-[#047857]' : 'bg-slate-200'
          } ${saving ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
          <label className="text-[11px] font-semibold text-slate-600">
            Customize Website URL (Slug):
          </label>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500">
              <span className="text-[11px] text-slate-400 select-none font-mono">
                /site/
              </span>
              <input
                type="text"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="brokerage-name"
                className="w-full text-[12px] font-mono text-[#0b1c30] outline-none bg-transparent"
              />
            </div>
            <button
              type="button"
              disabled={saving || !slugInput || slugInput === slug}
              onClick={handleSaveSlug}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                slugInput && slugInput !== slug
                  ? 'bg-[#005d42] hover:bg-[#004d37] text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Save
            </button>
          </div>

          {portalUrl && (
            <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 mt-1">
              <span className="text-[11px] text-slate-600 font-mono truncate flex-1">
                {portalUrl}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  title="Copy portal link"
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#005d42] hover:text-[#047857] transition-colors cursor-pointer"
                >
                  {addonCopied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {addonCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open live site"
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard (only rendered when authenticated) ─────────────────────────────

interface DashboardProps {
  orgId: string | null;
  user: User;
  onSignOut: () => Promise<void>;
}

function Dashboard({ orgId, user, onSignOut }: DashboardProps) {
  useEffect(() => {
    if (window.location.pathname.startsWith('/site/')) return; // Skip if on public website
    
    document.title = 'EstatePulse CRM | Brokerage Dashboard';
    // Base64 encoded Green Shield to bypass cache
    const greenFavicon = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NCA0NCI+PHJlY3Qgd2lkdGg9IjQ0IiBoZWlnaHQ9IjQ0IiByeD0iMTAiIGZpbGw9IiMwMDVkNDIiLz48cGF0aCBkPSJNMTIgMjJsMTAtOCAxMCA4djEwSDEyVjIyeiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTdmNWNjIiBzdHJva2Utd2lkdGg9IjIiLz48cGF0aCBkPSJNMTYgMjZoNGwyLTMgMiA2IDItM2g0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5N2Y1Y2MiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==';
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']") || document.createElement('link');
    link.rel = 'icon'; link.href = greenFavicon; document.head.appendChild(link);
  }, []);

  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Step 3 Realtime Lead Management hook
  const {
    leads,
    setLeads,
    stages,
    loading: leadsLoading,
    fetchLeads,
    createLead,
    updateLead,
    updateLeadStage,
  } = useLeads(orgId);

  // Properties data hook
  const {
    properties,
    setProperties,
    loading: propsLoading,
    createProperty,
    updateProperty,
    deleteProperty,
  } = useProperties(orgId);

  // Org users hook
  const { users: orgUsers } = useOrgUsers(orgId);

  // Modals and UI State
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
  const [defaultLeadStage, setDefaultLeadStage] = useState<LeadStage>('assigned');
  const [propertyFormModalOpen, setPropertyFormModalOpen] = useState(false);
  const [editingPropertyModal, setEditingPropertyModal] = useState<Property | null>(null);
  const [activePropertyModal, setActivePropertyModal] = useState<Property | null>(null);
  const [settingsTab, setSettingsTab] = useState<'support' | 'settings' | null>(null);
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Lead | null>(null);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);

  const handleOpenLeadDrawer = (lead: Lead) => {
    setSelectedLeadForDrawer(lead);
    setLeadDrawerOpen(true);
  };

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Brokerage WhatsApp Number State for Settings
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  // Public Website Content State for Settings
  const [websiteContent, setWebsiteContent] = useState({
    about_text: '',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    calendly_url: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });
  const [savingWebsiteContent, setSavingWebsiteContent] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    supabase
      .from('organizations')
      .select('whatsapp_number, about_text, facebook_url, instagram_url, linkedin_url, calendly_url, contact_email, contact_phone, address')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.whatsapp_number) {
            setWhatsappNumber(data.whatsapp_number);
          }
          setWebsiteContent({
            about_text: data.about_text || '',
            facebook_url: data.facebook_url || '',
            instagram_url: data.instagram_url || '',
            linkedin_url: data.linkedin_url || '',
            calendly_url: data.calendly_url || '',
            contact_email: data.contact_email || '',
            contact_phone: data.contact_phone || '',
            address: data.address || '',
          });
        }
      });
  }, [orgId]);

  const handleSaveWhatsapp = async () => {
    if (!orgId) return;
    setSavingWhatsapp(true);
    try {
      const cleaned = whatsappNumber.trim().replace(/\D/g, '');
      const { error } = await supabase
        .from('organizations')
        .update({ whatsapp_number: cleaned || null })
        .eq('id', orgId);
      if (error) throw error;
      setWhatsappNumber(cleaned);
      triggerToast('Brokerage WhatsApp number updated successfully.');
    } catch (err: any) {
      triggerToast(`Failed to update WhatsApp: ${err.message || 'Error'}`);
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const handleSaveWebsiteContent = async () => {
    if (!orgId) return;
    setSavingWebsiteContent(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          about_text: websiteContent.about_text.trim() || null,
          facebook_url: websiteContent.facebook_url.trim() || null,
          instagram_url: websiteContent.instagram_url.trim() || null,
          linkedin_url: websiteContent.linkedin_url.trim() || null,
          calendly_url: websiteContent.calendly_url.trim() || null,
          contact_email: websiteContent.contact_email.trim() || null,
          contact_phone: websiteContent.contact_phone.trim() || null,
          address: websiteContent.address.trim() || null,
        })
        .eq('id', orgId);
      if (error) throw error;
      triggerToast('Public Website Content updated successfully.');
    } catch (err: any) {
      triggerToast(`Failed to update website content: ${err.message || 'Error'}`);
    } finally {
      setSavingWebsiteContent(false);
    }
  };

  const isAdmin = user?.email?.toLowerCase() === 'abbaspromo7861@gmail.com';

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Route security guard & URL deep-linking listener
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace(/^#\/?/, '');
    const urlPage = (params.get('page') || hash) as PageView;

    if (urlPage === 'super-admin') {
      if (isAdmin) {
        setCurrentPage('super-admin');
      } else {
        triggerToast('Access Denied: You do not have permission to view the Super Admin panel.');
        setCurrentPage('dashboard');
      }
    } else if (
      urlPage &&
      [
        'dashboard',
        'leads',
        'leads-assigned',
        'leads-awareness',
        'leads-contacted',
        'leads-touring',
        'leads-escrow',
        'leads-closed',
        'properties',
        'team',
        'analytics',
        'billing',
      ].includes(urlPage)
    ) {
      setCurrentPage(urlPage);
    }
  }, [isAdmin, triggerToast]);

  // Route protection guard: block unauthorized access if state or URL changes
  useEffect(() => {
    if (currentPage === 'super-admin' && !isAdmin) {
      triggerToast('Access Denied: You do not have permission to view the Super Admin panel.');
      setCurrentPage('dashboard');
    }
  }, [currentPage, isAdmin, triggerToast]);

  const handleNavigate = (page: PageView) => {
    if (page === 'super-admin' && !isAdmin) {
      triggerToast('Access Denied: You do not have permission to view the Super Admin panel.');
      return;
    }
    setCurrentPage(page);
  };

  if (leadsLoading || propsLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-[#005d42] animate-spin" />
          <p className="text-[#3e4943] text-sm font-medium">Loading your brokerage data…</p>
        </div>
      </div>
    );
  }

  // Lead handlers with Supabase mutations
  const handleMoveLeadStage = async (leadId: string, newStage: LeadStage) => {
    const { error } = await updateLeadStage(leadId, newStage);
    if (error) {
      triggerToast(`Failed to update stage: ${error.message}`);
    } else {
      triggerToast(`Moved lead to ${newStage.toUpperCase()} stage.`);
    }
  };

  const handleAssignBroker = async (leadId: string) => {
    const targetUser = orgUsers[0];
    if (targetUser) {
      const { error } = await updateLead(leadId, {
        assignedTo: targetUser.id,
        brokerId: targetUser.id,
        brokerName: targetUser.full_name,
        brokerInitials: targetUser.initials,
        brokerAvatarUrl: targetUser.avatar_url,
      });
      if (error) {
        triggerToast(`Failed to assign broker: ${error.message}`);
      } else {
        triggerToast(`Assigned lead to ${targetUser.full_name}.`);
      }
    } else {
      const { error } = await updateLead(leadId, {
        assignedTo: null,
        brokerId: null,
      });
      if (error) {
        triggerToast(`Failed to auto-assign lead: ${error.message}`);
      } else {
        triggerToast('Auto-assigned lead via Round-Robin.');
      }
    }
  };

  const handleAddLead = async (newLead: Lead) => {
    const { data, error } = await createLead(newLead);
    if (error) {
      triggerToast(`Error creating lead: ${error.message}`);
    } else {
      triggerToast(`Added "${data?.name || newLead.name}" to acquisition pipeline.`);
    }
  };

  // Property handlers
  const handleToggleFavorite = (propertyId: string) => {
    setProperties((prev) =>
      prev.map((prop) =>
        prop.id === propertyId ? { ...prop, isFavorite: !prop.isFavorite } : prop
      )
    );
  };

  const handleAddProperty = (newProp: Property) => {
    setProperties((prev) => [newProp, ...prev]);
    triggerToast(`Published "${newProp.title}" (${newProp.mlsId}) to MLS Inventory.`);
  };

  const handleUpdatePropertyStatus = async (
    propertyId: string,
    newStatus: PropertyStatus,
    newPrice?: number
  ) => {
    // Saved to the database (it used to change the screen only and vanish on refresh).
    const updates: Partial<Property> = { status: newStatus };
    if (newPrice !== undefined) {
      updates.price = newPrice;
      updates.priceFormatted = formatMoney(newPrice, { compact: true });
    }
    const { error } = await updateProperty(propertyId, updates);
    if (error) {
      triggerToast(`Failed to update listing status: ${error.message}`);
    } else {
      triggerToast(`Updated listing status to "${newStatus}".`);
    }
  };

  const handleShareProperty = (property: Property) => {
    const shareUrl = `${window.location.origin}/?mls=${encodeURIComponent(property.mlsId)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    triggerToast(`Copied private client brochure link for ${property.title} (${property.mlsId}).`);
  };

  // CSV Export utility
  const downloadCsvFile = (filename: string, rows: string[][]) => {
    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportLeadsCsv = () => {
    const headers = [
      'Lead Name', 'Stage', 'Source', 'Target Property', 'Budget', 'Broker', 'Email', 'Phone',
    ];
    const dataRows = leads.map((l) => [
      l.name, l.stage, l.source, l.targetProperty,
      l.budgetFormatted, l.brokerName, l.email, l.phone,
    ]);
    downloadCsvFile('estatepulse-lead-pipeline.csv', [headers, ...dataRows]);
    triggerToast('Exported Lead Pipeline CSV (estatepulse-lead-pipeline.csv).');
  };

  const handleExportPropertiesCsv = () => {
    const headers = [
      'MLS ID', 'Title', 'Address', 'Status', 'Type',
      'Price', 'Beds', 'Baths', 'Sqft', 'Broker',
    ];
    const dataRows = properties.map((p) => [
      p.mlsId, p.title, p.address, p.status, p.type,
      p.priceFormatted, String(p.beds), String(p.baths), p.sqftFormatted, p.brokerName,
    ]);
    downloadCsvFile('estatepulse-property-inventory.csv', [headers, ...dataRows]);
    triggerToast('Exported MLS Property Inventory CSV (estatepulse-property-inventory.csv).');
  };

  const currentUserName =
    (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'there';

  // ── Fullscreen pages (no AppLayout sidebar) ─────────────────────────────────
  if (currentPage === 'billing') {
    return (
      <BillingPage
        orgId={orgId}
        onBack={() => setCurrentPage('dashboard')}
        onNotify={triggerToast}
      />
    );
  }

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      leadCount={leads.length}
      globalSearch={globalSearch}
      onGlobalSearchChange={(val) => setGlobalSearch(val)}
      onOpenNewTransaction={() => {
        if (currentPage === 'properties') {
          setEditingPropertyModal(null);
          setPropertyFormModalOpen(true);
        } else {
          setDefaultLeadStage('assigned');
          setAddLeadModalOpen(true);
        }
      }}
      onOpenSettingsModal={(tab) => setSettingsTab(tab)}
      onOpenProfileSettings={() => setProfileModalOpen(true)}
    >
      {currentPage === 'dashboard' && (
        <DashboardPage
          leads={leads}
          properties={properties}
          orgId={orgId}
          userId={user.id}
          onNavigate={(page) => setCurrentPage(page)}
          onExportReport={handleExportPropertiesCsv}
          onNotify={triggerToast}
        />
      )}

      {currentPage === 'leads' && (
        <LeadsKanbanPage
          leads={leads}
          stages={stages}
          properties={properties}
          globalSearch={globalSearch}
          currentUserName={currentUserName}
          onMoveStage={handleMoveLeadStage}
          onAssignBroker={handleAssignBroker}
          onOpenAddLead={(stage = 'assigned') => {
            setDefaultLeadStage(stage);
            setAddLeadModalOpen(true);
          }}
          onCreateLead={createLead}
          onUpdateLead={updateLead}
          onSelectPropertyMatch={(propertyId) => {
            const matched = properties.find((p) => p.id === propertyId);
            if (matched) {
              setActivePropertyModal(matched);
            }
          }}
          onExportPipeline={handleExportLeadsCsv}
          onNotify={triggerToast}
        />
      )}

      {currentPage === 'inquiries' && (
        <InquiriesPage
          orgId={orgId}
          onNotify={triggerToast}
          onOpenLead={handleOpenLeadDrawer}
          onRefreshLeads={fetchLeads}
        />
      )}

      {currentPage === 'leads-assigned' && (
        <LeadsStageListPage
          stageSlug="assigned"
          stageName="Assigned"
          leads={leads}
          onOpenLead={handleOpenLeadDrawer}
        />
      )}

      {currentPage === 'leads-awareness' && (
        <LeadsStageListPage
          stageSlug="awareness"
          stageName="Awareness"
          leads={leads}
          onOpenLead={handleOpenLeadDrawer}
        />
      )}

      {currentPage === 'leads-contacted' && (
        <LeadsStageListPage
          stageSlug="contacted"
          stageName="Contacted"
          leads={leads}
          onOpenLead={handleOpenLeadDrawer}
        />
      )}

      {currentPage === 'leads-touring' && (
        <LeadsStageListPage
          stageSlug="touring"
          stageName="Private Touring"
          leads={leads}
          onOpenLead={handleOpenLeadDrawer}
        />
      )}

      {currentPage === 'leads-escrow' && (
        <LeadsStageListPage
          stageSlug="escrow"
          stageName="Offer & Escrow"
          leads={leads}
          onOpenLead={handleOpenLeadDrawer}
        />
      )}

      {currentPage === 'leads-closed' && (
        <LeadsStageListPage
          stageSlug="closed"
          stageName="Closed Deals"
          leads={leads}
          onOpenLead={handleOpenLeadDrawer}
        />
      )}

      {currentPage === 'properties' && (
        <PropertyListingPage
          properties={properties}
          loading={propsLoading}
          globalSearch={globalSearch}
          leads={leads}
          orgId={orgId}
          onToggleFavorite={handleToggleFavorite}
          onCreateProperty={createProperty}
          onUpdateProperty={updateProperty}
          onDeleteProperty={deleteProperty}
          onManageListing={(prop) => setActivePropertyModal(prop)}
          onShareListing={handleShareProperty}
          onEditListing={(prop) => {
            setEditingPropertyModal(prop);
            setPropertyFormModalOpen(true);
          }}
          onExportInventory={handleExportPropertiesCsv}
          onNotify={triggerToast}
          onRefreshLeads={fetchLeads}
        />
      )}

      {currentPage === 'deals' && <DealsPage />}

      {currentPage === 'visits' && <VisitsPage />}

      {currentPage === 'expenses' && <ExpensesPage orgId={orgId} onNotify={triggerToast} />}

      {currentPage === 'installments' && <InstallmentsPage orgId={orgId} onNotify={triggerToast} />}

      {currentPage === 'documents' && <DocumentsPage />}

      {currentPage === 'maps' && <MapsPage />}

      {currentPage === 'notes' && <NotesPage />}

      {currentPage === 'commissions' && <CommissionsPage orgId={orgId} onNotify={triggerToast} />}

      {currentPage === 'team' && (
        <TeamPage
          orgId={orgId}
          leads={leads}
          onNavigate={(page) => setCurrentPage(page)}
          onNotify={triggerToast}
        />
      )}

      {currentPage === 'analytics' && (
        <AnalyticsPage
          orgId={orgId}
          leads={leads}
          onExportReport={handleExportLeadsCsv}
          onNotify={triggerToast}
        />
      )}

      {currentPage === 'ai-agent' && (
        <AIAgentPage
          orgId={orgId}
          onNotify={triggerToast}
          onNavigate={(page) => setCurrentPage(page)}
          onRefreshLeads={fetchLeads}
        />
      )}

      {currentPage === 'super-admin' && (
        isAdmin ? (
          <SuperAdminPage onNotify={triggerToast} />
        ) : (
          <div className="p-8 text-center">
            <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
              <h2 className="text-lg font-bold mb-2">Access Denied</h2>
              <p className="text-sm">You do not have permission to view the Super Admin panel.</p>
              <button
                type="button"
                onClick={() => setCurrentPage('dashboard')}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )
      )}

      {/* Modals */}
      <AddLeadModal
        isOpen={addLeadModalOpen}
        defaultStage={defaultLeadStage}
        orgId={orgId}
        onClose={() => setAddLeadModalOpen(false)}
        onAddLead={handleAddLead}
      />

      {/* Property Form Modal (Add & Edit with Photo Upload & Storage Sync) */}
      <PropertyFormModal
        isOpen={propertyFormModalOpen}
        property={editingPropertyModal}
        orgId={orgId}
        onClose={() => {
          setPropertyFormModalOpen(false);
          setEditingPropertyModal(null);
        }}
        onSubmit={async (data) => {
          if (editingPropertyModal) {
            const { error } = await updateProperty(editingPropertyModal.id, data);
            if (error) {
              triggerToast(`Failed to update listing: ${error.message}`);
            } else {
              triggerToast(`Updated listing "${data.title || editingPropertyModal.title}".`);
            }
          } else {
            const { data: created, error } = await createProperty(data);
            if (error) {
              triggerToast(`Failed to create listing: ${error.message}`);
            } else {
              triggerToast(`Property added: "${created?.title || data.title}"`);
            }
          }
        }}
      />

      {/* Property Detail Modal (Photo Gallery Carousel, Specs, Lead Assignment) */}
      <PropertyDetailModal
        property={activePropertyModal}
        isOpen={!!activePropertyModal}
        leads={leads}
        onClose={() => setActivePropertyModal(null)}
        onEdit={(prop) => {
          setActivePropertyModal(null);
          setEditingPropertyModal(prop);
          setPropertyFormModalOpen(true);
        }}
        onUpdateStatus={handleUpdatePropertyStatus}
        onAssignToLead={async (prop, leadId) => {
          try {
            const { error } = await updateLead(leadId, {
              targetProperty: prop.title,
              targetPropertyId: prop.id,
            });
            if (error) {
              triggerToast(`Failed to assign property: ${error.message}`);
            } else {
              const assignedLead = leads.find((l) => l.id === leadId);
              triggerToast(`Assigned "${prop.title}" to ${assignedLead?.name || 'lead'}.`);
            }
          } catch (err: any) {
            triggerToast(`Failed to assign property: ${err.message || 'Unknown error'}`);
          }
        }}
        onNotify={triggerToast}
      />

      {/* Lead Detail Drawer for dedicated Stage List Pages */}
      <LeadDetailDrawer
        lead={selectedLeadForDrawer}
        isOpen={leadDrawerOpen}
        stages={stages}
        availableProperties={properties}
        currentUser={{ full_name: currentUserName }}
        onClose={() => setLeadDrawerOpen(false)}
        onUpdateLead={updateLead}
        onSelectPropertyMatch={(propertyId) => {
          const matched = properties.find((p) => p.id === propertyId);
          if (matched) {
            setActivePropertyModal(matched);
          }
        }}
        onNotify={triggerToast}
      />

      {/* Support / Settings Modal */}
      {settingsTab && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-display font-bold text-lg text-[#0b1c30]">
                {settingsTab === 'support'
                  ? 'Brokerage Concierge & MLS Support'
                  : 'Workspace & MLS Sync Settings'}
              </h2>
              <button
                type="button"
                onClick={() => setSettingsTab(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {settingsTab === 'support' ? (
              <div className="flex flex-col gap-4 text-[13px] text-[#3e4943]">
                <p>Our dedicated brokerage concierge team can help with your workspace, listings, team routing, and billing.</p>
                <div className="bg-[#eff4ff] rounded-xl p-3.5 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-[#005d42] uppercase tracking-wider">CONCIERGE DESK</span>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#005d42]" />
                    <span className="text-[13px] font-semibold text-[#0b1c30]">estatepulsesupport@gmail.com</span>
                  </div>
                  {REGION.support.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="font-mono text-[12px]">{REGION.support.phone}</span>
                    </div>
                  )}
                </div>
                <a
                  href="mailto:estatepulsesupport@gmail.com"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white font-semibold text-center text-sm transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact Support</span>
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-[13px] text-[#3e4943]">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="font-semibold text-[#0b1c30]">Workspace Region</p>
                    <p className="text-[11px] text-[#6e7a73]">
                      {REGION.currency} · {areaUnitLabel(REGION.areaUnit)}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-[#005d42]">{REGION.id}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-semibold text-[#0b1c30]">Auto-Lead Routing</p>
                    <p className="text-[11px] text-[#6e7a73]">Round-robin new leads across your team</p>
                  </div>
                  <span className="text-[12px] font-semibold text-[#005d42]">Enabled</span>
                </div>

                {/* Brokerage WhatsApp Number */}
                <div className="py-2.5 border-t border-slate-100 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[#0b1c30] text-[13px]">
                      Brokerage WhatsApp Number
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Public Portal CTA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="e.g. 923001234567"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-mono text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                    />
                    <button
                      type="button"
                      disabled={savingWhatsapp}
                      onClick={handleSaveWhatsapp}
                      className="px-3.5 py-2 bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {savingWhatsapp ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6e7a73]">
                    Enter the number with country code, no spaces (e.g., 923164063124).
                  </p>
                </div>
                {/* Public Website Add-on */}
                <PublicWebsiteAddon orgId={orgId} orgName={null} onNotify={triggerToast} />

                {/* Public Website Content */}
                <div className="py-3 border-t border-slate-100 flex flex-col gap-3">
                  <div>
                    <p className="font-semibold text-[#0b1c30] text-[13px]">Public Website Content</p>
                    <p className="text-[11px] text-[#6e7a73]">About Us, Socials, Booking & Agency Details</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-700">About Text</label>
                    <textarea
                      rows={3}
                      value={websiteContent.about_text}
                      onChange={(e) => setWebsiteContent((prev) => ({ ...prev, about_text: e.target.value }))}
                      placeholder="Tell visitors about your brokerage story, vision, and expertise..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-700">Contact Email</label>
                      <input
                        type="email"
                        value={websiteContent.contact_email}
                        onChange={(e) => setWebsiteContent((prev) => ({ ...prev, contact_email: e.target.value }))}
                        placeholder="agency@example.com"
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-700">Contact Phone</label>
                      <input
                        type="tel"
                        value={websiteContent.contact_phone}
                        onChange={(e) => setWebsiteContent((prev) => ({ ...prev, contact_phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-700">Business Address</label>
                    <input
                      type="text"
                      value={websiteContent.address}
                      onChange={(e) => setWebsiteContent((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="e.g. 100 Financial Way, Suite 400, New York, NY"
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-700">Calendly / Booking URL</label>
                    <input
                      type="url"
                      value={websiteContent.calendly_url}
                      onChange={(e) => setWebsiteContent((prev) => ({ ...prev, calendly_url: e.target.value }))}
                      placeholder="https://calendly.com/your-agency/consultation"
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-700">Facebook URL</label>
                      <input
                        type="url"
                        value={websiteContent.facebook_url}
                        onChange={(e) => setWebsiteContent((prev) => ({ ...prev, facebook_url: e.target.value }))}
                        placeholder="https://facebook.com/..."
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-700">Instagram URL</label>
                      <input
                        type="url"
                        value={websiteContent.instagram_url}
                        onChange={(e) => setWebsiteContent((prev) => ({ ...prev, instagram_url: e.target.value }))}
                        placeholder="https://instagram.com/..."
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-slate-700">LinkedIn URL</label>
                      <input
                        type="url"
                        value={websiteContent.linkedin_url}
                        onChange={(e) => setWebsiteContent((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/company/..."
                        className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={savingWebsiteContent}
                    onClick={handleSaveWebsiteContent}
                    className="w-full mt-1 py-2 bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingWebsiteContent ? 'Saving Website Content…' : 'Save Website Content'}
                  </button>
                </div>

                {/* Billing link */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-1">
                  <div>
                    <p className="font-semibold text-[#0b1c30]">Subscription & Billing</p>
                    <p className="text-[11px] text-[#6e7a73]">Manage plan, invoices & payment</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsTab(null);
                      setCurrentPage('billing');
                    }}
                    className="text-[12px] font-semibold text-[#005d42] hover:text-[#047857] transition-colors cursor-pointer"
                  >
                    View Plans →
                  </button>
                </div>
                {/* Sign out option in settings */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div>
                    <p className="font-semibold text-[#0b1c30]">Signed in as</p>
                    <p className="text-[11px] text-[#6e7a73]">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="text-[12px] font-semibold text-red-600 hover:text-red-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSettingsTab(null)}
                className="px-4 py-2 rounded-lg bg-[#047857] text-white text-[13px] font-semibold hover:bg-[#005d42] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile & Account Settings Modal */}
      <ProfileSettingsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onNotify={triggerToast}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0b1c30] text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 max-w-md animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
          <span className="text-[13px] font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
