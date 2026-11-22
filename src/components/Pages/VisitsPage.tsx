import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, X, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';

export const VisitsPage = () => {
  const { orgId } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: visitsData } = await supabase.from('visits').select('*, leads(name), properties(title)').eq('org_id', orgId).order('visit_date', { ascending: true });
    if (visitsData) setVisits(visitsData);

    const { data: leadsData } = await supabase.from('leads').select('id, name').eq('org_id', orgId);
    if (leadsData) setLeads(leadsData);

    const { data: propsData } = await supabase.from('properties').select('id, title').eq('org_id', orgId);
    if (propsData) setProperties(propsData);
    
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !visitDate) return;
    setSaving(true);
    try {
      await supabase.from('visits').insert({
        org_id: orgId,
        lead_id: leadId || null,
        property_id: propertyId || null,
        visit_date: new Date(visitDate).toISOString(),
        notes
      });
      setIsModalOpen(false);
      setLeadId(''); setPropertyId(''); setVisitDate(''); setNotes('');
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this visit?')) return;
    await supabase.from('visits').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30]">Scheduled Visits</h1>
          <p className="text-[13px] text-[#6e7a73] mt-1">Manage site tours and client meetings.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-2 text-[13px] font-semibold shadow-xs">
          <Plus className="w-4 h-4" /> Schedule Visit
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-5">Date & Time</th>
              <th className="py-3 px-5">Lead</th>
              <th className="py-3 px-5">Property</th>
              <th className="py-3 px-5">Notes</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[13px]">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#005d42]" /></td></tr>
            ) : visits.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">No visits scheduled.</td></tr>
            ) : (
              visits.map(visit => (
                <tr key={visit.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-5 font-semibold text-[#0b1c30] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#005d42]" />
                    {new Date(visit.visit_date).toLocaleString()}
                  </td>
                  <td className="py-4 px-5 text-slate-600">{visit.leads?.name || 'Unknown'}</td>
                  <td className="py-4 px-5 text-slate-600">{visit.properties?.title || 'No Property'}</td>
                  <td className="py-4 px-5 text-slate-500 truncate max-w-[200px]">{visit.notes}</td>
                  <td className="py-4 px-5 text-right">
                    <button onClick={() => handleDelete(visit.id)} className="px-3 py-1.5 bg-red-50 text-red-600 font-semibold text-xs rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <h2 className="font-display font-bold text-lg">Schedule Visit</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date & Time *</label>
                <input required type="datetime-local" value={visitDate} onChange={e => setVisitDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Lead</label>
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
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Client will bring family" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#005d42] hover:bg-[#004d37] text-white font-bold rounded-xl mt-2 flex justify-center items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />} Schedule Visit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
