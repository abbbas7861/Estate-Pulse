import React from 'react';
import { X, Mail, Phone, Award, Clock, DollarSign, UserCheck, ShieldCheck, Calendar } from 'lucide-react';
import { EmployeeSummaryItem, Lead } from '../../types/crm';

interface AgentDetailModalProps {
  agent: EmployeeSummaryItem | null;
  leads: Lead[];
  isOpen: boolean;
  onClose: () => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  leads,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !agent) return null;

  // Filter leads assigned to this agent
  const agentLeads = leads.filter(
    (l) =>
      l.assignedTo === agent.id ||
      l.brokerId === agent.id ||
      (l.brokerName && l.brokerName.toLowerCase() === agent.name.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="relative bg-[#0b1c30] text-white p-6 pb-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {agent.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#97f5cc]/60 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#005d42] text-white flex items-center justify-center font-display font-bold text-2xl uppercase border-2 border-[#97f5cc]/60 shadow-md">
                {agent.name ? agent.name[0] : 'A'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-2xl text-white">
                  {agent.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#005d42] text-[#97f5cc] border border-emerald-400/20">
                  DRE Verified
                </span>
              </div>
              <p className="text-[13px] text-slate-300 font-medium">{agent.role}</p>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-[12px] text-slate-300">
                <a
                  href={`mailto:${agent.email}`}
                  className="flex items-center gap-1.5 hover:text-[#97f5cc] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#97f5cc]" />
                  <span>{agent.email}</span>
                </a>
                <a
                  href={`tel:${agent.phone}`}
                  className="flex items-center gap-1.5 hover:text-[#97f5cc] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#97f5cc]" />
                  <span>{agent.phone}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-5 bg-[#eff4ff]/60 border-b border-slate-200">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500">Pipeline Value</span>
            <p className="font-mono font-bold text-[16px] text-[#005d42] mt-0.5">
              {agent.pipelineValueFormatted}
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500">Quota Attained</span>
            <p className="font-mono font-bold text-[16px] text-[#0b1c30] mt-0.5">
              {agent.monthlyTargetPct}%
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500">Deals Closed</span>
            <p className="font-mono font-bold text-[16px] text-[#0b1c30] mt-0.5">
              {agent.dealsClosed} deals
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500">Avg Response</span>
            <p className="font-mono font-bold text-[16px] text-slate-700 mt-0.5">
              {agent.avgResponseTime}
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Assigned Leads */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-[15px] text-[#0b1c30]">
                Active Inbound Lead Allocation ({agentLeads.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                Sorted by most recent inquiry
              </span>
            </div>

            {agentLeads.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                No leads currently assigned to {agent.name}. Use the Kanban board to allocate inquiries.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {agentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3 bg-white hover:bg-[#eff4ff]/60 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[13px] text-[#0b1c30]">
                          {lead.name}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 uppercase">
                          {lead.stage}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Target: {lead.targetProperty} · {lead.budgetFormatted}
                      </p>
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-400 shrink-0">
                      {lead.timeAgo}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance & Credentials */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-[12px] text-slate-600 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#005d42] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">California DRE Compliance Verified</p>
              <p className="mt-0.5 text-slate-500">
                Agent is authorized to execute luxury disclosures, lead-paint acknowledgments, and escrow purchase agreements under EstatePulse Brokerage License #01928412.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#0b1c30] hover:bg-[#1a2d42] text-white text-[13px] font-semibold transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
