import React, { useState } from 'react';
import { X, UserPlus, Mail, Phone, Briefcase, DollarSign, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { EmployeeSummaryItem } from '../../types/crm';

interface InviteAgentModalProps {
  isOpen: boolean;
  orgId: string | null;
  onClose: () => void;
  onAgentInvited: (newAgent: EmployeeSummaryItem) => void;
}

export const InviteAgentModal: React.FC<InviteAgentModalProps> = ({
  isOpen,
  orgId,
  onClose,
  onAgentInvited,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Senior Broker Associate');
  const [quotaTarget, setQuotaTarget] = useState('10000000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please provide a name and email.');
      return;
    }
    if (!orgId) {
      setError('No organization found. Please reload and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedQuota = Number(quotaTarget) || 10_000_000;
      const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const avatarUrl = `https://placehold.co/120x120/005d42/ffffff?text=${initials}`;

      // FIX #2: Insert into public.users and capture the real Supabase UUID.
      // Previously, a synthetic `agent-${Date.now()}` string was used which
      // caused "invalid input syntax for type uuid" errors on assigned_to columns.
      const { data: insertedUser, error: insertErr } = await supabase
        .from('users')
        .insert({
          org_id: orgId,
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          // FIX #2 / #37: Do NOT store a hardcoded placeholder phone.
          // Store null when the user left the field blank.
          phone: phone.trim() || null,
          role: 'agent',
          specialty: role,
          quota_target: parsedQuota,
          avatar_url: avatarUrl,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      const createdAgent: EmployeeSummaryItem = {
        // Use the real UUID returned by Supabase — not a synthetic string.
        id: insertedUser.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        // FIX #37: Reflect empty/null phone as '—' in the UI object too.
        phone: phone.trim() || '—',
        role,
        avatarUrl,
        initials,
        totalLeads: 0,
        assigned: 0,
        won: 0,
        lost: 0,
        conversionPct: 0,
        // FIX #37: '—' instead of the hardcoded '6 mins'.
        avgResponseTime: '—',
        pipelineValue: 0,
        pipelineValueFormatted: '$0',
        dealsClosed: 0,
        monthlyTargetPct: 0,
        quotaTarget: parsedQuota,
      };

      onAgentInvited(createdAgent);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to send advisor invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200">
        <div className="p-6 bg-[#0b1c30] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005d42] flex items-center justify-center text-[#97f5cc]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                Invite Broker Associate
              </h2>
              <p className="text-[12px] text-slate-300">
                Grant access to the Beverly Hills brokerage acquisition desk
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[13px] rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Victoria Sterling"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005d42]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Corporate Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="v.sterling@estatepulse.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005d42]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Direct Mobile Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="+1 (310) 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005d42]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                Specialty Title
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005d42] bg-white"
              >
                <option value="Senior Broker Associate">Senior Broker Associate</option>
                <option value="Managing Luxury Partner">Managing Luxury Partner</option>
                <option value="Architectural Estates Director">Architectural Estates Director</option>
                <option value="Commercial & Penthouse Specialist">Commercial & Penthouse Specialist</option>
                <option value="Acquisitions Associate">Acquisitions Associate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Monthly Closed Quota Target ($)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                value={quotaTarget}
                onChange={(e) => setQuotaTarget(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-[13px] font-mono focus:outline-none focus:ring-2 focus:ring-[#005d42]"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>Send Invitation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
