/**
 * LeadDetailDrawer.tsx – Comprehensive Slide-Over Lead Detail Drawer.
 * Displays contact metadata, stage & agent selectors, tags, realtime activity timeline,
 * and the Step 4 Lead-to-Property Auto-Mapper with Top 3 scored property recommendations.
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Mail,
  User,
  Building,
  DollarSign,
  Tag,
  Clock,
  Calendar,
  MessageSquare,
  FileText,
  Plus,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Maximize2,
  Bed,
  Bath,
} from 'lucide-react';
import { Lead, LeadStageItem, Activity, Property } from '../../types/crm';
import { supabase } from '../../lib/supabaseClient';
import { useLeadPropertyMatches } from '../../lib/hooks/useLeadPropertyMatches';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  stages: LeadStageItem[];
  availableProperties?: Property[];
  onClose: () => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<{ error: Error | null }>;
  onSelectPropertyMatch?: (propertyId: string) => void;
  onNotify: (msg: string) => void;
}

type ActionFormType = 'none' | 'call' | 'email' | 'meeting' | 'note';

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  isOpen,
  stages,
  availableProperties = [],
  onClose,
  onUpdateLead,
  onSelectPropertyMatch,
  onNotify,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);

  // Action form state
  const [activeForm, setActiveForm] = useState<ActionFormType>('none');
  const [actionTitle, setActionTitle] = useState('');
  const [actionDesc, setActionDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Tag state
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Auto-Mapper Matches
  const { matches, loading: loadingMatches } = useLeadPropertyMatches(
    lead?.orgId || null,
    lead,
    availableProperties
  );

  // Fetch agents and activities when lead changes
  useEffect(() => {
    if (!isOpen || !lead) return;

    // Fetch org users/agents
    async function loadAgents() {
      if (!lead?.orgId) return;
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('org_id', lead.orgId);

      if (data && data.length > 0) {
        setAgents(
          data.map((u: any) => ({
            id: u.id,
            name: u.full_name || u.email.split('@')[0],
          }))
        );
      } else {
        setAgents([]);
      }
    }

    // Fetch lead activities
    async function loadActivities() {
      setLoadingActivities(true);
      if (!lead?.id) return;
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActivities(data as Activity[]);
      } else {
        setActivities([]);
      }
      setLoadingActivities(false);
    }

    loadAgents();
    loadActivities();
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  // Handle stage change from dropdown
  const handleStageSelect = async (newStageSlug: string) => {
    const { error } = await onUpdateLead(lead.id, { stage: newStageSlug });
    if (error) {
      onNotify(`Failed to update stage: ${error.message}`);
    } else {
      onNotify(`Stage updated to ${newStageSlug.toUpperCase()}`);
    }
  };

  // Handle agent assignment
  const handleAgentSelect = async (agentId: string) => {
    if (!agentId) {
      const { error } = await onUpdateLead(lead.id, {
        assignedTo: null,
        brokerName: '',
        brokerId: null,
      });
      if (error) {
        onNotify(`Failed to unassign agent: ${error.message}`);
      } else {
        onNotify('Lead unassigned');
      }
      return;
    }

    const matchedAgent = agents.find((a) => a.id === agentId);
    const agentName = matchedAgent?.name || 'Assigned Agent';
    const { error } = await onUpdateLead(lead.id, {
      assignedTo: agentId,
      brokerName: agentName,
      brokerId: agentId,
    });
    if (error) {
      onNotify(`Failed to assign agent: ${error.message}`);
    } else {
      onNotify(`Lead assigned to ${agentName}`);
    }
  };

  // Handle adding tag
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim();
    if (!tag) return;

    const currentTags = lead.tags || [];
    if (currentTags.includes(tag)) {
      setNewTagInput('');
      setIsAddingTag(false);
      return;
    }

    const updated = [...currentTags, tag];
    const { error } = await onUpdateLead(lead.id, { tags: updated });
    if (!error) {
      setNewTagInput('');
      setIsAddingTag(false);
      onNotify(`Added tag "${tag}"`);
    }
  };

  // Handle removing tag
  const handleRemoveTag = async (tagToRemove: string) => {
    const currentTags = lead.tags || [];
    const updated = currentTags.filter((t) => t !== tagToRemove);
    await onUpdateLead(lead.id, { tags: updated });
    onNotify(`Removed tag "${tagToRemove}"`);
  };

  // Handle logging activity / meeting
  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.orgId) return;

    setSubmittingAction(true);
    try {
      const type = activeForm as Activity['type'];
      const title = actionTitle.trim() || `Logged ${type.toUpperCase()}`;
      const description = actionDesc.trim();

      // 1. Insert into activities
      const { data: actData, error: actErr } = await supabase
        .from('activities')
        .insert({
          org_id: lead.orgId,
          lead_id: lead.id,
          type,
          title,
          description: description || null,
        })
        .select()
        .single();

      if (actErr) throw actErr;

      // 2. If meeting, also schedule in tasks_meetings
      if (type === 'meeting' && meetingDate) {
        // Sanitize assigned_to — only pass real UUIDs, never mock broker IDs
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const safeAssignedTo = lead.assignedTo && UUID_REGEX.test(lead.assignedTo.trim())
          ? lead.assignedTo.trim()
          : null;

        await supabase.from('tasks_meetings').insert({
          org_id: lead.orgId,
          lead_id: lead.id,
          assigned_to: safeAssignedTo,
          title: `Meeting: ${title}`,
          due_date: new Date(meetingDate).toISOString(),
          status: 'pending',
          type: 'meeting',
        });
      }

      // 3. Update lead's last_activity_at
      await onUpdateLead(lead.id, {
        lastActivityAt: new Date().toISOString(),
      });

      if (actData) {
        setActivities((prev) => [actData as Activity, ...prev]);
      }

      onNotify(`Successfully logged ${type}: ${title}`);
      setActiveForm('none');
      setActionTitle('');
      setActionDesc('');
      setMeetingDate('');
    } catch (err: any) {
      onNotify(`Error logging activity: ${err.message}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 bg-gradient-to-r from-[#0b1c30] to-[#122b48] text-white flex items-start justify-between shrink-0">
          <div className="flex flex-col gap-1 min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-[#97f5cc] uppercase bg-white/10 px-2.5 py-0.5 rounded-full">
                {lead.source}
              </span>
              {lead.isDuplicate && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Duplicate Record
                </span>
              )}
            </div>
            <h2 className="font-display font-bold text-2xl text-white truncate mt-1">
              {lead.name}
            </h2>
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#97f5cc]" />
              {lead.targetProperty || 'General Portfolio'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Status & Assignment Selectors */}
          <div className="grid grid-cols-2 gap-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-200/80">
            <div>
              <label className="block text-[11px] font-bold text-[#6e7a73] uppercase tracking-wider mb-1.5">
                Pipeline Stage
              </label>
              <div className="relative">
                <select
                  value={lead.stage}
                  onChange={(e) => handleStageSelect(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-[#0b1c30] appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 cursor-pointer shadow-xs"
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.slug}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#6e7a73] uppercase tracking-wider mb-1.5">
                Assigned Agent
              </label>
              <div className="relative">
                <select
                  value={lead.assignedTo || ''}
                  onChange={(e) => handleAgentSelect(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-[#0b1c30] appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 cursor-pointer shadow-xs"
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#6e7a73] uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2.5 text-[#0b1c30]">
                <div className="w-8 h-8 rounded-lg bg-[#e5eeff] text-[#005d42] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">Email Address</span>
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium hover:text-[#005d42] truncate block"
                  >
                    {lead.email || 'No email provided'}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-[#0b1c30]">
                <div className="w-8 h-8 rounded-lg bg-[#99efe5]/60 text-[#006f67] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 block">Phone Number</span>
                  <a
                    href={`tel:${lead.phone}`}
                    className="font-medium hover:text-[#005d42] truncate block"
                  >
                    {lead.phone || 'No phone provided'}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-[#0b1c30]">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Purchase Budget</span>
                  <span className="font-semibold text-[#005d42]">
                    {lead.budgetFormatted || '$0'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-[#0b1c30]">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Last Active</span>
                  <span className="font-medium">
                    {lead.daysSinceLastActivity === 0
                      ? 'Today'
                      : `${lead.daysSinceLastActivity} days ago`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 Auto-Mapper: Top 3 Property Matches */}
          <div className="bg-gradient-to-br from-[#eff4ff] to-[#f0fdf4] rounded-2xl border border-[#97f5cc]/60 p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#005d42] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#006f67]" />
                  Auto-Mapper: Top Property Matches
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Algorithmic scoring based on budget (+40), location (+30), and size fit (+30).
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#005d42] bg-white px-2 py-0.5 rounded-full border border-[#97f5cc]/60 shadow-xs">
                Live MLS
              </span>
            </div>

            {loadingMatches ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#005d42]" />
                Calculating matching inventory…
              </div>
            ) : matches.length === 0 ? (
              <div className="bg-white/80 rounded-xl p-4 text-center text-xs text-slate-500 border border-slate-200">
                No inventory matches computed for this budget/location. Add more listings to the catalog.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {matches.map((match) => (
                  <div
                    key={match.property_id}
                    onClick={() => onSelectPropertyMatch?.(match.property_id)}
                    className="bg-white rounded-xl p-3 border border-slate-200 hover:border-[#005d42] transition-all cursor-pointer shadow-xs flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={match.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80'}
                        alt={match.title}
                        className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-200"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-xs text-[#0b1c30] truncate group-hover:text-[#005d42] transition-colors">
                            {match.title}
                          </span>
                          <span className="font-mono font-bold text-xs text-[#005d42] shrink-0">
                            {match.price_formatted}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate block">
                          {(match as any).location || match.address} • {match.beds} Beds • {match.sqft} sqft
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          {match.match_reasons.slice(0, 2).map((reason, rIdx) => (
                            <span
                              key={rIdx}
                              className="text-[9px] font-semibold text-[#006f67] bg-[#99efe5]/40 px-1.5 py-0.5 rounded"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="font-display font-bold text-xs text-white bg-gradient-to-r from-[#005d42] to-[#047857] px-2 py-1 rounded-lg shadow-xs">
                        {match.score}% Match
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-1 group-hover:text-[#005d42]">
                        View Details <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#6e7a73] uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Tags &amp; Segmentation
              </h3>
              {!isAddingTag && (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  className="text-xs font-semibold text-[#005d42] hover:text-[#004d37] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Tag
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(lead.tags || []).length === 0 && !isAddingTag && (
                <span className="text-xs text-slate-400 italic">No tags assigned</span>
              )}

              {(lead.tags || []).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-[#e5eeff] text-[#0b1c30] px-2.5 py-1 rounded-lg border border-slate-200/60"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {isAddingTag && (
                <form onSubmit={handleAddTag} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="e.g. VIP, Cash Buyer"
                    autoFocus
                    className="bg-white border border-[#005d42] rounded-lg px-2.5 py-1 text-xs text-[#0b1c30] focus:outline-none w-32"
                  />
                  <button
                    type="submit"
                    className="bg-[#005d42] text-white px-2 py-1 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingTag(false);
                      setNewTagInput('');
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#6e7a73] uppercase tracking-wider">
              Log Deal Interactions
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveForm(activeForm === 'call' ? 'none' : 'call');
                  setActionTitle(`Phone Call with ${lead.name}`);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeForm === 'call'
                    ? 'bg-[#005d42] text-white border-[#005d42]'
                    : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                Log Call
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveForm(activeForm === 'email' ? 'none' : 'email');
                  setActionTitle(`Email sent to ${lead.name}`);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeForm === 'email'
                    ? 'bg-[#005d42] text-white border-[#005d42]'
                    : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Log Email
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveForm(activeForm === 'meeting' ? 'none' : 'meeting');
                  setActionTitle(`Private Showing / Meeting with ${lead.name}`);
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeForm === 'meeting'
                    ? 'bg-[#005d42] text-white border-[#005d42]'
                    : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Meeting
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveForm(activeForm === 'note' ? 'none' : 'note');
                  setActionTitle('Internal Brokerage Note');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeForm === 'note'
                    ? 'bg-[#005d42] text-white border-[#005d42]'
                    : 'bg-white hover:bg-slate-50 text-[#0b1c30] border-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Add Note
              </button>
            </div>

            {/* Quick Action Form Modal/Card */}
            {activeForm !== 'none' && (
              <form
                onSubmit={handleSubmitAction}
                className="mt-2 bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#005d42] uppercase tracking-wider">
                    Log {activeForm.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveForm('none')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  required
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  placeholder="Subject / Summary"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 font-medium"
                />

                {activeForm === 'meeting' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Meeting Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/20"
                    />
                  </div>
                )}

                <textarea
                  rows={2}
                  value={actionDesc}
                  onChange={(e) => setActionDesc(e.target.value)}
                  placeholder="Additional notes, key client remarks, or follow-up action..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 resize-none"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveForm('none')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="bg-[#005d42] hover:bg-[#004d37] text-white px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingAction ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Save Entry
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-[#6e7a73] uppercase tracking-wider">
              Activity History &amp; Timeline
            </h3>

            {loadingActivities ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#005d42]" />
                Loading timeline…
              </div>
            ) : activities.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl text-center text-xs text-slate-500">
                No logged interactions yet. Use the buttons above to log a call, meeting, or note.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {activities.map((act) => {
                  const dateStr = new Date(act.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  let IconComponent = FileText;
                  let iconColor = 'text-slate-600 bg-slate-100';

                  if (act.type === 'call') {
                    IconComponent = Phone;
                    iconColor = 'text-emerald-700 bg-emerald-100';
                  } else if (act.type === 'email') {
                    IconComponent = Mail;
                    iconColor = 'text-blue-700 bg-blue-100';
                  } else if (act.type === 'meeting') {
                    IconComponent = Calendar;
                    iconColor = 'text-purple-700 bg-purple-100';
                  } else if (act.type === 'stage_change') {
                    IconComponent = CheckCircle2;
                    iconColor = 'text-teal-700 bg-teal-100';
                  }

                  return (
                    <div key={act.id} className="relative group">
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${iconColor}`}
                      >
                        <IconComponent className="w-2.5 h-2.5" />
                      </div>
                      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-[#0b1c30]">{act.title}</span>
                          <span className="text-slate-400 tabular-nums">{dateStr}</span>
                        </div>
                        {act.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
