import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  ExternalLink,
  Loader2,
  Sparkles,
  HelpCircle,
  Building,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useSubscription } from '../../lib/hooks/useSubscription';

interface BillingPageProps {
  orgId: string | null;
  onBack?: () => void;
  onNotify?: (msg: string) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ orgId, onBack, onNotify }) => {
  const {
    tier,
    loading: subLoading,
    limits,
    stripeCustomerId,
    subscriptionStatus,
    startCheckout,
    openCustomerPortal,
    refetch,
  } = useSubscription(orgId);

  const [upgradingTier, setUpgradingTier] = useState<'pro' | 'enterprise' | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Detect query params from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('billing_status');

    if (status === 'success') {
      onNotify?.('Subscription updated successfully! Welcome to EstatePulse Pro.');
      refetch();
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'canceled') {
      onNotify?.('Checkout session was canceled. Your plan remains unchanged.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'portal_return') {
      onNotify?.('Returned from Stripe Customer Portal.');
      refetch();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onNotify, refetch]);

  const handleUpgrade = async (targetTier: 'pro' | 'enterprise') => {
    setUpgradingTier(targetTier);
    try {
      const res = await startCheckout(targetTier);
      if (res?.simulated) {
        onNotify?.(`Development Mode: upgraded organization to ${targetTier.toUpperCase()} tier.`);
      }
    } catch (err: any) {
      onNotify?.(`Checkout error: ${err.message}`);
    } finally {
      setUpgradingTier(null);
    }
  };

  const handleOpenPortal = async () => {
    setOpeningPortal(true);
    try {
      await openCustomerPortal();
    } catch (err: any) {
      onNotify?.(err.message || 'Unable to open Stripe Customer Portal.');
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Back navigation bar — only shown when rendered standalone outside AppLayout */}
      {onBack && (
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-[#005d42] hover:underline cursor-pointer"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-[13px] font-semibold text-[#0b1c30]">Billing & Plans</span>
        </header>
      )}
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <CreditCard className="w-3.5 h-3.5" />
            <span>COMMERCIAL LICENSING &amp; SUBSCRIPTION</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight mt-0.5">
            Brokerage Billing &amp; Plan Quotas
          </h1>
          <p className="text-[14px] text-[#3e4943] mt-1">
            Manage your corporate real estate SaaS tier, team advisor capacity, and Stripe billing invoices.
          </p>
        </div>

        {stripeCustomerId && (
          <button
            type="button"
            onClick={handleOpenPortal}
            disabled={openingPortal}
            className="px-4 py-2.5 rounded-lg bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-slate-200/80 text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs self-start sm:self-auto disabled:opacity-50"
          >
            {openingPortal ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#005d42]" />
            ) : (
              <ExternalLink className="w-4 h-4 text-[#005d42]" />
            )}
            <span>Manage Stripe Subscription</span>
          </button>
        )}
      </div>

      {/* Current Subscription Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#005d42] to-[#003928] text-[#97f5cc] flex items-center justify-center shrink-0 shadow-xs">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Current Active Plan
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                  tier === 'enterprise'
                    ? 'bg-purple-100 text-purple-800'
                    : tier === 'pro'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tier} Tier
              </span>
              <span className="text-[11px] text-[#005d42] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {subscriptionStatus === 'active' ? 'Active & In Good Standing' : subscriptionStatus}
              </span>
            </div>

            <h2 className="font-display font-bold text-2xl text-[#0b1c30] mt-1 capitalize">
              EstatePulse {tier} License
            </h2>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-[12px] text-slate-600">
              <span>Max Advisors: <b>{tier === 'enterprise' ? 'Unlimited' : limits.maxUsers}</b></span>
              <span>·</span>
              <span>Inbound Leads: <b>{tier === 'enterprise' ? 'Unlimited' : limits.maxLeads.toLocaleString()}</b></span>
              <span>·</span>
              <span>MLS Properties: <b>{tier === 'free' ? '10' : 'Unlimited'}</b></span>
              <span>·</span>
              <span>Gemini AI Insights: <b>{limits.hasAiInsights ? 'Enabled' : 'Locked'}</b></span>
            </div>
          </div>
        </div>

        {tier === 'free' ? (
          <button
            type="button"
            onClick={() => handleUpgrade('pro')}
            disabled={upgradingTier !== null}
            className="px-5 py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs self-start md:self-auto disabled:opacity-50"
          >
            {upgradingTier === 'pro' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Upgrade to Pro ($49/mo)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={openingPortal}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0b1c30] text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Customer Billing Portal →
            </button>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FREE PLAN */}
        <div
          className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
            tier === 'free'
              ? 'border-2 border-[#005d42] bg-white shadow-md'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-xl text-[#0b1c30]">Starter Free</h3>
              {tier === 'free' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#005d42] text-white">
                  Current
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 mt-1">
              For solo brokers exploring the platform.
            </p>

            <div className="my-4 flex items-baseline gap-1">
              <span className="font-display font-bold text-4xl text-[#0b1c30]">$0</span>
              <span className="text-slate-500 text-[13px]">/ month forever</span>
            </div>

            <ul className="space-y-3 text-[13px] text-slate-700">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span>1 Licensed Broker</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span>Up to 50 Inbound Leads</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span>10 MLS Properties</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400">
                <span className="w-4 text-center">✕</span>
                <span>Gemini AI Insights</span>
              </li>
              <li className="flex items-center gap-2.5 text-slate-400">
                <span className="w-4 text-center">✕</span>
                <span>Priority DRE Support</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <span className="block text-center text-[12px] font-medium text-slate-400">
              {tier === 'free' ? 'Currently Active' : 'Free Tier'}
            </span>
          </div>
        </div>

        {/* PRO PLAN */}
        <div
          className={`rounded-2xl border p-6 flex flex-col justify-between relative transition-all ${
            tier === 'pro'
              ? 'border-2 border-[#005d42] bg-white shadow-md'
              : 'border-2 border-[#005d42]/60 bg-gradient-to-b from-[#eff4ff]/60 to-white hover:border-[#005d42]'
          }`}
        >
          <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#005d42] text-[#97f5cc] tracking-wider uppercase shadow-xs">
            Dealership Choice
          </span>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#005d42]" />
                <h3 className="font-display font-bold text-xl text-[#0b1c30]">Brokerage Pro</h3>
              </div>
              {tier === 'pro' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#005d42] text-white">
                  Current
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 mt-1">
              For boutique firms accelerating portfolio velocity.
            </p>

            <div className="my-4 flex items-baseline gap-1">
              <span className="font-display font-bold text-4xl text-[#0b1c30]">$49</span>
              <span className="text-slate-500 text-[13px]">/ month billed monthly</span>
            </div>

            <ul className="space-y-3 text-[13px] text-slate-700">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span><b>5 Licensed Broker Seats</b></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span><b>1,000 Inbound Leads</b></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span><b>Unlimited</b> MLS Properties</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span><b>Gemini AI Insights Briefing</b></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                <span>Round-Robin Lead Allocator</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            {tier === 'pro' ? (
              <button
                type="button"
                onClick={handleOpenPortal}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Manage Subscription
              </button>
            ) : (
              <button
                type="button"
                disabled={upgradingTier !== null}
                onClick={() => handleUpgrade('pro')}
                className="w-full py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {upgradingTier === 'pro' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Upgrade to Pro ($49/mo)</span>
              </button>
            )}
          </div>
        </div>

        {/* ENTERPRISE PLAN */}
        <div
          className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
            tier === 'enterprise'
              ? 'border-2 border-purple-600 bg-white shadow-md'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-700" />
                <h3 className="font-display font-bold text-xl text-[#0b1c30]">Enterprise Flagship</h3>
              </div>
              {tier === 'enterprise' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-700 text-white">
                  Current
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 mt-1">
              For enterprise real estate brokerages with multi-city desks.
            </p>

            <div className="my-4 flex items-baseline gap-1">
              <span className="font-display font-bold text-4xl text-[#0b1c30]">$199</span>
              <span className="text-slate-500 text-[13px]">/ month billed monthly</span>
            </div>

            <ul className="space-y-3 text-[13px] text-slate-700">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span><b>Unlimited Broker Seats</b></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span><b>Unlimited Inbound Leads</b></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span><b>Unlimited MLS Properties</b></span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Custom Domain &amp; Luxury Branding</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Dedicated DRE Legal SLA Support</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100">
            {tier === 'enterprise' ? (
              <button
                type="button"
                onClick={handleOpenPortal}
                className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[13px] font-semibold transition-colors cursor-pointer"
              >
                Manage Subscription
              </button>
            ) : (
              <button
                type="button"
                disabled={upgradingTier !== null}
                onClick={() => handleUpgrade('enterprise')}
                className="w-full py-2.5 rounded-lg bg-[#0b1c30] hover:bg-[#1a2d42] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {upgradingTier === 'enterprise' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                <span>Upgrade to Enterprise ($199/mo)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <h3 className="font-display font-bold text-xl text-[#0b1c30] mb-2">
          Comprehensive Feature Matrix
        </h3>
        <p className="text-[13px] text-slate-500 mb-6">
          Compare quotas and capabilities across all commercial license tiers.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px] uppercase">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-center">Free ($0)</th>
                <th className="py-3 px-4 text-center text-[#005d42]">Pro ($49/mo)</th>
                <th className="py-3 px-4 text-center text-purple-700">Enterprise ($199/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900">Broker Seat Licenses</td>
                <td className="py-3.5 px-4 text-center font-mono">1</td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-[#005d42]">5</td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-700">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900">Monthly Lead Quota</td>
                <td className="py-3.5 px-4 text-center font-mono">50</td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-[#005d42]">1,000</td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-700">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900">MLS Inventory Properties</td>
                <td className="py-3.5 px-4 text-center font-mono">10</td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-[#005d42]">Unlimited</td>
                <td className="py-3.5 px-4 text-center font-mono font-bold text-purple-700">Unlimited</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900">Gemini AI Executive Insights</td>
                <td className="py-3.5 px-4 text-center text-slate-300">✕</td>
                <td className="py-3.5 px-4 text-center text-[#005d42] font-bold">✓ Included</td>
                <td className="py-3.5 px-4 text-center text-purple-700 font-bold">✓ Priority</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900">Telemetry &amp; CSV Data Exports</td>
                <td className="py-3.5 px-4 text-center text-slate-300">✕</td>
                <td className="py-3.5 px-4 text-center text-[#005d42] font-bold">✓ Full Suite</td>
                <td className="py-3.5 px-4 text-center text-purple-700 font-bold">✓ Automated</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium text-slate-900">Custom Branding &amp; White-label</td>
                <td className="py-3.5 px-4 text-center text-slate-300">✕</td>
                <td className="py-3.5 px-4 text-center text-slate-300">✕</td>
                <td className="py-3.5 px-4 text-center text-purple-700 font-bold">✓ Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);
};

