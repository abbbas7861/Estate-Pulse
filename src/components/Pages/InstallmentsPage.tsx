import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  X,
  Loader2,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';
import { formatMoney, useCurrency } from '../../config/regional';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InstallmentStatus = 'active' | 'completed' | 'defaulted';

export interface InstallmentPlan {
  id: string;
  org_id: string;
  lead_id: string | null;
  title: string;
  total_amount: number;
  down_payment: number;
  monthly_amount: number;
  duration_months: number;
  status: InstallmentStatus;
  created_at: string;
  // joined
  buyer_name?: string;
}

interface LeadOption {
  id: string;
  name: string;
}

interface InstallmentsPageProps {
  orgId: string | null;
  onNotify?: (msg: string) => void;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<InstallmentStatus, string> = {
  active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border border-blue-200',
  defaulted: 'bg-red-50 text-red-700 border border-red-200',
};

const STATUS_LABELS: Record<InstallmentStatus, string> = {
  active:    'Active',
  completed: 'Completed',
  defaulted: 'Defaulted',
};

function StatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[status]}`}>
      {status === 'active'    && <CheckCircle2 className="w-3 h-3" />}
      {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'defaulted' && <AlertCircle  className="w-3 h-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const InstallmentsPage: React.FC<InstallmentsPageProps> = ({ orgId: propOrgId, onNotify }) => {
  const { orgId: authOrgId } = useAuth();
  const effectiveOrgId = propOrgId || authOrgId;
  const [currency] = useCurrency();

  // ── Data state ───────────────────────────────────────────────────────────────
  const [plans, setPlans]         = useState<InstallmentPlan[]>([]);
  const [leads, setLeads]         = useState<LeadOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Form fields ──────────────────────────────────────────────────────────────
  const [fTitle,    setFTitle]    = useState('');
  const [fLeadId,   setFLeadId]   = useState('');
  const [fTotal,    setFTotal]    = useState('');
  const [fDown,     setFDown]     = useState('');
  const [fMonthly,  setFMonthly]  = useState('');
  const [fDuration, setFDuration] = useState('');
  const [fStatus,   setFStatus]   = useState<InstallmentStatus>('active');

  // ── Fetch plans (with buyer name join) ───────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    if (!effectiveOrgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('installments')
        .select('*, leads(name)')
        .eq('org_id', effectiveOrgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: InstallmentPlan[] = (data || []).map((row: any) => ({
        ...row,
        buyer_name: row.leads?.name ?? '—',
      }));
      setPlans(mapped);
    } catch (err: any) {
      console.error('[InstallmentsPage] fetch error:', err);
      onNotify?.(`Failed to load payment plans: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId, onNotify]);

  // ── Fetch leads for dropdown ─────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    if (!effectiveOrgId) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name')
        .eq('org_id', effectiveOrgId)
        .order('name', { ascending: true });

      if (error) throw error;
      setLeads((data as LeadOption[]) || []);
    } catch (err: any) {
      console.warn('[InstallmentsPage] leads fetch error:', err);
    }
  }, [effectiveOrgId]);

  useEffect(() => { fetchPlans(); fetchLeads(); }, [fetchPlans, fetchLeads]);

  // ── KPI calculations ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalCollected   = plans.reduce((s, p) => s + (p.down_payment    || 0), 0);
    const totalOutstanding = plans.reduce((s, p) => s + ((p.total_amount - p.down_payment) || 0), 0);
    const activePlans      = plans.filter(p => p.status === 'active').length;
    return { totalCollected, totalOutstanding, activePlans };
  }, [plans]);

  // ── Delete handler ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete plan "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('installments').delete().eq('id', id);
      if (error) throw error;
      setPlans(prev => prev.filter(p => p.id !== id));
      onNotify?.(`Deleted payment plan: ${title}`);
    } catch (err: any) {
      onNotify?.(`Failed to delete plan: ${err.message || 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  };

  // ── Reset + open modal ───────────────────────────────────────────────────────
  const openModal = () => {
    setFTitle(''); setFLeadId(''); setFTotal(''); setFDown('');
    setFMonthly(''); setFDuration(''); setFStatus('active');
    setModalOpen(true);
  };

  // ── Submit handler ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrgId) return;
    if (!fTitle.trim()) { onNotify?.('Plan title is required.'); return; }
    if (!fTotal || isNaN(Number(fTotal)) || Number(fTotal) <= 0) {
      onNotify?.('Enter a valid total amount.'); return;
    }

    setSubmitting(true);
    try {
      const payload = {
        org_id:          effectiveOrgId,
        lead_id:         fLeadId || null,
        title:           fTitle.trim(),
        total_amount:    Number(fTotal),
        down_payment:    Number(fDown)     || 0,
        monthly_amount:  Number(fMonthly)  || 0,
        duration_months: Number(fDuration) || 0,
        status:          fStatus,
      };

      const { error } = await supabase.from('installments').insert(payload);
      if (error) throw error;

      onNotify?.(`Payment plan "${fTitle}" created.`);
      setModalOpen(false);
      await fetchPlans();
    } catch (err: any) {
      onNotify?.(`Failed to create plan: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <CreditCard className="w-5 h-5 text-[#005d42]" />
            <h1 className="font-display font-bold text-xl text-[#0b1c30]">
              Installment Plans
            </h1>
          </div>
          <p className="text-[13px] text-slate-500">
            Track property payment plans, down payments and monthly schedules.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Collected */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#005d42] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Total Collected
            </p>
            <p className="font-display font-bold text-xl text-[#0b1c30]">
              {formatMoney(kpis.totalCollected, { currency, compact: true })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sum of all down payments</p>
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Total Outstanding
            </p>
            <p className="font-display font-bold text-xl text-[#0b1c30]">
              {formatMoney(kpis.totalOutstanding, { currency, compact: true })}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Remaining balance across plans</p>
          </div>
        </div>

        {/* Active Plans */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Active Plans
            </p>
            <p className="font-display font-bold text-xl text-[#0b1c30]">
              {kpis.activePlans}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Currently running payment plans</p>
          </div>
        </div>
      </div>

      {/* ── Data Table ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#005d42] animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <CreditCard className="w-10 h-10 text-slate-200" />
            <p className="text-sm font-medium">No payment plans yet.</p>
            <button
              type="button"
              onClick={openModal}
              className="text-[13px] font-semibold text-[#005d42] hover:underline cursor-pointer"
            >
              + Create your first plan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Plan Title', 'Buyer', 'Total Amount', 'Down Payment', 'Monthly', 'Duration', 'Status', ''].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map(plan => (
                  <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0b1c30] max-w-[180px] truncate">
                      {plan.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {plan.buyer_name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#0b1c30] tabular-nums">
                      {formatMoney(plan.total_amount, { currency, compact: true })}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-semibold tabular-nums">
                      {formatMoney(plan.down_payment, { currency, compact: true })}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {formatMoney(plan.monthly_amount, { currency, compact: true })}/mo
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {plan.duration_months ? `${plan.duration_months} mo` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={deleting === plan.id}
                        onClick={() => handleDelete(plan.id, plan.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40"
                        title="Delete plan"
                      >
                        {deleting === plan.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Plan Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0b1c30]/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#005d42]" />
                <h2 className="font-display font-bold text-[15px] text-[#0b1c30]">
                  New Installment Plan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

              {/* Plan Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-slate-600">
                  Plan Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  placeholder="e.g. 10 Marla DHA Plot – 2 Year Plan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#005d42] focus:ring-2 focus:ring-[#005d42]/10 transition"
                  required
                />
              </div>

              {/* Buyer / Lead */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-slate-600">
                  Buyer / Lead
                </label>
                <select
                  value={fLeadId}
                  onChange={e => setFLeadId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-[#0b1c30] bg-white focus:outline-none focus:border-[#005d42] focus:ring-2 focus:ring-[#005d42]/10 transition cursor-pointer"
                >
                  <option value="">— No buyer linked —</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* Total Amount + Down Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-slate-600">
                    Total Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={fTotal}
                    onChange={e => setFTotal(e.target.value)}
                    placeholder="e.g. 12500000"
                    min="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#005d42] focus:ring-2 focus:ring-[#005d42]/10 transition"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-slate-600">
                    Down Payment
                  </label>
                  <input
                    type="number"
                    value={fDown}
                    onChange={e => setFDown(e.target.value)}
                    placeholder="e.g. 2500000"
                    min="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#005d42] focus:ring-2 focus:ring-[#005d42]/10 transition"
                  />
                </div>
              </div>

              {/* Monthly Amount + Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-slate-600">
                    Monthly Amount
                  </label>
                  <input
                    type="number"
                    value={fMonthly}
                    onChange={e => setFMonthly(e.target.value)}
                    placeholder="e.g. 416667"
                    min="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#005d42] focus:ring-2 focus:ring-[#005d42]/10 transition"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-semibold text-slate-600">
                    Duration (Months)
                  </label>
                  <input
                    type="number"
                    value={fDuration}
                    onChange={e => setFDuration(e.target.value)}
                    placeholder="e.g. 24"
                    min="1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-[#0b1c30] focus:outline-none focus:border-[#005d42] focus:ring-2 focus:ring-[#005d42]/10 transition"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-semibold text-slate-600">Status</label>
                <select
                  value={fStatus}
                  onChange={e => setFStatus(e.target.value as InstallmentStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-[#0b1c30] bg-white focus:outline-none focus:border-[#005d42] focus:ring-2 focus:ring-[#005d42]/10 transition cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="defaulted">Defaulted</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#047857] hover:bg-[#005d42] text-white text-[13px] font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Saving…' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
