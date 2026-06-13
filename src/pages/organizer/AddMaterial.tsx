import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { FileText, Link as LinkIcon, Video, Type, UploadCloud, Brain } from 'lucide-react';
import { uploadSmart } from '../../lib/storage';
import { awardPoints } from '../../lib/gamification';
import { SYNC_SHARDS } from '../../lib/gdrive';
import { syncEngine } from '../../lib/SyncEngine';

export default function AddMaterial() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [type, setType] = useState('pdf');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      supabase.from('study_materials').select('subject').eq('user_id', user.id).then(({ data }) => {
        if (data) {
          const subs = Array.from(new Set(data.map(d => d.subject)));
          setExistingSubjects(subs as string[]);
        }
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      let file_url = content; // For links and videos
      let storage_hash = null;

      if (type === 'pdf') {
        if (!file) throw new Error('Please select a PDF file.');
        const { url: publicUrl, hash } = await uploadSmart(file, 'materials-files');
        file_url = publicUrl;
        storage_hash = hash;
      } else if (type === 'note') {
        if (!content) throw new Error('Note content cannot be empty.');
        // Save note text as a .txt blob
        const blob = new Blob([content], { type: 'text/plain' });
        const fileObj = new File([blob], `${Date.now()}.txt`, { type: 'text/plain' });
        const { url: publicUrl, hash } = await uploadSmart(fileObj, 'materials-files');
        file_url = publicUrl;
        storage_hash = hash;
      } else {
        if (!content) throw new Error('URL cannot be empty.');
      }

      const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);

      const { error: insertError } = await supabase.from('study_materials').insert({
        user_id: user.id,
        subject,
        topic,
        title,
        file_type: type,
        file_url,
        tags: tagArray,
        is_personal: true,
        storage_hash
      });

      if (insertError) throw insertError;
      
      // Award points for adding material
      await awardPoints(user.id, 'upload_material');
      
      // Trigger background sync
      syncEngine.markDirty(SYNC_SHARDS.ORGANIZER);
      
      navigate(`/organizer/${subject}/${topic}`);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mobile-hardened">
      <div className="flex items-center gap-4">
        <div className="bg-sky-500/10 p-3 rounded-2xl text-sky-500 glow-sky">
          <UploadCloud size={32} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Add Material</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Populate your intelligence matrix</p>
        </div>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center gap-3 animate-in shake duration-500">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
          <p className="text-sm font-bold uppercase tracking-wide">{error}</p>
        </div>
      )}

      <div className="flex gap-2 p-1.5 glass-premium bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl overflow-x-auto border border-slate-200/50 dark:border-slate-800 scrollbar-hide">
        {[
          { id: 'pdf', icon: FileText, label: 'PDF Upload' },
          { id: 'note', icon: Type, label: 'Text Note' },
          { id: 'link', icon: LinkIcon, label: 'Web Link' },
          { id: 'video', icon: Video, label: 'Video URL' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setType(t.id); setContent(''); setFile(null); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              type === t.id 
                ? 'bg-white dark:bg-slate-800 text-sky-500 shadow-lg shadow-sky-500/10 scale-105' 
                : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="glass-premium bg-white/40 dark:bg-slate-900/40 p-8 md:p-10 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800 space-y-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Brain size={120} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Subject</label>
            <input 
              type="text" 
              required
              value={subject} 
              onChange={e => setSubject(e.target.value)}
              list="subjects"
              className="w-full bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner" 
              placeholder="e.g., Mathematics" 
            />
            <datalist id="subjects">
              {existingSubjects.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Topic</label>
            <input 
              type="text" 
              required
              value={topic} 
              onChange={e => setTopic(e.target.value)}
              className="w-full bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner" 
              placeholder="e.g., Calculus" 
            />
          </div>
        </div>

        <div className="space-y-2 relative">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Title</label>
          <input 
            type="text" 
            required
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner" 
            placeholder="Material title" 
          />
        </div>

        <div className="space-y-2 relative">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Tags (comma separated)</label>
          <input 
            type="text" 
            value={tags} 
            onChange={e => setTags(e.target.value)}
            className="w-full bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner" 
            placeholder="e.g., exam, revision, important" 
          />
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 relative">
          {type === 'pdf' && (
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-[2rem] cursor-pointer bg-slate-50/50 dark:bg-slate-950/20 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300 group/upload">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-4 bg-sky-500/10 rounded-2xl text-sky-500 mb-4 group-hover/upload:scale-110 group-hover/upload:rotate-3 transition-transform duration-300">
                    <UploadCloud size={40} />
                  </div>
                  <p className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest"><span className="text-sky-500">Click to upload</span> or drag and drop</p>
                  {file && (
                    <div className="mt-4 px-4 py-2 bg-sky-500/10 text-sky-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-sky-500/20 flex items-center gap-2">
                       <FileText size={14} /> {file.name}
                    </div>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} required />
              </label>
            </div>
          )}

          {type === 'note' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Note Content</label>
              <textarea
                required
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700 rounded-3xl p-6 text-sm font-medium text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 shadow-inner min-h-[250px] resize-none leading-relaxed"
                placeholder="Write your high-density notes here..."
              />
            </div>
          )}

          {(type === 'link' || type === 'video') && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">{type === 'video' ? 'Video' : 'Web'} URL</label>
              <input
                type="url"
                required
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 transition shadow-inner"
                placeholder={`Enter full ${type.toUpperCase()} URL (https://...)`}
              />
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-6 bg-sky-500 hover:bg-sky-600 text-white font-black uppercase tracking-[0.2em] text-sm py-5 rounded-2xl transition-all duration-300 shadow-2xl shadow-sky-500/30 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 group/btn"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Sync Material 
              <UploadCloud size={20} className="group-hover/btn:translate-y-[-2px] transition-transform" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
