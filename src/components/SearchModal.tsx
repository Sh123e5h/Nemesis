import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Users, CheckCircle2, X, ChevronRight, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

interface SearchResult {
  id: string;
  type: 'material' | 'group' | 'task' | 'file';
  title: string;
  subtitle?: string;
  path: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleNavigate(results[selectedIndex].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleNavigate, onClose]);

  useEffect(() => {
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;
        
        // Use Promise.allSettled so if one table fails, the others still work!
        const results = await Promise.allSettled([
          // 1. Materials
          supabase
            .from('study_materials')
            .select('id, title, subject, topic')
            .or(`title.ilike.${searchTerm},subject.ilike.${searchTerm},topic.ilike.${searchTerm}`)
            .limit(4),
            
          // 2. Groups
          supabase
            .from('groups')
            .select('id, name, description')
            .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(4),
            
          // 3. Tasks
          supabase
            .from('tasks')
            .select('id, title, group_id')
            .ilike('title', searchTerm)
            .limit(4),
            
          // 4. Files
          supabase
            .from('files')
            .select('id, file_name, group_id')
            .ilike('file_name', searchTerm)
            .limit(4),
            
          // 5. People
          supabase
            .from('public_profiles')
            .select('id, full_name, username')
            .or(`full_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
            .limit(4)
        ]);

        const combined: SearchResult[] = [];

        // Parse Materials
        if (results[0].status === 'fulfilled' && results[0].value.data) {
          combined.push(...results[0].value.data.map((m: any) => ({
            id: m.id,
            type: 'material' as const,
            title: m.title,
            subtitle: m.subject ? `${m.subject} • ${m.topic || ''}` : 'Study Material',
            path: `/organizer/preview/${m.id}`
          })));
        }

        // Parse Groups
        if (results[1].status === 'fulfilled' && results[1].value.data) {
          combined.push(...results[1].value.data.map((g: any) => ({
            id: g.id,
            type: 'group' as const,
            title: g.name,
            subtitle: g.description || 'Neural Group',
            path: `/groups/${g.id}`
          })));
        }

        // Parse Tasks
        if (results[2].status === 'fulfilled' && results[2].value.data) {
          combined.push(...results[2].value.data.map((t: any) => ({
            id: t.id,
            type: 'task' as const,
            title: t.title,
            subtitle: t.group_id ? 'Group Task' : 'Personal Task',
            path: t.group_id ? `/groups/${t.group_id}/planner` : `/planner`
          })));
        }

        // Parse Files
        if (results[3].status === 'fulfilled' && results[3].value.data) {
          combined.push(...results[3].value.data.map((f: any) => ({
            id: f.id,
            type: 'file' as const,
            title: f.file_name,
            subtitle: 'Secure File',
            path: `/groups/${f.group_id}/files`
          })));
        }
        
        // Parse People
        if (results[4].status === 'fulfilled' && results[4].value.data) {
          combined.push(...results[4].value.data.map((p: any) => ({
            id: p.id,
            type: 'group' as const,
            title: p.full_name || p.username,
            subtitle: `@${p.username}`,
            path: `/profile/${p.username}`
          })));
        }

        // Deduplicate just in case
        const uniqueResults = combined.filter((v, i, a) => a.findIndex(t => (t.id === v.id && t.type === v.type)) === i);
        
        setResults(uniqueResults);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, user]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/30 dark:bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 sm:rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden border-0 sm:border border-white/20 dark:border-white/5 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85vh] transition-colors duration-500 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 sm:gap-4 p-4 sm:p-6 border-b border-slate-100 dark:border-white/5 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-6 bg-white/50 dark:bg-black/20 backdrop-blur-md z-10 shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 dark:bg-sky-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0 transition-transform group-hover:scale-110">
                <Search size={24} className="glow-white" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Query Nemesis Intelligence..."
                className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-lg sm:text-2xl text-slate-900 dark:text-white w-full min-w-0 px-2 font-black uppercase tracking-tight placeholder:text-slate-400 dark:placeholder:text-slate-600"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shrink-0 shadow-sm">
                Ctrl K
              </div>
              <button onClick={onClose} className="p-3 sm:p-2.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shrink-0 active:scale-90">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 custom-scrollbar">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
                  <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin" />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Decoding Neural Fragments...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {results.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleNavigate(result.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-300 group relative overflow-hidden ${
                        index === selectedIndex 
                        ? 'bg-sky-500 text-white shadow-xl shadow-sky-500/20 scale-[1.01] z-10' 
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-100/50 dark:border-white/5'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:rotate-12 ${
                        index === selectedIndex 
                        ? 'bg-white/20 text-white' 
                        : result.type === 'material' ? 'bg-orange-500/10 text-orange-500 dark:bg-orange-500/20' :
                        result.type === 'group' ? 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20' :
                        result.type === 'file' ? 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20' :
                        'bg-violet-500/10 text-violet-500 dark:bg-violet-500/20'
                      }`}>
                        {result.type === 'material' && <FileText size={22} />}
                        {result.type === 'group' && <Users size={22} />}
                        {result.type === 'file' && <File size={22} />}
                        {result.type === 'task' && <CheckCircle2 size={22} />}
                      </div>

                      <div className="flex-1 text-left min-w-0">
                        <div className={`font-black text-sm sm:text-base leading-tight uppercase tracking-tight truncate ${index === selectedIndex ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 truncate opacity-70 ${index === selectedIndex ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {result.subtitle}
                          </div>
                        )}
                      </div>

                      <div className={`flex items-center gap-3 transition-all duration-300 ${index === selectedIndex ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{result.type}</span>
                        <div className="p-2 bg-white/20 rounded-xl">
                          <ChevronRight size={18} className="text-white" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.trim() ? (
                <div className="py-24 text-center">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700">
                    <Search size={32} />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Null Result</h3>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">No signals detected for "{query}"</p>
                </div>
              ) : (
                <div className="py-12 sm:py-20 text-center space-y-10">
                  <div className="relative inline-block">
                    <Search size={64} className="text-sky-500/20 mx-auto" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-sky-500/10 blur-3xl rounded-full" 
                    />
                  </div>
                  
                  <div className="space-y-4 px-6 md:px-20">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Universal Omnisearch</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold max-w-sm mx-auto leading-relaxed">Instantly access any material, group, task, or secure file across your entire Nemesis cloud infrastructure.</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-4">
                    {[
                      { icon: <FileText size={14}/>, label: 'Materials', color: 'orange' },
                      { icon: <File size={14}/>, label: 'Secure Files', color: 'blue' },
                      { icon: <Users size={14}/>, label: 'Neural Groups', color: 'emerald' },
                      { icon: <CheckCircle2 size={14}/>, label: 'Active Tasks', color: 'violet' }
                    ].map((tag) => (
                      <div key={tag.label} className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-600 dark:text-slate-300 shadow-sm transition-transform hover:scale-105`}>
                        <span className={`text-${tag.color}-500`}>{tag.icon}</span>
                        {tag.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:flex p-4 sm:p-5 bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 items-center justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] shrink-0">
              <div className="flex items-center gap-8">
                <span className="flex items-center gap-2"><div className="px-2 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg shadow-sm text-slate-900 dark:text-white transition-colors">↑↓</div> Navigate Matrix</span>
                <span className="flex items-center gap-2"><div className="px-2 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg shadow-sm text-slate-900 dark:text-white transition-colors">↵</div> Access Entry</span>
              </div>
              <span className="flex items-center gap-2"><div className="px-2 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg shadow-sm text-slate-900 dark:text-white transition-colors">ESC</div> Terminal Close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
