import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { ChevronLeft, Folder, Plus, Trash2, ChevronRight, X } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';

export default function SubjectView() {
  const { subject } = useParams<{ subject: string }>();
  const decodedSubject = decodeURIComponent(subject || '');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTopics = useCallback(async () => {
    if (!user || !decodedSubject) return;
    
    // Fetch from materials
    const { data: materialsData } = await supabase
      .from('study_materials')
      .select('topic')
      .eq('user_id', user.id)
      .eq('subject', decodedSubject)
      .eq('is_personal', true);
      
    // Fetch from folders that have valid subjects
    const { data: foldersData } = await supabase
      .from('folders')
      .select('topic')
      .eq('user_id', user.id)
      .eq('subject', decodedSubject)
      .not('topic', 'is', null);
    
    const allTopics = [
      ...(materialsData?.map(d => d.topic) || []),
      ...(foldersData?.map(d => d.topic) || [])
    ].filter(Boolean);

    const distinct = Array.from(new Set(allTopics));
    setTopics(distinct);
    setLoading(false);
  }, [user, decodedSubject]);

  useEffect(() => {
    fetchTopics();

    const handleSync = (e: any) => {
      const { table } = e.detail;
      if (table === 'study_materials' || table === 'folders' || table === 'subjects') {
        fetchTopics();
      }
    };

    window.addEventListener('nemesis_sync', handleSync);

    return () => {
      window.removeEventListener('nemesis_sync', handleSync);
    };
  }, [fetchTopics]);


  const createTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !user) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.from('study_materials').insert({
        user_id: user.id,
        subject: decodedSubject,
        topic: newTopic.trim(),
        title: 'Initial Topic Placeholder',
        file_type: 'note',
        file_url: 'placeholder',
        is_personal: true
      });

      if (error) throw error;

      setNewTopic('');
      setShowModal(false);
      fetchTopics();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create topic');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTopic = async (topicToDelete: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to the topic
    e.stopPropagation(); // Stop event from bubbling to the Link component
    if (!user || (!window.confirm(`Are you sure you want to completely delete the topic "${topicToDelete}" and all its contents?`))) return;
    
    try {
      // Batch delete all materials that have this subject & topic
      const { error: err1 } = await supabase.from('study_materials')
        .delete()
        .eq('user_id', user.id)
        .eq('subject', decodedSubject)
        .eq('topic', topicToDelete)
        .eq('is_personal', true);
        
      if (err1) throw err1;
        
      // Batch delete all folders matching this topic to clean up empty classifications
      const { error: err2 } = await supabase.from('folders')
        .delete()
        .eq('user_id', user.id)
        .eq('subject', decodedSubject)
        .eq('topic', topicToDelete);
        
      if (err2) throw err2;
        
      fetchTopics();
    } catch (err: any) {
      console.error('Delete topic error:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      alert(`Failed to delete topic: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="px-4 pt-3 pb-6 md:pb-8 md:p-8 max-w-5xl mx-auto flex flex-col w-full min-h-0 min-h-screen md:min-h-0 md:h-[calc(100vh-80px)] mobile-hardened">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 md:mb-8 shrink-0">
        <Link to="/organizer" className="w-10 h-10 flex items-center justify-center glass-premium border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-500 hover:text-sky-500 transition shrink-0 group">
          <ChevronLeft size={20} className="transition-transform group-active:scale-90" />
        </Link>
        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 flex-1 min-w-0 truncate">
          {decodedSubject} <span className="text-slate-400 dark:text-slate-600 cyberpunk:text-emerald-900 font-medium">— Topics</span>
        </h1>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center bg-sky-500 text-white w-10 h-10 sm:w-auto sm:px-4 sm:py-2 rounded-xl hover:bg-sky-600 shadow-sm transition shrink-0 shadow-lg shadow-sky-500/20 active:scale-95"
        >
          <Plus size={20} /> <span className="hidden sm:inline ml-2 font-bold">New Topic</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 overflow-y-auto">
           {[1, 2, 3, 4, 5].map(i => (
             <div key={i} className="glass-premium border border-slate-200/50 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <Skeleton variant="rectangle" className="w-10 h-10 rounded-lg" />
                 <Skeleton variant="text" className="w-32 h-4" />
               </div>
               <Skeleton variant="rectangle" className="w-8 h-8 rounded-lg opacity-40" />
             </div>
           ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center glass-premium p-10 md:p-12 rounded-3xl border border-slate-200/60 dark:border-slate-800 cyberpunk:border-emerald-500/30 flex-1 flex flex-col justify-center items-center">
          <div className="w-16 h-16 bg-sky-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <Folder className="text-sky-300 dark:text-sky-700 cyberpunk:text-emerald-500 opacity-60" size={32} />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-2">No topics yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/70 mb-6 max-w-xs mx-auto text-center">Organize your content into specific topics to stay focused and efficient.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="text-sky-500 font-bold text-sm hover:underline uppercase tracking-widest"
          >
            Create your first topic
          </button>
        </div>
      ) : (
        <div className="flex-1 pr-1 pb-6 md:pb-6 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-3">
            {topics.map(topic => (
              <div 
                key={topic} 
                onClick={() => navigate(`/organizer/${encodeURIComponent(decodedSubject)}/${encodeURIComponent(topic)}`)}
                className="glass-premium p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 cyberpunk:border-emerald-500/30 hover:border-sky-500/50 dark:hover:border-sky-500/50 transition-all duration-300 flex items-center justify-between group md:hover:-translate-x-1 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-500 group-hover:bg-sky-500/20 transition-all duration-300 glow-sky group-hover:scale-110">
                    <Folder size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white cyberpunk:text-emerald-400 text-sm md:text-base group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors tracking-tight">{topic}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-sky-500" />
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteTopic(topic, e);
                    }}
                    className="p-2 text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-300 hover:scale-125 relative z-20 cursor-pointer"
                    title="Delete Topic"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="bg-white dark:bg-slate-900 cyberpunk:bg-black rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 cyberpunk:border-emerald-500/20 bg-slate-50/50 dark:bg-slate-800/20 cyberpunk:bg-emerald-500/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="bg-sky-500/10 p-2 rounded-lg">
                    <Folder className="text-sky-500 dark:text-sky-400 cyberpunk:text-emerald-400" size={20} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400">New Topic</h2>
               </div>
               <button onClick={() => { setShowModal(false); setErrorMsg(''); setNewTopic(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={createTopic} className="p-6">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-900 uppercase tracking-widest mb-1.5 ml-1">Topic Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Molecular Structure" 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 text-slate-900 dark:text-white cyberpunk:text-emerald-400 placeholder:text-slate-400 transition"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    autoFocus
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setNewTopic(''); setErrorMsg(''); }}
                  className="flex-1 px-4 py-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 disabled:opacity-50 transition shadow-lg shadow-sky-500/20 active:scale-95"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
