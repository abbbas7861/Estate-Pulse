import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  Clock,
  Plus,
  Trash2,
  Calendar,
  X,
  Loader2,
  RefreshCw,
  Building2,
  CheckCircle2,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';
import { formatMoney, useCurrency } from '../../config/regional';

export interface CommissionItem {
  id: string;
  org_id?: string;
  property_title: string;
  sale_price: number;
  commission_rate: number;
  total_commission: number;
  broker_share: number;
  agent_share: number;
  paid_by: 'Buyer' | 'Seller' | 'Both' | string;
  status: 'Pending' | 'Received' | string;
  created_at?: string;
}

interface CommissionsPageProps {
  orgId: string | null;
  onNotify?: (msg: string) => void;
}

export const CommissionsPage: React.FC<CommissionsPageProps> = ({ orgId: propOrgId, onNotify }) => {
  const { orgId: authOrgId } = useAuth();
  const effectiveOrgId = propOrgId || authOrgId;
  const [currency] = useCurrency();

  // Data state
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Form Inputs
  const [propertyTitle, setPropertyTitle] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [commissionRate, setCommissionRate] = useState('2');
  const [totalCommission, setTotalCommission] = useState('');
  const [agentShare, setAgentShare] = useState('');
  const [paidBy, setPaidBy] = useState<'Buyer' | 'Seller' | 'Both'>('Seller');
  const [status, setStatus] = useState<'Pending' | 'Received'>('Pending');

  // Auto-calculated broker share
  const calculatedBrokerShare = useMemo(() => {
    const total = parseFloat(totalCommission) || 0;
    const agent = parseFloat(agentShare) || 0;
    return Math.max(0, total - agent);
  }, [totalCommission, agentShare]);

  // Handlers for responsive calculation
  const handleSalePriceChange = (val: string) => {
    setSalePrice(val);
    const sp = parseFloat(val) || 0;
    const rate = parseFloat(commissionRate) || 0;
    const total = (sp * rate) / 100;
    setTotalCommission(total > 0 ? String(total) : '');
  };

  const handleRateChange = (val: string) => {
    setCommissionRate(val);
    const sp = parseFloat(salePrice) || 0;
    const rate = parseFloat(val) || 0;
    const total = (sp * rate) / 100;
    setTotalCommission(total > 0 ? String(total) : '');
  };

  // Fetch commissions from Supabase
  const fetchCommissions = useCallback(async () => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('org_id', effectiveOrgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions((data as CommissionItem[]) || []);
    } catch (err: any) {
      console.error('Failed to fetch commissions:', err);
      onNotify?.(`Failed to load commissions: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId, onNotify]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  // KPI Calculations
  const totalBrokerProfitReceived = useMemo(() => {
    return commissions
      .filter((c) => (c.status || '').toLowerCase() === 'received')
      .reduce((sum, c) => sum + (Number(c.broker_share) || 0), 0);
  }, [commissions]);

  const pendingProfit = useMemo(() => {
    return commissions
      .filter((c) => (c.status || '').toLowerCase() === 'pending')
      .reduce((sum, c) => sum + (Number(c.broker_share) || 0), 0);
  }, [commissions]);

  const totalDealsTracked = commissions.length;

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this commission record?')) {
      return;
    }
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('commissions').delete().eq('id', id);
      if (error) throw error;
      setCommissions((prev) => prev.filter((item) => item.id !== id));
      onNotify?.('Commission entry deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete commission:', err);
      onNotify?.(`Failed to delete commission: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrgId) {
      onNotify?.('Organization context missing.');
      return;
    }

    if (!propertyTitle.trim()) {
      onNotify?.('Please provide the deal / property title.');
      return;
    }

    const sp = parseFloat(salePrice);
    if (isNaN(sp) || sp <= 0) {
      onNotify?.('Please enter a valid deal sale price.');
      return;
    }

    const rate = parseFloat(commissionRate) || 0;
    const total = parseFloat(totalCommission) || (sp * rate) / 100;
    const agent = parseFloat(agentShare) || 0;
    const broker = Math.max(0, total - agent);

    setSubmitting(true);
    try {
      const { error } = await supabase.from('commissions').insert({
        org_id: effectiveOrgId,
        property_title: propertyTitle.trim(),
        sale_price: sp,
        commission_rate: rate,
        total_commission: total,
        broker_share: broker,
        agent_share: agent,
        paid_by: paidBy,
        status: status,
      });

      if (error) throw error;

      onNotify?.('Commission recorded successfully.');
      setIsModalOpen(false);

      // Reset form
      setPropertyTitle('');
      setSalePrice('');
      setCommissionRate('2');
      setTotalCommission('');
      setAgentShare('');
      setPaidBy('Seller');
      setStatus('Pending');

      fetchCommissions();
    } catch (err: any) {
      console.error('Failed to save commission:', err);
      onNotify?.(`Failed to record commission: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>COMMISSIONS &amp; REVENUE LEDGER</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight mt-0.5">
            Brokerage Profit &amp; Commissions
          </h1>
          <p className="text-[14px] text-[#3e4943] mt-1">
            Track gross commission income, agent splits, and net brokerage profits across all closed transactions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCommissions}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#3e4943] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh commissions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#005d42]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-sm font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Commission</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Broker Profit (Received) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Broker Profit (Received)</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#005d42] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[#005d42] leading-none tabular-nums">
                {formatMoney(totalBrokerProfitReceived, { currency })}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#006f67] tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settled
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73] tabular-nums">
            <span>Collected net brokerage profit</span>
            <span className="text-[#005d42] font-semibold">Realized Income</span>
          </div>
        </div>

        {/* Card 2: Pending Profit */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Pending Profit</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[#b45309] leading-none tabular-nums">
                {formatMoney(pendingProfit, { currency })}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600 tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                In Escrow
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73] tabular-nums">
            <span>Awaiting escrow or client release</span>
            <span className="text-amber-700 font-semibold">Unrealized</span>
          </div>
        </div>

        {/* Card 3: Total Deals Tracked */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Deals Tracked</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none tabular-nums">
                {totalDealsTracked}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#006f67] tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                Ledger
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73] tabular-nums">
            <span>Closed &amp; negotiated transactions</span>
            <span className="text-[#005d42] font-semibold">Full Portfolio</span>
          </div>
        </div>
      </div>

      {/* Commissions Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-base text-[#0b1c30]">Commission Settlements</h2>
            <span className="text-xs bg-slate-100 text-[#3e4943] font-semibold px-2 py-0.5 rounded-full">
              {commissions.length} Deals
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-[#005d42] animate-spin" />
            <p className="text-sm text-[#6e7a73]">Loading commission settlements...</p>
          </div>
        ) : commissions.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-[#0b1c30]">No commissions recorded yet</h3>
            <p className="text-sm text-[#6e7a73] max-w-sm mt-1 mb-4">
              Track closing fees, brokerage profit splits, and agent compensation for every deal.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Commission</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#f8f9ff] text-[#3e4943] text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Deal Title</th>
                  <th className="py-3.5 px-5 text-right">Sale Price</th>
                  <th className="py-3.5 px-5 text-right">Total Commission</th>
                  <th className="py-3.5 px-5 text-right">Broker Profit</th>
                  <th className="py-3.5 px-5 text-right">Agent Share</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.map((item) => {
                  const isReceived = (item.status || '').toLowerCase() === 'received';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-[#0b1c30] font-medium text-xs">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Deal Title */}
                      <td className="py-3.5 px-5 font-semibold text-[#0b1c30] max-w-xs">
                        <div className="line-clamp-1">{item.property_title || 'Untitled Deal'}</div>
                        {item.paid_by && (
                          <span className="text-[11px] text-[#6e7a73] font-normal">
                            Paid by: {item.paid_by}
                          </span>
                        )}
                      </td>

                      {/* Sale Price */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right font-medium text-[#0b1c30] tabular-nums">
                        {formatMoney(item.sale_price, { currency })}
                      </td>

                      {/* Total Commission */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right text-[#3e4943] tabular-nums">
                        <div className="font-semibold text-[#0b1c30]">
                          {formatMoney(item.total_commission, { currency })}
                        </div>
                        {item.commission_rate ? (
                          <span className="text-[11px] text-[#6e7a73]">({item.commission_rate}%)</span>
                        ) : null}
                      </td>

                      {/* Broker Profit (Highlighted in green) */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right tabular-nums">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60 shadow-xs">
                          {formatMoney(item.broker_share, { currency })}
                        </span>
                      </td>

                      {/* Agent Share */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right text-[#3e4943] tabular-nums">
                        {formatMoney(item.agent_share, { currency })}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : 'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}
                        >
                          {item.status || 'Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting === item.id}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          title="Delete commission"
                        >
                          {isDeleting === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Commission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#005d42] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#0b1c30]">Record Deal Commission</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              {/* Deal / Property Title */}
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                  Deal / Property Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyTitle}
                  onChange={(e) => setPropertyTitle(e.target.value)}
                  placeholder="e.g. Luxury Penthouse at Downtown Crest"
                  className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                  required
                />
              </div>

              {/* Sale Price & Commission Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                    Sale Price ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={salePrice}
                    onChange={(e) => handleSalePriceChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                    Commission Rate %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    placeholder="2.0"
                    className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                  />
                </div>
              </div>

              {/* Total Commission & Agent Share */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                    Total Commission ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={totalCommission}
                    onChange={(e) => setTotalCommission(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                    required
                  />
                  <p className="text-[11px] text-[#6e7a73] mt-1">Auto-calculated or override manually</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                    Agent Share ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={agentShare}
                    onChange={(e) => setAgentShare(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                  />
                  <p className="text-[11px] text-[#6e7a73] mt-1">Portion paid out to handling agent</p>
                </div>
              </div>

              {/* Broker Share (Read-only, highlighted in green) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-900 block">Broker Net Profit</span>
                  <span className="text-[11px] text-emerald-700">Total Commission minus Agent Share</span>
                </div>
                <div className="text-right">
                  <span className="font-display font-bold text-lg text-emerald-800 tabular-nums">
                    {formatMoney(calculatedBrokerShare, { currency })}
                  </span>
                </div>
              </div>

              {/* Paid By & Status Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Paid By</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value as any)}
                    className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all cursor-pointer"
                  >
                    <option value="Seller">Seller</option>
                    <option value="Buyer">Buyer</option>
                    <option value="Both">Both (Split)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">Settlement Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all cursor-pointer"
                  >
                    <option value="Pending">Pending (In Escrow)</option>
                    <option value="Received">Received (Settled)</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-[#3e4943] transition-colors cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Commission</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
