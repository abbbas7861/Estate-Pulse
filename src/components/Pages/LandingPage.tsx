import React from 'react';
import {
  Building2,
  ArrowRight,
  Check,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
  Users,
  Compass,
  Layers,
  Award,
  ChevronRight,
  Smartphone,
  Star,
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToSignup: () => void;
  onGoToTerms: () => void;
  onGoToPrivacy: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToLogin,
  onGoToSignup,
  onGoToTerms,
  onGoToPrivacy,
}) => {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#97f5cc] selection:text-[#002115]">
      {/* ─── Navigation Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#f8f9ff]/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005d42] text-[#97f5cc] flex items-center justify-center font-display font-extrabold text-xl shadow-xs">
              EP
            </div>
            <div>
              <span className="font-display font-bold text-lg text-[#0b1c30] tracking-tight block">
                EstatePulse
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#005d42] uppercase font-semibold block">
                Brokerage Pro SaaS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-slate-600">
            <a href="#features" className="hover:text-[#005d42] transition-colors">
              Platform Features
            </a>
            <a href="#cockpit" className="hover:text-[#005d42] transition-colors">
              Executive Telemetry
            </a>
            <a href="#pricing" className="hover:text-[#005d42] transition-colors">
              Pricing Plans
            </a>
            <a href="#testimonials" className="hover:text-[#005d42] transition-colors">
              Dealership Reviews
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGoToLogin}
              className="px-4 py-2 text-[13px] font-semibold text-[#0b1c30] hover:text-[#005d42] transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGoToSignup}
              className="px-5 py-2.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-[#97f5cc]/20 via-[#eff4ff] to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-emerald-500/20 text-[#005d42] text-[12px] font-semibold mb-6 shadow-xs animate-in fade-in duration-500">
            <Sparkles className="w-3.5 h-3.5 text-[#005d42]" />
            <span>The Executive Cockpit Layer for Elite Real Estate Dealerships</span>
          </div>

          <h1 className="font-display font-extrabold text-4xl sm:text-6xl text-[#0b1c30] tracking-tight leading-[1.1] mb-6">
            The Property CRM SaaS Built for{' '}
            <span className="text-[#005d42] underline decoration-[#97f5cc] decoration-4 underline-offset-4">
              High-Velocity
            </span>{' '}
            Brokerages
          </h1>

          <p className="max-w-2xl mx-auto text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
            Manage your acquisition pipeline, synchronize luxury MLS inventory, and track team quota velocity in real time. Powered by Google Gemini intelligence and Stripe commercial licensing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onGoToSignup}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-[15px] font-bold shadow-lg shadow-emerald-900/10 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started in 60 Seconds</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onGoToLogin}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#0b1c30] border border-slate-200 text-[14px] font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Access Demo Workspace
            </button>
          </div>

          {/* Social Proof Strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-[12px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#005d42]" /> No credit card required for Free tier
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#005d42]" /> DRE Verified Compliance
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-[#005d42]" /> Offline-Ready PWA Mobile App
            </span>
          </div>

          {/* Product Cockpit Mockup Preview */}
          <div className="mt-12 relative rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-[#0b1c30] text-left p-6 sm:p-8 text-white max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">
                  estatepulse.io/cockpit · Live Brokerage Telemetry
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#005d42] text-[#97f5cc]">
                Live MLS Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block">Total Pipeline Value</span>
                <span className="font-mono font-bold text-2xl text-[#97f5cc] mt-1 block">
                  $34.8M
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 block">+18.4% MTD Velocity</span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block">Active Escrow Conversions</span>
                <span className="font-mono font-bold text-2xl text-white mt-1 block">
                  12 Deals
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Avg 14-day escrow</span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-[11px] text-slate-400 block">Median Advisor Response</span>
                <span className="font-mono font-bold text-2xl text-white mt-1 block">
                  6.4 mins
                </span>
                <span className="text-[10px] text-[#97f5cc] mt-1 block">SLA: 15 mins target</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-r from-[#005d42]/40 to-transparent border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#97f5cc] shrink-0" />
                <p className="text-[13px] text-slate-200">
                  <b>AI Intelligence Brief:</b> Portfolio velocity increased by 14% this quarter following luxury re-allocations in Beverly Hills Craftsman estates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Platform Features Grid ───────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-semibold text-[#005d42] uppercase tracking-wider block mb-2">
              Everything Your Brokerage Needs
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0b1c30]">
              Built for High-Stakes Luxury Real Estate
            </h2>
            <p className="text-slate-600 text-[14px] mt-2">
              Replace fragmented spreadsheets and disjointed tools with one synchronized brokerage platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200 hover:border-[#005d42]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Interactive Lead Kanban
              </h3>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                Seamless drag-and-drop pipeline tracking across 8 validated stages from initial inquiry to closing escrow.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200 hover:border-[#005d42]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                MLS Inventory Auto-Mapper
              </h3>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                Instant matchmaking between buyer budget requirements and luxury property listings with amenity tagging.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200 hover:border-[#005d42]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Executive Telemetry
              </h3>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                Deal size distribution, lead funnel velocity, and advisor quota attainment backed by PostgreSQL SQL views.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200 hover:border-[#005d42]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Gemini AI Intelligence Briefs
              </h3>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                Automated executive summaries and high-leverage recommendations synthesized from live pipeline statistics.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200 hover:border-[#005d42]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                PWA Mobile Offline Cockpit
              </h3>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                Add to your mobile home screen. Cache listings and review client dossiers on showings without cell coverage.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200 hover:border-[#005d42]/30 transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#005d42] flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Round-Robin Advisory Allocations
              </h3>
              <p className="text-slate-600 text-[13px] leading-relaxed">
                Automated lead routing ensures equal workload distribution and enforces sub-15-minute response benchmarks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-[#f8f9ff]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-[11px] font-semibold text-[#005d42] uppercase tracking-wider block mb-2">
              Transparent SaaS Licensing
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0b1c30]">
              Simple, Predictable Brokerage Pricing
            </h2>
            <p className="text-slate-600 text-[14px] mt-2">
              Upgrade, downgrade, or cancel anytime. Powered by Stripe billing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col justify-between shadow-xs">
              <div>
                <h3 className="font-display font-bold text-xl text-[#0b1c30]">Solo Free</h3>
                <p className="text-slate-500 text-xs mt-1">For independent solo brokers.</p>
                <div className="my-6">
                  <span className="font-display font-bold text-4xl text-[#0b1c30]">$0</span>
                  <span className="text-slate-400 text-xs ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-[13px] text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> 1 Licensed Broker</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> 50 Inbound Leads</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> 10 MLS Properties</li>
                  <li className="flex items-center gap-2 text-slate-400"><span className="w-4 text-center">✕</span> Gemini AI Insights</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onGoToSignup}
                className="mt-8 w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0b1c30] font-semibold text-sm transition-colors cursor-pointer"
              >
                Start Free
              </button>
            </div>

            {/* Pro */}
            <div className="rounded-2xl bg-white border-2 border-[#005d42] p-8 flex flex-col justify-between shadow-lg relative">
              <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[10px] font-bold bg-[#005d42] text-[#97f5cc] uppercase tracking-wider">
                Dealership Favorite
              </span>
              <div>
                <h3 className="font-display font-bold text-xl text-[#0b1c30]">Brokerage Pro</h3>
                <p className="text-slate-500 text-xs mt-1">For growing boutique teams.</p>
                <div className="my-6">
                  <span className="font-display font-bold text-4xl text-[#0b1c30]">$49</span>
                  <span className="text-slate-400 text-xs ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-[13px] text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> <b>5 Licensed Broker Seats</b></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> <b>1,000 Inbound Leads</b></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> <b>Unlimited</b> MLS Properties</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> Gemini AI Executive Insights</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#005d42]" /> Full CSV Data Telemetry</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onGoToSignup}
                className="mt-8 w-full py-3 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Choose Pro Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col justify-between shadow-xs">
              <div>
                <h3 className="font-display font-bold text-xl text-[#0b1c30]">Enterprise Flagship</h3>
                <p className="text-slate-500 text-xs mt-1">For multi-office luxury firms.</p>
                <div className="my-6">
                  <span className="font-display font-bold text-4xl text-[#0b1c30]">$199</span>
                  <span className="text-slate-400 text-xs ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-[13px] text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-700" /> <b>Unlimited Broker Seats</b></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-700" /> <b>Unlimited Inbound Leads</b></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-700" /> <b>Unlimited MLS Inventory</b></li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-700" /> Dedicated DRE Legal SLA</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-700" /> Custom Luxury Branding</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onGoToSignup}
                className="mt-8 w-full py-3 rounded-xl bg-[#0b1c30] hover:bg-[#1a2d42] text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Deploy Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials Section ─────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-[11px] font-semibold text-[#005d42] uppercase tracking-wider block mb-2">
              Trusted by Top Producers
            </span>
            <h2 className="font-display font-bold text-3xl text-[#0b1c30]">
              Endorsed by Premier Managing Partners
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200">
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-[13px] text-slate-700 leading-relaxed mb-4">
                &ldquo;EstatePulse transformed our luxury acquisition desk. Moving from manual spreadsheets to the auto-mapper and round-robin dispatch doubled our closed escrow velocity.&rdquo;
              </p>
              <div>
                <p className="font-display font-bold text-sm text-[#0b1c30]">Tariq Mahmood</p>
                <p className="text-[11px] text-slate-500">Managing Luxury Partner, Premier Realty</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200">
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-[13px] text-slate-700 leading-relaxed mb-4">
                &ldquo;The AI insights report is something our leadership partners review every Monday morning. It flags pipeline drop-offs before we lose high-net-worth buyers.&rdquo;
              </p>
              <div>
                <p className="font-display font-bold text-sm text-[#0b1c30]">Ayesha Khan</p>
                <p className="text-[11px] text-slate-500">Principal Broker, Apex Property Group</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#f8f9ff] border border-slate-200">
              <div className="flex items-center gap-1 text-amber-400 mb-3">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-amber-400" />)}
              </div>
              <p className="text-[13px] text-slate-700 leading-relaxed mb-4">
                &ldquo;The PWA offline capability is exceptional. In remote construction sites with zero cell service, our associates can pull up full property specs and client notes instantly.&rdquo;
              </p>
              <div>
                <p className="font-display font-bold text-sm text-[#0b1c30]">Bilal Siddiqui</p>
                <p className="text-[11px] text-slate-500">Director of Commercial Estates</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-[#0b1c30] text-white py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#005d42] text-[#97f5cc] flex items-center justify-center font-display font-bold text-sm">
              EP
            </div>
            <span className="font-display font-bold text-base text-white">
              EstatePulse Brokerage Pro
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[13px] text-slate-400">
            <button
              type="button"
              onClick={onGoToTerms}
              className="hover:text-[#97f5cc] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={onGoToPrivacy}
              className="hover:text-[#97f5cc] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <a
              href="mailto:support@estatepulse.io"
              className="hover:text-[#97f5cc] transition-colors"
            >
              Support &amp; DRE Inquiries
            </a>
          </div>

          <p className="text-[12px] text-slate-400">
            &copy; {new Date().getFullYear()} EstatePulse Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};
