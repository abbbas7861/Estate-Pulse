/**
 * SignupPage.tsx – EstatePulse new brokerage workspace registration & invited agent onboarding.
 * On signup: creates auth user → triggers DB function to link to invited org or create new org.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { REGION } from '../../config/regional';
import { Logo } from '../UI/Logo';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Mail } from 'lucide-react';

interface Props {
  onGoToLogin: () => void;
  invitedEmail?: string | null;
}

const PERKS = [
  'Full Kanban lead pipeline',
  'MLS property inventory',
  'Real-time deal activity feed',
  'Team & broker performance analytics',
];

export function SignupPage({ onGoToLogin, invitedEmail }: Props) {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState(invitedEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (invitedEmail) {
      setEmail(invitedEmail);
    }
  }, [invitedEmail]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }

    setLoading(true);

    // 1. Create the auth user. Pass org_name in metadata.
    // If user's email exists in team_invites, DB trigger handle_new_user() automatically
    // links them to the existing brokerage organization instead of creating a new one.
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { org_name: orgName.trim() || `${email.split('@')[0]}'s Brokerage` },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // 2. If email confirmation is disabled, user is returned immediately.
    if (data.user && !data.session) {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1c30] via-[#0d2a1e] to-[#0b1c30] flex items-center justify-center p-4">
        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#005d42]/20 border border-[#97f5cc]/20 rounded-2xl mb-5">
            <CheckCircle2 className="w-8 h-8 text-[#97f5cc]" />
          </div>
          <h2 className="font-display font-bold text-2xl text-white mb-2">Check your email</h2>
          <p className="text-slate-400 text-sm mb-6">
            We sent a confirmation link to <span className="text-[#97f5cc] font-medium">{email}</span>. Click it to activate your brokerage workspace account.
          </p>
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-sm text-[#97f5cc] font-semibold hover:text-white transition-colors cursor-pointer"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1c30] via-[#0d2a1e] to-[#0b1c30] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#005d42]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#006a63]/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size={64} className="rounded-2xl shadow-lg shadow-[#005d42]/40" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">EstatePulse</h1>
          <p className="text-[#97f5cc]/70 text-sm mt-1 font-medium">Brokerage Workspace &amp; Team Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-4">
            <h2 className="font-display font-bold text-xl text-white">
              {invitedEmail ? 'Join Brokerage Workspace' : 'Create an Account'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {invitedEmail
                ? 'You have been invited to join a brokerage workspace.'
                : 'Purchase your brokerage workspace.'}
            </p>
          </div>

          {/* Team Invite Notice Banner */}
          {invitedEmail ? (
            <div className="mb-5 bg-[#005d42]/30 border border-[#97f5cc]/40 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
              <Mail className="w-4 h-4 text-[#97f5cc] shrink-0 mt-0.5" />
              <p className="text-xs text-[#97f5cc] leading-relaxed">
                <strong className="font-semibold text-white">Invited Workspace Member:</strong> Your account will automatically link to your brokerage upon completing registration.
              </p>
            </div>
          ) : (
            <div className="mb-5 bg-[#005d42]/20 border border-[#97f5cc]/30 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
              <Mail className="w-4 h-4 text-[#97f5cc] shrink-0 mt-0.5" />
              <p className="text-xs text-[#97f5cc] leading-relaxed">
                <strong className="font-semibold text-white">Already invited by your brokerage?</strong> Make sure to use the exact email your Admin invited.
              </p>
            </div>
          )}

          {/* Feature perks */}
          <div className="mb-5 grid grid-cols-2 gap-1.5">
            {PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-1.5 text-xs text-slate-400">
                <CheckCircle2 className="w-3 h-3 text-[#97f5cc] shrink-0" />
                {perk}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {!invitedEmail && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Brokerage Name <span className="text-slate-500 font-normal lowercase">(optional if invited)</span>
                </label>
                <input
                  id="signup-org-name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={REGION.examples.brokerage}
                  className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#97f5cc]/30 focus:border-[#97f5cc]/30 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                readOnly={!!invitedEmail}
                disabled={!!invitedEmail}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbrokerage.com"
                className={`w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#97f5cc]/30 focus:border-[#97f5cc]/30 transition-all ${
                  invitedEmail ? 'opacity-70 cursor-not-allowed bg-white/[0.03] select-none' : ''
                }`}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {invitedEmail
                  ? 'This email is linked to your brokerage invitation and cannot be changed.'
                  : 'Already invited by your brokerage? Make sure to use the exact email your Admin invited.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 10 characters"
                  className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#97f5cc]/30 focus:border-[#97f5cc]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#005d42] to-[#047857] hover:from-[#004d37] hover:to-[#005d42] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#005d42]/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up account…
                </>
              ) : invitedEmail ? (
                'Join Brokerage Workspace →'
              ) : (
                'Create Account →'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-slate-400">Already have an account?</span>
            <button
              id="go-to-login"
              type="button"
              onClick={onGoToLogin}
              className="text-[#97f5cc] font-semibold hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
