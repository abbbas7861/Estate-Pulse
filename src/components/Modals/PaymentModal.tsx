import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle, CreditCard, Landmark, Building2, Coins } from 'lucide-react';
import QRCode from 'react-qr-code';

const QRCodeSVG = QRCode;

// ─── WhatsApp receipt link ────────────────────────────────────────────────────
// Replace YOUR_PHONE_NUMBER with your full number incl. country code, no spaces
// e.g. 923001234567 for a Pakistani number.
const RECEIPT_WA_NUMBER = '+923164063124';
const RECEIPT_WA_MESSAGE = encodeURIComponent(
  'Hi, I just paid for the EstatePulse Pro plan. Here is my receipt.'
);
const WA_RECEIPT_HREF = `https://wa.me/${RECEIPT_WA_NUMBER}?text=${RECEIPT_WA_MESSAGE}`;

// ─── Payoneer / international payment link ─────────────────────────────────────
const PAYONEER_LINK = "https://payoneer.com/pay/YOUR_PAYONEER_LINK_HERE";

// ─── Bank / Digital Account Details ──────────────────────────────────────────
const BANK_DETAILS = {
  bankName:      'Meezan Bank Limited',
  accountTitle:  'Muhammad Abbas',
  accountNumber: '11530-0115163982',
  iban:          'PK77 MEZN 0011 5301 1516 3982',
};

const RAQAMI_DETAILS = {
  accountTitle: 'Muhammad Abbas',
  iban:         '+923164063124',
};

// ─── Crypto Wallet Details ────────────────────────────────────────────────────
const USDT_WALLET_TRC20 = 'TXofT7YubkgLw5BqCbMabEYh3GUqRWSgqd';
const BTC_WALLET = 'bc1qn7mhcya2ssdmhhewp9drn2gh9ql3a0l48tepzv';
const ETH_WALLET = '0xc04eB1E3db056f01cd0Ba2aA934a5eBc602cd7A5';

// ─────────────────────────────────────────────────────────────────────────────

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: silently fail
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
        <span className="flex-1 text-[13px] font-mono text-[#0b1c30] truncate">{value}</span>
        <button
          type="button"
          onClick={copy}
          title={`Copy ${label}`}
          className="shrink-0 text-slate-400 hover:text-[#005d42] transition-colors cursor-pointer"
        >
          {copied ? (
            <Check className="w-4 h-4 text-[#005d42]" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'pakistan' | 'international' | 'crypto'>('pakistan');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-[#005d42] to-[#047857] p-6 text-white flex items-start justify-between shrink-0">
          <div>
            <h3 className="font-display font-bold text-xl">Purchase EstatePulse Pro</h3>
            <p className="text-xs text-[#97f5cc] mt-0.5">
              Choose your payment method below — $49 / month
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white cursor-pointer mt-0.5"
            aria-label="Close payment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('pakistan')}
            className={`flex-1 min-w-[110px] py-3 text-[12px] sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              tab === 'pakistan'
                ? 'border-[#005d42] text-[#005d42] bg-[#f0faf6]'
                : 'border-transparent text-slate-500 hover:text-[#005d42]'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Pakistan (PKR)
          </button>
          <button
            type="button"
            onClick={() => setTab('international')}
            className={`flex-1 min-w-[120px] py-3 text-[12px] sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              tab === 'international'
                ? 'border-[#005d42] text-[#005d42] bg-[#f0faf6]'
                : 'border-transparent text-slate-500 hover:text-[#005d42]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            International (USD)
          </button>
          <button
            type="button"
            onClick={() => setTab('crypto')}
            className={`flex-1 min-w-[150px] py-3 text-[12px] sm:text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
              tab === 'crypto'
                ? 'border-[#005d42] text-[#005d42] bg-[#f0faf6]'
                : 'border-transparent text-slate-500 hover:text-[#005d42]'
            }`}
          >
            <Coins className="w-4 h-4" />
            Crypto (USDT/BTC/ETH)
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 p-6">

          {/* ─── International Tab ─── */}
          {tab === 'international' && (
            <div className="flex flex-col gap-5">
              <div className="bg-[#eff4ff] border border-[#005d42]/20 rounded-xl p-4">
                <p className="text-[13px] font-semibold text-[#005d42]">
                  Pay via Card, Wise, or Payoneer
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Secure international payment. You will be redirected to the payment gateway to complete your purchase.
                </p>
              </div>

              <a
                href={PAYONEER_LINK}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                Pay $49 via Payoneer (Card/Wise)
              </a>

              <p className="text-center text-xs text-slate-400">
                Card, Wise, and Payoneer accepted. Secure checkout.
              </p>
            </div>
          )}

          {/* ─── Pakistan Tab ─── */}
          {tab === 'pakistan' && (
            <div className="flex flex-col gap-6">

              {/* Bank Transfer */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#005d42]/10 flex items-center justify-center text-[#005d42]">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <h4 className="font-display font-bold text-[14px] text-[#0b1c30]">
                    Bank Transfer
                  </h4>
                </div>
                <CopyField label="Bank Name"      value={BANK_DETAILS.bankName} />
                <CopyField label="Account Title"  value={BANK_DETAILS.accountTitle} />
                <CopyField label="Account Number" value={BANK_DETAILS.accountNumber} />
                <CopyField label="IBAN"            value={BANK_DETAILS.iban} />
              </div>

              <div className="border-t border-dashed border-slate-200" />

              {/* Raqami Digital Account */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-[#005d42]/10 flex items-center justify-center text-[#005d42]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-display font-bold text-[14px] text-[#0b1c30]">
                    Raqami Digital Account
                  </h4>
                </div>
                <CopyField label="Account Title"         value={RAQAMI_DETAILS.accountTitle} />
                <CopyField label="Raqami IBAN / Account" value={RAQAMI_DETAILS.iban} />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800">
                <b>Important:</b> After sending payment, please tap the WhatsApp button below and attach your payment screenshot or receipt. We will activate your workspace within 24 hours.
              </div>
            </div>
          )}

          {/* ─── Crypto Tab ─── */}
          {tab === 'crypto' && (
            <div className="flex flex-col gap-6">
              {/* USDT Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#005d42]/10 flex items-center justify-center text-[#005d42] font-bold text-xs">
                      ₮
                    </div>
                    <h4 className="font-display font-bold text-[14px] text-[#0b1c30]">
                      USDT (Tether)
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-[#005d42] border border-emerald-200">
                    USDT (TRC20)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* QR Code */}
                  <div className="w-24 h-24 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-2 shadow-xs mx-auto sm:mx-0">
                    <QRCodeSVG value={USDT_WALLET_TRC20} size={80} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <CopyField label="USDT (TRC20) Wallet Address" value={USDT_WALLET_TRC20} />
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200" />

              {/* Bitcoin Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 font-bold text-xs">
                      ₿
                    </div>
                    <h4 className="font-display font-bold text-[14px] text-[#0b1c30]">
                      Bitcoin (BTC)
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    BTC (Bitcoin Network)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* QR Code */}
                  <div className="w-24 h-24 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-2 shadow-xs mx-auto sm:mx-0">
                    <QRCodeSVG value={BTC_WALLET} size={80} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <CopyField label="Bitcoin (BTC) Wallet Address" value={BTC_WALLET} />
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200" />

              {/* Ethereum Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      Ξ
                    </div>
                    <h4 className="font-display font-bold text-[14px] text-[#0b1c30]">
                      Ethereum (ETH)
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    ETH (ERC20)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* QR Code */}
                  <div className="w-24 h-24 shrink-0 rounded-xl border border-slate-200 bg-white flex items-center justify-center p-2 shadow-xs mx-auto sm:mx-0">
                    <QRCodeSVG value={ETH_WALLET} size={80} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <CopyField label="Ethereum (ETH) Wallet Address" value={ETH_WALLET} />
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 leading-relaxed">
                <b>Important:</b> Only send the specified asset on the correct network. Sending funds via the wrong network will result in permanent loss. After sending, please send the transaction hash (TxID) via WhatsApp to activate your workspace.
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Footer — WhatsApp Receipt Button ── */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <a
            href={WA_RECEIPT_HREF}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md shadow-green-900/10 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            Send Payment Receipt on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};
