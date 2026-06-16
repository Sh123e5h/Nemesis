import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { BookOpen, Plus, Trash2, Clock, User, StickyNote, RefreshCw, Send, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminNote {
  id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  admin?: { email: string };
}



export default function AdminCollab() {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'sky' });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_collab_suite');
      if (error) throw error;
      
      if (data) {
        const mapped = data.map((n: any) => ({
          ...n,
          admin: { email: n.admin_email }
        }));
        setNotes(mapped);
      }
    } catch (err: any) {
      console.error('[AdminCollab] Sync failure:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    const subscription = supabase
      .channel('admin_notes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notes' }, () => {
        fetchNotes();
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [fetchNotes]);

  const addNote = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const adminId = sessionStorage.getItem('adminId');
    if (!adminId) return;

    setAdding(true);
    try {
      const { error } = await supabase.rpc('admin_manage_note', {
        p_action: 'create',
        p_note_data: newNote as any,
        p_note_id: null,
        p_admin_id: adminId
      });
      if (error) throw error;
      setNewNote({ title: '', content: '', color: 'sky' });
    } catch (err: any) {
      alert('Dispatch Error: ' + err.message);
    } finally {
      setAdding(false);
    }
  }, [newNote]);

  const deleteNote = useCallback(async (id: string) => {
    if (!confirm('Permanent deletion requested?')) return;
    const adminId = sessionStorage.getItem('adminId');
    
    try {
      const { error } = await supabase.rpc('admin_manage_note', {
        p_action: 'delete',
        p_note_data: null,
        p_note_id: id,
        p_admin_id: adminId
      });
      if (error) throw error;
    } catch (err: any) {
      alert('Purge Error: ' + err.message);
    }
  }, []);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const colors = [
    { id: 'sky', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600' },
    { id: 'rose', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-600' },
    { id: 'amber', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600' },
    { id: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
    { id: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            Admin Collab Hub
          </h1>
          <p className="text-slate-500 text-sm mt-1 ml-13 font-medium">Coordinate Intelligence briefings & moderator briefings.</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
              <input 
                type="text" 
                placeholder="Search briefings..."
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 outline-none w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Creation Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-8">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Plus size={18} className="text-sky-500" /> New Briefing
            </h3>
            <form onSubmit={addNote} className="space-y-4">
              <input 
                type="text" required placeholder="Subject Line"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
                value={newNote.title}
                onChange={e => setNewNote({ ...newNote, title: e.target.value })}
              />
              <textarea 
                required placeholder="Intelligence Details..." rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                value={newNote.content}
                onChange={e => setNewNote({ ...newNote, content: e.target.value })}
              />
              
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Priority Color</span>
                <div className="flex gap-2">
                  {colors.map(c => (
                    <button 
                      key={c.id} type="button"
                      onClick={() => setNewNote({ ...newNote, color: c.id })}
                      className={`w-8 h-8 rounded-lg border-2 transition ${c.bg} ${newNote.color === c.id ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent opacity-60'}`}
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit" disabled={adding}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-sky-600 transition disabled:opacity-50 text-xs flex items-center justify-center gap-2"
              >
                {adding ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                {adding ? 'Syncing...' : 'Dispatch Briefing'}
              </button>
            </form>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="animate-spin text-sky-500" size={32} />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
               <StickyNote size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 font-medium italic">No briefings found. Start a new coordination session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredNotes.map((note) => {
                  const style = colors.find(c => c.id === note.color) || colors[0];
                  return (
                    <motion.div 
                      layout
                      key={note.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className={`p-6 rounded-2xl border ${style.bg} ${style.border} h-fit space-y-4`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-black uppercase tracking-tight text-lg ${style.text} leading-tight`}>{note.title}</h4>
                        <button onClick={() => deleteNote(note.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                         <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-6 h-6 bg-white/50 rounded-lg flex items-center justify-center shrink-0">
                               <User size={12} className="text-slate-500" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 truncate">{note.admin?.email}</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock size={12} />
                            <span className="text-[10px] font-bold">{new Date(note.created_at).toLocaleDateString()}</span>
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
