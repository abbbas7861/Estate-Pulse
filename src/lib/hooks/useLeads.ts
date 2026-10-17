/**
 * useLeads.ts – Comprehensive Lead Management Hook for EstatePulse.
 * Handles CRUD operations, dynamic stages, realtime channel sync, and activity logging.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { formatMoney, isHighValue } from '../../config/regional';
import { Lead, LeadStage, LeadStageItem } from '../../types/crm';

const DEFAULT_STAGES: LeadStageItem[] = [
  { id: 'stage-1', name: 'Assigned', slug: 'assigned', order_index: 1, color: '#005d42' },
  { id: 'stage-2', name: 'Awareness', slug: 'awareness', order_index: 2, color: '#006f67' },
  { id: 'stage-3', name: 'Contacted', slug: 'contacted', order_index: 3, color: '#0284c7' },
  { id: 'stage-4', name: 'Private Touring', slug: 'touring', order_index: 4, color: '#7c3aed' },
  { id: 'stage-5', name: 'Offer & Escrow', slug: 'negotiation', order_index: 5, color: '#d97706' },
];

function calculateDaysAgo(dateString?: string): number {
  if (!dateString) return 0;
  const past = new Date(dateString).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - past) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return 'Just now';
  const days = calculateDaysAgo(dateString);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Convert raw DB row to app Lead model
function mapRowToLead(row: any): Lead {
  const budget = Number(row.budget) || 0;
  const budgetFormatted = formatMoney(budget, { compact: true });
  const daysSince = calculateDaysAgo(row.last_activity_at || row.created_at);

  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name || 'Unnamed Lead',
    email: row.email || '',
    phone: row.phone || '',
    source: row.source || 'Website',
    timeAgo: formatRelativeTime(row.last_activity_at || row.created_at),
    stage: (row.stage as LeadStage) || 'assigned',
    targetProperty: row.target_property || '',
    targetPropertyId: row.target_property_id || undefined,
    budgetLabel: isHighValue(budget) ? 'High Value' : 'Standard',
    budgetAmount: budget,
    budgetFormatted,
    brokerId: row.assigned_to || row.broker_id || null,
    brokerName: row.broker_name || 'Unassigned',
    brokerInitials: row.broker_initials || (row.broker_name ? row.broker_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'UA'),
    brokerAvatarUrl: row.broker_avatar_url || undefined,
    note: row.note,
    noteType: row.note_type || 'info',
    isHighValue: isHighValue(budget),
    isDirectInbound: row.source === 'Website' || row.source === 'Direct Inbound',
    tags: Array.isArray(row.tags) ? row.tags : [],
    assignedTo: row.assigned_to || row.broker_id || null,
    lastActivityAt: row.last_activity_at || row.created_at,
    daysSinceLastActivity: daysSince,
  };
}

// Mark duplicates in array based on matching email or phone (while preventing duplicate IDs)
function markDuplicates(leadList: Lead[]): Lead[] {
  const uniqueMap = new Map<string, Lead>();
  for (const lead of leadList) {
    if (lead?.id) {
      uniqueMap.set(lead.id, lead);
    }
  }
  const uniqueLeads = Array.from(uniqueMap.values());

  const emailCounts = new Map<string, number>();
  const phoneCounts = new Map<string, number>();

  uniqueLeads.forEach((lead) => {
    const cleanEmail = lead.email?.trim().toLowerCase();
    const cleanPhone = lead.phone?.replace(/\D/g, '');
    if (cleanEmail) emailCounts.set(cleanEmail, (emailCounts.get(cleanEmail) || 0) + 1);
    if (cleanPhone && cleanPhone.length >= 7) phoneCounts.set(cleanPhone, (phoneCounts.get(cleanPhone) || 0) + 1);
  });

  return uniqueLeads.map((lead) => {
    const cleanEmail = lead.email?.trim().toLowerCase();
    const cleanPhone = lead.phone?.replace(/\D/g, '');
    const isDup =
      (!!cleanEmail && (emailCounts.get(cleanEmail) || 0) > 1) ||
      (!!cleanPhone && cleanPhone.length >= 7 && (phoneCounts.get(cleanPhone) || 0) > 1);

    return {
      ...lead,
      isDuplicate: isDup,
    };
  });
}


export function useLeads(orgId: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<LeadStageItem[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const leadsRef = useRef<Lead[]>(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // ── 1. Fetch Stages ──────────────────────────────────────────────────────────
  const fetchStages = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data, error: stageErr } = await supabase
        .from('lead_stages')
        .select('*')
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .order('order_index', { ascending: true });

      if (stageErr) {
        console.warn('Using default stages. Stage fetch warning:', stageErr.message);
        setStages(DEFAULT_STAGES);
      } else if (data && data.length > 0) {
        setStages(data as LeadStageItem[]);
      } else {
        setStages(DEFAULT_STAGES);
      }
    } catch {
      setStages(DEFAULT_STAGES);
    }
  }, [orgId]);

  // ── 2. Fetch Leads ───────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!orgId) {
      setLeads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('leads')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (fetchErr) {
        throw fetchErr;
      }

      const mapped = markDuplicates((data || []).map(mapRowToLead));
      setLeads(mapped);
    } catch (err: any) {
      console.error('[useLeads] Error fetching leads:', err);
      setError(err?.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // ── 3. Realtime Subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!orgId) {
      setLeads([]);
      setLoading(false);
      return;
    }

    fetchStages();
    fetchLeads();

    const channelName = `leads-org-${orgId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `org_id=eq.${orgId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = mapRowToLead(payload.new);
            setLeads((prev) => markDuplicates([newLead, ...prev.filter((l) => l.id !== newLead.id)]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRowToLead(payload.new);
            setLeads((prev) => markDuplicates(prev.map((l) => (l.id === updated.id ? updated : l))));
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) => markDuplicates(prev.filter((l) => l.id !== payload.old.id)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchStages, fetchLeads]);

  // ── 4. Create Lead ───────────────────────────────────────────────────────────
  const createLead = async (data: Partial<Lead>): Promise<{ data: Lead | null; error: Error | null }> => {
    let activeOrgId = orgId;
    if (!activeOrgId) {
      try {
        const { fetchOrgId } = await import('../useAuth');
        const userRes = await supabase.auth.getUser();
        if (userRes.data.user) {
          activeOrgId = await fetchOrgId(userRes.data.user.id);
        }
      } catch (e) {
        console.warn('Failed to resolve active org on demand:', e);
      }
    }

    if (!activeOrgId) {
      return {
        data: null,
        error: new Error(
          'No organization found for this account. Please sign out and sign in again, or contact support.'
        ),
      };
    }

    try {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const sanitizeUuid = (val: any): string | null => {
        if (typeof val === 'string' && UUID_REGEX.test(val.trim())) {
          return val.trim();
        }
        return null;
      };

      const budgetAmount = data.budgetAmount || 0;
      const budgetFormatted = formatMoney(budgetAmount, { compact: true });

      const safeBrokerId = sanitizeUuid(data.brokerId);
      const safeAssignedTo = sanitizeUuid(data.assignedTo) || safeBrokerId || null;

      let finalAssignedTo = safeAssignedTo;
      let finalBrokerName = data.brokerName || null;
      let wasRoundRobin = false;

      // FIX #19: Round-Robin Auto-Assignment if no agent assigned
      if (!finalAssignedTo) {
        try {
          // 1. Fetch agents in this org
          let { data: agents } = await supabase
            .from('users')
            .select('id, full_name, role')
            .eq('org_id', activeOrgId)
            .eq('role', 'agent');

          // Fallback: if no user has strict 'agent' role, fetch any user in org
          if (!agents || agents.length === 0) {
            const { data: allUsers } = await supabase
              .from('users')
              .select('id, full_name, role')
              .eq('org_id', activeOrgId);
            agents = allUsers || [];
          }

          if (agents && agents.length > 0) {
            // 2. Fetch open leads for this org (excluding closed/rejected)
            const { data: openLeads } = await supabase
              .from('leads')
              .select('assigned_to')
              .eq('org_id', activeOrgId)
              .not('stage', 'in', '("closed","rejected","Deal Won","Deal Lost")');

            const counts = new Map<string, number>();
            agents.forEach((ag) => counts.set(ag.id, 0));
            (openLeads || []).forEach((row) => {
              if (row.assigned_to && counts.has(row.assigned_to)) {
                counts.set(row.assigned_to, (counts.get(row.assigned_to) || 0) + 1);
              }
            });

            // 3. Pick agent with fewest open leads
            let minAgent = agents[0];
            let minCount = counts.get(minAgent.id) ?? 0;
            for (const ag of agents) {
              const c = counts.get(ag.id) ?? 0;
              if (c < minCount) {
                minCount = c;
                minAgent = ag;
              }
            }

            finalAssignedTo = minAgent.id;
            finalBrokerName = minAgent.full_name || 'Agent Associate';
            wasRoundRobin = true;
          } else {
            // Fallback: assign to current authenticated user
            const authRes = await supabase.auth.getUser();
            if (authRes.data.user) {
              finalAssignedTo = authRes.data.user.id;
              finalBrokerName =
                authRes.data.user.user_metadata?.full_name ||
                authRes.data.user.email?.split('@')[0] ||
                'Broker Associate';
              wasRoundRobin = true;
            }
          }
        } catch (rrErr) {
          console.warn('[useLeads] Round-robin auto-assignment error:', rrErr);
        }
      }

      // FIX #3: Resolve the org's first stage so every lead gets a stage_id on
      // creation. Without this, leads have stage_id = NULL and never appear on
      // the Kanban board.
      const { data: firstStage } = await supabase
        .from('lead_stages')
        .select('id')
        .eq('org_id', activeOrgId)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      const payload = {
        org_id: activeOrgId,
        name: data.name?.trim() || 'New Inbound Lead',
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        source: data.source || 'Website',
        stage: data.stage || 'assigned',
        stage_id: firstStage?.id ?? null,
        target_property: data.targetProperty || 'General Portfolio',
        target_property_id: data.targetPropertyId || null,
        budget: budgetAmount,
        budget_formatted: budgetFormatted,
        broker_name: finalBrokerName,
        broker_id: finalAssignedTo,
        assigned_to: finalAssignedTo,
        tags: data.tags || [],
        last_activity_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('leads')
        .insert(payload)
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Log initial activity
      await supabase.from('activities').insert({
        org_id: activeOrgId,
        lead_id: inserted.id,
        type: 'note',
        title: wasRoundRobin
          ? `Auto-assigned via Round-Robin to ${finalBrokerName || 'Agent'}`
          : 'Lead Created',
        description: wasRoundRobin
          ? `Auto-assigned via Round-Robin to ${finalBrokerName || 'Agent'} • Source: ${payload.source} • Budget: ${budgetFormatted}`
          : `Source: ${payload.source} • Budget: ${budgetFormatted}`,
      });

      const newLeadModel = mapRowToLead(inserted);
      setLeads((prev) => markDuplicates([newLeadModel, ...prev.filter((l) => l.id !== newLeadModel.id)]));

      return { data: newLeadModel, error: null };
    } catch (err: any) {
      console.error('[useLeads] createLead error:', err);
      return { data: null, error: err };
    }
  };

  // ── 5. Update Lead ───────────────────────────────────────────────────────────
  const updateLead = async (id: string, updates: Partial<Lead>): Promise<{ error: Error | null }> => {
    if (!orgId) return { error: new Error('No active organization') };

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sanitizeUuid = (val: any): string | null => {
      if (typeof val === 'string' && UUID_REGEX.test(val.trim())) {
        return val.trim();
      }
      return null;
    };

    const previousLeads = [...leadsRef.current];

    // Optimistic local update
    setLeads((prev) =>
      markDuplicates(
        prev.map((lead) => (lead.id === id ? { ...lead, ...updates, lastActivityAt: new Date().toISOString() } : lead))
      )
    );

    try {
      const dbPayload: any = {
        last_activity_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.email !== undefined) dbPayload.email = updates.email;
      if (updates.phone !== undefined) dbPayload.phone = updates.phone;
      if (updates.source !== undefined) dbPayload.source = updates.source;
      if (updates.stage !== undefined) dbPayload.stage = updates.stage;
      if (updates.targetProperty !== undefined) dbPayload.target_property = updates.targetProperty;
      if (updates.targetPropertyId !== undefined) dbPayload.target_property_id = updates.targetPropertyId;
      if (updates.budgetAmount !== undefined) {
        dbPayload.budget = updates.budgetAmount;
        dbPayload.budget_formatted = formatMoney(updates.budgetAmount, { compact: true });
      }
      if (updates.assignedTo !== undefined) {
        const safeAssigned = sanitizeUuid(updates.assignedTo);
        dbPayload.assigned_to = safeAssigned;
        dbPayload.broker_id = safeAssigned;
      }
      if (updates.brokerId !== undefined) {
        dbPayload.broker_id = sanitizeUuid(updates.brokerId);
      }
      if (updates.brokerName !== undefined) dbPayload.broker_name = updates.brokerName;
      if (updates.tags !== undefined) dbPayload.tags = updates.tags;

      const { error: updateErr } = await supabase
        .from('leads')
        .update(dbPayload)
        .eq('id', id)
        .eq('org_id', orgId);

      if (updateErr) throw updateErr;

      return { error: null };
    } catch (err: any) {
      console.error('[useLeads] updateLead error, rolling back:', err);
      setLeads(previousLeads);
      return { error: err };
    }
  };

  // ── 6. Update Lead Stage (Optimistic Drag & Drop) ─────────────────────────────
  const updateLeadStage = async (id: string, stageIdOrSlug: string): Promise<{ error: Error | null }> => {
    if (!orgId) return { error: new Error('No active organization') };

    const targetLead = leadsRef.current.find((l) => l.id === id);
    if (!targetLead) return { error: new Error('Lead not found') };

    // Resolve stage slug
    const matchedStage = stages.find((s) => s.id === stageIdOrSlug || s.slug === stageIdOrSlug);
    const targetSlug = (matchedStage?.slug || stageIdOrSlug) as LeadStage;

    if (targetLead.stage === targetSlug) {
      return { error: null };
    }

    const previousLeads = [...leadsRef.current];

    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              stage: targetSlug,
              stageId: matchedStage?.id,
              timeAgo: 'Today',
              lastActivityAt: new Date().toISOString(),
              daysSinceLastActivity: 0,
            }
          : lead
      )
    );

    try {
      const { error: dbErr } = await supabase
        .from('leads')
        .update({
          stage: targetSlug,
          stage_id: matchedStage?.id || null,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId);

      if (dbErr) throw dbErr;

      // Log activity row for the stage move
      await supabase.from('activities').insert({
        org_id: orgId,
        lead_id: id,
        type: 'stage_change',
        title: `Stage Changed: ${targetSlug.toUpperCase()}`,
        description: `Moved from ${targetLead.stage} to ${targetSlug}`,
      });

      return { error: null };
    } catch (err: any) {
      console.error('[useLeads] updateLeadStage error, rolling back:', err);
      setLeads(previousLeads);
      return { error: err };
    }
  };

  // ── 7. Delete Lead ───────────────────────────────────────────────────────────
  const deleteLead = async (id: string): Promise<{ error: Error | null }> => {
    if (!orgId) return { error: new Error('No active organization') };

    const previousLeads = [...leadsRef.current];
    setLeads((prev) => markDuplicates(prev.filter((l) => l.id !== id)));

    try {
      const { error: delErr } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId);

      if (delErr) throw delErr;
      return { error: null };
    } catch (err: any) {
      console.error('[useLeads] deleteLead error, rolling back:', err);
      setLeads(previousLeads);
      return { error: err };
    }
  };

  // ── 8. Log Activity ──────────────────────────────────────────────────────────
  const logActivity = async (
    leadId: string,
    type: 'call' | 'email' | 'meeting' | 'note' | 'stage_change',
    title: string,
    description?: string
  ): Promise<{ error: Error | null }> => {
    if (!orgId) return { error: new Error('No active organization') };

    try {
      const { error: actErr } = await supabase.from('activities').insert({
        org_id: orgId,
        lead_id: leadId,
        type,
        title,
        description: description || null,
      });

      if (actErr) throw actErr;

      // Touch lead last_activity_at
      await supabase
        .from('leads')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', leadId)
        .eq('org_id', orgId);

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return {
    leads,
    setLeads,
    stages,
    loading,
    error,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    updateLeadStage,
    logActivity,
  };
}
