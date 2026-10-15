/**
 * SignupPage.tsx – EstatePulse new brokerage workspace registration.
 * On signup: creates auth user → triggers DB function to create org + user row.
 */
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Building2, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

interface Props {
  onGoToLogin: () => void;
}

const PERKS = [
  'Full Kanban lead pipeline',
  'MLS property inventory',
  'Real-time deal activity feed',
  'Team & broker performance analytics',
];

export function SignupPage({ onGoToLogin }: Props) {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    // 1. Create the auth user. Pass org_name in metadata so the DB trigger can use it.
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
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

    // 2. If email confirmation is disabled the user is returned immediately.
    //    The DB trigger handle_new_user() will create the org + user rows.
    if (data.user && !data.session) {
      // Confirmation email was sent
      setSuccess(true);
    }
    // If data.session exists, onAuthStateChange in App.tsx will handle navigation.

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
            We sent a confirmation link to <span className="text-[#97f5cc] font-medium">{email}</span>. Click it to activate your brokerage workspace.
          </p>
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-sm text-[#97f5cc] font-semibold hover:text-white transition-colors"
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#005d42] to-[#047857] rounded-2xl shadow-lg shadow-[#005d42]/40 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">EstatePulse</h1>
          <p className="text-[#97f5cc]/70 text-sm mt-1 font-medium">Create your brokerage workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-5">
            <h2 className="font-display font-bold text-xl text-white">Get started free</h2>
            <p className="text-slate-400 text-sm mt-1">Launch your CRM in under 60 seconds</p>
          </div>

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
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Brokerage Name
              </label>
              <input
                id="signup-org-name"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Beverly Hills Realty Group"
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#97f5cc]/30 focus:border-[#97f5cc]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbrokerage.com"
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#97f5cc]/30 focus:border-[#97f5cc]/30 transition-all"
              />
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
                  placeholder="Min. 8 characters"
                  className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#97f5cc]/30 focus:border-[#97f5cc]/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#005d42] to-[#047857] hover:from-[#004d37] hover:to-[#005d42] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#005d42]/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating workspace…
                </>
              ) : (
                'Launch My Workspace →'
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-slate-400">Already have an account?</span>
            <button
              id="go-to-login"
              type="button"
              onClick={onGoToLogin}
              className="text-[#97f5cc] font-semibold hover:text-white transition-colors flex items-center gap-1"
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
