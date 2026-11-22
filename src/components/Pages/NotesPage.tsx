import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, FileText, Loader2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';

export const NotesPage = () => {
  const { orgId, user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Editor state
  const [activeNote, setActiveNote] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (orgId && user?.id) fetchNotes();
  }, [orgId, user?.id]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
    setLoading(false);
  };

  const handleSelectNote = (note: any) => {
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content || '');
  };

  const handleNewNote = () => {
    setActiveNote(null);
    setTitle('');
    setContent('');
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  };

  const handleSave = async () => {
    if (!title.trim() || !orgId || !user?.id) return;
    setSaving(true);

    try {
      if (activeNote) {
        // Update
        const { error } = await supabase
          .from('notes')
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq('id', activeNote.id);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('notes')
          .insert({ org_id: orgId, user_id: user.id, title, content })
          .select()
          .single();
        if (error) throw error;
        setActiveNote(data);
      }
      fetchNotes();
    } catch (error: any) {
      alert(`Error saving note: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;
    await supabase.from('notes').delete().eq('id', id);
    if (activeNote?.id === id) handleNewNote();
    fetchNotes();
  };

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-5 sm:p-6 lg:p-8 flex flex-col gap-6 w-full h-[calc(100vh-80px)]">
      <div className="flex flex-col sm:flex-row justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#0b1c30]">Private Notes</h1>
          <p className="text-[13px] text-[#6e7a73] mt-1">Personal notebook. Only you can see these notes.</p>
        </div>
        <button 
          type="button" 
          onClick={handleNewNote} 
          className="h-10 px-4 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white flex items-center gap-2 text-[13px] font-semibold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left Sidebar - Note List */}
        <div className="w-1/3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#005d42]" /></div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No notes found.</div>
            ) : (
              filteredNotes.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => handleSelectNote(note)}
                  className={`p-4 border-b border-slate-50 cursor-pointer transition-colors group ${activeNote?.id === note.id ? 'bg-[#eff4ff] border-l-4 border-l-[#005d42]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-[14px] text-[#0b1c30] truncate pr-2">{note.title}</h3>
                    <button onClick={(e) => handleDelete(note.id, e)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[12px] text-slate-500 truncate mt-1">{note.content || 'No content'}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block">{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Editor */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> {activeNote ? 'Editing Note' : 'New Note'}
            </span>
            <button onClick={handleSave} disabled={saving || !title.trim()} className="px-4 py-1.5 bg-[#005d42] hover:bg-[#004d37] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Note
            </button>
          </div>
          <div className="flex flex-col flex-1 p-6 gap-4">
            <input 
              ref={titleInputRef}
              type="text" 
              placeholder="Note Title..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-bold text-[#0b1c30] border-none focus:outline-none placeholder:text-slate-300"
            />
            <textarea 
              placeholder="Write your note here..." 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full flex-1 resize-none text-[14px] text-slate-600 border-none focus:outline-none leading-relaxed placeholder:text-slate-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
