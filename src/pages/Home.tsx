import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import SEO from '../components/SEO';
import { supabase } from '../lib/supabase';

import { 
  Folder, 
  Users, 
  Calendar, 
  Clock, 
  Edit3, 
  ChevronRight, 
  CheckCircle2, 
  Trophy, 
  Target, 
  Zap,
  ShieldCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import UserAvatar from '../components/UserAvatar';
import { Skeleton } from '../components/Skeleton';
import { useMobile } from '../hooks/useMobile';
import NumberTicker from '../components/ui/NumberTicker';
import { DashboardTaskItem } from '../components/DashboardTaskItem';
import { useDataStore } from '../store/useDataStore';
import clsx from 'clsx';

const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);



interface DashboardStats {
  tasksCompleted: number;
  filesShared: number;
  studyMaterials: number;
  studySessions: number;
}

export default function Home() {
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const { isMobile, isNarrowMobile } = useMobile();
  const isNarrow = isNarrowMobile;
  const { upcomingTasks: tasks, fetchUpcoming, isServerUnreachable } = useDataStore();
  const loadingTasks = useDataStore(state => state.lastFetched.upcoming === 0 && !isServerUnreachable);

  // ─── One-time post-signup security notice ───────────────────────────────
  const [showSecurityNotice, setShowSecurityNotice] = useState(() => {
    const flag = localStorage.getItem('nemesis_show_security_notice');
    if (flag === 'true') {
      localStorage.removeItem('nemesis_show_security_notice');
      return true;
    }
    return false;
  });



  // ─── Stats fetch ─────────────────────────────────────────────────────────
  // ⚡ TTL GUARD: Stats are expensive (RPC). Only re-fetch if > 2 minutes stale.
  const fetchStats = useCallback(async (force = false) => {
    if (!user) return;

    if (!force) {
      const lastTs = Number(localStorage.getItem(`nemesis_stats_ts_${user.id}`) || 0);
      if (Date.now() - lastTs < 900000) return; // < 15 min — use cache, skip RPC
    }
    
    try {
      const { data, error } = await supabase
        .rpc('get_dashboard_stats')
        .abortSignal(AbortSignal.timeout(10000));
        
      if (error) throw error;
      
      const newStats = data as DashboardStats;
      setStats(newStats);
      localStorage.setItem(`nemesis_home_stats_${user.id}`, JSON.stringify(newStats));
      localStorage.setItem(`nemesis_stats_ts_${user.id}`, String(Date.now()));
      useDataStore.getState().setServerUnreachable(false);
    } catch (error) {
      console.error("[Home] Error fetching stats:", error);
      useDataStore.getState().setServerUnreachable(true);
    }
  }, [user]);

  const [stats, setStats] = useState<DashboardStats>(() => {
    try {
      const uid = useAuthStore.getState().user?.id || 'guest';
      const cached = localStorage.getItem(`nemesis_home_stats_${uid}`);
      return cached ? JSON.parse(cached) : { tasksCompleted: 0, filesShared: 0, studyMaterials: 0, studySessions: 0 };
    } catch {
      return { tasksCompleted: 0, filesShared: 0, studyMaterials: 0, studySessions: 0 };
    }
  });

  // ─── Debounce ref for realtime updates ──────────────────────────────────
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshAll = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      fetchUpcoming(user!.id, true);
      fetchStats(true);
    }, 400); // Debounce bursts of realtime events
  }, [user, fetchUpcoming, fetchStats]);


  // ─── Single combined effect: initial load + Global Sync listener ─────
  useEffect(() => {
    if (!user) return;

    // Initial load (Instant from cache, revalidate in background)
    fetchUpcoming(user.id);
    fetchStats();

    // Listen to global sync events from MainLayout
    const handleSync = (e: any) => {
      const { table } = e.detail;
      if (['tasks', 'subtasks', 'announcements', 'study_materials', 'files'].includes(table)) {
        refreshAll();
      }
    };

    window.addEventListener('nemesis_sync', handleSync);

    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      window.removeEventListener('nemesis_sync', handleSync);
    };
  }, [user, fetchUpcoming, fetchStats, refreshAll]);


  const itemVars: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  const [note, setNote] = useState(() => {
    const uid = useAuthStore.getState().user?.id || 'guest';
    return localStorage.getItem(`nemesis_quick_note_${uid}`) || '';
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      const uid = user?.id || 'guest';
      localStorage.setItem(`nemesis_quick_note_${uid}`, note);
    }, 500);
    return () => clearTimeout(handler);
  }, [note, user?.id]);

  const handleToggleTask = useCallback(async (taskId: string) => {
    // OPTIMISTIC UI: Remove from list immediately
    const originalTasks = [...useDataStore.getState().upcomingTasks];
    useDataStore.setState(state => ({ upcomingTasks: state.upcomingTasks.filter(t => t.id !== taskId) }));
    useDataStore.getState().invalidateCache(['planner']);
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId);
      
    if (error) {
      console.error("Failed to complete task:", error);
      useDataStore.setState({ upcomingTasks: originalTasks }); // Rollback on error
    } else {
      // Force refresh stats after a task completes (bypass TTL guard)
      fetchStats(true);
    }
  }, [fetchStats]);

  const dismissSecurityNotice = useCallback(() => setShowSecurityNotice(false), []);
  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div
      className={clsx(
        "px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-4 md:pt-6 md:px-8 md:pb-4 max-w-7xl mx-auto min-w-0 w-full flex-1 flex flex-col items-stretch justify-start md:h-[calc(100vh-80px)] md:max-h-[calc(100vh-80px)] md:overflow-hidden transition-all",
        isMobile && "mobile-hardened"
      )}
    >
      <SEO 
        title="Dashboard" 
        description="Your personalized Nemesis workspace. Track tasks, manage materials, and collaborate with your academic groups."
      />

      {/* ─── SERVER UNREACHABLE / OFFLINE BANNER ─── */}


      {/* ─── ONE-TIME POST-SIGNUP SECURITY NOTICE MODAL ─── */}
      <AnimatePresence>
        {showSecurityNotice && (
          <motion.div
            key="security-notice-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          >
            {/* Blurred backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={dismissSecurityNotice}
            />

            <motion.div
              key="security-notice-card"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
              className="relative w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              {/* Top gradient accent */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

              {/* Background decorative ShieldCheck */}
              <div className="absolute top-4 right-4 opacity-[0.06] pointer-events-none">
                <ShieldCheck size={120} className="text-amber-500" />
              </div>

              {/* Dismiss button */}
              <button
                onClick={dismissSecurityNotice}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 z-10"
                aria-label="Close security notice"
              >
                <X size={20} />
              </button>

              <div className="p-8 sm:p-10">
                {/* Icon + Badge */}
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                    <ShieldCheck size={28} className="text-amber-500" />
                  </div>
                  <div className="pt-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                      <GoogleLogo size={14} />
                      Google Verified Application
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      We Respect Your Privacy
                    </h2>
                  </div>
                </div>

                {/* Body */}
                <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-[15px] font-medium leading-relaxed mb-6">
                  Nemesis is officially <strong className="text-slate-900 dark:text-white">Verified by Google</strong>. We do not request access to your Gmail, Photos, or Personal Contacts. We operate in a strictly isolated environment — only accessing the files your app creates within your Google Drive.
                </p>

                {/* Permission pills */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { label: 'Gmail', allowed: false },
                    { label: 'Photos', allowed: false },
                    { label: 'Contacts', allowed: false },
                    { label: 'Drive (App Files Only)', allowed: true },
                  ].map(item => (
                    <div
                      key={item.label}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold',
                        item.allowed
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 line-through'
                      )}
                    >
                      <CheckCircle2 size={14} className={item.allowed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'} />
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={dismissSecurityNotice}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center gap-3"
                >
                  <GoogleLogo size={18} />
                  <span>Verified — Let's Go</span>
                </button>

                <p className="text-center text-[10px] text-slate-400 mt-4 font-medium">
                  This notice will not appear again.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={itemVars}
        className="flex flex-row justify-between items-center gap-2 md:gap-3 w-full min-w-0 mb-4 md:mb-8 mt-0"
      >
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <UserAvatar
            url={profile?.avatar_url}
            email={user?.email}
            name={profile?.full_name}
            size="xl"
            className="border-2 md:border-4 border-white shadow-sm w-11 h-11 sm:w-14 sm:h-14 md:w-24 md:h-24 lg:w-28 lg:h-28 text-base md:text-xl lg:text-2xl shrink-0"
          />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <span className="text-[10px] sm:text-xs md:hidden text-slate-500 font-bold uppercase tracking-widest leading-none mb-0.5">Welcome,</span>
            <h1 className="text-sm sm:text-lg md:text-3xl lg:text-4xl font-extrabold md:font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 leading-tight truncate">
              <span className="hidden md:inline">Welcome back, </span>{profile?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-slate-500 font-medium truncate leading-tight mt-0.5">{todayStr}</p>
          </div>
        </div>

        <div className={clsx(
          "flex bg-white/40 dark:bg-slate-800/40 cyberpunk:bg-black/40 backdrop-blur-2xl rounded-xl md:rounded-2xl p-1.5 sm:p-2.5 md:p-3 border border-white/40 dark:border-slate-700/50 cyberpunk:border-emerald-500/30 shadow-glass overflow-hidden divide-x divide-white/10 dark:divide-slate-700/50 cyberpunk:divide-emerald-500/30 shrink-0 justify-center h-fit mt-1 md:mt-0 transition-all",
          isNarrow ? "gap-0 px-0.5" : isMobile ? "gap-1 px-1.5" : "gap-2"
        )}>
          {[
            { label: 'Tasks', value: stats.tasksCompleted, icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-50', id: 'trophy' },
            { label: 'Shared', value: stats.filesShared, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50', id: 'zap' },
            { label: 'Materials', value: stats.studyMaterials, icon: Target, color: 'text-violet-500', bg: 'bg-violet-50', id: 'target' }
          ].map((stat, i) => (
            <div key={stat.id} className={clsx(
              "flex flex-col items-center justify-center py-0.5 sm:py-1 md:flex-none transition-all",
              isNarrow ? "px-1 min-w-[2.8rem]" : "px-2 sm:px-3 md:px-3 min-w-[3rem] sm:min-w-[3.5rem]"
            )}>
              <div className={clsx(
                "dashboard-icon-well rounded-full flex items-center justify-center mb-0.5 md:mb-1 transition-all",
                stat.color, stat.bg,
                stat.id === 'trophy' ? "dashboard-trophy-icon glow-orange" : 
                stat.id === 'zap' ? "glow-emerald" : "glow-violet",
                isNarrow ? "w-4 h-4" : "w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9"
              )}>
                <stat.icon size={isNarrow ? 9 : 11} className="w-2.5 h-2.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] shrink-0 fill-none stroke-current" />
              </div>
              <NumberTicker 
                value={stat.value} 
                className={clsx(
                  "font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 leading-none md:leading-tight tabular-nums mt-0.5 md:mt-0",
                  isNarrow ? "text-[12px]" : "text-sm sm:text-lg md:text-2xl"
                )}
                delay={0.2 + (i * 0.1)}
              />
              <span className={clsx(
                "uppercase font-bold text-slate-400 tracking-wider text-center leading-tight mt-0.5 md:mt-0",
                isNarrow ? "text-[6px]" : "text-[7px] sm:text-[9px] md:text-[11px]"
              )}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVars} className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-4 mb-4 md:mb-8 shrink-0">
        <motion.div className="min-h-0">
          <div className="relative glass-premium px-1 py-3 sm:py-4 md:p-6 rounded-2xl md:shadow-glass md:hover:shadow-premium hover:border-violet-500/50 transition duration-300 md:hover:-translate-y-1.5 group flex flex-col items-center justify-center md:items-start text-center md:text-left h-full dashboard-nav-card overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 opacity-20 group-hover:opacity-100 transition-opacity animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <Link to="/organizer" className="absolute inset-0 z-10 rounded-2xl" />
            <div className="relative z-0 dashboard-icon-well w-5 h-5 md:w-12 md:h-12 text-violet-500 rounded-lg md:rounded-xl flex items-center justify-center mb-0.5 md:mb-4 transition duration-300 bg-violet-500/10 group-hover:scale-110 md:group-hover:-rotate-12 shrink-0 glow-violet">
              <Folder size={18} className="w-3 h-3 md:w-6 md:h-6 shrink-0 fill-none stroke-current transition-transform duration-300 md:group-hover:scale-110" />
            </div>
            <h3 className="relative z-0 font-bold text-slate-800 dark:text-white cyberpunk:text-emerald-400 text-[9px] sm:text-xs md:text-base leading-[1.1] truncate mt-0.5">Organizer</h3>
            <p className="relative z-0 hidden md:block text-xs md:text-sm text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-600/80 leading-relaxed truncate mt-1">Manage documents &amp; notes.</p>
          </div>
        </motion.div>

        <motion.div className="min-h-0">
          <div className="relative glass-premium px-1 py-3 sm:py-4 md:p-6 rounded-2xl md:shadow-glass md:hover:shadow-premium hover:border-emerald-500/50 transition duration-300 md:hover:-translate-y-1.5 group flex flex-col items-center justify-center md:items-start text-center md:text-left h-full dashboard-nav-card text-emerald-600 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <Link to="/groups" className="absolute inset-0 z-10 rounded-2xl" />
            <div className="relative z-0 dashboard-icon-well w-5 h-5 md:w-12 md:h-12 text-emerald-500 rounded-lg md:rounded-xl flex items-center justify-center mb-0.5 md:mb-4 transition duration-300 bg-emerald-500/10 group-hover:scale-110 md:group-hover:-rotate-12 shrink-0 glow-emerald">
              <Users size={18} className="w-3 h-3 md:w-6 md:h-6 shrink-0 fill-none stroke-current transition-transform duration-300 md:group-hover:scale-110" />
            </div>
            <h3 className="relative z-0 font-bold text-slate-800 dark:text-white cyberpunk:text-emerald-400 text-[9px] sm:text-xs md:text-base leading-[1.1] truncate mt-0.5">Groups</h3>
            <p className="relative z-0 hidden md:block text-xs md:text-sm text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-600/80 leading-relaxed truncate mt-1">Collaborative peer hubs.</p>
          </div>
        </motion.div>

        <motion.div className="min-h-0">
          <div className="relative glass-premium px-1 py-3 sm:py-4 md:p-6 rounded-2xl md:shadow-glass md:hover:shadow-premium hover:border-rose-500/50 transition duration-300 md:hover:-translate-y-1.5 group flex flex-col items-center justify-center md:items-start text-center md:text-left h-full dashboard-nav-card text-rose-600 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 opacity-20 group-hover:opacity-100 transition-opacity animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <Link to="/planner" className="absolute inset-0 z-10 rounded-2xl" />
            <div className="relative z-0 dashboard-icon-well w-5 h-5 md:w-12 md:h-12 text-rose-500 rounded-lg md:rounded-xl flex items-center justify-center mb-0.5 md:mb-4 transition duration-300 bg-rose-500/10 group-hover:scale-110 md:group-hover:rotate-12 shrink-0 glow-rose">
              <Calendar size={18} className="w-3 h-3 md:w-6 md:h-6 shrink-0 fill-none stroke-current transition-transform duration-300 md:group-hover:scale-110" />
            </div>
            <h3 className="relative z-0 font-bold text-slate-800 dark:text-white cyberpunk:text-emerald-400 text-[9px] sm:text-xs md:text-base leading-[1.1] truncate mt-0.5">Planner</h3>
            <p className="relative z-0 hidden md:block text-xs md:text-sm text-slate-600 dark:text-slate-400 cyberpunk:text-emerald-600/80 leading-relaxed truncate mt-1">Assignments &amp; deadlines.</p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVars} className="flex-1 flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 lg:gap-6 min-h-0 md:mb-2">
        <motion.div className="lg:col-span-2 flex flex-col [flex:4_1_0%] md:flex-1 min-h-0">
          <div className="group flex flex-col overflow-hidden rounded-2xl glass-premium transition duration-300 md:hover:-translate-y-1.5 md:shadow-glass md:hover:shadow-premium hover:border-sky-500/50 flex-1 min-h-[140px] md:h-auto md:min-h-[280px] relative">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 opacity-20 group-hover:opacity-100 transition-opacity animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <div className="px-3 py-2 md:px-6 md:py-4 flex items-center gap-2 shrink-0 border-b border-white/10 shimmer-premium">
              <Edit3 size={14} className="md:w-5 md:h-5 text-sky-500 shrink-0 transition-transform duration-300 md:group-hover:scale-125 md:group-hover:-rotate-12 glow-sky" />
              <h3 className="font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 text-[12px] md:text-base">Quick Note</h3>
            </div>
            <textarea 
              value={note} 
              onChange={handleNoteChange} 
              placeholder="Jot down a quick thought..." 
              className="m-0 block w-full border-0 bg-transparent px-3 py-3 md:px-6 md:py-4 resize-none text-xs md:text-sm lg:text-base text-slate-800 dark:text-white cyberpunk:text-emerald-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 cyberpunk:placeholder:text-emerald-700/50 focus:outline-none focus:ring-0 flex-1 min-h-0 leading-relaxed custom-scrollbar font-medium"
            />
          </div>
        </motion.div>

        <motion.div className="flex flex-col [flex:6_1_0%] md:flex-1 min-h-0">
          <div className="group flex flex-col overflow-hidden rounded-2xl glass-premium transition duration-300 md:hover:-translate-y-1.5 md:shadow-glass md:hover:shadow-premium hover:border-orange-500/50 flex-1 h-full min-h-[180px] md:h-auto md:min-h-[280px] relative">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-orange-400 via-rose-500 to-orange-400 opacity-20 group-hover:opacity-100 transition-opacity animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            <div className="px-3 py-2 md:px-6 md:py-4 flex items-center justify-between shrink-0 border-b border-white/10 shimmer-premium">
              <div className="flex items-center gap-1.5 md:gap-2">
                 <Clock size={14} className="md:w-5 md:h-5 text-orange-500 shrink-0 transition-transform duration-300 md:group-hover:scale-125 md:group-hover:rotate-12 glow-orange" />
                 <h3 className="font-bold text-slate-900 dark:text-white cyberpunk:text-emerald-400 text-[12px] md:text-base">Upcoming</h3>
              </div>
              <Link to="/planner" className="relative z-10 text-[10px] md:text-xs text-sky-500 font-bold hover:underline flex items-center gap-0.5 shrink-0 transition-transform md:hover:translate-x-1">
                 VIEW ALL <ChevronRight size={12} className="md:w-3.5 md:h-3.5" />
              </Link>
            </div>
            <div className="px-3 py-2 md:p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
              {loadingTasks ? (
                 <div className="space-y-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="flex items-start gap-3">
                       <Skeleton variant="circle" className="w-2 h-2 mt-2 shrink-0 bg-slate-200" />
                       <div className="flex-1 space-y-2 min-w-0">
                          <Skeleton variant="text" className="w-4/5 h-4 rounded-md" />
                          <Skeleton variant="text" className="w-1/3 h-3 opacity-50 rounded-md" />
                       </div>
                     </div>
                   ))}
                 </div>
              ) : tasks.length === 0 ? (
                 <div className="text-center flex flex-col items-center justify-center flex-1">
                   <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-500 mb-2" strokeWidth={2} />
                   <p className="text-xs font-bold text-slate-500">All caught up!</p>
                 </div>
              ) : (
                 <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0">
                   {tasks.map((task, i) => (
                     <DashboardTaskItem key={task.id} task={task} index={i} onToggle={handleToggleTask} />
                   ))}
                 </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
