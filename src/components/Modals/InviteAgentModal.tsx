import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, Loader2, AlertCircle, Copy, Check, CheckCircle2, Phone, Award } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { EmployeeSummaryItem } from '../../types/crm';
import { useAuth } from '../../lib/useAuth';

interface InviteAgentModalProps {
  isOpen: boolean;
  orgId?: string | null;
  onClose: () => void;
  onAgentInvited?: (newAgent: EmployeeSummaryItem) => void;
  onNotify?: (msg: string) => void;
  onInviteSent?: (email: string) => void;
}

export const InviteAgentModal: React.FC<InviteAgentModalProps> = ({
  isOpen,
  orgId: propOrgId,
  onClose,
  onAgentInvited,
  onNotify,
  onInviteSent,
}) => {
  const { orgId: authOrgId, user } = useAuth();
  const effectiveOrgId = propOrgId || authOrgId;

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('agent');
  const [phone, setPhone] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCloseModal = () => {
    setGeneratedLink(null);
    setEmail('');
    setPhone('');
    setExperienceYears('');
    setAvatarFile(null);
    setAvatarPreview(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = generatedLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      onNotify?.('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed', err);
      onNotify?.('Failed to copy link to clipboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid agent email address.');
      return;
    }

    setLoading(true);

    let targetOrgId = effectiveOrgId;

    // Resilient fallback: if targetOrgId is not yet available, query Supabase for user's org_id
    if (!targetOrgId && user?.id) {
      try {
        const { data: userProfile } = await supabase
          .from('users')
          .select('org_id')
          .eq('id', user.id)
          .maybeSingle();

        if (userProfile?.org_id) {
          targetOrgId = userProfile.org_id;
        } else if (user?.email) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('org_id')
            .eq('email', user.email)
            .maybeSingle();
          if (userByEmail?.org_id) {
            targetOrgId = userByEmail.org_id;
          }
        }

        if (!targetOrgId) {
          const { data: userOrg } = await supabase
            .from('organizations')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (userOrg?.id) {
            targetOrgId = userOrg.id;
          }
        }
      } catch (lookupErr) {
        console.warn('[InviteAgentModal] org lookup warning:', lookupErr);
      }
    }

    if (!targetOrgId) {
      const errMsg = 'Organization not found. Please reload and try again.';
      setError(errMsg);
      onNotify?.(errMsg);
      setLoading(false);
      return;
    }

    try {
      let finalAvatarUrl: string | null = null;
      if (avatarFile && targetOrgId) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${targetOrgId}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(uploadData.path);
          finalAvatarUrl = publicUrlData.publicUrl;
        }
      }

      const { data: insertedInvite, error: insertErr } = await supabase
        .from('team_invites')
        .insert({
          org_id: targetOrgId,
          email: cleanEmail,
          role: role || 'agent',
          phone: phone,
          experience_years: experienceYears,
          avatar_url: finalAvatarUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (insertErr) {
        throw insertErr;
      }

      const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(cleanEmail)}`;
      setGeneratedLink(inviteUrl);

      const successMsg = `Invite created for ${cleanEmail}`;
      onNotify?.(successMsg);
      onInviteSent?.(cleanEmail);

      const initials = cleanEmail
        .split('@')[0]
        .slice(0, 2)
        .toUpperCase() || 'AG';

      const createdAgent: EmployeeSummaryItem = {
        id: insertedInvite?.id || `invite-${Date.now()}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: phone || '—',
        role: role === 'admin' ? 'Broker Admin' : 'Senior Broker Associate',
        avatarUrl: finalAvatarUrl || `https://placehold.co/120x120/005d42/ffffff?text=${initials}`,
        initials,
        totalLeads: 0,
        assigned: 0,
        won: 0,
        lost: 0,
        conversionPct: 0,
        avgResponseTime: '—',
        pipelineValue: 0,
        pipelineValueFormatted: '$0',
        dealsClosed: 0,
        monthlyTargetPct: 0,
        quotaTarget: 10_000_000,
      };

      onAgentInvited?.(createdAgent);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to send agent invitation.';
      setError(errMsg);
      onNotify?.(`Error sending invite: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#005d42]/10 text-[#005d42] flex items-center justify-center">
              {generatedLink ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30]">
                {generatedLink ? 'Invite Created' : 'Invite Agent to Team'}
              </h3>
              <p className="text-xs text-slate-500">
                {generatedLink ? 'Shareable signup link ready to send' : 'Add an agent to your existing brokerage workspace'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {generatedLink ? (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-4 shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>

            <h3 className="font-display font-bold text-xl text-[#0b1c30] mb-1">
              Invite created successfully!
            </h3>
            <p className="text-xs text-slate-500 mb-5 max-w-sm">
              Your agent can now join your brokerage workspace instantly using this unique invite link.
            </p>

            {/* Shareable Link Box */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-left">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Shareable Signup Link
              </label>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="w-full text-xs text-slate-700 bg-transparent border-none focus:outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 rounded-lg bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
                  title="Copy Link to Clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#97f5cc]" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* WhatsApp Note */}
            <div className="w-full bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 mb-6 text-left flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✓
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                Send this link to your agent via WhatsApp. They must sign up using this exact email (<span className="font-bold underline">{email}</span>) to join your workspace.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 w-full pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setGeneratedLink(null);
                  setEmail('');
                  setPhone('');
                  setExperienceYears('');
                  setAvatarFile(null);
                  setAvatarPreview(null);
                  setCopied(false);
                  setError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Invite Another Agent
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 rounded-xl bg-[#0b1c30] hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Agent's Work Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@yourbrokerage.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 focus:border-[#005d42] text-[#0b1c30]"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                When the agent signs up with this exact email, they will automatically join your organization.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Assigned Role
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 focus:border-[#005d42] text-[#0b1c30]"
                >
                  <option value="agent">Broker Associate (Agent)</option>
                  <option value="admin">Broker Admin (Manager)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Agent Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="Agent Phone (e.g. 923001234567)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 focus:border-[#005d42] text-[#0b1c30]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Experience
              </label>
              <div className="relative">
                <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Experience (e.g. 10+ Years)"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#005d42]/20 focus:border-[#005d42] text-[#0b1c30]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Agent Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAvatarFile(file);
                    setAvatarPreview(URL.createObjectURL(file));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#eff4ff] file:text-[#005d42] hover:file:bg-[#e2edff] cursor-pointer"
              />
              {avatarPreview && (
                <img src={avatarPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover mt-2 border border-slate-200" />
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating…</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Send Invite</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
