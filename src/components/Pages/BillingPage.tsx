import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Shield,
  Building,
  CheckCircle2,
  Lock,
  Mail,
} from 'lucide-react';
import { useSubscription } from '../../lib/hooks/useSubscription';
import { PaymentModal } from '../Modals/PaymentModal';

interface BillingPageProps {
  orgId: string | null;
  onBack?: () => void;
  onNotify?: (msg: string) => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ orgId, onBack, onNotify }) => {
  const {
    tier,
    effectiveTier,
    limits,
    isLocked,
  } = useSubscription(orgId);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleContactSales = () => {
    setPaymentModalOpen(true);
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
          <span className="text-[13px] font-semibold text-[#0b1c30]">Billing &amp; Plans</span>
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
              Select a commercial plan or contact sales to activate your organization workspace.
            </p>
          </div>
        </div>

        {/* Locked Workspace Alert Banner */}
        {isLocked && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#0b1c30]">
                  Commercial Workspace License Required
                </p>
                <p className="text-xs text-slate-600">
                  Access to Deals Pipeline, Properties, and Gemini AI telemetry is locked. Contact our sales desk to purchase your workspace license.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleContactSales}
                className="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Sales to Purchase</span>
              </button>
            </div>
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
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isLocked ? 'License Locked' : `${tier} Tier`}
                </span>
                <span className="text-[11px] text-[#005d42] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {!isLocked
                    ? 'Active & In Good Standing'
                    : 'Awaiting License Activation'}
                </span>
              </div>

              <h2 className="font-display font-bold text-2xl text-[#0b1c30] mt-1 capitalize">
                {isLocked ? 'EstatePulse Locked Workspace' : `EstatePulse ${effectiveTier} License`}
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

          {isLocked && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleContactSales}
                className="px-5 py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Sales to Purchase</span>
              </button>
            </div>
          )}
        </div>

        {/* Pricing Cards Grid (Sales-Led: Pro & Enterprise) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
          {/* PRO PLAN */}
          <div
            className={`rounded-2xl border p-7 flex flex-col justify-between relative transition-all shadow-sm ${
              tier === 'pro'
                ? 'border-2 border-[#005d42] bg-white ring-4 ring-[#005d42]/10'
                : 'border-2 border-[#005d42]/60 bg-gradient-to-b from-[#eff4ff]/60 to-white hover:border-[#005d42]'
            }`}
          >
            <span className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full text-[10px] font-bold bg-[#005d42] text-[#97f5cc] tracking-wider uppercase shadow-xs">
              Dealership Favorite
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
                For boutique brokerages accelerating acquisition velocity and deal closing.
              </p>

              <div className="my-5 flex items-baseline gap-1.5">
                <span className="font-display font-bold text-4xl text-[#0b1c30]">$49</span>
                <span className="text-slate-500 text-[13px]">/ month billed monthly</span>
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

            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleContactSales}
                className="w-full py-3 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Sales to Purchase</span>
              </button>
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

            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleContactSales}
                className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Sales to Purchase</span>
              </button>



















            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} />
    </div>
  );
};
