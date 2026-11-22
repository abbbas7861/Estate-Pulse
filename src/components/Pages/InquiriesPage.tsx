import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Inbox,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Filter,
  User,
  Eye,
  X,
  Building2,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Lead } from '../../types/crm';

interface InquiriesPageProps {
  orgId: string | null;
  onNotify?: (msg: string) => void;
  onOpenLead?: (lead: Lead) => void;
  onRefreshLeads?: () => void;
}

export interface InquiryItem {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: string;
  website_message: string | null;
  target_property: string | null;
  created_at: string;
}

export const InquiriesPage: React.FC<InquiriesPageProps> = ({
  orgId,
  onNotify,
  onOpenLead,
  onRefreshLeads,
}) => {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'new' | 'converted'>('all');
  const [activeMessageModal, setActiveMessageModal] = useState<InquiryItem | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const fetchInquiries = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, org_id, name, email, phone, source, stage, website_message, target_property, created_at')
        .eq('org_id', orgId)
        .in('source', ['Website Inquiry', 'Website Chat'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (err: any) {
      console.error('[InquiriesPage] Fetch error:', err);
      onNotify?.(`Failed to load inquiries: ${err.message || 'Error'}`);
    } finally {
      setLoading(false);
    }
  }, [orgId, onNotify]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  // Convert to active pipeline lead
  const handleConvertToLead = async (item: InquiryItem) => {
    setConvertingId(item.id);
    try {
      // Update stage to 'assigned' and source to 'Website' so it appears in the main Leads Kanban board
      const { error } = await supabase
        .from('leads')
        .update({
          stage: 'assigned',
          source: 'Website',
        })
        .eq('id', item.id);

      if (error) throw error;

      // Remove from the local Website Inquiries list
      setInquiries((prev) => prev.filter((inq) => inq.id !== item.id));

      onNotify?.(`"${item.name}" converted to lead in pipeline.`);
      onRefreshLeads?.();
      await fetchInquiries();

      // If opener is provided, open detail drawer
      if (onOpenLead) {
        const leadObj: Lead = {
          id: item.id,
          orgId: item.org_id,
          name: item.name,
          email: item.email || '',
          phone: item.phone || '',
          source: 'Website',
          timeAgo: 'Just now',
          stage: 'assigned',
          targetProperty: item.target_property || 'Website Inquirer',
          budgetLabel: '',
          budgetAmount: 0,
          budgetFormatted: '',
          brokerId: null,
          brokerName: 'Unassigned',
          brokerInitials: item.name.slice(0, 2).toUpperCase(),
          note: item.website_message || undefined,
          website_message: item.website_message || undefined,
          isHighValue: false,
          isDirectInbound: true,
        };
        onOpenLead(leadObj);
      }
    } catch (err: any) {
      onNotify?.(`Error converting inquiry: ${err.message || 'Error'}`);
    } finally {
      setConvertingId(null);
    }
  };

  // Filtered inquiries
  const filtered = useMemo(() => {
    return inquiries.filter((inq) => {
      // Stage filter
      if (stageFilter === 'new' && inq.stage !== 'assigned') return false;
      if (stageFilter === 'converted' && inq.stage === 'assigned') return false;

      // Text search
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const messageText = inq.website_message || inq.target_property || '';
      return (
        inq.name.toLowerCase().includes(q) ||
        (inq.phone || '').toLowerCase().includes(q) ||
        (inq.email || '').toLowerCase().includes(q) ||
        messageText.toLowerCase().includes(q)
      );
    });
  }, [inquiries, search, stageFilter]);

  const totalCount = inquiries.length;
  const newCount = inquiries.filter((i) => i.stage === 'assigned').length;
  const convertedCount = inquiries.filter((i) => i.stage !== 'assigned').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc]">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-6 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <Inbox className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl sm:text-2xl text-[#0b1c30]">
                  Website Inquiries
                </h1>
                <p className="text-xs text-slate-500">
                  Prospective buyers and direct inquiries received via your public property portal
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchInquiries}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Inquiries
              </p>
              <p className="text-2xl font-display font-bold text-[#0b1c30] mt-0.5">
                {totalCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white text-slate-600 flex items-center justify-center shadow-2xs border border-slate-100">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                New & Unhandled
              </p>
              <p className="text-2xl font-display font-bold text-amber-900 mt-0.5">
                {newCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Converted to Pipeline
              </p>
              <p className="text-2xl font-display font-bold text-emerald-900 mt-0.5">
                {convertedCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search and Filter Controls ───────────────────────────────────────── */}
      <div className="px-6 py-4 sm:px-8 bg-white border-b border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or message..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-[#0b1c30] outline-none focus:border-[#005d42] focus:ring-1 focus:ring-[#005d42]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              stageFilter === 'all'
                ? 'bg-white text-[#0b1c30] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('new')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              stageFilter === 'new'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New ({newCount})
          </button>
          <button
            type="button"
            onClick={() => setStageFilter('converted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              stageFilter === 'converted'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Converted ({convertedCount})
          </button>
        </div>
      </div>

      {/* ── Inquiries List / Table ─────────────────────────────────────────── */}
      <div className="flex-1 p-6 sm:p-8 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <RefreshCw className="w-8 h-8 text-[#005d42] animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading website inquiries…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-lg text-slate-800 mb-1">
              {search ? 'No inquiries matching your search' : 'No website inquiries yet'}
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-sm">
              {search
                ? 'Try searching with different keywords or clearing your filter.'
                : 'When prospective buyers submit the Contact Form on your public portal, their messages will appear here.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const isNew = item.stage === 'assigned';
                const messageText = item.website_message || item.target_property || 'No inquiry text provided.';
                const cleanPhone = item.phone ? item.phone.replace(/\D/g, '') : '';
                const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;
                const formattedDate = new Date(item.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true,
                });

                return (
                  <div
                    key={item.id}
                    className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left: Contact Info & Status */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-[#0b1c30] text-amber-300 font-display font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-bold text-base text-[#0b1c30]">
                            {item.name}
                          </span>

                          {isNew ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200/80">
                              New Inquiry
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/80">
                              In Pipeline
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span>{formattedDate}</span>
                          </span>
                        </div>

                        {/* Contact Channels */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {item.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <a
                                href={`tel:${item.phone}`}
                                className="font-mono text-[#0b1c30] hover:underline"
                              >
                                {item.phone}
                              </a>
                            </div>
                          )}

                          {item.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <a
                                href={`mailto:${item.email}`}
                                className="text-slate-600 hover:text-slate-900 hover:underline"
                              >
                                {item.email}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Message Preview */}
                        <div className="pt-1">
                          <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-2.5 border border-slate-100 line-clamp-2 leading-relaxed">
                            <span className="font-semibold text-slate-500 mr-1.5">Message:</span>
                            {messageText}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                      {/* View Full Message Button */}
                      <button
                        type="button"
                        onClick={() => setActiveMessageModal(item)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="View Full Inquiry Message"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Read Message</span>
                      </button>

                      {/* WhatsApp Button */}
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}

                      {/* Convert to Lead Button */}
                      {isNew ? (
                        <button
                          type="button"
                          disabled={convertingId === item.id}
                          onClick={() => handleConvertToLead(item)}
                          className="px-4 py-2 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#97f5cc]" />
                          <span>{convertingId === item.id ? 'Converting…' : 'Convert to Lead'}</span>
                        </button>
                      ) : (
                        <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 border border-emerald-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active in CRM</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Full Message Modal ──────────────────────────────────────────────── */}
      {activeMessageModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setActiveMessageModal(null)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 flex flex-col gap-4 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-[#0b1c30]">
                  Inquiry from {activeMessageModal.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Received on {new Date(activeMessageModal.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMessageModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                  <span className="font-semibold text-slate-800">{activeMessageModal.phone || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Email</span>
                  <span className="font-semibold text-slate-800 truncate block">{activeMessageModal.email || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Inquiry Message:
                </label>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                  {activeMessageModal.website_message || activeMessageModal.target_property || 'No text content.'}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
              {activeMessageModal.phone && (
                <a
                  href={`https://wa.me/${activeMessageModal.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Reply on WhatsApp</span>
                </a>
              )}

              {activeMessageModal.stage === 'assigned' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleConvertToLead(activeMessageModal);
                    setActiveMessageModal(null);
                  }}
                  className="ml-auto px-4 py-2 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Convert to Lead</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveMessageModal(null)}
                  className="ml-auto px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiriesPage;
