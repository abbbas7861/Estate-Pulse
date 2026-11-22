import React, { useState, useEffect, useMemo } from 'react';
import {
  Bot,
  Sparkles,
  Sliders,
  Users,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Lock,
  Globe,
  Building2,
  DollarSign,
  UserCheck,
  Search,
  Send,
  Filter,
  Trash2,
  Check,
  Play,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';
import { useSubscription } from '../../lib/hooks/useSubscription';
import { formatMoney, useCurrency } from '../../config/regional';
import { PageView } from '../../types/crm';

interface AIAgentPageProps {
  orgId?: string | null;
  onNotify: (msg: string) => void;
  onNavigate: (page: PageView) => void;
  onRefreshLeads?: () => void | Promise<void>;
}

export interface AIProspect {
  id: string;
  org_id?: string;
  owner_name: string;
  property: string;
  price?: number | string;
  property_price?: number | string;
  buyer_budget?: number | string;
  prospect_type?: 'buyer' | 'seller' | string;
  source_url: string;
  status: 'pending' | 'pitched' | 'replied';
  email?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
}

export interface AIAgentConfig {
  id?: string;
  org_id: string;
  target_cities: string[];
  target_property_types: string[];
  commission_rate: string | number;
  pitch_message: string;
  buyer_pitch_message?: string;
  scout_sellers?: boolean;
  scout_buyers?: boolean;
  is_active?: boolean;
}

const DEFAULT_CITIES = ['Lahore', 'Islamabad', 'Karachi', 'Dubai', 'Beverly Hills', 'Miami'];
const DEFAULT_TYPES = ['House', 'Villa', 'Penthouse', 'Apartment', 'Commercial Plot', 'Office Space'];

const DEFAULT_PITCH =
  "Hi {owner_name}, I noticed your property at {property_address}. We have verified high-net-worth buyers actively searching in this area. Our brokerage offers comprehensive representation at a competitive {commission_rate}% commission. Would you be open to a 5-minute call this week?";

const DEFAULT_BUYER_PITCH =
  "Hi {buyer_name}, I saw your post looking for a {property_type} in {city}. We have off-market listings that match your criteria. Would you like to see them?";

export const AIAgentPage: React.FC<AIAgentPageProps> = ({
  orgId,
  onNotify,
  onNavigate,
  onRefreshLeads,
}) => {
  const { orgName, orgId: authOrgId } = useAuth();
  const effectiveOrgId = orgId || authOrgId;
  const { isEnterprise, startCheckout } = useSubscription(effectiveOrgId ?? null);
  const [currency] = useCurrency();

  const [activeTab, setActiveTab] = useState<'config' | 'prospects'>('config');

  // Agent Config State
  const [targetCities, setTargetCities] = useState<string[]>(['Lahore', 'Islamabad']);
  const [targetPropertyTypes, setTargetPropertyTypes] = useState<string[]>(['House', 'Villa']);
  const [commissionRate, setCommissionRate] = useState<string>('2.0');
  const [pitchMessage, setPitchMessage] = useState<string>(DEFAULT_PITCH);
  const [buyerPitchMessage, setBuyerPitchMessage] = useState<string>(DEFAULT_BUYER_PITCH);
  const [scoutSellers, setScoutSellers] = useState<boolean>(true);
  const [scoutBuyers, setScoutBuyers] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [customCityInput, setCustomCityInput] = useState<string>('');

  // Prospects State
  const [prospects, setProspects] = useState<AIProspect[]>([]);
  const [loadingProspects, setLoadingProspects] = useState<boolean>(false);
  const [isScouting, setIsScouting] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'pitched' | 'replied'>('all');

  // Load Agent Config
  useEffect(() => {
    if (!effectiveOrgId || !isEnterprise) return;

    let isMounted = true;
    async function loadConfig() {
      try {
        const { data, error } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('org_id', effectiveOrgId)
          .maybeSingle();

        if (!error && data && isMounted) {
          if (Array.isArray(data.target_cities)) {
            setTargetCities(data.target_cities);
          } else if (typeof data.target_cities === 'string') {
            setTargetCities(data.target_cities.split(',').map((s: string) => s.trim()).filter(Boolean));
          }

          if (Array.isArray(data.target_property_types)) {
            setTargetPropertyTypes(data.target_property_types);
          } else if (typeof data.target_property_types === 'string') {
            setTargetPropertyTypes(data.target_property_types.split(',').map((s: string) => s.trim()).filter(Boolean));
          }

          if (data.commission_rate !== undefined && data.commission_rate !== null) {
            setCommissionRate(String(data.commission_rate));
          }

          if (data.pitch_message) {
            setPitchMessage(data.pitch_message);
          }

          if (data.buyer_pitch_message) {
            setBuyerPitchMessage(data.buyer_pitch_message);
          }

          if (data.scout_sellers !== undefined && data.scout_sellers !== null) {
            setScoutSellers(Boolean(data.scout_sellers));
          }

          if (data.scout_buyers !== undefined && data.scout_buyers !== null) {
            setScoutBuyers(Boolean(data.scout_buyers));
          }

          if (data.is_active !== undefined) {
            setIsActive(Boolean(data.is_active));
          }
        }
      } catch (err) {
        console.warn('Could not load ai_agents configuration:', err);
      }
    }

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [effectiveOrgId, isEnterprise]);

  // Load Prospects
  const fetchProspects = async () => {
    if (!effectiveOrgId || !isEnterprise) return;
    setLoadingProspects(true);
    try {
      const { data, error } = await supabase
        .from('ai_prospects')
        .select('*')
        .eq('org_id', effectiveOrgId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProspects(data as AIProspect[]);
      } else {
        setProspects([]);
      }
    } catch (err) {
      console.warn('Could not load ai_prospects:', err);
      setProspects([]);
    } finally {
      setLoadingProspects(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, [effectiveOrgId, isEnterprise]);

  const handleRunScout = async () => {
    setIsScouting(true);
    try {
      const res = await fetch('/api/scout-worker');
      const data = await res.json();
      if (data.success) {
        alert(`Success! Scouted ${data.scoutedCount} new prospects.`);
        // Re-fetch the prospects table here to show the new data
        fetchProspects();
      } else {
        alert('Scout failed: ' + data.error);
      }
    } catch (err) {
      alert('Failed to connect to the scout worker.');
    } finally {
      setIsScouting(false);
    }
  };

  // Save Agent Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrgId) {
      onNotify('Organization not found.');
      return;
    }

    setSavingConfig(true);
    try {
      const payload = {
        org_id: effectiveOrgId,
        target_cities: targetCities,
        target_property_types: targetPropertyTypes,
        commission_rate: parseFloat(commissionRate) || 2.0,
        pitch_message: pitchMessage,
        buyer_pitch_message: buyerPitchMessage,
        scout_sellers: scoutSellers,
        scout_buyers: scoutBuyers,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      // Check if existing agent record exists
      const { data: existing } = await supabase
        .from('ai_agents')
        .select('id')
        .eq('org_id', effectiveOrgId)
        .maybeSingle();

      let err = null;
      if (existing?.id) {
        const { error } = await supabase
          .from('ai_agents')
          .update(payload)
          .eq('id', existing.id);
        err = error;
      } else {
        const { error } = await supabase
          .from('ai_agents')
          .insert({ ...payload, created_at: new Date().toISOString() });
        err = error;
      }

      if (err) {
        onNotify(`Failed to save AI Agent configuration: ${err.message}`);
      } else {
        onNotify('AI Lead Generation Agent configuration saved successfully.');
      }
    } catch (err: any) {
      onNotify(`Error saving configuration: ${err.message || 'Unknown error'}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Toggle city in target list
  const toggleCity = (city: string) => {
    setTargetCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  // Add custom city
  const handleAddCustomCity = () => {
    const trimmed = customCityInput.trim();
    if (trimmed && !targetCities.includes(trimmed)) {
      setTargetCities((prev) => [...prev, trimmed]);
      setCustomCityInput('');
    }
  };

  // Toggle property type
  const toggleType = (type: string) => {
    setTargetPropertyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Convert Prospect to CRM Lead
  const handleConvertToLead = async (prospect: AIProspect) => {
    if (!effectiveOrgId) return;
    setConvertingId(prospect.id);

    try {
      const isBuyer = prospect.prospect_type === 'buyer';
      const rawBudget = isBuyer
        ? prospect.buyer_budget ?? prospect.price ?? 0
        : prospect.property_price ?? prospect.price ?? 0;
      const numPrice = Number(rawBudget) || 0;
      const budgetFormatted = formatMoney(numPrice, { compact: true, currency });

      // 1. Insert into leads
      const leadPayload = {
        org_id: effectiveOrgId,
        name: prospect.owner_name || (isBuyer ? 'Buyer Prospect' : 'Prospect Owner'),
        email: prospect.email || '',
        phone: prospect.phone || '',
        source: isBuyer ? 'AI Scout (Buyer Inbound)' : 'AI Scout (Property Seller)',
        stage: 'assigned',
        target_property: prospect.property || (isBuyer ? 'Looking for Property' : 'Target Property'),
        budget: numPrice,
        budget_amount: numPrice,
        budget_formatted: budgetFormatted,
        note: `Converted from AI Prospect (${isBuyer ? 'Buyer' : 'Seller'}). Source: ${prospect.source_url || 'Scraped Portal'}. Status was: ${prospect.status}.`,
        tags: ['AI Prospect', isBuyer ? 'Buyer Scout' : 'Seller Scout', 'Growth-as-a-Service'],
        created_at: new Date().toISOString(),
      };

      const { data: createdLead, error: insertError } = await supabase
        .from('leads')
        .insert(leadPayload)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Lead creation failed: ${insertError.message}`);
      }

      // 2. Delete from ai_prospects
      const { error: deleteError } = await supabase
        .from('ai_prospects')
        .delete()
        .eq('id', prospect.id);

      if (deleteError) {
        console.warn('Could not delete prospect after lead conversion:', deleteError);
      }

      // 3. Update local state
      setProspects((prev) => prev.filter((p) => p.id !== prospect.id));
      onNotify(`Converted "${prospect.owner_name}" to Active CRM Lead.`);

      if (onRefreshLeads) {
        await onRefreshLeads();
      }
    } catch (err: any) {
      onNotify(`Conversion failed: ${err.message || 'Unknown error'}`);
    } finally {
      setConvertingId(null);
    }
  };

  // Filtered prospects
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        (p.owner_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.property || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.source_url || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [prospects, searchQuery, statusFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // TASK 3: Enterprise Lock Screen
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isEnterprise) {
    return (
      <div className="p-5 sm:p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
          {/* Top Decorative Banner */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#005d42] via-[#0284c7] to-[#7c3aed]" />

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#005d42]/10 to-[#0284c7]/10 flex items-center justify-center text-[#005d42] mb-5 border border-[#005d42]/20">
            <Bot className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-wider text-[#005d42] bg-[#eff4ff] px-3 py-1 rounded-full border border-[#005d42]/20 mb-3">
            Growth-as-a-Service (GaaS)
          </span>

          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight">
            Premium Feature - Upgrade to Enterprise
          </h1>

          <p className="text-[14px] text-slate-600 max-w-xl mt-3 leading-relaxed">
            Autonomous AI Lead Generation Agent is exclusively available to Enterprise brokerages. Let our AI crawl listings, identify off-market property owners, pitch your brokerage, and feed warm leads directly into your CRM pipeline.
          </p>

          <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 w-full max-w-lg">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="font-display font-extrabold text-3xl text-[#0b1c30]">$199</span>
              <span className="text-sm font-semibold text-slate-500">/ month</span>
            </div>
            <p className="text-[12px] text-emerald-700 font-semibold mt-1">
              Autonomous AI Prospecting • Verified Owner Scouting • 1-Click CRM Lead Pipeline
            </p>
          </div>

          {/* Feature List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left w-full max-w-lg mb-8 text-[13px] text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
              <span>Target City &amp; Property Filters</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
              <span>Personalized AI Pitch Outreach</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
              <span>Automated Prospect Discovery</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
              <span>1-Click Convert to CRM Lead</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
            <button
              type="button"
              onClick={async () => {
                try {
                  await startCheckout('enterprise');
                } catch {
                  onNavigate('billing');
                }
              }}
              className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#005d42] to-[#047857] hover:from-[#004d37] hover:to-[#005d42] text-white font-bold text-[14px] transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Upgrade to Enterprise ($199/mo)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#0b1c30] hover:bg-slate-50 font-semibold text-[13px] transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Enterprise Dashboard
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-[#005d42]">GROWTH-AS-A-SERVICE</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">ENTERPRISE AGENT</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#0b1c30] tracking-tight leading-tight">
              AI Lead Generation Agent
            </h1>
            <span className="text-[11px] font-bold text-[#006f67] bg-[#99efe5]/60 px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-[#006f67]/20">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#006f67] animate-pulse' : 'bg-slate-400'}`} />
              {isActive ? 'Autonomous Scout Active' : 'Scout Paused'}
            </span>
            <button
              type="button"
              onClick={handleRunScout}
              disabled={isScouting}
              className="flex items-center gap-2 bg-[#047857] hover:bg-[#005d42] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isScouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isScouting ? 'Scouting...' : 'Run Scout Now'}
            </button>
          </div>
          <p className="text-[14px] text-[#3e4943] mt-1.5 leading-relaxed">
            Configure your AI scout to scan real estate portals, pitch property owners, and populate warm prospects into your pipeline.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-white text-[#005d42] shadow-xs'
                : 'text-slate-600 hover:text-[#0b1c30]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Agent Configuration</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('prospects');
              fetchProspects();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
              activeTab === 'prospects'
                ? 'bg-white text-[#005d42] shadow-xs'
                : 'text-slate-600 hover:text-[#0b1c30]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Generated Prospects ({prospects.length})</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[12px] font-medium text-slate-500">Scouted Prospects</span>
            <div className="font-display font-bold text-[26px] text-[#0b1c30] mt-0.5 tabular-nums">
              {prospects.length}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">Live in database</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#005d42]">
            <Bot className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[12px] font-medium text-slate-500">Pending Review</span>
            <div className="font-display font-bold text-[26px] text-amber-600 mt-0.5 tabular-nums">
              {prospects.filter((p) => p.status === 'pending').length}
            </div>
            <span className="text-[11px] text-slate-500">Ready for outreach</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[12px] font-medium text-slate-500">Pitched / Contacted</span>
            <div className="font-display font-bold text-[26px] text-[#0284c7] mt-0.5 tabular-nums">
              {prospects.filter((p) => p.status === 'pitched').length}
            </div>
            <span className="text-[11px] text-slate-500">AI outreach dispatched</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[12px] font-medium text-slate-500">Owner Replies</span>
            <div className="font-display font-bold text-[26px] text-emerald-700 mt-0.5 tabular-nums">
              {prospects.filter((p) => p.status === 'replied').length}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">Ready for CRM deal</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: AGENT CONFIGURATION
         ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
            <div>
              <h2 className="font-display font-bold text-xl text-[#0b1c30]">Agent Parameters</h2>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Set targeting parameters and tailored pitch copy for your automated lead gen agent.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#005d42] cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Agent Active</span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="flex flex-col gap-6">
            {/* Scouting Targets */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Scouting Targets
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Configure your autonomous agent to scout property sellers, buyers, or both.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#005d42]/40 transition-colors cursor-pointer select-none shadow-2xs">
                  <div>
                    <span className="font-semibold text-sm text-[#0b1c30] block">Scout Property Sellers</span>
                    <span className="text-xs text-slate-500">Find homeowners &amp; FSBO sellers looking to list</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={scoutSellers}
                    onChange={(e) => setScoutSellers(e.target.checked)}
                    className="w-4 h-4 accent-[#005d42] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#005d42]/40 transition-colors cursor-pointer select-none shadow-2xs">
                  <div>
                    <span className="font-semibold text-sm text-[#0b1c30] block">Scout Property Buyers</span>
                    <span className="text-xs text-slate-500">Find buyers seeking properties across portals &amp; social</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={scoutBuyers}
                    onChange={(e) => setScoutBuyers(e.target.checked)}
                    className="w-4 h-4 accent-[#005d42] cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Target Cities */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Target Cities &amp; Regions
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {DEFAULT_CITIES.map((city) => {
                  const selected = targetCities.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleCity(city)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        selected
                          ? 'bg-[#005d42] text-white border-[#005d42]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                      <span>{city}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom City Adder */}
              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  value={customCityInput}
                  onChange={(e) => setCustomCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCity();
                    }
                  }}
                  placeholder="Add custom city/location..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCity}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              {targetCities.length > 0 && (
                <div className="mt-2 text-[12px] text-slate-500">
                  Active filter: <strong className="text-slate-700">{targetCities.join(', ')}</strong>
                </div>
              )}
            </div>

            {/* Target Property Types */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Target Property Types
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TYPES.map((type) => {
                  const selected = targetPropertyTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        selected
                          ? 'bg-[#005d42] text-white border-[#005d42]'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Commission Rate */}
            <div className="max-w-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Standard Commission Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="15.0"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="2.0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-[#0b1c30] font-mono focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Automatically substituted in outbound pitch messages.
              </span>
            </div>

            {/* AI Pitch Messages */}
            <div className="flex flex-col gap-6">
              {/* Seller Pitch Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Seller Pitch Message Template
                  </label>
                  <button
                    type="button"
                    onClick={() => setPitchMessage(DEFAULT_PITCH)}
                    className="text-[11px] font-semibold text-[#005d42] hover:underline cursor-pointer"
                  >
                    Reset to Default Template
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={pitchMessage}
                  onChange={(e) => setPitchMessage(e.target.value)}
                  placeholder="Enter seller pitch message..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 leading-relaxed font-sans"
                />
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span>Dynamic tags:</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{`{owner_name}`}</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{`{property_address}`}</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{`{commission_rate}`}</span>
                </div>
              </div>

              {/* Buyer Pitch Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Buyer Pitch Message Template
                  </label>
                  <button
                    type="button"
                    onClick={() => setBuyerPitchMessage(DEFAULT_BUYER_PITCH)}
                    className="text-[11px] font-semibold text-[#005d42] hover:underline cursor-pointer"
                  >
                    Reset to Default Template
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={buyerPitchMessage}
                  onChange={(e) => setBuyerPitchMessage(e.target.value)}
                  placeholder="Enter buyer pitch message..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 leading-relaxed font-sans"
                />
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500">
                  <span>Dynamic tags:</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{`{buyer_name}`}</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{`{property_type}`}</span>
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{`{city}`}</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingConfig}
                className="px-6 py-2.5 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white text-sm font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{savingConfig ? 'Saving...' : 'Save Agent Configuration'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: GENERATED PROSPECTS TABLE
         ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'prospects' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-[#0b1c30]">Scouted Prospects</h2>
              <span className="text-xs font-semibold text-slate-500">
                ({filteredProspects.length} total)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search owner or property..."
                  className="bg-transparent border-0 outline-none text-[#0b1c30] placeholder:text-slate-400 w-36 sm:w-48"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="pitched">Pitched</option>
                <option value="replied">Replied</option>
              </select>

              {/* Refresh */}
              <button
                type="button"
                onClick={fetchProspects}
                disabled={loadingProspects}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Refresh Prospects"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProspects ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3 px-5">Owner / Prospect</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Property</th>
                  <th className="py-3 px-5">Price / Budget</th>
                  <th className="py-3 px-5">Source URL</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {loadingProspects ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#005d42]" />
                      Loading scouted prospects...
                    </td>
                  </tr>
                ) : filteredProspects.length > 0 ? (
                  filteredProspects.map((prospect) => {
                    const isPending = prospect.status === 'pending';
                    const isPitched = prospect.status === 'pitched';
                    const isReplied = prospect.status === 'replied';
                    const isBuyer = prospect.prospect_type === 'buyer';
                    const rawPrice = isBuyer
                      ? prospect.buyer_budget ?? prospect.price
                      : prospect.property_price ?? prospect.price;

                    return (
                      <tr key={prospect.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-[#0b1c30]">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#005d42]/10 text-[#005d42] font-bold text-xs flex items-center justify-center">
                              {prospect.owner_name ? prospect.owner_name[0].toUpperCase() : 'O'}
                            </div>
                            <span>{prospect.owner_name || (isBuyer ? 'Buyer Prospect' : 'Property Owner')}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize inline-flex items-center gap-1 ${
                              isBuyer
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isBuyer ? 'bg-blue-600' : 'bg-emerald-600'
                              }`}
                            />
                            {isBuyer ? 'Buyer' : 'Seller'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-slate-700 max-w-xs truncate font-medium">
                          {prospect.property || '—'}
                        </td>
                        <td className="py-3.5 px-5 font-mono font-semibold text-[#005d42]">
                          {rawPrice !== undefined && rawPrice !== null && rawPrice !== ''
                            ? formatMoney(Number(rawPrice), { compact: true, currency })
                            : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 max-w-xs">
                          {prospect.source_url ? (
                            <a
                              href={prospect.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0284c7] hover:underline flex items-center gap-1 text-xs truncate max-w-[200px]"
                            >
                              <span className="truncate">{prospect.source_url}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">Direct Scout</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize inline-flex items-center gap-1 ${
                              isReplied
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isPitched
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isReplied ? 'bg-emerald-600' : isPitched ? 'bg-sky-600' : 'bg-amber-500'
                              }`}
                            />
                            {prospect.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleConvertToLead(prospect)}
                            disabled={convertingId === prospect.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {convertingId === prospect.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                            <span>Convert to CRM Lead</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Bot className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">No prospects scouted yet.</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Your AI Lead Gen Agent will discover off-market owners based on your Target Cities and Property Types.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
