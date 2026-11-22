import React, { useState, useEffect } from 'react';
import { Upload, Map, Trash2, X, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';

export const MapsPage = () => {
  const { orgId } = useAuth();
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [societyName, setSocietyName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (orgId) fetchMaps();
  }, [orgId]);

  const fetchMaps = async () => {
    setLoading(true);
    const { data } = await supabase.from('society_maps').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (data) setMaps(data);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !orgId) return;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${orgId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('society-maps')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('society-maps')
        .getPublicUrl(uploadData.path);

      const { error: dbError } = await supabase.from('society_maps').insert({
        org_id: orgId,
        title,
        society_name: societyName,
        file_url: publicUrlData.publicUrl,
        file_type: fileExt === 'pdf' ? 'PDF' : 'Image',
      });

      if (dbError) throw dbError;

      setIsModalOpen(false);
      setTitle(''); setSocietyName(''); setFile(null);
      fetchMaps();
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this map?')) return;
    await supabase.from('society_maps').delete().eq('id', id);
    fetchMaps();
  };

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30]">Society Maps</h1>
          <p className="text-[13px] text-[#6e7a73] mt-1">Upload society layout PDFs and images (DHA, Bahria, etc.) for your team.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="h-10 px-4 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-2 text-[13px] font-semibold shadow-xs">
          <Upload className="w-4 h-4" /> Upload Map
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Total Maps</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{maps.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#eff4ff] text-[#005d42] flex items-center justify-center"><Map className="w-5 h-5" /></div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">PDF Documents</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{maps.filter(m => m.file_type === 'PDF').length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[12px] font-medium text-[#3e4943]">Image Maps</span>
            <p className="font-display font-bold text-[28px] text-[#0b1c30] mt-1">{maps.filter(m => m.file_type === 'Image').length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><ImageIcon className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-5">Map Title</th>
              <th className="py-3 px-5">Society Name</th>
              <th className="py-3 px-5">File Type</th>
              <th className="py-3 px-5">Date Uploaded</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[13px]">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#005d42]" /></td></tr>
            ) : maps.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">No maps uploaded yet.</td></tr>
            ) : (
              maps.map(map => (
                <tr key={map.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-5 font-semibold text-[#0b1c30] flex items-center gap-2">
                    <Map className="w-4 h-4 text-slate-400" /> {map.title}
                  </td>
                  <td className="py-4 px-5 text-slate-600">{map.society_name}</td>
                  <td className="py-4 px-5">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${map.file_type === 'PDF' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{map.file_type}</span>
                  </td>
                  <td className="py-4 px-5 text-slate-500">{new Date(map.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-5 text-right flex justify-end gap-2">
                    <a href={map.file_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-[#eff4ff] text-[#005d42] font-semibold text-xs rounded-lg hover:bg-[#e2edff]">View Map</a>
                    <button onClick={() => handleDelete(map.id)} className="px-3 py-1.5 bg-red-50 text-red-600 font-semibold text-xs rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <h2 className="font-display font-bold text-lg">Upload Society Map</h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Map Title *</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. DHA Phase 6 Layout" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Society Name *</label>
                <input required type="text" value={societyName} onChange={e => setSocietyName(e.target.value)} placeholder="e.g. DHA" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select File (PDF/Image) *</label>
                <input required type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#eff4ff] file:text-[#005d42] hover:file:bg-[#e2edff] cursor-pointer" />
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
