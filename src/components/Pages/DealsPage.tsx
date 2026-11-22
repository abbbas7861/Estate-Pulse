import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';
import { formatMoney, useCurrency } from '../../config/regional';

export const DealsPage = () => {
  const { orgId } = useAuth();
  const [currency] = useCurrency();
  const [deals, setDeals] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [status, setStatus] = useState('negotiation');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: dealsData } = await supabase.from('deals').select('*, leads(name), properties(title)').eq('org_id', orgId).order('created_at', { ascending: false });
    if (dealsData) setDeals(dealsData);

    const { data: leadsData } = await supabase.from('leads').select('id, name').eq('org_id', orgId);
    if (leadsData) setLeads(leadsData);

    const { data: propsData } = await supabase.from('properties').select('id, title').eq('org_id', orgId);
    if (propsData) setProperties(propsData);
    
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    try {
      await supabase.from('deals').insert({
        org_id: orgId,
        lead_id: leadId || null,
        property_id: propertyId || null,
        deal_value: Number(dealValue) || 0,
        status
      });
      setIsModalOpen(false);
      setLeadId(''); setPropertyId(''); setDealValue(''); setStatus('negotiation');
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deal?')) return;
    await supabase.from('deals').delete().eq('id', id);
    fetchData();
  };

  const activeDeals = deals.filter(d => d.status !== 'closed');
  const totalVolume = deals.reduce((sum, d) => sum + Number(d.deal_value), 0);

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30]">Deals Pipeline</h1>
          <p className="text-[13px] text-[#6e7a73] mt-1">Track offers, negotiations, and closed transactions.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-2 text-[13px] font-semibold shadow-xs">
          <Plus className="w-4 h-4" /> Add Deal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Active Deals</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{activeDeals.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#005d42] flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Total Deal Volume</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{formatMoney(totalVolume, { compact: true, currency })}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            {currency === 'PKR' ? 'Rs' : '$'}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Closed Deals</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{deals.filter(d => d.status === 'closed').length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-5">Buyer (Lead)</th>
              <th className="py-3 px-5">Property</th>
              <th className="py-3 px-5">Deal Value</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[13px]">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#005d42]" /></td></tr>
            ) : deals.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">No deals tracked yet.</td></tr>
            ) : (
              deals.map(deal => (
                <tr key={deal.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-5 font-semibold text-[#0b1c30]">{deal.leads?.name || 'Unknown Buyer'}</td>
                  <td className="py-4 px-5 text-slate-600">{deal.properties?.title || 'No Property Linked'}</td>
                  <td className="py-4 px-5 font-bold text-[#005d42]">{formatMoney(deal.deal_value, { compact: false, currency })}</td>
                  <td className="py-4 px-5">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 capitalize">{deal.status}</span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <button onClick={() => handleDelete(deal.id)} className="px-3 py-1.5 bg-red-50 text-red-600 font-semibold text-xs rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#0b1c30] text-white p-5 flex justify-between items-center">
              <h2 className="font-display font-bold text-lg">Add New Deal</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Buyer (Lead)</label>
                <select value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                  <option value="">Select Lead</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Property</label>
                <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                  <option value="">Select Property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Deal Value</label>
                <input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="e.g. 5000000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                  <option value="negotiation">Negotiation</option>
                  <option value="agreement">Agreement</option>
                  <option value="payment">Payment</option>
                  <option value="closed">Closed / Won</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#005d42] hover:bg-[#004d37] text-white font-bold rounded-xl mt-2 flex justify-center items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save Deal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
