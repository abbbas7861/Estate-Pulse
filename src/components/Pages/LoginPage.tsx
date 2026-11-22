/**
 * Login.tsx – EstatePulse professional login page.
 * Matches the green/slate brand theme.
 */
import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Logo } from '../UI/Logo';
import { Eye, EyeOff, Loader2, AlertCircle, TrendingUp } from 'lucide-react';

interface Props {
  onGoToSignup: () => void;
}

export function LoginPage({ onGoToSignup }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
    }
    // On success, onAuthStateChange in App.tsx handles the redirect
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1c30] via-[#0d2a1e] to-[#0b1c30] flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#005d42]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#006a63]/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#047857]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size={64} className="rounded-2xl shadow-lg shadow-[#005d42]/40" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">EstatePulse</h1>
          <p className="text-[#97f5cc]/70 text-sm mt-1 font-medium">Brokerage Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="font-display font-bold text-xl text-white">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in to your brokerage workspace</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="broker@estatepulse.io"
                className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#97f5cc]/30 focus:border-[#97f5cc]/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#005d42] to-[#047857] hover:from-[#004d37] hover:to-[#005d42] text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#005d42]/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-sm">
            <span className="text-slate-400">New brokerage?</span>
            <button
              id="go-to-signup"
              type="button"
              onClick={onGoToSignup}
              className="text-[#97f5cc] font-semibold hover:text-white transition-colors"
            >
              Create workspace →
            </button>
          </div>
        </div>

        {/* Footer stat */}
        <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <TrendingUp className="w-3.5 h-3.5 text-[#97f5cc]/50" />
          <span>Trusted by 1,200+ real estate professionals</span>
        </div>
      </div>
    </div>
  );
}
