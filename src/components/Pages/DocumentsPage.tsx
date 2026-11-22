import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, X, Loader2, Folder } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';

export const DocumentsPage = () => {
  const { orgId } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('Contract');
  const [leadId, setLeadId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: docs } = await supabase.from('documents').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (docs) setDocuments(docs);

    const { data: leadsData } = await supabase.from('leads').select('id, name').eq('org_id', orgId);
    if (leadsData) setLeads(leadsData);

    const { data: propsData } = await supabase.from('properties').select('id, title').eq('org_id', orgId);
    if (propsData) setProperties(propsData);
    
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !orgId) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orgId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('org-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('org-documents')
        .getPublicUrl(uploadData.path);

      const { error: dbError } = await supabase.from('documents').insert({
        org_id: orgId,
        title,
        doc_type: docType,
        lead_id: leadId || null,
        property_id: propertyId || null,
        file_url: publicUrlData.publicUrl,
      });

      if (dbError) throw dbError;

      setIsModalOpen(false);
      setTitle(''); setFile(null); setLeadId(''); setPropertyId('');
      fetchData();
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    await supabase.from('documents').delete().eq('id', id);
    fetchData();
  };

  const getLinkedName = (doc: any) => {
    if (doc.lead_id) return `Lead: ${leads.find(l => l.id === doc.lead_id)?.name || 'Unknown'}`;
    if (doc.property_id) return `Property: ${properties.find(p => p.id === doc.property_id)?.title || 'Unknown'}`;
    return 'Unlinked';
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30]">Documents Vault</h1>
          <p className="text-[13px] text-[#6e7a73] mt-1">Upload contracts, KYC, and receipts. Link them directly to leads and properties.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-2 text-[13px] font-semibold shadow-xs">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Total Documents</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{documents.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#005d42] flex items-center justify-center"><Folder className="w-5 h-5" /></div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Contracts</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{documents.filter(d => d.doc_type === 'Contract').length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">KYC / IDs</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{documents.filter(d => d.doc_type === 'KYC/CNIC').length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-5">Document Title</th>
              <th className="py-3 px-5">Type</th>
              <th className="py-3 px-5">Linked To</th>
              <th className="py-3 px-5">Date Uploaded</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[13px]">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#005d42]" /></td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">No documents uploaded yet.</td></tr>
            ) : (
              documents.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-5 font-semibold text-[#0b1c30] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> {doc.title}
                  </td>
                  <td className="py-4 px-5">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">{doc.doc_type}</span>
                  </td>
                  <td className="py-4 px-5 text-slate-500">{getLinkedName(doc)}</td>
                  <td className="py-4 px-5 text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-5 text-right flex justify-end gap-2">
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-[#eff4ff] text-[#005d42] font-semibold text-xs rounded-lg hover:bg-[#e2edff]">View File</a>
                    <button onClick={() => handleDelete(doc.id)} className="px-3 py-1.5 bg-red-50 text-red-600 font-semibold text-xs rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <h2 className="font-display font-bold text-lg">Upload Document</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Document Title *</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sale Agreement" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                  <option>Contract</option>
                  <option>KYC/CNIC</option>
                  <option>Receipt</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Link to Lead</label>
                  <select value={leadId} onChange={e => setLeadId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                    <option value="">None</option>
                    {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Link to Property</label>
                  <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer">
                    <option value="">None</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select File *</label>
                <input required type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#eff4ff] file:text-[#005d42] hover:file:bg-[#e2edff] cursor-pointer" />
              </div>
              <button type="submit" disabled={uploading} className="w-full py-2.5 bg-[#005d42] hover:bg-[#004d37] text-white font-bold rounded-xl mt-2 flex justify-center items-center gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Upload & Save'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
