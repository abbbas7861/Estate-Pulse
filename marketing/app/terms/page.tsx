'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]">
      {/* Top Bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-sm font-semibold text-[#005d42] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to EstatePulse</span>
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#005d42]" />
            <span className="font-display font-bold text-sm tracking-tight text-[#0b1c30]">
              EstatePulse Legal
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#005d42] uppercase tracking-wider mb-2">
          <FileText className="w-3.5 h-3.5" />
          <span>Last Updated: October 2024</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#0b1c30] mb-4">
          Terms of Service
        </h1>
        <p className="text-slate-600 text-[14px] leading-relaxed mb-8">
          Welcome to EstatePulse Brokerage Pro. By subscribing, accessing, or utilizing our software, API, or hosting infrastructure, you agree to be legally bound by these terms.
        </p>

        <div className="space-y-8 text-[14px] text-slate-700 leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              1. Commercial Licensing &amp; Permitted Use
            </h2>
            <p>
              EstatePulse grants you a non-exclusive, non-transferable, revocable commercial license to use the EstatePulse Brokerage Pro SaaS platform for legitimate real estate brokerage, lead acquisition, and MLS inventory management activities within your registered brokerage entity.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              2. Subscription Billing &amp; Payment Processing
            </h2>
            <p>
              Paid subscription plans (Pro at $49/month, Enterprise at $199/month) are billed in advance on a recurring monthly cycle via Stripe. You may cancel your subscription at any time via the Stripe Customer Portal, taking effect at the conclusion of the current billing period. All transactions are non-refundable unless required by state real estate law.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              3. Client Data &amp; Confidentiality
            </h2>
            <p>
              Your brokerage retains complete proprietary ownership of all inquiries, client contact records, commission agreements, and property photos uploaded to your tenant database. EstatePulse does not sell, broker, or market third-party services against your client records.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              4. MLS Compliance &amp; DRE Regulations
            </h2>
            <p>
              Each brokerage is solely responsible for ensuring its published listing descriptions, MLS IDs, and disclosures comply with applicable local Real Estate Board regulations, the California Department of Real Estate (DRE), and the Fair Housing Act.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg text-[#0b1c30] mb-2">
              5. Limitation of Liability
            </h2>
            <p>
              EstatePulse is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. In no event shall EstatePulse or its affiliates be liable for indirect, incidental, or consequential damages resulting from transaction escrow outcomes or third-party syndication feeds.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
