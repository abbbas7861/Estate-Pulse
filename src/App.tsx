/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect } from 'react';

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
import { CheckCircle2, X, Loader2 } from 'lucide-react';
import { AppLayout } from './components/Layouts/AppLayout';
import { DashboardPage } from './components/Pages/DashboardPage';
import { LeadsKanbanPage } from './components/Pages/LeadsKanbanPage';
import { PropertyListingPage } from './components/Pages/PropertyListingPage';
import { TeamPage } from './components/Pages/TeamPage';
import { AnalyticsPage } from './components/Pages/AnalyticsPage';
import { BillingPage } from './components/Pages/BillingPage';
import { LandingPage } from './components/Pages/LandingPage';
import { TermsPage } from './components/Pages/TermsPage';
import { PrivacyPage } from './components/Pages/PrivacyPage';
import { LoginPage } from './components/Pages/LoginPage';
import { SignupPage } from './components/Pages/SignupPage';
import {
  AddLeadModal,
  ManagePropertyModal,
} from './components/Modals/CrmModals';
import { PropertyFormModal } from './components/Modals/PropertyFormModal';
import { PropertyDetailModal } from './components/Modals/PropertyDetailModal';
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
}

function AuthScreen({ onGoToLanding }: AuthScreenProps) {
  const [view, setView] = useState<AuthView>('login');
  if (view === 'signup') {
    return <SignupPage onGoToLogin={() => setView('login')} />;
  }
  return <LoginPage onGoToSignup={() => setView('signup')} />;
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function AppInner() {
  // ── Auth state ──────────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Public page routing (before auth) ───────────────────────────────────────
  // 'app' = show auth/dashboard flow; 'landing'/'terms'/'privacy' = public pages
  type PublicView = 'landing' | 'terms' | 'privacy' | 'app';
  const [publicView, setPublicView] = useState<PublicView>('landing');

  useEffect(() => {
    // Hydrate from existing session on mount
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const oid = await fetchOrgId(s.user.id);
        setOrgId(oid);
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
          setPublicView('app');
        } else {
          setOrgId(null);
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

  const authCtx: AuthContextType = { session, user, orgId, loading: authLoading, signOut };

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
        <AuthScreen onGoToLanding={() => setPublicView('landing')} />
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

// ─── Dashboard (only rendered when authenticated) ─────────────────────────────

interface DashboardProps {
  orgId: string | null;
  user: User;
  onSignOut: () => Promise<void>;
}

function Dashboard({ orgId, user, onSignOut }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');

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

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

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
      onNavigate={(page) => setCurrentPage(page)}
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

      {/* Support / Settings Modal */}
      {settingsTab && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
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
              <div className="flex flex-col gap-3 text-[13px] text-[#3e4943]">
                <p>Our team can help with your workspace, listings, leads and billing.</p>
                {(REGION.support.phone || REGION.support.email) && (
                  <div className="bg-[#eff4ff] rounded-xl p-3.5 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-[#005d42]">SUPPORT</span>
                    {REGION.support.phone && (
                      <span className="font-mono font-bold text-[#0b1c30] tabular-nums">
                        {REGION.support.phone}
                      </span>
                    )}
                    {REGION.support.email && (
                      <span className="text-[12px]">{REGION.support.email}</span>
                    )}
                  </div>
                )}
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
