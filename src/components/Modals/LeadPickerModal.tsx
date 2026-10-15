/**
 * LeadPickerModal.tsx – Select a Lead to assign a Property listing.
 * Filters leads in current org with no target_property yet.
 * Styled in matching green/white, DM Sans font, rounded-xl cards.
 */
import React, { useState } from 'react';
import {
  X,
  Search,
  Building2,
  UserCheck,
  DollarSign,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Property, Lead } from '../../types/crm';

interface LeadPickerModalProps {
  isOpen: boolean;
  property: Property | null;
  leads: Lead[];
  onClose: () => void;
  onSelectLead: (leadId: string) => Promise<void> | void;
  loading?: boolean;
}

export const LeadPickerModal: React.FC<LeadPickerModalProps> = ({
  isOpen,
  property,
  leads,
  onClose,
  onSelectLead,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  if (!isOpen || !property) return null;

  // Filter leads in current org with NO target_property yet
  const unassignedLeads = leads.filter(
    (l) =>
      !l.targetProperty ||
      l.targetProperty.trim() === '' ||
      l.targetProperty.toLowerCase() === 'general portfolio'
  );

  // Search filter
  const query = searchQuery.trim().toLowerCase();
  const filteredLeads = unassignedLeads.filter((l) => {
    if (!query) return true;
    return (
      l.name.toLowerCase().includes(query) ||
      l.email.toLowerCase().includes(query) ||
      l.phone.toLowerCase().includes(query) ||
      l.stage.toLowerCase().includes(query) ||
      (l.tags && l.tags.some((t) => t.toLowerCase().includes(query)))
    );
  });

  const handleConfirm = async () => {
    if (!selectedLeadId) return;
    await onSelectLead(selectedLeadId);
  };

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#005d42]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-[#0b1c30]">
                Assign Listing to Buyer Lead
              </h2>
              <p className="text-xs text-[#6e7a73] mt-0.5">
                Route &quot;{property.title}&quot; to a pipeline lead without a target property.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Property Brief Strip */}
        <div className="px-6 py-3 bg-[#eff4ff]/60 border-b border-slate-100 flex items-center justify-between text-xs text-[#0b1c30]">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-4 h-4 text-[#005d42] shrink-0" />
            <span className="font-semibold truncate">{property.title}</span>
            <span className="text-[#6e7a73]">•</span>
            <span className="font-mono text-[#006f67] font-semibold">{property.mlsId}</span>
          </div>
          <span className="font-display font-bold text-[#005d42] tabular-nums shrink-0 ml-2">
            {property.priceFormatted}
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 bg-[#f8fafc] border border-slate-200 rounded-xl px-3.5 py-2">
            <Search className="w-4 h-4 text-[#6e7a73] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search unassigned leads by name, email, or stage..."
              className="w-full bg-transparent border-0 outline-none text-xs text-[#0b1c30] placeholder:text-[#6e7a73]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#6e7a73] hover:text-[#0b1c30]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lead Cards List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-[220px]">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => {
              const isSelected = selectedLeadId === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-[#005d42] bg-[#f0fdf4] shadow-xs ring-1 ring-[#005d42]'
                      : 'border-slate-200/80 bg-white hover:border-[#005d42]/40 hover:bg-[#f8fafc]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-display text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-[#005d42] text-white'
                          : 'bg-[#99efe5] text-[#006f67]'
                      }`}
                    >
                      {lead.brokerInitials || lead.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-xs text-[#0b1c30] truncate">
                          {lead.name}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-[#3e4943]">
                          {lead.stage}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#6e7a73] mt-1 truncate">
                        {lead.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{lead.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-[#6e7a73] block">Budget</span>
                      <span className="font-display font-bold text-xs text-[#005d42] tabular-nums">
                        {lead.budgetFormatted}
                      </span>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'border-[#005d42] bg-[#005d42] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
              <p className="font-display font-semibold text-sm text-[#0b1c30]">
                {unassignedLeads.length === 0
                  ? 'All leads already have target properties assigned'
                  : 'No unassigned leads match your search query'}
              </p>
              <p className="text-xs text-[#6e7a73] mt-1 max-w-sm">
                {unassignedLeads.length === 0
                  ? 'Create a new lead in your acquisition pipeline or clear an existing property assignment.'
                  : 'Try searching with a different buyer name or clear the search input.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-[#f8fafc]">
          <span className="text-xs text-[#6e7a73]">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} available
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-[#3e4943] text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedLeadId || loading}
              className="px-5 py-2 rounded-xl bg-[#005d42] text-white text-xs font-semibold hover:bg-[#004d37] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Assignment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
