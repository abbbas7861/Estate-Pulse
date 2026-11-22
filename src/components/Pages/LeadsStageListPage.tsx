import React from 'react';
import { Mail, Phone, ExternalLink, Inbox, Eye, DollarSign, Calendar } from 'lucide-react';

interface LeadsStageListPageProps {
  stageSlug: string;
  stageName: string;
  leads: any[];
  onOpenLead: (lead: any) => void;
}

export const LeadsStageListPage: React.FC<LeadsStageListPageProps> = ({
  stageSlug,
  stageName,
  leads = [],
  onOpenLead,
}) => {
  const isClosedStage = stageSlug === 'closed';

  // Filter leads matching this stage
  const stageLeads = leads.filter((lead) => {
    if (!lead) return false;
    if (stageSlug === 'escrow') {
      return lead.stage === 'escrow' || lead.stage === 'negotiation';
    }
    if (isClosedStage) {
      const s = (lead.stage || '').toLowerCase();
      return s === 'closed' || s === 'closing' || s === 'won' || s === 'deal won';
    }
    return lead.stage === stageSlug;
  });

  const formatBuyerRequirements = (lead: any) => {
    const parts = [
      lead.requirementSize && lead.requirementUnit
        ? `${lead.requirementSize} ${lead.requirementUnit}`
        : '',
      lead.requirementType,
      lead.preferredArea ? `in ${lead.preferredArea}` : '',
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' ');
    }
    return lead.targetProperty || 'No specific requirements';
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-2xl md:text-3xl text-[#0b1c30]">
              {stageName}
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#eff4ff] text-[#005d42] border border-[#005d42]/10">
              {stageLeads.length} {stageLeads.length === 1 ? 'Lead' : 'Leads'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated pipeline view for leads currently in {stageName.toLowerCase()} stage.
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {stageLeads.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="font-display font-bold text-lg text-[#0b1c30]">
              No leads in this stage yet
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              As leads move into {stageName.toLowerCase()}, they will appear in this dedicated overview.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-[#f8fafc] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Lead Name &amp; Email</th>
                  <th className="py-3.5 px-6">Phone / Contact</th>
                  <th className="py-3.5 px-6">Budget</th>
                  <th className="py-3.5 px-6">Buyer Requirements</th>
                  {isClosedStage && (
                    <>
                      <th className="py-3.5 px-6">Final Price</th>
                      <th className="py-3.5 px-6">Date Closed</th>
                    </>
                  )}
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {stageLeads.map((lead) => {
                  const rawPhone = (lead.phone || '').replace(/\D/g, '');
                  const waUrl = rawPhone ? `https://wa.me/${rawPhone}` : null;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#0b1c30] group-hover:text-[#005d42] transition-colors">
                            {lead.name || 'Unnamed Lead'}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]">
                              {lead.email || 'No email provided'}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-700 text-xs">
                            {lead.phone || '—'}
                          </span>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 text-[11px] font-semibold transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-[#25D366]" />
                              <span>WhatsApp</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-[#005d42] text-xs">
                          {lead.budgetFormatted || lead.budgetLabel || '$0'}
                        </span>
                      </td>

                      {/* Buyer Requirements */}
                      <td className="py-4 px-6">
                        <span className="text-xs text-slate-600 line-clamp-1 max-w-[280px]">
                          {formatBuyerRequirements(lead)}
                        </span>
                      </td>

                      {/* Closed Stage Specific Columns */}
                      {isClosedStage && (
                        <>
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-emerald-700 text-xs flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                              {lead.closedPriceFormatted ||
                                (lead.closedPrice ? `$${lead.closedPrice.toLocaleString()}` : null) ||
                                lead.budgetFormatted ||
                                '—'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {lead.dateClosed ||
                                lead.closedAt ||
                                (lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleDateString() : 'Recent')}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenLead(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#005d42] text-[#005d42] hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
