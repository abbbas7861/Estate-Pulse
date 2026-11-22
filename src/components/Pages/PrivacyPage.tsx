import React from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-[#005d42] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to EstatePulse</span>
          </button>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#005d42]" />
            <span className="font-display font-bold text-sm tracking-tight text-[#0b1c30]">
              EstatePulse Privacy
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#005d42] uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Last Updated: October 2024</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#0b1c30] mb-4">
          Privacy Policy
        </h1>
        <p className="text-slate-600 text-[14px] leading-relaxed mb-8">
          EstatePulse is committed to safeguarding the proprietary high-net-worth client intelligence and transactional data entrusted to our SaaS infrastructure.
        </p>

        <div className="space-y-8 text-[14px] text-slate-700 leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              1. Information We Collect
            </h2>
            <p>
              We collect user authentication information (name, business email, encrypted credentials), brokerage profile details, and telemetry usage necessary to deliver Kanban acquisition tracking, MLS inventory mapping, and executive analytics reports.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              2. Strict Isolation of Client Leads
            </h2>
            <p>
              Lead records entered into EstatePulse (including buyer budgets, phone numbers, and private escrow notes) are governed by strict tenant-isolated database policies (PostgreSQL Row Level Security). No broker data is shared across organizational boundaries or sold to data brokers.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              3. Payment Information Security
            </h2>
            <p>
              Credit card transactions are processed directly by Stripe via PCI-DSS Level 1 compliant tokenization. EstatePulse does not store, log, or transmit raw credit card numbers or CVV codes on our servers.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              4. AI Processing Policy
            </h2>
            <p>
              When generating executive intelligence briefings via Google Gemini, only aggregated pipeline numbers (e.g. stage counts, conversion percentages) are provided to the inference endpoint. Personally identifiable client contact records (PII) are never sent to external AI model providers.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              5. Data Retention &amp; Deletion
            </h2>
            <p>
              You have the right to request full export or deletion of your tenant organization&rsquo;s database records upon terminating your subscription by contacting estatepulsesupport@gmail.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};
