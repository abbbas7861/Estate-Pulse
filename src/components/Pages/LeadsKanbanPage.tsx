import React, { useState } from 'react';
import {
  Award,
  Bolt,
  Contact,
  DollarSign,
  Download,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  TrendingUp,
  X,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Lead, LeadStage, LeadStageItem, Property } from '../../types/crm';
import { LeadKanbanCard } from '../Cards/LeadKanbanCard';
import { LeadDetailDrawer } from '../Modals/LeadDetailDrawer';
import { useAuth } from '../../lib/useAuth';

interface LeadsKanbanPageProps {
  leads: Lead[];
  stages?: LeadStageItem[];
  properties?: Property[];
  globalSearch?: string;
  currentUserName?: string;
  onMoveStage: (leadId: string, newStage: LeadStage) => void;
  onAssignBroker: (leadId: string) => void;
  onOpenAddLead: (defaultStage?: LeadStage) => void;
  onCreateLead?: (data: Partial<Lead>) => Promise<{ data: Lead | null; error: Error | null }>;
  onUpdateLead?: (id: string, updates: Partial<Lead>) => Promise<{ error: Error | null }>;
  onSelectPropertyMatch?: (propertyId: string) => void;
  onExportPipeline: () => void;
  onNotify: (msg: string) => void;
}

const DEFAULT_STAGES: LeadStageItem[] = [
  { id: 'stage-1', name: 'Assigned', slug: 'assigned', order_index: 1, color: '#005d42' },
  { id: 'stage-2', name: 'Awareness', slug: 'awareness', order_index: 2, color: '#006f67' },
  { id: 'stage-3', name: 'Contacted', slug: 'contacted', order_index: 3, color: '#0284c7' },
  { id: 'stage-4', name: 'Private Touring', slug: 'touring', order_index: 4, color: '#7c3aed' },
  { id: 'stage-5', name: 'Offer & Escrow', slug: 'negotiation', order_index: 5, color: '#d97706' },
];

type FilterChip = 'all' | 'facebook' | 'website' | 'referral' | 'high_value' | 'assigned_me' | 'duplicates';

export const LeadsKanbanPage: React.FC<LeadsKanbanPageProps> = ({
  leads,
  stages = DEFAULT_STAGES,
  properties = [],
  globalSearch = '',
  currentUserName = '',
  onMoveStage,
  onAssignBroker,
  onOpenAddLead,
  onCreateLead,
  onUpdateLead,
  onSelectPropertyMatch,
  onExportPipeline,
  onNotify,
}) => {
  const { user } = useAuth();
  const [localSearch, setLocalSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [compactCards, setCompactCards] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Selected lead for detail drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Quick Add Lead Modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickBudget, setQuickBudget] = useState('2500000');
  const [quickSource, setQuickSource] = useState('Website');
  const [quickStage, setQuickStage] = useState<LeadStage>('assigned');
  const [submittingQuickLead, setSubmittingQuickLead] = useState(false);

  const activeStages = stages && stages.length > 0 ? stages : DEFAULT_STAGES;
  const cardStagesList = activeStages.map((s) => ({ id: s.slug as LeadStage, label: s.name }));

  const combinedQuery = (localSearch || globalSearch).trim().toLowerCase();

  // Filter leads according to selected filter chip & search query
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !combinedQuery ||
      lead.name.toLowerCase().includes(combinedQuery) ||
      lead.email.toLowerCase().includes(combinedQuery) ||
      lead.phone.toLowerCase().includes(combinedQuery) ||
      lead.brokerName.toLowerCase().includes(combinedQuery) ||
      lead.targetProperty.toLowerCase().includes(combinedQuery) ||
      lead.source.toLowerCase().includes(combinedQuery) ||
      (lead.tags && lead.tags.some((t) => t.toLowerCase().includes(combinedQuery)));

    if (!matchesSearch) return false;

    // FIX #29: Filter by duplicates when active
    if (activeFilter === 'duplicates') {
      return lead.isDuplicate === true;
    }

    if (activeFilter === 'facebook') return lead.source.toLowerCase().includes('facebook');
    if (activeFilter === 'website') return lead.source.toLowerCase().includes('website');
    if (activeFilter === 'referral') return lead.source.toLowerCase().includes('referral');
    if (activeFilter === 'high_value') return lead.budgetAmount >= 1000000;

    // FIX #18: Real UUID matching for "Assigned to Me", fallback to broker name only if assignedTo is null
    if (activeFilter === 'assigned_me') {
      if (user?.id && lead.assignedTo) {
        return lead.assignedTo === user.id;
      }
      // Fallback to broker name match ONLY if assignedTo is null
      const currentName = (user?.user_metadata?.full_name || currentUserName || '').toLowerCase().trim();
      return !!currentName && lead.brokerName.toLowerCase() === currentName;
    }

    return true;
  });

  // Check if duplicates exist
  const duplicateCount = leads.filter((l) => l.isDuplicate).length;

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stageSlug: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageSlug) {
      setDragOverStage(stageSlug);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStageSlug: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onMoveStage(leadId, targetStageSlug as LeadStage);
    }
  };

  const handleActionClick = (lead: Lead, actionType: 'message' | 'call' | 'schedule') => {
    if (actionType === 'message') {
      onNotify(`Opened communication channel with ${lead.name} (${lead.email})`);
    } else if (actionType === 'call') {
      onNotify(`Calling ${lead.name} at ${lead.phone}...`);
    } else {
      setSelectedLead(lead);
      setDrawerOpen(true);
    }
  };

  const handleCardSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  // Quick Add Lead submit handler
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateLead) {
      onOpenAddLead(quickStage);
      setQuickAddOpen(false);
      return;
    }

    setSubmittingQuickLead(true);
    try {
      const budgetNum = parseInt(quickBudget, 10) || 0;
      const budgetFormatted = budgetNum ? `$${(budgetNum / 1000000).toFixed(2)}M` : '$0';

      const { data, error } = await onCreateLead({
        name: quickName.trim(),
        email: quickEmail.trim(),
        phone: quickPhone.trim(),
        budgetAmount: budgetNum,
        budgetFormatted,
        source: quickSource,
        stage: quickStage,
        tags: ['Quick Lead'],
      });

      if (error) {
        onNotify(`Failed to create lead: ${error.message}`);
      } else {
        onNotify(`Added "${data?.name || quickName}" to ${quickStage.toUpperCase()} pipeline.`);
        setQuickName('');
        setQuickEmail('');
        setQuickPhone('');
        setQuickAddOpen(false);
      }
    } catch (err: any) {
      onNotify(`Error: ${err.message || 'Failed to create lead'}`);
    } finally {
      setSubmittingQuickLead(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6">
      {/* Top Header & Actions Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-[#6e7a73]">LEAD ACQUISITION</span>
            <span className="text-[#bdc9c1]">/</span>
            <span className="text-[#005d42]">ACTIVE PIPELINE</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#0b1c30] tracking-tight leading-tight">
              Lead Pipeline &amp; Acquisition
            </h1>
            <span className="text-[12px] font-semibold text-[#006f67] bg-[#99efe5]/60 px-3 py-1 rounded-md flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006f67] animate-pulse" />
              Realtime Sync Active
            </span>
          </div>

          <p className="text-[14px] text-[#3e4943] mt-2 leading-relaxed">
            Drag and drop leads across funnel stages. Real-time updates, duplicate intelligence, and
            automated round-robin agent routing enabled.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setCompactCards(!compactCards)}
            className="h-10 px-4 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-slate-200/80 flex items-center gap-2 text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#6e7a73]" />
            <span>{compactCards ? 'Standard View' : 'Compact Cards'}</span>
          </button>

          <button
            type="button"
            onClick={onExportPipeline}
            className="h-10 px-4 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-slate-200/80 flex items-center gap-2 text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Download className="w-4 h-4 text-[#6e7a73]" />
            <span>Export Pipeline</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="h-10 px-4 rounded-lg bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-1.5 text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Quick Add Lead</span>
          </button>
        </div>
      </div>

      {/* FIX #29: Duplicate Warning Banner with dynamic toggle and real filtering */}
      {duplicateCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{duplicateCount} duplicate lead(s) detected</strong> in your pipeline with
              identical email or phone numbers. Look for cards with amber badges.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setActiveFilter((prev) => (prev === 'duplicates' ? 'all' : 'duplicates'))
            }
            className="text-[11px] font-bold text-amber-700 underline hover:text-amber-900 cursor-pointer"
          >
            {activeFilter === 'duplicates' ? 'Show All Leads' : 'Review Duplicates'}
          </button>
        </div>
      )}

      {/* 4 Pipeline KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Pipeline Leads</span>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none">
                {leads.length}
              </span>
              <span className="text-[11px] font-semibold text-[#005d42] flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                Live
              </span>
            </div>
            <span className="text-[11px] text-[#3e4943] mt-1.5">Across {activeStages.length} acquisition stages</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#005d42] shrink-0">
            <Contact className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Pipeline Value</span>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none">
                ${(leads.reduce((s, l) => s + (l.budgetAmount || 0), 0) / 1000000).toFixed(1)}M
              </span>
              <span className="text-[11px] font-semibold text-[#005d42] flex items-center gap-0.5">
                <Sparkles className="w-3 h-3" />
                Active
              </span>
            </div>
            <span className="text-[11px] text-[#3e4943] mt-1.5 tabular-nums">
              Total buyer purchasing power
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#99efe5] flex items-center justify-center text-[#006f67] shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">High-Value Leads</span>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none">
                {leads.filter((l) => l.budgetAmount >= 1000000).length}
              </span>
              <span className="text-[11px] font-semibold text-[#005d42] flex items-center gap-0.5">
                <Bolt className="w-3 h-3" />
                &gt; $1M
              </span>
            </div>
            <span className="text-[11px] text-[#3e4943] mt-1.5">Priority routing target</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#005d42] shrink-0">
            <Bolt className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">Avg Activity Freshness</span>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none">
                {leads.length > 0
                  ? `${Math.round(
                      leads.reduce((s, l) => s + (l.daysSinceLastActivity || 0), 0) / leads.length
                    )}d`
                  : '0d'}
              </span>
              <span className="text-[11px] font-semibold text-[#005d42] flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                Touch Rate
              </span>
            </div>
            <span className="text-[11px] text-[#3e4943] mt-1.5 tabular-nums">
              Days since last interaction
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#005d42] flex items-center justify-center text-white shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xs">
        <div className="flex-1 max-w-lg flex items-center gap-2.5 bg-[#eff4ff] px-3.5 py-2 rounded-lg">
          <Search className="w-4 h-4 text-[#6e7a73] shrink-0" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by name, email, phone, broker, or tags..."
            className="w-full bg-transparent border-0 outline-none text-[13px] text-[#0b1c30] placeholder:text-[#6e7a73]"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => setLocalSearch('')}
              className="text-[#6e7a73] hover:text-[#0b1c30]"
              aria-label="Clear lead search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips: All, Facebook, Website, Referral, High Value, Assigned to Me, Duplicates Only */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'All Leads' },
            { id: 'facebook', label: 'Facebook' },
            { id: 'website', label: 'Website' },
            { id: 'referral', label: 'Referral' },
            { id: 'high_value', label: 'High Value (>$1M)' },
            { id: 'assigned_me', label: 'Assigned to Me' },
            { id: 'duplicates', label: 'Duplicates Only' },
          ].map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as FilterChip)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#005d42] text-white shadow-xs'
                    : 'bg-[#eff4ff] text-[#3e4943] hover:bg-[#e5eeff] hover:text-[#0b1c30]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setActiveFilter('all');
              setLocalSearch('');
            }}
            title="Reset filters"
            className="w-8 h-8 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#3e4943] flex items-center justify-center transition-colors cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 5-Column Kanban Board Layout or Duplicates Empty State */}
      {activeFilter === 'duplicates' && filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-lg text-[#0b1c30]">
            No duplicate leads found. Great data hygiene!
          </h3>
          <p className="text-sm text-[#6e7a73] mt-1 max-w-md">
            All leads in your active pipeline have unique email and phone numbers.
          </p>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className="mt-5 px-4 py-2 rounded-lg bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            Show All Leads
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
        {activeStages.map((stage) => {
          const stageLeads = filteredLeads.filter((lead) => lead.stage === stage.slug);
          const stageVolume = stageLeads.reduce((s, l) => s + (l.budgetAmount || 0), 0);
          const stageVolumeM = stageVolume / 1000000;
          const isOver = dragOverStage === stage.slug;

          return (
            <div
              key={stage.id}
              onDragOver={(e) => handleDragOver(e, stage.slug)}
              onDrop={(e) => handleDrop(e, stage.slug)}
              className={`rounded-2xl border p-3.5 flex flex-col gap-3 transition-colors ${
                isOver
                  ? 'border-[#005d42] bg-[#eff4ff]/90 ring-2 ring-[#005d42]/30'
                  : 'border-slate-200/80 bg-[#f8fafc]'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color || '#005d42' }}
                  />
                  <h2 className="font-display font-bold text-[15px] text-[#0b1c30]">
                    {stage.name}
                  </h2>
                  <span className="text-[11px] font-bold text-[#0b1c30] bg-[#d3e4fe] px-2 py-0.5 rounded-md tabular-nums">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-[#3e4943] tabular-nums">
                    ${stageVolumeM.toFixed(1)}M
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickStage(stage.slug as LeadStage);
                      setQuickAddOpen(true);
                    }}
                    title={`Add lead to ${stage.name}`}
                    className="w-6 h-6 rounded-md hover:bg-white text-[#3e4943] hover:text-[#0b1c30] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cards Stack */}
              <div
                className={`flex flex-col ${
                  compactCards ? 'gap-2' : 'gap-3.5'
                } min-h-[220px]`}
              >
                {stageLeads.length > 0 ? (
                  stageLeads.map((lead) => (
                    <LeadKanbanCard
                      key={lead.id}
                      lead={lead}
                      stages={cardStagesList}
                      onMoveStage={onMoveStage}
                      onAssignBroker={onAssignBroker}
                      onActionClick={handleActionClick}
                      onDragStart={handleDragStart}
                      onSelect={handleCardSelect}
                    />
                  ))
                ) : (
                  <div className="flex-1 rounded-xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[12px] font-medium text-[#3e4943]">
                      No leads in {stage.name} yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickStage(stage.slug as LeadStage);
                        setQuickAddOpen(true);
                      }}
                      className="mt-2 text-[11px] font-semibold text-[#005d42] hover:underline cursor-pointer"
                    >
                      + Add your first lead
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Floating "Quick Add Lead" Action Button */}
      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-8 right-8 z-40 bg-gradient-to-r from-[#005d42] to-[#047857] hover:from-[#004d37] hover:to-[#005d42] text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2 font-display font-bold text-sm tracking-wide transition-all transform hover:scale-105 cursor-pointer border border-[#97f5cc]/30"
      >
        <Plus className="w-5 h-5" />
        <span>Quick Add Lead</span>
      </button>

      {/* Lead Detail Slide-Over Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={drawerOpen}
        stages={activeStages}
        availableProperties={properties}
        onSelectPropertyMatch={onSelectPropertyMatch}
        onClose={() => setDrawerOpen(false)}
        onUpdateLead={
          onUpdateLead ||
          (async (id, updates) => {
            onNotify(`Updated lead ${id}`);
            return { error: null };
          })
        }
        onNotify={onNotify}
      />

      {/* Quick Add Lead Modal */}
      {quickAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0b1c30] to-[#122b48] p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xl">Quick Add Lead</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Round-Robin assignment will automatically route this lead.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Lead Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={quickEmail}
                    onChange={(e) => setQuickEmail(e.target.value)}
                    placeholder="client@gmail.com"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="+1 (310) 555-0199"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    value={quickBudget}
                    onChange={(e) => setQuickBudget(e.target.value)}
                    placeholder="2500000"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Source
                  </label>
                  <select
                    value={quickSource}
                    onChange={(e) => setQuickSource(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 cursor-pointer"
                  >
                    <option value="Website">Website</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Referral">Referral</option>
                    <option value="MLS Inbound">MLS Inbound</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Starting Pipeline Stage
                </label>
                <select
                  value={quickStage}
                  onChange={(e) => setQuickStage(e.target.value as LeadStage)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 cursor-pointer"
                >
                  {activeStages.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setQuickAddOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuickLead}
                  className="bg-[#005d42] hover:bg-[#004d37] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingQuickLead ? 'Saving…' : 'Create & Auto-Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
