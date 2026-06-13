import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useDataStore } from '../../store/useDataStore';
import { useMobile } from '../../hooks/useMobile';
import { motion } from 'framer-motion';
import { Folder, Plus, Search, Trash2, Atom, Calculator, Code, FlaskConical, Dna, Landmark, Globe, BookOpen, Palette, Music, Briefcase, Scale, ChevronRight, X } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';
import SEO from '../../components/SEO';

/** Prevent Lucide icons from rendering as solid fills if global CSS sets svg fill. */
const iconCls = 'shrink-0 fill-none';

const getSubjectIcon = (subjectName: string) => {
  const name = subjectName.toLowerCase();

  if (name.includes('physics')) return <Atom className={iconCls} size={24} />;
  if (name.includes('math') || name.includes('calculus') || name.includes('algebra') || name.includes('geometry')) return <Calculator className={iconCls} size={24} />;
  if (name.includes('computer') || name.includes('programming') || name.includes('software') || name.includes('cs') || name.includes('it') || name.includes('coding')) return <Code className={iconCls} size={24} />;
  if (name.includes('chemistry') || name.includes('science')) return <FlaskConical className={iconCls} size={24} />;
  if (name.includes('biology') || name.includes('medical') || name.includes('anatomy') || name.includes('health')) return <Dna className={iconCls} size={24} />;
  if (name.includes('history') || name.includes('archeology') || name.includes('sociology')) return <Landmark className={iconCls} size={24} />;
  if (name.includes('geography') || name.includes('earth') || name.includes('environmental')) return <Globe className={iconCls} size={24} />;
  if (name.includes('english') || name.includes('literature') || name.includes('language') || name.includes('reading')) return <BookOpen className={iconCls} size={24} />;
  if (name.includes('art') || name.includes('design') || name.includes('drawing')) return <Palette className={iconCls} size={24} />;
  if (name.includes('music') || name.includes('audio')) return <Music className={iconCls} size={24} />;
  if (name.includes('business') || name.includes('economics') || name.includes('finance') || name.includes('accounting') || name.includes('marketing')) return <Briefcase className={iconCls} size={24} />;
  if (name.includes('law') || name.includes('politics') || name.includes('government') || name.includes('civics')) return <Scale className={iconCls} size={24} />;

  return <Folder className={iconCls} size={24} />;
};

export default function OrganizerHome() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { subjects, fetchSubjects: syncSubjects, lastFetched } = useDataStore();
  const loading = lastFetched.subjects === 0;
  const [showModal, setShowModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isMobile } = useMobile();

  const fetchSubjects = useCallback(async (force = false) => {
    if (!user) return;
    await syncSubjects(user.id, force);
  }, [user, syncSubjects]);

  useEffect(() => {
    fetchSubjects();

    const handleSync = (e: any) => {
      const { table } = e.detail;
      if (['study_materials', 'subjects', 'folders'].includes(table)) {
        fetchSubjects(true);
      }
    };

    window.addEventListener('nemesis_sync', handleSync);

    return () => {
      window.removeEventListener('nemesis_sync', handleSync);
    };
  }, [fetchSubjects]);


  const createSubject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !user) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      // insert a placeholder to instantiate the subject
      const { error } = await supabase.from('study_materials').insert({
        user_id: user.id,
        subject: newSubject.trim(),
        topic: 'General',
        title: 'Initial Directory Placeholder',
        file_type: 'note', // Using 'note' to avoid potential ENUM constraint errors with 'folder'
        file_url: 'placeholder', // Ensure it satisfies any NOT NULL constraints
        is_personal: true
      });

      if (error) {
        throw error;
      }

      setNewSubject('');
      setShowModal(false);
      fetchSubjects();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create subject.');
    } finally {
      setSubmitting(false);
    }
  }, [user, newSubject, fetchSubjects]);

  const deleteSubject = useCallback(async (subjectToDelete: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating
    e.stopPropagation(); // Stop bubbling to Link
    if (!user || (!window.confirm(`Are you sure you want to completely delete the subject "${subjectToDelete}" and all its contents?`))) return;
    
    try {
      // Batch delete all materials that have this subject
      const { error: err1 } = await supabase.from('study_materials')
        .delete()
        .eq('user_id', user.id)
        .eq('subject', subjectToDelete)
        .eq('is_personal', true);
        
      if (err1) throw err1;
        
      // Batch delete all folders that have this subject
      const { error: err2 } = await supabase.from('folders')
        .delete()
        .eq('user_id', user.id)
        .eq('subject', subjectToDelete);
        
      if (err2) throw err2;
        
      fetchSubjects();
    } catch (err: unknown) {
      const error = err as any;
      console.error('Delete subject error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      alert(`Failed to delete subject: ${error.message || 'Unknown error'}`);
    }
  }, [user, fetchSubjects]);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => {
    setShowModal(false);
    setNewSubject('');
    setErrorMsg('');
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleNewSubjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewSubject(e.target.value);
  }, []);

  const handleNavigateToSubject = useCallback((sub: string) => {
    navigate(`/organizer/${encodeURIComponent(sub)}`);
  }, [navigate]);

  return (
    <div className="px-4 pt-3 pb-6 md:pb-8 sm:px-4 md:p-8 max-w-5xl mx-auto flex flex-col items-stretch justify-start w-full flex-1 md:h-[calc(100vh-80px)] md:max-h-[calc(100vh-80px)] md:overflow-hidden transition-all mobile-hardened">
      <SEO 
        title="My Subjects" 
        description="Organize your study materials by subject. Create, manage, and access your academic notes and resources."
      />
      <div className="flex items-center justify-between gap-4 mb-6 md:mb-10 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-700 dark:from-white dark:to-slate-400">My Subjects</h1>
        </div>
        <button 
          onClick={openModal}
          className="flex items-center justify-center bg-sky-500 hover:bg-sky-600 text-white px-6 py-3.5 rounded-2xl shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-all hover:shadow-[0_12px_25px_rgba(14,165,233,0.4)] hover:-translate-y-1 active:scale-95 font-black text-[11px] uppercase tracking-widest shrink-0"
        >
          <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline ml-2">New Subject</span>
        </button>
      </div>

      <div className="relative mb-8 md:mb-12 shrink-0 group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors z-10 pointer-events-none">
          <Search size={20} strokeWidth={2.5} />
        </div>
        <input 
          type="text" 
          placeholder="Search subjects..." 
          className="w-full pl-12 pr-6 py-4 glass-premium border border-white/60 dark:border-slate-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 text-sm md:text-lg font-bold transition shadow-sm hover:shadow-md"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-premium border border-slate-200/50 dark:border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton variant="rectangle" className="w-12 h-12 rounded-xl" />
                <Skeleton variant="rectangle" className="w-8 h-8 rounded-lg opacity-40" />
              </div>
              <div className="space-y-2">
                <Skeleton variant="text" className="w-3/5 h-4" />
                <Skeleton variant="text" className="w-2/5 h-3 opacity-60" />
              </div>
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center glass-premium p-10 md:p-12 rounded-3xl border border-slate-200/60 dark:border-slate-800 cyberpunk:border-emerald-500/30 flex-1 flex flex-col justify-center items-center">
          <div className="w-20 h-20 bg-sky-50 dark:bg-slate-800/50 cyberpunk:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="text-sky-300 dark:text-sky-700 cyberpunk:text-emerald-500 opacity-60" size={40} />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 mb-2">No subjects yet</h3>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/70 mb-8 max-w-sm">Create your first subject to start organizing your study materials and tracking your progress.</p>
          <button 
            onClick={openModal}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-sky-500/20 active:scale-95"
          >
            <Plus size={20} /> Create Subject
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-6 min-h-0">
          {subjects.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <div className="text-center py-12 glass-premium rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/20">
              <Search className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
              <p className="text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-600 text-sm font-medium">No subjects found matching "{searchQuery}"</p>
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: isMobile ? 0 : 0.05 }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
            >
              {subjects.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).map(sub => (
                <motion.div
                  key={sub}
                  variants={{
                    hidden: { opacity: 0, scale: 0.95, y: 10 },
                    show: { opacity: 1, scale: 1, y: 0 }
                  }}
                  whileHover={isMobile ? undefined : { y: -5, scale: 1.005 }}
                  whileTap={isMobile ? undefined : { scale: 0.995 }}
                  transition={isMobile ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div 
                    onClick={() => handleNavigateToSubject(sub)}
                    className="glass-premium p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:border-sky-500/30 transition-all duration-300 group relative overflow-hidden block cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                       <div className="bg-sky-500/10 dark:bg-sky-500/20 p-2 rounded-xl">
                         <ChevronRight size={18} className="text-sky-500" />
                       </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5 mb-2 sm:mb-6">
                      <div className="w-11 h-11 sm:w-16 sm:h-16 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center text-sky-500 dark:text-sky-400 border border-slate-100 dark:border-slate-700/50 shadow-sm group-hover:scale-110 transition-transform duration-500">
                        {getSubjectIcon(sub)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-slate-900 dark:text-white tracking-tight text-sm sm:text-2xl truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-none mb-1.5">{sub}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black">Subject Module</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 sm:pt-5 border-t border-slate-100 dark:border-slate-800/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Launch Module</span>
                      <button 
                        type="button"
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all relative z-20 cursor-pointer border border-transparent hover:border-red-100"
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          deleteSubject(sub, e); 
                        }}
                        title="Delete Subject"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="bg-white dark:bg-slate-900 cyberpunk:bg-black rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 cyberpunk:border-emerald-500/50 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 cyberpunk:border-emerald-500/20 bg-slate-50/50 dark:bg-slate-800/20 cyberpunk:bg-emerald-500/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="bg-sky-500/10 p-2 rounded-lg">
                    <BookOpen className="text-sky-500 dark:text-sky-400 cyberpunk:text-emerald-400" size={20} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400">New Subject</h2>
               </div>
               <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={createSubject} className="p-6">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/30 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-900 uppercase tracking-widest mb-1.5 ml-1">Subject Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Molecular Biology" 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 cyberpunk:bg-black border border-slate-200 dark:border-slate-700 cyberpunk:border-emerald-500/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/50 text-slate-900 dark:text-white cyberpunk:text-emerald-400 placeholder:text-slate-400 transition"
                    value={newSubject}
                    onChange={handleNewSubjectChange}
                    autoFocus
                    required
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={closeModal}
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
