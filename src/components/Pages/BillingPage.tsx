import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  ExternalLink,
  Loader2,
  Sparkles,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
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
    effectiveTier,
    loading: subLoading,
    limits,
    lemonSqueezyCustomerId,
    subscriptionStatus,
    trialEndsAt,
    isTrialActive,
    isTrialExpired,
    trialDaysRemaining,
    isLocked,
    startCheckout,
    openCustomerPortal,
    refetch,
  } = useSubscription(orgId);

  const [upgradingTier, setUpgradingTier] = useState<'pro' | 'enterprise' | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Detect query params from Lemon Squeezy redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('billing_status');

    if (status === 'success') {
      onNotify?.('Subscription activated successfully! Welcome to EstatePulse Pro.');
      refetch();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'canceled') {
      onNotify?.('Checkout session was canceled. Your plan remains unchanged.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onNotify, refetch]);

  const handleUpgrade = async (targetTier: 'pro' | 'enterprise') => {
    setUpgradingTier(targetTier);
    try {
      const res = (await startCheckout(targetTier)) as { simulated?: boolean } | undefined;
      if (res?.simulated) {
        onNotify?.(`Development Mode: activated organization ${targetTier.toUpperCase()} license.`);
        refetch();
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
      onNotify?.(err.message || 'Unable to open Lemon Squeezy Customer Portal.');
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
              <span>LEMON SQUEEZY LICENSING &amp; SUBSCRIPTION</span>
            </div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight mt-0.5">
              Brokerage Billing &amp; Plan Quotas
            </h1>
            <p className="text-[14px] text-[#3e4943] mt-1">
              Manage your commercial real estate SaaS license, 14-day free trial, and Lemon Squeezy invoices.
            </p>
          </div>

          {lemonSqueezyCustomerId && (
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
              <span>Manage Lemon Squeezy Portal</span>
            </button>
          )}
        </div>

        {/* 14-Day Free Trial Notice Banner */}
        {isTrialActive && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#005d42] text-[#97f5cc] flex items-center justify-center font-bold text-sm shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#0b1c30]">
                  14-Day Pro Free Trial Active
                </p>
                <p className="text-xs text-slate-600">
                  You have <b>{trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'} remaining</b> with full access to Pro features (5 Advisors, 1,000 Leads, Gemini AI).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpgrade('pro')}
              className="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
            >
              Lock in Pro Plan ($49/mo)
            </button>
          </div>
        )}

        {isLocked && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <p className="font-display font-bold text-sm text-[#0b1c30]">
                  Your 14-Day Free Trial Has Concluded
                </p>
                <p className="text-xs text-slate-600">
                  Access to Leads, Properties, and Gemini Telemetry is locked. Activate your subscription to restore instant access.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUpgrade('pro')}
              className="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
            >
              Activate Pro ($49/mo)
            </button>
          </div>
        )}

        {/* Current Subscription Status Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#005d42] to-[#003928] text-[#97f5cc] flex items-center justify-center shrink-0 shadow-xs">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Current Status
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                    tier === 'enterprise'
                      ? 'bg-purple-100 text-purple-800'
                      : tier === 'pro'
                      ? 'bg-emerald-100 text-emerald-800'
                      : isTrialActive
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isTrialActive ? '14-Day Trial' : isLocked ? 'Trial Expired' : `${tier} Tier`}
                </span>
                <span className="text-[11px] text-[#005d42] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isTrialActive
                    ? `${trialDaysRemaining} Days Left in Trial`
                    : subscriptionStatus === 'active'
                    ? 'Active & In Good Standing'
                    : subscriptionStatus}
                </span>
              </div>

              <h2 className="font-display font-bold text-2xl text-[#0b1c30] mt-1 capitalize">
                EstatePulse {effectiveTier} License
              </h2>

              <div className="flex flex-wrap items-center gap-4 mt-2 text-[12px] text-slate-600">
                <span>Max Advisors: <b>{limits.maxUsers >= 999999 ? 'Unlimited' : limits.maxUsers}</b></span>
                <span>·</span>
                <span>Inbound Leads: <b>{limits.maxLeads >= 999999 ? 'Unlimited' : limits.maxLeads.toLocaleString()}</b></span>
                <span>·</span>
                <span>MLS Properties: <b>{limits.maxProperties >= 999999 ? 'Unlimited' : limits.maxProperties}</b></span>
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
              <span>{isTrialActive ? 'Start 14-Day Free Trial' : 'Activate Pro ($49/mo)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={openingPortal}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0b1c30] text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Customer Billing Portal →
            </button>
          )}
        </div>

        {/* Pricing Cards Grid (Free tier removed - 14-day trial on Pro) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* PRO PLAN WITH 14-DAY FREE TRIAL */}
          <div
            className={`rounded-2xl border p-7 flex flex-col justify-between relative transition-all shadow-sm ${
              effectiveTier === 'pro' && !isTrialExpired
                ? 'border-2 border-[#005d42] bg-white ring-4 ring-[#005d42]/10'
                : 'border-2 border-[#005d42]/60 bg-gradient-to-b from-[#eff4ff]/60 to-white hover:border-[#005d42]'
            }`}
          >
            <span className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-bold bg-[#005d42] text-[#97f5cc] tracking-wider uppercase shadow-xs">
              14-Day Free Trial Included
            </span>

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#005d42] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[#005d42]" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-[#0b1c30]">Brokerage Pro</h3>
                </div>
                {tier === 'pro' && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#005d42] text-white">
                    Active Plan
                  </span>
                )}
              </div>
              <p className="text-[13px] text-slate-500 mt-2">
                For growing brokerages accelerating acquisition velocity and sales closing.
              </p>

              <div className="my-5 flex items-baseline gap-1.5">
                <span className="font-display font-bold text-4xl text-[#0b1c30]">$49</span>
                <span className="text-slate-500 text-[13px]">/ month (after 14-day trial)</span>
              </div>

              <ul className="space-y-3.5 text-[13px] text-slate-700">
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
                  <span>Round-Robin Lead Dispatch</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span>Multi-Currency (PKR, USD, AED) &amp; Marla units</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              {tier === 'pro' ? (
                <button
                  type="button"
                  onClick={handleOpenPortal}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  Manage Lemon Squeezy Subscription
                </button>
              ) : (
                <button
                  type="button"
                  disabled={upgradingTier !== null}
                  onClick={() => handleUpgrade('pro')}
                  className="w-full py-3 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  {upgradingTier === 'pro' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isTrialActive ? 'Start 14-Day Free Trial' : 'Activate Pro ($49/mo)'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ENTERPRISE PLAN */}
          <div
            className={`rounded-2xl border p-7 flex flex-col justify-between transition-all shadow-sm ${
              tier === 'enterprise'
                ? 'border-2 border-purple-600 bg-white ring-4 ring-purple-600/10'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-700" />
                  </div>
                  <h3 className="font-display font-bold text-2xl text-[#0b1c30]">Enterprise Flagship</h3>
                </div>
                {tier === 'enterprise' && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-700 text-white">
                    Active Plan
                  </span>
                )}
              </div>
              <p className="text-[13px] text-slate-500 mt-2">
                For premier multi-branch brokerages and high-volume real estate developers.
              </p>

              <div className="my-5 flex items-baseline gap-1.5">
                <span className="font-display font-bold text-4xl text-[#0b1c30]">$199</span>
                <span className="text-slate-500 text-[13px]">/ month billed monthly</span>
              </div>

              <ul className="space-y-3.5 text-[13px] text-slate-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span><b>Unlimited Advisor Seats</b></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span><b>Unlimited Leads &amp; Deals</b></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span><b>Unlimited MLS Properties</b></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span><b>Priority Telemetry &amp; Gemini AI</b></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Custom Domain &amp; White-label Branding</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Dedicated DRE Compliance Manager</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100">
              {tier === 'enterprise' ? (
                <button
                  type="button"
                  onClick={handleOpenPortal}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  Manage Lemon Squeezy Subscription
                </button>
              ) : (
                <button
                  type="button"
                  disabled={upgradingTier !== null}
                  onClick={() => handleUpgrade('enterprise')}
                  className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  {upgradingTier === 'enterprise' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Upgrade to Enterprise ($199/mo)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
