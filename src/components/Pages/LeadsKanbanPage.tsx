import React, { useState } from 'react';
import {
  Award,
  Bolt,
  Download,
  Plus,
  Sparkles,
  TrendingUp,
  X,
  Calendar,
} from 'lucide-react';
import { Lead, LeadStage, LeadStageItem, Property } from '../../types/crm';
import { CURRENCY_CONFIGS, formatMoney, REGION, useCurrency } from '../../config/regional';
import { LeadKanbanCard } from '../Cards/LeadKanbanCard';
import { LeadDetailDrawer } from '../Modals/LeadDetailDrawer';

interface LeadsKanbanPageProps {
  leads: Lead[];
  stages?: LeadStageItem[];
  properties?: Property[];
  globalSearch?: string;
  currentUserName?: string;
  onMoveStage?: (leadId: string, newStage: LeadStage) => void;
  onAssignBroker?: (leadId: string) => void;
  onOpenAddLead?: (defaultStage?: LeadStage) => void;
  onCreateLead?: (data: Partial<Lead>) => Promise<{ data: Lead | null; error: Error | null }>;
  onUpdateLead?: (id: string, updates: Partial<Lead>) => Promise<{ error: Error | null }>;
  onSelectPropertyMatch?: (propertyId: string) => void;
  onExportPipeline?: () => void;
  onNotify?: (msg: string) => void;
}

export const LeadsKanbanPage: React.FC<LeadsKanbanPageProps> = ({
  leads = [],
  stages = [],
  properties = [],
  onOpenAddLead,
  onCreateLead,
  onUpdateLead,
  onSelectPropertyMatch,
  onExportPipeline,
  onNotify,
}) => {
  const [currency] = useCurrency();
  const currencyInfo = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.PKR;

  // Quick Add Lead Modal state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickBudget, setQuickBudget] = useState('2500000');
  const [quickSource, setQuickSource] = useState('Website');
  const [quickStage, setQuickStage] = useState<LeadStage>('assigned');
  const [submittingQuickLead, setSubmittingQuickLead] = useState(false);
  const [newLead, setNewLead] = useState({
    requirementType: '',
    preferredArea: '',
    requirementSize: '',
    requirementUnit: 'Marla',
  });

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeStages =
    stages && stages.length > 0
      ? stages
      : [
          { id: 'stage-1', name: 'Assigned', slug: 'assigned', order_index: 1, color: '#005d42' },
          { id: 'stage-2', name: 'Awareness', slug: 'awareness', order_index: 2, color: '#006f67' },
          { id: 'stage-3', name: 'Contacted', slug: 'contacted', order_index: 3, color: '#0284c7' },
          { id: 'stage-4', name: 'Private Touring', slug: 'touring', order_index: 4, color: '#7c3aed' },
          { id: 'stage-5', name: 'Offer & Escrow', slug: 'negotiation', order_index: 5, color: '#d97706' },
        ];

  const [leadStartDate, setLeadStartDate] = useState('');
  const [leadEndDate, setLeadEndDate] = useState('');

  // Filter leads by date range
  const filteredLeads = leads.filter((lead) => {
    const leadDate = (lead as any).createdAt || (lead as any).created_at;
    if (leadStartDate) {
      if (!leadDate || new Date(leadDate) < new Date(leadStartDate)) return false;
    }
    if (leadEndDate) {
      const end = new Date(leadEndDate);
      end.setHours(23, 59, 59, 999);
      if (!leadDate || new Date(leadDate) > end) return false;
    }
    return true;
  });

  // Metric 1: Total Pipeline Value
  const totalPipelineValue = filteredLeads.reduce(
    (sum, lead) => sum + (Number(lead.budgetAmount) || 0),
    0
  );

  // Metric 2: High Value Leads
  const highValueThreshold = REGION.highValueBudget || 1000000;
  const highValueCount = filteredLeads.filter(
    (lead) => (Number(lead.budgetAmount) || 0) >= highValueThreshold
  ).length;

  // Metric 3: Avg Activity Freshness
  const avgFreshnessDays =
    filteredLeads.length > 0
      ? Math.round(
          filteredLeads.reduce(
            (sum, lead) => sum + (Number(lead.daysSinceLastActivity) || 0),
            0
          ) / filteredLeads.length
        )
      : 0;

  // Handle Quick Add Submit
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateLead) {
      if (onOpenAddLead) onOpenAddLead(quickStage);
      setQuickAddOpen(false);
      return;
    }

    setSubmittingQuickLead(true);
    try {
      const budgetNum = parseInt(quickBudget, 10) || 0;
      const budgetFormatted = formatMoney(budgetNum, { compact: true });

      const { data, error } = await onCreateLead({
        name: quickName.trim(),
        email: quickEmail.trim(),
        phone: quickPhone.trim(),
        budgetAmount: budgetNum,
        budgetFormatted,
        source: quickSource,
        stage: quickStage,
        tags: ['Quick Lead'],
        requirementType: newLead.requirementType,
        preferredArea: newLead.preferredArea,
        requirementSize: Number(newLead.requirementSize) || 0,
        requirementUnit: newLead.requirementUnit as any,
      });

      if (error) {
        onNotify?.(`Failed to create lead: ${error.message}`);
      } else {
        onNotify?.(`Added "${data?.name || quickName}" to ${quickStage.toUpperCase()} pipeline.`);
        setQuickName('');
        setQuickEmail('');
        setQuickPhone('');
        setNewLead({
          requirementType: '',
          preferredArea: '',
          requirementSize: '',
          requirementUnit: 'Marla',
        });
        setQuickAddOpen(false);
      }
    } catch (err: any) {
      onNotify?.(`Error: ${err.message || 'Failed to create lead'}`);
    } finally {
      setSubmittingQuickLead(false);
    }
  };

  const handleOpenAdd = () => {
    if (onCreateLead) {
      setQuickAddOpen(true);
    } else if (onOpenAddLead) {
      onOpenAddLead('assigned');
    } else {
      setQuickAddOpen(true);
    }
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 w-full min-w-0">
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
            Drag and drop leads across pipeline stages. Visual overview with quick actions and automated routing.
          </p>
        </div>

        {/* Action Buttons: Export & Add Quick Lead */}
        <div className="flex items-center gap-3 flex-wrap shrink-0">
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
            onClick={handleOpenAdd}
            className="h-10 px-4 rounded-lg bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-1.5 text-[13px] font-semibold transition-colors cursor-pointer whitespace-nowrap shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Quick Lead</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0b1c30]">
          <Calendar className="w-4 h-4 text-[#005d42]" />
          <span>Filter Leads by Creation Date:</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <label className="text-xs font-semibold text-[#3e4943]">From:</label>
            <input
              type="date"
              value={leadStartDate}
              onChange={(e) => setLeadStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <label className="text-xs font-semibold text-[#3e4943]">To:</label>
            <input
              type="date"
              value={leadEndDate}
              onChange={(e) => setLeadEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setLeadStartDate('');
              setLeadEndDate('');
            }}
            disabled={!leadStartDate && !leadEndDate}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#6e7a73] hover:text-[#0b1c30] transition-colors cursor-pointer shadow-xs disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 3 KPI Cards: Total Pipeline Value, High-Value Leads, Avg Activity Freshness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Pipeline Value */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Pipeline Value</span>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none">
                {formatMoney(totalPipelineValue, { compact: true })}
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
          <div className="w-11 h-11 rounded-xl bg-[#99efe5] flex items-center justify-center text-[#006f67] font-bold text-sm shrink-0">
            {currencyInfo.code === 'PKR' ? 'Rs' : currencyInfo.symbol || '$'}
          </div>
        </div>

        {/* Card 2: High-Value Leads */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">High-Value Leads</span>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none">
                {highValueCount}
              </span>
              <span className="text-[11px] font-semibold text-[#005d42] flex items-center gap-0.5">
                <Bolt className="w-3 h-3" />
                &gt; {formatMoney(highValueThreshold, { compact: true })}
              </span>
            </div>
            <span className="text-[11px] text-[#3e4943] mt-1.5">
              Priority routing target
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#005d42] shrink-0">
            <Bolt className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Avg Activity Freshness */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-[#3e4943]">Avg Activity Freshness</span>
            <div className="flex items-baseline gap-2 mt-1 tabular-nums">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none">
                {avgFreshnessDays}d
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

      {/* Recent Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs mt-6">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-display font-bold text-lg text-[#0b1c30]">Recent Leads</h3>
          <p className="text-xs text-slate-500">Your latest incoming inquiries.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Name</th>
                <th className="py-3 px-5">Contact</th>
                <th className="py-3 px-5">Stage</th>
                <th className="py-3 px-5">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {leads.length > 0 ? (
                leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="py-3 px-5 font-semibold text-[#0b1c30]">{lead.name}</td>
                    <td className="py-3 px-5 text-slate-500">{lead.email || lead.phone || '—'}</td>
                    <td className="py-3 px-5">
                      <span className="bg-[#eff4ff] text-[#005d42] px-2 py-1 rounded-md text-[11px] font-bold capitalize">
                        {lead.stage}
                      </span>
                    </td>
                    <td className="py-3 px-5 font-mono text-[#005d42]">
                      {formatMoney(lead.budgetAmount, { compact: true, currency })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No leads recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                    placeholder="+92 300 1234567"
                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Budget ({currencyInfo.code})
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

              {/* Buyer Requirements */}
              <div className="bg-[#eff4ff]/60 border border-[#005d42]/20 rounded-xl p-4 mt-2">
                <span className="text-[11px] font-bold text-[#005d42] uppercase block mb-3">Buyer Requirements</span>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Looking For</label>
                    <select value={newLead.requirementType} onChange={e => setNewLead({...newLead, requirementType: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                      <option value="">Select type...</option>
                      <option>House</option>
                      <option>Plot</option>
                      <option>Shop</option>
                      <option>Building</option>
                      <option>Penthouse</option>
                      <option>Rent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preferred Area</label>
                    <input type="text" value={newLead.preferredArea} onChange={e => setNewLead({...newLead, preferredArea: e.target.value})} placeholder="e.g. DHA Phase 6" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Size Requirement</label>
                  <div className="flex gap-2">
                    <input type="number" value={newLead.requirementSize} onChange={e => setNewLead({...newLead, requirementSize: e.target.value})} placeholder="e.g. 10" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                    <select value={newLead.requirementUnit} onChange={e => setNewLead({...newLead, requirementUnit: e.target.value})} className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                      <option>Marla</option>
                      <option>Kanal</option>
                      <option>Sq Ft</option>
                    </select>
                  </div>
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
                  {(stages && stages.length > 0
                    ? stages
                    : [
                        { id: '1', slug: 'assigned', name: 'Assigned' },
                        { id: '2', slug: 'awareness', name: 'Awareness' },
                        { id: '3', slug: 'contacted', name: 'Contacted' },
                        { id: '4', slug: 'touring', name: 'Private Touring' },
                        { id: '5', slug: 'escrow', name: 'Offer & Escrow' },
                        { id: '6', slug: 'closed', name: 'Closed Deals' },
                      ]
                  ).map((s) => (
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
