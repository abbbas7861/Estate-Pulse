'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  X,
  Calendar,
  MessageCircle,
  Mail,
  Phone,
  Coins,
  Maximize2,
  GitBranch,
  Bot,
  CreditCard,
  Building,
  CheckCircle2,
  ExternalLink,
  Clock,
  Globe2,
} from 'lucide-react';
import { PaymentModal } from '../components/PaymentModal';

// ─── Inline Brand Logo Component ──────────────────────────────────────────────
function Logo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EstatePulse logo"
      role="img"
      className={className}
    >
      <rect width="48" height="48" rx="11" fill="#005d42" />
      <path
        d="M 7 30 L 24 12 L 41 30 L 36 30 L 32 37 L 28 22 L 25 33 L 12 33"
        stroke="#97f5cc"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="24" cy="12" r="2" fill="#97f5cc" />
    </svg>
  );
}

// ─── Demo Contact Links ──────────────────────────────────────────────────────
const CALENDLY_LINK = 'https://calendly.com/muhammadhammadarshad2/30min';
const WHATSAPP_LINK = 'https://wa.me/+923164063124';
const SALES_EMAIL = 'estatepulsesupport@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [, setSelectedPlanTier] = useState<'pro' | 'enterprise'>('pro');

  const handleOpenBuyNow = (tier: 'pro' | 'enterprise') => {
    setSelectedPlanTier(tier);
    setPaymentModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#97f5cc] selection:text-[#002115]">
      {/* ─── Navigation Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={40} className="rounded-xl shadow-xs shrink-0" />
            <div>
              <span className="font-display font-bold text-lg text-[#0b1c30] tracking-tight block leading-tight">
                EstatePulse
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#005d42] uppercase font-bold block">
                Brokerage Pro SaaS
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-slate-600">
            <a href="#features" className="hover:text-[#005d42] transition-colors">
              Core Capabilities
            </a>
            <a href="#cockpit" className="hover:text-[#005d42] transition-colors">
              AI Telemetry &amp; Regional
            </a>
            <a href="#pricing" className="hover:text-[#005d42] transition-colors">
              Commercial Plans
            </a>
            <a href="#testimonials" className="hover:text-[#005d42] transition-colors">
              Brokerage Endorsements
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`${APP_URL}/?view=login`}
              className="px-3 sm:px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#0b1c30] hover:text-[#005d42] hover:bg-[#eff4ff] rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center"
            >
              Sign In
            </a>
            <a
              href={`${APP_URL}/?view=signup`}
              className="px-3.5 sm:px-5 py-2.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-xs sm:text-[13px] font-semibold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <span>Request Demo</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </a>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[450px] bg-gradient-to-tr from-[#97f5cc]/25 via-[#eff4ff]/60 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-12 left-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#005d42]/20 text-[#005d42] text-xs font-bold mb-6 shadow-xs animate-in fade-in duration-500">
            <Sparkles className="w-3.5 h-3.5 text-[#005d42]" />
            <span>PAKISTAN &amp; GCC BROKERAGE OPERATING SYSTEM</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-[#0b1c30] tracking-tight leading-[1.12] mb-6">
            The Property CRM SaaS Built for{' '}
            <span className="text-[#005d42] underline decoration-[#97f5cc] decoration-4 underline-offset-4">
              High-Velocity
            </span>{' '}
            Brokerages
          </h1>

          <p className="max-w-2xl mx-auto text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed mb-8">
            Empower your real estate firm with native <strong>Multi-Currency (PKR/USD/AED)</strong>, 
            <strong> Marla &amp; Kanal property sizing</strong>, <strong>automated round-robin lead routing</strong>, and 
            <strong> Gemini AI executive briefings</strong> for elite pipeline control.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto sm:max-w-none">
            <button
              type="button"
              onClick={() => setDemoModalOpen(true)}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-sm sm:text-[15px] font-bold shadow-lg shadow-emerald-900/10 hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Request Private Demo</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenBuyNow('pro')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#0b1c30] border border-slate-300 text-sm sm:text-[14px] font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Explore Commercial Plans</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#005d42]" />
            </button>
          </div>

          {/* Value Prop Highlight Pills */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-left max-w-4xl mx-auto">
            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-[#005d42] font-bold text-xs mb-1">
                <Coins className="w-4 h-4 shrink-0" />
                <span>Multi-Currency</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Native PKR (Lacs / Crores), USD ($) &amp; AED exchange sync.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-[#005d42] font-bold text-xs mb-1">
                <Maximize2 className="w-4 h-4 shrink-0" />
                <span>Marla &amp; Kanal Engine</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Automatic land conversions for residential plots &amp; luxury estates.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-[#005d42] font-bold text-xs mb-1">
                <GitBranch className="w-4 h-4 shrink-0" />
                <span>Round-Robin Routing</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Fair, automated lead dispatch across associates with zero latency.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-[#005d42] font-bold text-xs mb-1">
                <Bot className="w-4 h-4 shrink-0" />
                <span>AI Executive Briefings</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Gemini intelligence digests weekly velocity &amp; escrow risks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Executive Telemetry & Cockpit Showcase Section ─────────────────── */}
      <section id="cockpit" className="py-16 sm:py-24 bg-[#0b1c30] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#005d42]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-mono tracking-widest text-[#97f5cc] uppercase font-bold block mb-2">
              EXECUTIVE TELEMETRY LAYER
            </span>
            <h2 className="font-display font-bold text-2xl sm:text-4xl text-white">
              Grounded in Real Estate Commercial Reality
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
              Designed specifically for regional managing partners who require instant currency switching, 
              local sizing metrics, and automated lead governance.
            </p>
          </div>

          {/* Interactive Mockup Visual Preview */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl overflow-hidden backdrop-blur-md">
            {/* Top Bar Window Chrome */}
            <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">
                  EstatePulse Telemetry Cockpit · Active Brokerage Workspace
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#005d42]/60 border border-[#97f5cc]/30 text-[#97f5cc] text-[11px] font-mono font-bold">
                  CURRENCY: PKR / USD
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-700/80 text-slate-300 text-[11px] font-mono">
                  SIZING: MARLA / KANAL
                </span>
              </div>
            </div>

            {/* Mockup Body Content */}
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left Column: AI Executive Briefing Snippet */}
              <div className="lg:col-span-2 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="flex items-center gap-2 mb-2 text-[#97f5cc]">
                    <Sparkles className="w-4 h-4 text-[#97f5cc]" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Google Gemini AI Weekly Executive Digest
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed font-sans">
                    &ldquo;Brokerage escrow velocity accelerated <strong>+22% week-over-week</strong>. 
                    Automated round-robin allocated <strong>46 new buyer leads</strong> with an average 
                    first-contact response time of <strong>3.4 minutes</strong>. High priority deal flagged: 
                    <strong> 1 Kanal Designer Villa, DHA Phase 6 (PKR 115,000,000 / $410,000 USD)</strong> has entered final negotiation stage.&rdquo;
                  </p>
                </div>

                {/* Telemetry Numbers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">In Flight Volume</span>
                    <span className="text-base sm:text-lg font-bold text-white block mt-0.5">PKR 3.45B</span>
                    <span className="text-[10px] text-emerald-400 font-medium">▲ +14% vs last mo</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">USD Parity</span>
                    <span className="text-base sm:text-lg font-bold text-white block mt-0.5">$12.4M</span>
                    <span className="text-[10px] text-slate-400">Live rate sync</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Round-Robin SLA</span>
                    <span className="text-base sm:text-lg font-bold text-[#97f5cc] block mt-0.5">99.4%</span>
                    <span className="text-[10px] text-slate-400">Zero lead leaks</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Prime Sizing</span>
                    <span className="text-base sm:text-lg font-bold text-white block mt-0.5">10M &amp; 1K</span>
                    <span className="text-[10px] text-slate-400">Marla / Kanal</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Pipeline Mini Visual */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block mb-3">
                    Automated Lead Dispatch Queue
                  </span>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-200">Muhammad Hamza</p>
                        <p className="text-[10px] text-slate-400">2 Kanal Luxury · Gulberg III</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        Assigned (Agent 1)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-200">Dr. Sarah Naveed</p>
                        <p className="text-[10px] text-slate-400">10 Marla · E-11 Islamabad</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                        Assigned (Agent 2)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-200">Farooq Enterprise</p>
                        <p className="text-[10px] text-slate-400">Commercial Plaza · DHA</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
                        Assigned (Agent 3)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700 text-center">
                  <span className="text-[11px] text-slate-400">
                    Round-robin rotation balances quotas dynamically.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Platform Features Grid ───────────────────────────────────────── */}
      <section id="features" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold text-[#005d42] uppercase tracking-wider block mb-2">
              Enterprise Feature Matrix
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0b1c30]">
              Engineered for High-Ticket Real Estate Operations
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              Everything your dealership requires to replace disconnected spreadsheets with an automated operating system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* 1. Multi-Currency */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200/80 hover:border-[#005d42]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center mb-5 border border-emerald-100">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Multi-Currency (PKR, USD, AED)
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Native formatting in Pakistani Rupees (Lacs &amp; Crores) alongside US Dollars and UAE Dirhams. Quote international diaspora buyers without mental arithmetic.
              </p>
            </div>

            {/* 2. Marla / Kanal */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200/80 hover:border-[#005d42]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center mb-5 border border-emerald-100">
                <Maximize2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Marla &amp; Kanal Property Sizing
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Built specifically for regional land measurements. Automatically calculates price-per-marla, kanal equivalents, square yards, and square feet on every listing.
              </p>
            </div>

            {/* 3. Round-Robin Lead Routing */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200/80 hover:border-[#005d42]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center mb-5 border border-emerald-100">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Automated Round-Robin Routing
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Inbound leads from online campaigns and listing portals are automatically cycled through active agents. Eliminates disputes, lead hoarding, and sluggish response times.
              </p>
            </div>

            {/* 4. AI Telemetry */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200/80 hover:border-[#005d42]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center mb-5 border border-emerald-100">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Gemini AI Executive Briefings
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Receive weekly synthesized leadership summaries on deal health, quota attainment, overdue touchpoints, and forecast escrow conversions without digging through logs.
              </p>
            </div>

            {/* 5. 5-Stage Acquisition Kanban */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200/80 hover:border-[#005d42]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center mb-5 border border-emerald-100">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                5-Stage Acquisition Kanban
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Smooth drag-and-drop deal pipeline with duplicate lead protection, activity logging, and stage SLA indicators to keep every team member focused on closing.
              </p>
            </div>

            {/* 6. Offline PWA Architecture */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200/80 hover:border-[#005d42]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center mb-5 border border-emerald-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Offline PWA Mobile Architecture
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Install directly onto iOS and Android devices without App Store gatekeepers. Cached local storage enables browsing property collateral and plot maps at remote job sites.
              </p>
            </div>

            {/* 7. Public Branded Website */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200/80 hover:border-[#005d42]/40 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center mb-5 border border-emerald-100">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
                Public Branded Property Website
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                Turn your active listings into a live public-facing portal at <code className="text-emerald-700 font-mono text-xs">/site/:slug</code> with 1 click. Buyers browse verified specs and contact brokers directly via WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing Section (Sales-Led 2 Paid Tiers) ───────────────────────── */}
      <section id="pricing" className="py-20 bg-[#f8f9ff]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-[#005d42] uppercase tracking-wider block mb-2">
              Commercial Plans
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0b1c30]">
              Transparent Brokerage Licensing
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Scale your firm with predictable monthly subscriptions or schedule a tailored concierge onboarding.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Plan 1: Brokerage Pro ($49/mo) */}
            <div className="rounded-3xl bg-white border-2 border-[#005d42] p-8 flex flex-col justify-between shadow-xl relative ring-4 ring-[#005d42]/5">
              <span className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-bold bg-[#005d42] text-[#97f5cc] uppercase tracking-wider shadow-xs">
                Dealership Favorite
              </span>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display font-bold text-2xl text-[#0b1c30]">Brokerage Pro</h3>
                </div>
                <p className="text-slate-500 text-xs">For growing independent agencies and specialized real estate sales desks.</p>

                <div className="my-6 py-4 border-y border-slate-100 flex items-baseline gap-2">
                  <span className="font-display font-black text-4xl sm:text-5xl text-[#0b1c30]">$49</span>
                  <span className="text-slate-500 text-xs font-medium">/ month billed monthly</span>
                </div>

                <ul className="space-y-3.5 text-[13px] text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span><b>5 Licensed Broker Seats</b> included</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span><b>1,000 Active Inbound Leads</b></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span><b>Unlimited MLS Inventory</b> &amp; Plot Listings</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span><b>Multi-Currency</b> (PKR Lacs/Crores &amp; USD)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span><b>Marla &amp; Kanal</b> Land Calculation Engine</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span><b>Automated Round-Robin</b> Lead Routing</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span>Gemini AI Weekly Executive Briefings</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#005d42] shrink-0" />
                    <span>Offline PWA Mobile App Support</span>
                  </li>
                </ul>

                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Optional Add-on</span>
                    <span className="text-[13px] font-semibold text-[#0b1c30]">Public Website Portal</span>
                  </div>
                  <span className="text-[13px] font-bold text-[#005d42]">+$30/mo</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenBuyNow('pro')}
                  className="w-full py-3.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Buy Now — $49/mo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDemoModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Request Concierge Demo First
                </button>
              </div>
            </div>

            {/* Plan 2: Enterprise Flagship ($199/mo) — Distinct VIP Luxury Styling */}
            <div className="rounded-3xl bg-[#0b1c30] text-white border-2 border-slate-700 p-8 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl" />
              </div>

              <span className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 uppercase tracking-wider shadow-xs z-10">
                VIP Flagship · Unlimited Scale
              </span>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-display font-bold text-2xl text-white">Enterprise Flagship</h3>
                </div>
                <p className="text-slate-400 text-xs">For multi-office regional developers, luxury desks, and enterprise brokerages.</p>

                <div className="my-6 py-4 border-y border-slate-800 flex items-baseline gap-2">
                  <span className="font-display font-black text-4xl sm:text-5xl text-white">$199</span>
                  <span className="text-slate-400 text-xs font-medium">/ month billed monthly</span>
                </div>

                <ul className="space-y-3.5 text-[13px] text-slate-200">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
                    <span><b>Unlimited Licensed Broker Seats</b></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
                    <span><b>Unlimited Inbound Leads &amp; Telemetry</b></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
                    <span><b>Unlimited MLS Inventory</b> &amp; Custom Taxonomy</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
                    <span>Multi-Branch &amp; Multi-Team Round-Robin Logic</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
                    <span>Dedicated Gemini AI Fine-Tuned Briefings</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
                    <span>24/7 Concierge Hotline &amp; Account Director</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#97f5cc] shrink-0" />
                    <span>Assisted Data Migration from Spreadsheets</span>
                  </li>
                </ul>

                <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Optional Add-on</span>
                    <span className="text-[13px] font-semibold text-white">Public Website Portal</span>
                  </div>
                  <span className="text-[13px] font-bold text-[#97f5cc]">+$80/mo</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2.5 relative z-10">
                <button
                  type="button"
                  onClick={() => handleOpenBuyNow('enterprise')}
                  className="w-full py-3.5 rounded-xl bg-[#97f5cc] hover:bg-[#6ee7b7] text-[#002115] font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Buy Now — $199/mo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDemoModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Request Executive VIP Demo
                </button>
              </div>
            </div>
          </div>

          {/* International & Crypto Payment Note */}
          <div className="mt-10 max-w-2xl mx-auto p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[#0b1c30]">
                International &amp; Crypto payments accepted (USDT, BTC, ETH).
              </p>
              <p className="text-[11px] text-slate-500">
                Direct wallet transfers supported. Contact sales concierge for payment gateway details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials Section ─────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-[11px] font-bold text-[#005d42] uppercase tracking-wider block mb-2">
              Trusted by Premier Brokerages
            </span>
            <h2 className="font-display font-bold text-3xl text-[#0b1c30]">
              Endorsed by Top Industry Producers
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              See how market leaders use EstatePulse to scale volume and close high-value deals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* 1. Tariq Mahmood */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed mb-6">
                  &ldquo;EstatePulse transformed our luxury acquisition desk. The native <strong>Marla and Kanal land conversions</strong> combined with 
                  <strong> automated round-robin lead routing</strong> doubled our escrow closing velocity. Our 14 agents never miss a buyer inquiry.&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/80">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#005d42] to-[#047857] text-white font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-emerald-200 shadow-xs">
                  TM
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-[#0b1c30]">Tariq Mahmood</p>
                  <p className="text-[11px] text-slate-500 font-medium">Managing Partner, Premier Realty (Lahore)</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    Closed PKR 1.8B+ Volume
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Ayesha Khan */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed mb-6">
                  &ldquo;Handling overseas buyers used to require manual spreadsheets. EstatePulse&apos;s instant <strong>PKR / USD / AED currency toggle</strong> and 
                  <strong> Gemini AI executive briefings</strong> give our leadership team total clarity on deal risks every Monday morning.&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/80">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-purple-200 shadow-xs">
                  AK
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-[#0b1c30]">Ayesha Khan</p>
                  <p className="text-[11px] text-slate-500 font-medium">Principal Broker, Apex Property Group (Karachi &amp; Dubai)</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                    35+ Overseas Deals Closed
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Bilal Siddiqui */}
            <div className="p-7 rounded-2xl bg-[#f8f9ff] border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[13px] text-slate-700 leading-relaxed mb-6">
                  &ldquo;The <strong>offline PWA capability</strong> is exceptional. While walking raw commercial development sites with zero cell reception, our associates pull up full plot specs, zoning bylaws, and client notes without hesitation.&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200/80">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-600 text-white font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-blue-200 shadow-xs">
                  BS
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-[#0b1c30]">Bilal Siddiqui</p>
                  <p className="text-[11px] text-slate-500 font-medium">Director of Commercial Estates, Capital Horizon (Islamabad)</p>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                    42 Active Commercial Listings
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mt-auto bg-[#0b1c30] text-white py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <Logo size={32} className="rounded-lg shrink-0" />
            <div className="text-left">
              <span className="font-display font-bold text-base text-white block">
                EstatePulse Brokerage Pro
              </span>
              <span className="text-[11px] text-slate-400">
                The Real Estate Operating System
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[13px] text-slate-400">
            <Link
              href="/terms"
              className="hover:text-[#97f5cc] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[#97f5cc] transition-colors"
            >
              Privacy Policy
            </Link>
            <a
              href={`mailto:${SALES_EMAIL}`}
              className="hover:text-[#97f5cc] transition-colors"
            >
              Support &amp; Inquiries
            </a>
          </div>

          <p className="text-[12px] text-slate-400">
            &copy; {new Date().getFullYear()} EstatePulse Inc. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ─── Request Private Demo Modal ────────────────────────────────────── */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#005d42] to-[#047857] p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
                  <Calendar className="w-5 h-5 text-[#97f5cc]" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg sm:text-xl leading-tight">
                    Request a Private Demo
                  </h3>
                  <p className="text-xs text-[#97f5cc] mt-0.5">
                    Connect with our solution architects across your preferred channel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                aria-label="Close demo modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#005d42]/15 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-[#005d42]">Concierge Demo Service: </span>
                We will walk your leadership team through multi-currency setup, round-robin lead allocation, and team quotas.
              </div>

              {/* 1. Calendly Live Demo */}
              <a
                href={CALENDLY_LINK}
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all flex items-center gap-4 group cursor-pointer shadow-2xs"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-sm text-[#0b1c30] group-hover:text-blue-700">
                      Schedule 15-Minute Live Demo
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      Calendly
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pick a direct calendar slot with our solutions director.
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </a>

              {/* 2. WhatsApp Direct Concierge */}
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all flex items-center gap-4 group cursor-pointer shadow-2xs"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-sm text-[#0b1c30] group-hover:text-emerald-700">
                      Chat on WhatsApp Concierge
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Fastest Response (&lt; 5m)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    +92 316 4063124 · Direct chat with our executive desk.
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
              </a>

              {/* 3. Direct Sales Email */}
              <a
                href={`mailto:${SALES_EMAIL}?subject=EstatePulse%20Private%20Demo%20Request`}
                className="p-4 rounded-2xl border border-slate-200 hover:border-[#005d42] hover:bg-[#eff4ff] transition-all flex items-center gap-4 group cursor-pointer shadow-2xs"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#005d42] flex items-center justify-center shrink-0 border border-slate-200">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-sm text-[#0b1c30] group-hover:text-[#005d42]">
                      Email Sales Concierge
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      Official Deck &amp; Invoices
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {SALES_EMAIL} · Formal corporate procurement.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#005d42] shrink-0" />
              </a>

              {/* Instant purchase footer option */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Ready to activate immediately?</span>
                <a
                  href="http://localhost:3000/?view=signup"
                  className="text-xs font-bold text-[#005d42] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Sign Up Directly</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Payment Modal ──────────────────────────────────────────────────── */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      />
    </div>
  );
}
