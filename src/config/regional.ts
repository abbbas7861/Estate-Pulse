/**
 * regional.ts – the ONE place that decides currency, area units and local wording.
 *
 * HOW TO SWITCH MARKET
 *   Set VITE_REGION in .env.local (and in your hosting provider's environment variables):
 *     VITE_REGION=PK   → Pakistan: ₨ PKR, Marla / Kanal   (default)
 *     VITE_REGION=US   → United States: $ USD, sq ft
 *   Then restart `npm run dev` (or redeploy).
 *
 * HOW TO ADD A MARKET
 *   Copy a preset in PRESETS below, change the values, and use its key in VITE_REGION.
 *
 * DATA RULES (do not change)
 *   The database stores plain numbers only: prices / budgets as numbers and area ALWAYS in
 *   square feet. Currency symbols and area units are applied only when showing or typing values.
 *
 * NOTE: subscription plan prices (Stripe) stay in USD regardless of region.
 */

import { useState, useEffect } from 'react';

export type AreaUnit = 'sqft' | 'sqm' | 'sqyd' | 'marla' | 'kanal';

export interface RegionConfig {
  id: string;
  /** ISO 4217 code, e.g. PKR, USD */
  currency: string;
  currencySymbol: string;
  /** Text placed between the symbol and the number ('₨ 5' vs '$5') */
  symbolGap: string;
  /** Locale used for digit grouping */
  locale: string;
  /** 'south-asian' → Lakh / Crore, 'western' → K / M / B */
  compactStyle: 'south-asian' | 'western';
  /** Default unit for entering and showing areas */
  areaUnit: AreaUnit;
  /** Units a user may pick when typing an area */
  areaUnits: AreaUnit[];
  /** Square feet in one marla (272.25 is the common standard; it varies by city) */
  marlaSqft: number;
  /** Budgets at or above this are flagged "High Value" */
  highValueBudget: number;
  /** Upper edges (ascending) for the deal-size chart buckets */
  dealBucketEdges: number[];
  /** Used when a listing has no city. Leave '' for none. */
  defaultCity: string;
  /** Placeholder examples shown in forms */
  examples: { address: string; title: string; price: string; area: string; brokerage: string };
  support: { email: string; phone: string };
}

const PRESETS: Record<string, Omit<RegionConfig, 'support'>> = {
  PK: {
    id: 'PK',
    currency: 'PKR',
    currencySymbol: '₨',
    symbolGap: ' ',
    locale: 'en-PK',
    compactStyle: 'south-asian',
    areaUnit: 'marla',
    areaUnits: ['marla', 'kanal', 'sqft', 'sqyd'],
    marlaSqft: 272.25,
    highValueBudget: 50_000_000, // 5 Crore
    dealBucketEdges: [5_000_000, 10_000_000, 50_000_000, 100_000_000], // 50 Lakh, 1 Cr, 5 Cr, 10 Cr
    defaultCity: '',
    examples: {
      address: 'House 12, Street 5, DHA Phase 6, Lahore',
      title: '10 Marla House in DHA Phase 6',
      price: '25000000',
      area: '10',
      brokerage: 'Prime Realty Group',
    },
  },
  US: {
    id: 'US',
    currency: 'USD',
    currencySymbol: '$',
    symbolGap: '',
    locale: 'en-US',
    compactStyle: 'western',
    areaUnit: 'sqft',
    areaUnits: ['sqft', 'sqm'],
    marlaSqft: 272.25,
    highValueBudget: 1_000_000,
    dealBucketEdges: [500_000, 1_000_000, 5_000_000, 10_000_000],
    defaultCity: '',
    examples: {
      address: '740 Stradella Rd, Los Angeles, CA',
      title: 'The Promontory Bel Air Villa',
      price: '3250000',
      area: '4200',
      brokerage: 'Beverly Hills Realty Group',
    },
  },
};

const ENV_REGION = ((import.meta.env.VITE_REGION as string | undefined) ?? '').trim().toUpperCase();
const ENV_SUPPORT_EMAIL = ((import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? '').trim();
const ENV_SUPPORT_PHONE = ((import.meta.env.VITE_SUPPORT_PHONE as string | undefined) ?? '').trim();

if (ENV_REGION && !PRESETS[ENV_REGION]) {
  console.warn(`[regional] Unknown VITE_REGION "${ENV_REGION}". Falling back to PK.`);
}

export const REGION: RegionConfig = {
  ...(PRESETS[ENV_REGION] ?? PRESETS.PK),
  support: { email: ENV_SUPPORT_EMAIL, phone: ENV_SUPPORT_PHONE },
};

// ─── Supported Global Currencies (PKR, USD, AED) ──────────────────────────────

export type SupportedCurrency = 'PKR' | 'USD' | 'AED';

export interface CurrencyDetails {
  code: SupportedCurrency;
  symbol: string;
  symbolGap: string;
  locale: string;
  compactStyle: 'south-asian' | 'western';
  label: string;
  name: string;
}

export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyDetails> = {
  PKR: {
    code: 'PKR',
    symbol: '₨',
    symbolGap: ' ',
    locale: 'en-PK',
    compactStyle: 'south-asian',
    label: '₨ PKR',
    name: 'Pakistani Rupee',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    symbolGap: '',
    locale: 'en-US',
    compactStyle: 'western',
    label: '$ USD',
    name: 'US Dollar',
  },
  AED: {
    code: 'AED',
    symbol: 'AED',
    symbolGap: ' ',
    locale: 'en-AE',
    compactStyle: 'western',
    label: 'AED د.إ',
    name: 'UAE Dirham',
  },
};

const STORAGE_CURRENCY_KEY = 'estatepulse_active_currency';

/**
 * Returns the currently active currency from localStorage or defaults to REGION.currency / PKR.
 */
export function getActiveCurrency(): SupportedCurrency {
  try {
    const saved = localStorage.getItem(STORAGE_CURRENCY_KEY) as SupportedCurrency | null;
    if (saved && CURRENCY_CONFIGS[saved]) {
      return saved;
    }
  } catch {
    // Ignore localStorage access failures
  }
  return (REGION.currency as SupportedCurrency) || 'PKR';
}

/**
 * Updates the active currency globally, persists to localStorage, and emits an event for reactive re-render.
 */
export function setActiveCurrency(cur: SupportedCurrency): void {
  try {
    localStorage.setItem(STORAGE_CURRENCY_KEY, cur);
    window.dispatchEvent(new CustomEvent('currencychange', { detail: cur }));
  } catch {
    // Ignore localStorage access failures
  }
}

/**
 * React hook to read and update the active currency reactively across the whole application.
 */
export function useCurrency(): [SupportedCurrency, (cur: SupportedCurrency) => void] {
  const [cur, setCur] = useState<SupportedCurrency>(() => getActiveCurrency());

  useEffect(() => {
    const handle = (e: Event) => {
      const customEvent = e as CustomEvent<SupportedCurrency>;
      setCur(customEvent.detail || getActiveCurrency());
    };
    window.addEventListener('currencychange', handle);
    return () => window.removeEventListener('currencychange', handle);
  }, []);

  return [cur, setActiveCurrency];
}

// ─── Money Formatting ─────────────────────────────────────────────────────────

function trim2(n: number): string {
  return String(parseFloat(n.toFixed(2)));
}

/**
 * Dynamically formats prices based on the provided or active currency (PKR, USD, AED)
 * using localized number formatting and compact notation (Lakh/Crore for PKR, K/M/B for USD/AED).
 */
export function formatMoney(
  amount: number | null | undefined,
  opts: { compact?: boolean; currency?: SupportedCurrency } = {}
): string {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  
  const curCode = opts.currency || getActiveCurrency();
  const cur = CURRENCY_CONFIGS[curCode] || CURRENCY_CONFIGS.PKR;
  const sym = cur.symbol + cur.symbolGap;

  if (opts.compact) {
    if (cur.compactStyle === 'south-asian') {
      if (abs >= 1e7) return `${sign}${sym}${trim2(abs / 1e7)} Cr`;
      if (abs >= 1e5) return `${sign}${sym}${trim2(abs / 1e5)} Lakh`;
    } else {
      if (abs >= 1e9) return `${sign}${sym}${trim2(abs / 1e9)}B`;
      if (abs >= 1e6) return `${sign}${sym}${trim2(abs / 1e6)}M`;
      if (abs >= 1e3) return `${sign}${sym}${trim2(abs / 1e3)}K`;
    }
  }

  try {
    const formattedNum = new Intl.NumberFormat(cur.locale, {
      maximumFractionDigits: 0,
    }).format(abs);
    return `${sign}${sym}${formattedNum}`;
  } catch {
    return `${sign}${sym}${abs.toLocaleString(cur.locale, { maximumFractionDigits: 0 })}`;
  }
}

export function isHighValue(budget: number | null | undefined): boolean {
  return (Number(budget) || 0) >= REGION.highValueBudget;
}

export interface DealBucket {
  label: string;
  min: number;
  max: number;
}

/** Deal-size buckets for the analytics chart, built from REGION.dealBucketEdges. */
export function dealBuckets(): DealBucket[] {
  const e = REGION.dealBucketEdges;
  const f = (n: number) => formatMoney(n, { compact: true });
  const out: DealBucket[] = [{ label: `< ${f(e[0])}`, min: -Infinity, max: e[0] }];
  for (let i = 1; i < e.length; i++) {
    out.push({ label: `${f(e[i - 1])} – ${f(e[i])}`, min: e[i - 1], max: e[i] });
  }
  out.push({ label: `> ${f(e[e.length - 1])}`, min: e[e.length - 1], max: Infinity });
  return out;
}

// ─── Area ─────────────────────────────────────────────────────────────────────

const AREA_LABEL: Record<AreaUnit, string> = {
  sqft: 'Sq Ft',
  sqm: 'Sq M',
  sqyd: 'Sq Yd',
  marla: 'Marla',
  kanal: 'Kanal',
};

export function areaUnitLabel(unit: AreaUnit): string {
  return AREA_LABEL[unit];
}

function sqftPer(unit: AreaUnit): number {
  switch (unit) {
    case 'sqft':
      return 1;
    case 'sqm':
      return 10.7639;
    case 'sqyd':
      return 9;
    case 'marla':
      return REGION.marlaSqft;
    case 'kanal':
      return REGION.marlaSqft * 20;
  }
}

/** Typed value in `unit` → whole square feet (what the database stores). */
export function toSqft(value: number, unit: AreaUnit): number {
  if (!isFinite(value) || value <= 0) return 0;
  return Math.round(value * sqftPer(unit));
}

/** Square feet from the database → number to show in `unit` (2 decimals max). */
export function fromSqft(sqft: number, unit: AreaUnit): number {
  if (!isFinite(sqft) || sqft <= 0) return 0;
  return Math.round((sqft / sqftPer(unit)) * 100) / 100;
}

/** Convert a typed value from one unit to another (used by the unit dropdown). */
export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  if (!isFinite(value) || value <= 0) return 0;
  return Math.round(((value * sqftPer(from)) / sqftPer(to)) * 100) / 100;
}

/** Human-readable area: "10 Marla", "1 Kanal 5 Marla", "4,200 sq ft". */
export function formatArea(sqft: number | null | undefined, unit: AreaUnit = REGION.areaUnit): string {
  const s = Number(sqft) || 0;
  if (s <= 0) return '—';

  if (unit === 'marla' || unit === 'kanal') {
    const marla = Math.round((s / REGION.marlaSqft) * 10) / 10;
    if (marla >= 20) {
      const kanal = Math.floor(marla / 20);
      const rem = Math.round((marla - kanal * 20) * 10) / 10;
      return rem > 0 ? `${kanal} Kanal ${rem} Marla` : `${kanal} Kanal`;
    }
    return `${marla} Marla`;
  }

  const value = fromSqft(s, unit);
  const shown = value.toLocaleString(REGION.locale, { maximumFractionDigits: unit === 'sqft' ? 0 : 1 });
  return `${shown} ${AREA_LABEL[unit].toLowerCase()}`;
}
