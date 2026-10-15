import React, { useState } from 'react';
import { X, Check, Sparkles, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: 'pro' | 'enterprise') => Promise<any>;
  reason?: string;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  reason = 'You have reached the maximum quota for the Free tier.',
}) => {
  const [loadingTier, setLoadingTier] = useState<'pro' | 'enterprise' | null>(null);

  if (!isOpen) return null;

  const handleSelectUpgrade = async (tier: 'pro' | 'enterprise') => {
    setLoadingTier(tier);
    try {
      await onUpgrade(tier);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-[#0b1c30] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#97f5cc] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Unlock Executive Scale</span>
          </div>
          <h2 className="font-display font-bold text-2xl text-white">
            Upgrade Your Brokerage License
          </h2>
          <p className="text-[13px] text-slate-300 mt-1 max-w-xl">
            {reason} Expand your advisor capacity and unlock automated AI telemetry.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pro Card */}
          <div className="rounded-xl border-2 border-[#005d42] p-5 flex flex-col justify-between bg-[#eff4ff]/30 relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#005d42] text-white uppercase tracking-wider">
              Most Popular
            </span>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#005d42]" />
                <h3 className="font-display font-bold text-[17px] text-[#0b1c30]">
                  Professional Tier
                </h3>
              </div>
              <div className="flex items-baseline gap-1 my-2">
                <span className="font-display font-bold text-3xl text-[#0b1c30]">$49</span>
                <span className="text-[13px] text-slate-500">/ month</span>
              </div>
              <p className="text-[12px] text-slate-600 mb-4">
                Engineered for boutique teams and growing brokerages.
              </p>

              <ul className="space-y-2 text-[12px] text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span>Up to <b>5 Advisor Accounts</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span><b>1,000 Inbound Leads</b></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span><b>Unlimited</b> MLS Properties</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span>Gemini AI Insights Briefing</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={loadingTier !== null}
              onClick={() => handleSelectUpgrade('pro')}
              className="mt-6 w-full py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loadingTier === 'pro' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Enterprise Card */}
          <div className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between bg-white hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-[#0b1c30]" />
                <h3 className="font-display font-bold text-[17px] text-[#0b1c30]">
                  Enterprise Tier
                </h3>
              </div>
              <div className="flex items-baseline gap-1 my-2">
                <span className="font-display font-bold text-3xl text-[#0b1c30]">$199</span>
                <span className="text-[13px] text-slate-500">/ month</span>
              </div>
              <p className="text-[12px] text-slate-600 mb-4">
                Unlimited scale for premier luxury flagships.
              </p>

              <ul className="space-y-2 text-[12px] text-slate-700">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span><b>Unlimited</b> Advisor Accounts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span><b>Unlimited</b> Inbound Leads</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span>Dedicated DRE Support SLA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#005d42] shrink-0" />
                  <span>Custom Luxury Branding</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              disabled={loadingTier !== null}
              onClick={() => handleSelectUpgrade('enterprise')}
              className="mt-6 w-full py-2.5 rounded-lg bg-[#0b1c30] hover:bg-[#1a2d42] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loadingTier === 'enterprise' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Upgrade to Enterprise</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-6">
          <span>Stripe-secured payments · Cancel anytime with 1 click</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Continue on Free Tier
          </button>
        </div>
      </div>
    </div>
  );
};
