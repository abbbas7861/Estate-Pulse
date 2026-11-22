import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Wallet,
  TrendingUp,
  X,
  Loader2,
  RefreshCw,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';
import { formatMoney, useCurrency } from '../../config/regional';

export interface ExpenseItem {
  id: string;
  org_id?: string;
  category: 'Rent' | 'Bills' | 'Salary' | 'Repair' | 'Marketing' | 'Other' | string;
  description: string;
  amount: number;
  date: string;
  created_at?: string;
}

interface ExpensesPageProps {
  orgId: string | null;
  onNotify?: (msg: string) => void;
}

const CATEGORIES = ['Rent', 'Bills', 'Salary', 'Repair', 'Marketing', 'Other'] as const;

// Helper to get first and last date of current month in YYYY-MM-DD
function getInitialMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDay = new Date(year, month, 1);
  const endDay = new Date(year, month + 1, 0);

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    start: formatYMD(startDay),
    end: formatYMD(endDay),
  };
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ orgId: propOrgId, onNotify }) => {
  const { orgId: authOrgId } = useAuth();
  const effectiveOrgId = propOrgId || authOrgId;
  const [currency] = useCurrency();

  // Expenses data state
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Date Filter State (default to first and last day of current month)
  const [startDate, setStartDate] = useState<string>(() => getInitialMonthRange().start);
  const [endDate, setEndDate] = useState<string>(() => getInitialMonthRange().end);

  // Add Expense Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form inputs
  const [category, setCategory] = useState<string>('Rent');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Fetch expenses from Supabase
  const fetchExpenses = useCallback(async () => {
    if (!effectiveOrgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('org_id', effectiveOrgId)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }
      setExpenses((data as ExpenseItem[]) || []);
    } catch (err: any) {
      console.error('Failed to fetch expenses:', err);
      onNotify?.(`Failed to load expenses: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId, onNotify]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Filter expenses based on startDate and endDate
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (!item.date) return false;
      const itemDate = item.date.includes('T') ? item.date.split('T')[0] : item.date;

      if (startDate && itemDate < startDate) {
        return false;
      }
      if (endDate && itemDate > endDate) {
        return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate]);

  // Calculations for KPI Cards
  const totalSelectedRange = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [filteredExpenses]);

  const thisMonthTotal = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.reduce((sum, item) => {
      if (!item.date) return sum;
      const d = new Date(item.date);
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        return sum + (Number(item.amount) || 0);
      }
      return sum;
    }, 0);
  }, [expenses]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, []);

  // Filter actions
  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleSetCurrentMonth = () => {
    const initial = getInitialMonthRange();
    setStartDate(initial.start);
    setEndDate(initial.end);
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) {
      return;
    }
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      onNotify?.('Expense deleted successfully.');
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      onNotify?.(`Failed to delete expense: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle Add Expense Submit
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveOrgId) {
      onNotify?.('Organization context missing.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      onNotify?.('Please enter a valid expense amount.');
      return;
    }

    if (!description.trim()) {
      onNotify?.('Please provide an expense description.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('expenses').insert({
        org_id: effectiveOrgId,
        category,
        description: description.trim(),
        amount: numericAmount,
        date: date || new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      onNotify?.('Expense recorded successfully.');
      setIsModalOpen(false);
      // Reset form
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Rent');
      // Refresh table
      fetchExpenses();
    } catch (err: any) {
      console.error('Failed to create expense:', err);
      onNotify?.(`Failed to add expense: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for Category Badges
  const renderCategoryBadge = (cat: string) => {
    const normalized = cat.toLowerCase();
    let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200/80';

    if (normalized.includes('rent')) {
      badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200/70';
    } else if (normalized.includes('bill')) {
      badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200/70';
    } else if (normalized.includes('salary')) {
      badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
    } else if (normalized.includes('repair')) {
      badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200/70';
    } else if (normalized.includes('market')) {
      badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200/70';
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle}`}
      >
        {cat}
      </span>
    );
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#005d42]">
            <Receipt className="w-3.5 h-3.5" />
            <span>OPERATIONAL COSTS &amp; OVERHEAD</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30] tracking-tight mt-0.5">
            Office Expenses
          </h1>
          <p className="text-[14px] text-[#3e4943] mt-1">
            Track office overhead including rent, utility bills, staff payroll, repairs, and marketing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchExpenses}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#3e4943] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh expenses"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#005d42]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-sm font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Top Summary Row - 2 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* KPI 1: Total Expenses (Selected Range) */}
        <div className="bg-white rounded-xl p-5 flex flex-col justify-between border border-slate-200/80 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Total Expenses (Selected Range)</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#005d42] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none tabular-nums">
                {formatMoney(totalSelectedRange, { currency })}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73] tabular-nums">
            <span>{filteredExpenses.length} filtered records</span>
            <span className="text-[#005d42] font-semibold">
              {startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'}
            </span>
          </div>
        </div>

        {/* KPI 2: Expenses This Month */}
        <div className="bg-white rounded-xl p-5 flex flex-col justify-between border border-slate-200/80 shadow-xs">
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-[#3e4943]">Expenses This Month</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-bold text-[30px] text-[#0b1c30] leading-none tabular-nums">
                {formatMoney(thisMonthTotal, { currency })}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#006f67] tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#6e7a73] tabular-nums">
            <span>Month of {currentMonthName}</span>
            <span className="text-[#006f67] font-semibold">Current Billing Cycle</span>
          </div>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#005d42] flex items-center justify-center shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-[#0b1c30]">Date Range Filter</h3>
            <p className="text-xs text-[#6e7a73]">Trace expenses within specific audit dates</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#3e4943]">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#f8f9ff] border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-[#3e4943]">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#f8f9ff] border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetCurrentMonth}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#005d42] transition-colors cursor-pointer shadow-xs"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#3e4943] transition-colors cursor-pointer shadow-xs"
              title="Clear date filter to show all records"
            >
              <RotateCcw className="w-3 h-3 text-[#6e7a73]" />
              <span>Reset (Show All)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-base text-[#0b1c30]">Expense Ledger</h2>
            {(startDate || endDate) && (
              <span className="text-xs bg-[#eff4ff] text-[#005d42] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                Filtered Range
              </span>
            )}
          </div>
          <span className="text-xs text-[#6e7a73] font-medium">
            Showing {filteredExpenses.length} of {expenses.length} records
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-[#005d42] animate-spin" />
            <p className="text-sm text-[#6e7a73]">Loading brokerage expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-[#0b1c30]">No expenses recorded yet</h3>
            <p className="text-sm text-[#6e7a73] max-w-sm mt-1 mb-4">
              Keep your brokerage finances organized by logging office rent, bills, payroll, and maintenance costs.
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-[#0b1c30]">
              No expenses found for this date range
            </h3>
            <p className="text-sm text-[#6e7a73] max-w-sm mt-1 mb-4">
              Try adjusting your start or end date to view transactions outside of this range.
            </p>
            <button
              type="button"
              onClick={handleResetFilter}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#005d42] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Date Filter</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#f8f9ff] text-[#3e4943] text-xs font-semibold uppercase tracking-wider border-b border-slate-200/80">
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Description</th>
                  <th className="py-3.5 px-5 text-right">Amount</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-5 whitespace-nowrap text-[#0b1c30] font-medium text-xs">
                      {item.date ? new Date(item.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      }) : '—'}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {renderCategoryBadge(item.category || 'Other')}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-5 text-[#3e4943] max-w-md">
                      <span className="line-clamp-2">{item.description || '—'}</span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-5 whitespace-nowrap text-right font-display font-bold text-[#0b1c30] tabular-nums">
                      {formatMoney(item.amount, { currency })}
                    </td>

                    {/* Action: Delete Button */}
                    <td className="py-3.5 px-5 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(item.id)}
                        disabled={isDeleting === item.id}
                        className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        title="Delete expense"
                      >
                        {isDeleting === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0b1c30]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#005d42] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-[#0b1c30]">Record New Expense</h3>
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
            <form onSubmit={handleAddExpense} className="p-6 flex flex-col gap-4">
              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all cursor-pointer"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                  Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Office Rent for current month"
                  className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                  Amount ({currency}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#005d42]/30 focus:border-[#005d42] transition-all"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
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
                    <span>Save Expense</span>
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
