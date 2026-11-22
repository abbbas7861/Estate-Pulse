import React from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Mail,
  MessageSquare,
  Phone,
  Video,
  AlertTriangle,
  Tag,
  Sparkles,
} from 'lucide-react';
import { Lead, LeadStage } from '../../types/crm';
import { WhatsAppIcon, openWhatsAppChat } from '../../lib/whatsapp';

interface LeadKanbanCardProps {
  lead: Lead;
  stages: { id: LeadStage; label: string }[];
  currentUserName?: string;
  onMoveStage: (leadId: string, newStage: LeadStage) => void;
  onAssignBroker: (leadId: string) => void;
  onActionClick: (lead: Lead, actionType: 'message' | 'call' | 'schedule') => void;
  onWhatsAppClick?: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: string) => void;
  onSelect?: (lead: Lead) => void;
}

export const LeadKanbanCard: React.FC<LeadKanbanCardProps> = ({
  lead,
  stages,
  currentUserName,
  onMoveStage,
  onAssignBroker,
  onActionClick,
  onWhatsAppClick,
  onDragStart,
  onSelect,
}) => {
  const currentStageIdx = stages.findIndex((s) => s.id === lead.stage);
  const prevStage = currentStageIdx > 0 ? stages[currentStageIdx - 1] : null;
  const nextStage = currentStageIdx < stages.length - 1 ? stages[currentStageIdx + 1] : null;

  // Source badge styling
  const getSourceBadgeStyle = (src: string) => {
    const s = src.toLowerCase();
    if (s.includes('facebook')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('referral')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s.includes('website')) return 'bg-teal-50 text-teal-700 border-teal-200';
    return 'bg-emerald-50 text-[#005d42] border-emerald-200';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicked on button or link, don't trigger drawer
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    onSelect?.(lead);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={handleCardClick}
      className={`bg-white rounded-xl p-4 border transition-all cursor-grab active:cursor-grabbing flex flex-col gap-3 group relative shadow-xs hover:shadow-md ${
        lead.isDuplicate
          ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/40'
          : 'border-slate-200/80 hover:border-[#047857]/50'
      }`}
    >
      {/* Top Source, Duplicate warning & Activity Metadata */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span
            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${getSourceBadgeStyle(
              lead.source
            )}`}
          >
            {lead.source}
          </span>

          {lead.isDuplicate && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300"
              title="Duplicate email or phone detected in pipeline"
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Duplicate
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[#6e7a73] tabular-nums shrink-0 ml-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {lead.daysSinceLastActivity === 0
              ? 'Today'
              : `${lead.daysSinceLastActivity}d inactive`}
          </span>
        </div>

        {/* Stage quick-step buttons */}
        <div
          className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {prevStage && (
            <button
              type="button"
              onClick={() => onMoveStage(lead.id, prevStage.id)}
              title={`Move back to ${prevStage.label}`}
              className="p-1 rounded hover:bg-[#eff4ff] text-[#6e7a73] hover:text-[#0b1c30] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {nextStage && (
            <button
              type="button"
              onClick={() => onMoveStage(lead.id, nextStage.id)}
              title={`Advance to ${nextStage.label}`}
              className="p-1 rounded hover:bg-[#eff4ff] text-[#6e7a73] hover:text-[#005d42] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Lead Name & Contact Details */}
      <div>
        <h3 className="font-display font-bold text-[15px] text-[#0b1c30] leading-snug group-hover:text-[#005d42] transition-colors flex items-center justify-between">
          <span>{lead.name}</span>
        </h3>
        <div className="mt-1.5 flex flex-col gap-1 text-[12px] text-[#3e4943]">
          {lead.email && (
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 text-[#6e7a73] shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-1.5 tabular-nums">
              <Phone className="w-3.5 h-3.5 text-[#6e7a73] shrink-0" />
              <span>{lead.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tags chips */}
      {(lead.tags || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {lead.tags!.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-medium px-1.5 py-0.5 rounded"
            >
              <Tag className="w-2.5 h-2.5 text-slate-400" />
              {tag}
            </span>
          ))}
          {lead.tags!.length > 3 && (
            <span className="text-[10px] text-slate-400 font-semibold">
              +{lead.tags!.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Optional Note Callout */}
      {lead.note && (
        <div className="bg-[#eff4ff] rounded-lg px-3 py-2 flex items-start gap-2 text-[11px] text-[#0b1c30] font-medium leading-relaxed">
          {lead.noteType === 'tour' ? (
            <Video className="w-3.5 h-3.5 text-[#005d42] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-3.5 h-3.5 text-[#005d42] shrink-0 mt-0.5" />
          )}
          <span className="line-clamp-2">{lead.note}</span>
        </div>
      )}

      {/* Target Property & Financial Capacity */}
      <div className="bg-[#eff4ff]/80 rounded-lg p-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-[#6e7a73] font-medium">Target Property</span>
          <span className="text-[12px] font-semibold text-[#0b1c30] truncate mt-0.5">
            {lead.targetProperty}
          </span>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-[10px] text-[#6e7a73] font-medium">{lead.budgetLabel}</span>
          <span className="font-mono font-semibold text-[13px] text-[#005d42] tabular-nums mt-0.5">
            {lead.budgetFormatted}
          </span>
        </div>
      </div>

      {/* Auto-Mapper Quick Action Pill */}
      <button
        type="button"
        onClick={() => onSelect?.(lead)}
        className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-[#eff4ff] to-[#f0fdf4] border border-[#97f5cc]/60 hover:border-[#005d42] flex items-center justify-between text-[11px] text-[#005d42] font-semibold transition-all group/automap cursor-pointer shadow-2xs"
        title="View Auto-Mapper top matched MLS properties for this lead"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#006f67]" />
          <span>Auto-Mapper</span>
        </span>
        <span className="text-[10px] font-medium text-slate-500 group-hover/automap:text-[#005d42] flex items-center gap-0.5">
          View Property Matches →
        </span>
      </button>

      {/* Footer: Assigned Broker & Quick Actions */}
      <div className="pt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {lead.brokerAvatarUrl ? (
            <img
              src={lead.brokerAvatarUrl}
              alt={lead.brokerName}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-[#dce9ff] text-[#0b1c30] text-[10px] font-bold flex items-center justify-center shrink-0">
              {lead.brokerInitials || 'UA'}
            </div>
          )}
          <span className="text-[11px] font-medium text-[#3e4943] truncate">
            {lead.brokerName || 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onWhatsAppClick) {
                onWhatsAppClick(lead);
              } else if (lead.phone) {
                openWhatsAppChat(lead.phone, lead.name, currentUserName);
              }
            }}
            disabled={!lead.phone}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
              lead.phone
                ? 'bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white shadow-2xs'
                : 'text-slate-300 cursor-not-allowed opacity-40'
            }`}
            title={lead.phone ? `Message ${lead.name} on WhatsApp` : 'No phone number provided'}
            aria-label={`WhatsApp ${lead.name}`}
          >
            <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => onActionClick(lead, 'message')}
            className="w-7 h-7 rounded-md hover:bg-[#eff4ff] text-[#6e7a73] hover:text-[#0b1c30] flex items-center justify-center transition-colors cursor-pointer"
            title={`Message ${lead.name}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onActionClick(lead, 'schedule')}
            className="w-7 h-7 rounded-md hover:bg-[#eff4ff] text-[#6e7a73] hover:text-[#005d42] flex items-center justify-center transition-colors cursor-pointer"
            title={`Schedule showing / call with ${lead.name}`}
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
