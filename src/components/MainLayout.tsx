import * as React from 'react';
import { useState, useEffect, useLayoutEffect, Suspense, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Folder, Users, Calendar, User, Search, Bell,
  Brain, MessageCircle
} from 'lucide-react';
import { useMobile } from '../hooks/useMobile';
import clsx from 'clsx';

import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';
import { supabase } from '../lib/supabase';
const SearchModal = React.lazy(() => import('./SearchModal'));
import UserAvatar from './UserAvatar';
import PageTransition from './PageTransition';
import { AchievementOverlay } from './AchievementOverlay';
const PomodoroTimer = React.lazy(() => import('./PomodoroTimer'));
import { hapticFeedback } from '../lib/haptics';
import { ImpactStyle } from '@capacitor/haptics';


interface NavItem {
  label: string;
  path: string;
  icon: any;
  component: () => Promise<any>;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/home', icon: Home, component: () => import('../pages/Home') },
  { label: 'Organizer', path: '/organizer', icon: Folder, component: () => import('../pages/organizer/OrganizerHome') },
  { label: 'Groups', path: '/groups', icon: Users, component: () => import('../pages/groups/GroupsList') },
  { label: 'Planner', path: '/planner', icon: Calendar, component: () => import('../pages/Planner') },
  { label: 'Profile', path: '/profile', icon: User, component: () => import('../pages/Profile') },
];

const HeaderContent = ({ 
  user, profile, location, unreadCount, dmUnreadCount, 
  setIsSearchOpen, isTimerOpen, setIsTimerOpen,
  setHoveredIndex, prefetchData 
}: any) => {
  return (
    <header className="glass-header z-50 sticky top-0 transition-colors duration-300">
      <div className="w-full bg-white/90 dark:bg-slate-900/90 cyberpunk:bg-black/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 cyberpunk:border-emerald-500/20 py-2 sm:py-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 min-w-0 shrink">
          <Link to="/home" className="text-base sm:text-xl font-bold text-sky-500 cyberpunk:text-emerald-400 tracking-tight flex items-center gap-2 min-w-0 shrink">
            <img src="/logo.svg" alt="logo" className="w-8 h-8 sm:w-8 sm:h-8" width={32} height={32} />
            <span className="truncate text-sky-500 md:text-xl font-black md:normal-case md:tracking-tight">Nemesis</span>
          </Link>
          <nav className="hidden md:flex items-center justify-center flex-1 gap-1.5 xl:gap-3 px-2">
            {user && navItems.map((item, index) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  onMouseEnter={() => { setHoveredIndex(index); prefetchData(item); }} 
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => hapticFeedback.impact(ImpactStyle.Light)}
                  className={clsx("relative flex items-center shrink-0 md:gap-2 font-bold uppercase tracking-wider md:px-2 xl:px-4 py-2 md:text-[10px] lg:text-[11px] xl:text-xs rounded-xl transition-all duration-300", isActive ? "text-sky-600 dark:text-sky-400 cyberpunk:text-emerald-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200")}>
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={clsx("transition-transform", isActive && "scale-110")} />
                  <span className="hidden xl:inline whitespace-nowrap">{item.label}</span>
                  {isActive && <motion.div layoutId="navActiveIndicator" className="absolute inset-0 bg-sky-50 dark:bg-sky-500/10 rounded-xl -z-10 border border-sky-200/60 shadow-sm" />}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">

            <button onClick={() => { setIsSearchOpen(true); hapticFeedback.impact(ImpactStyle.Light); }} className="p-2 text-slate-500 hover:text-sky-600 rounded-full transition"><Search size={20} /></button>
            <button onClick={() => { setIsTimerOpen(!isTimerOpen); hapticFeedback.impact(ImpactStyle.Medium); }} className={clsx("p-2 rounded-full transition", isTimerOpen ? "text-sky-600 bg-sky-50" : "text-slate-500 hover:bg-slate-100")}><Brain size={20} /></button>
            {user && (
              <Link to="/messages" className="p-2 rounded-full relative text-slate-400 dark:text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-white/5 transition-all">
                <MessageCircle size={20} />
                {dmUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                    {dmUnreadCount}
                  </span>
                )}
              </Link>
            )}
            {user && (
              <Link to="/notifications" className="p-2 rounded-full relative text-slate-400 dark:text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-white/5 transition-all">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            {user && <Link to="/profile" className="ml-2 hidden md:block pl-2 border-l border-slate-200"><UserAvatar url={profile?.avatar_url} name={profile?.full_name} size="sm" /></Link>}
          </div>
        </div>
      </div>
    </header>
  );
};

const BottomNavContent = ({ location, profile, prefetchData }: any) => {
  if (typeof document === 'undefined') return null;
  const portalRoot = document.body;
  
  return createPortal(
    <nav className="md:hidden fixed left-1/2 -translate-x-1/2 w-[min(92%,calc(100vw-1rem))] backdrop-blur-2xl rounded-full z-50 px-1 py-1.5 shadow-premium glass-pile-active" style={{ bottom: 'max(1.15rem, calc(0.2rem + env(safe-area-inset-bottom, 0px)))' }}>
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link 
              key={item.path} 
              to={item.path} 
              onMouseEnter={() => prefetchData(item)} 
              onTouchStart={() => { prefetchData(item); hapticFeedback.impact(ImpactStyle.Light); }} 
              onClick={() => hapticFeedback.impact(ImpactStyle.Light)}
              className="relative flex-1 py-2 px-1 rounded-full text-center active:scale-95 transition-transform"
            >
              {isActive && <motion.div layoutId="activeBottomTab" className="absolute inset-x-1 inset-y-0.5 rounded-full -z-10 bg-[var(--footer-active-bg)]" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              <div className="flex flex-col items-center gap-0.5">
                {item.label === 'Profile' ? <UserAvatar url={profile?.avatar_url} name={profile?.full_name} size="xs" className={isActive ? 'scale-110 ring-2 ring-sky-500 cyberpunk:ring-black' : ''} /> : <item.icon size={20} className={isActive ? 'text-sky-500 cyberpunk:text-[var(--footer-active-text)] scale-110' : 'text-slate-500'} />}
                <span className={`text-[9px] font-bold ${isActive ? 'text-sky-600 cyberpunk:text-[var(--footer-active-text)]' : 'text-slate-400'}`}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>, 
    portalRoot
  );
};

const MemoizedHeader = React.memo(HeaderContent);
const MemoizedBottomNav = React.memo(BottomNavContent);

const prefetchData = (item: NavItem, user: any, fetchSubjects: any, fetchGroups: any, fetchGamification: any, fetchPlanner: any, fetchUpcoming: any) => {
  // 🚀 PREFETCH BUNDLE
  if (item.component) item.component().catch(() => {});
  
  if (!user) return;

  // 🚀 PREFETCH DATA
  if (item.path === '/organizer') fetchSubjects(user.id);
  if (item.path === '/groups') fetchGroups(user.id);
  if (item.path === '/profile') fetchGamification(user.id);
  if (item.path === '/planner') fetchPlanner(user.id);
  if (item.path === '/home') fetchUpcoming(user.id);
};


export default function MainLayout() {
  const { profile, user } = useAuthStore();
  const { fetchSubjects, fetchGroups, fetchGamification, fetchPlanner, fetchUpcoming } = useDataStore();
  
  const [activeAchievement, setActiveAchievement] = useState<{
    type: 'LEVEL_UP' | 'BADGE_EARNED';
    data: any;
  } | null>(null);
  const location = useLocation();
  const { isNarrowMobile } = useMobile();
  const mainRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
  }, [location.pathname]);

  const groupId = location.pathname.startsWith('/groups/') ? location.pathname.split('/')[2] : null;

  const [unreadCount, setUnreadCount] = useState(() => parseInt(localStorage.getItem('nemesis_unread_count') || '0', 10));
  const [dmUnreadCount, setDmUnreadCount] = useState(() => parseInt(localStorage.getItem('nemesis_dm_unread_count') || '0', 10));
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const throttleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const lastSeenUpdateRef = useRef<number>(0);

  const fetchCounts = useCallback(async () => {
    if (!profile) return;
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    // Throttle count fetching to 5 seconds minimum
    if (timeSinceLastFetch < 5000) {
      if (throttleTimeoutRef.current) return;
      throttleTimeoutRef.current = setTimeout(() => {
        throttleTimeoutRef.current = null;
        fetchCounts();
      }, 5000 - timeSinceLastFetch);
      return;
    }
    
    lastFetchTimeRef.current = now;

    // Heartbeat: Only update last_seen once every 3 minutes to reduce DB write load
    // Update heartbeat - 15 minute interval to save Disk IO budget
    if (now - lastSeenUpdateRef.current > 900000) {
      lastSeenUpdateRef.current = now;
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', profile.id).then(() => {});
    }

    const lastVisitedStr = localStorage.getItem('lastVisitedNotifications');
    let lastVisitedMs = 0;
    if (lastVisitedStr) {
      const parsed = parseInt(lastVisitedStr, 10);
      if (!isNaN(parsed)) lastVisitedMs = parsed;
    }
    const { data, error } = await supabase.rpc('get_unread_counts', { 
      p_user_id: profile.id, 
      p_last_visited: new Date(lastVisitedMs).toISOString() 
    });
    if (!error && data) {
      setUnreadCount(data.total || 0);
      setDmUnreadCount(data.dms || 0);
      localStorage.setItem('nemesis_unread_count', (data.total || 0).toString());
      localStorage.setItem('nemesis_dm_unread_count', (data.dms || 0).toString());
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    const fetchWrapper = () => { if (mounted) fetchCounts(); };
    fetchCounts();
    // Poll every 60 seconds instead of 30
    // Poll counts every 10 minutes to save Disk IO budget
    // Also only poll if the tab is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCounts();
      }
    }, 600000);
    const dispatchSync = (table: string, payload: any) => {
      if (['tasks', 'subtasks', 'groups', 'group_members'].includes(table)) {
        useDataStore.setState(state => ({
          lastFetched: { ...state.lastFetched, planner: 0, upcoming: 0 }
        }));
      }
      window.dispatchEvent(new CustomEvent('nemesis_sync', { 
        detail: { table, payload } 
      }));
    };

    const realtimeChannel1 = supabase.channel(`global-notifications-1-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (p) => {
        fetchWrapper();
        dispatchSync('tasks', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (p) => {
        fetchWrapper();
        dispatchSync('messages', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, (p) => {
        fetchWrapper();
        dispatchSync('direct_messages', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${profile.id}` }, (p: any) => {
        const type = p.new?.type;
        if (type === 'badge_awarded' || type === 'level_up') {
          setActiveAchievement({
            type: type === 'badge_awarded' ? 'BADGE_EARNED' : 'LEVEL_UP',
            data: { ...(p.new.action_data || {}), content: p.new.content }
          });
        }
        fetchWrapper();
        dispatchSync('user_notifications', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, (p) => {
        dispatchSync('files', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_materials' }, (p) => {
        dispatchSync('study_materials', p);
      });

    const realtimeChannel2 = supabase.channel(`global-notifications-2-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reads' }, (p) => {
        dispatchSync('message_reads', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, (p) => {
        dispatchSync('subtasks', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders' }, (p) => {
        dispatchSync('folders', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (p) => {
        dispatchSync('announcements', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points', filter: `user_id=eq.${profile.id}` }, (p) => {
        dispatchSync('user_points', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_badges', filter: `user_id=eq.${profile.id}` }, (p) => {
        dispatchSync('user_badges', p);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` }, (p) => {
        dispatchSync('profiles', p);
      });

    realtimeChannel1.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') console.error('Channel 1 Error:', err);
    });
    realtimeChannel2.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') console.error('Channel 2 Error:', err);
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(realtimeChannel1);
      supabase.removeChannel(realtimeChannel2);
    };
  }, [profile, user, fetchCounts]);

  const memoizedPrefetch = useCallback((item: NavItem) => {
    prefetchData(item, user, fetchSubjects, fetchGroups, fetchGamification, fetchPlanner, fetchUpcoming);
  }, [user, fetchSubjects, fetchGroups, fetchGamification, fetchPlanner, fetchUpcoming]);

    const isFullBleed = ['/', '/privacy', '/terms', '/faq'].includes(location.pathname);
    const scrollClass = (location.pathname === '/home') ? "overflow-hidden" : "overflow-y-auto md:overflow-auto";


    return (
      <div className={clsx(
        "h-[100dvh] md:min-h-screen flex flex-col relative min-w-0 transition-colors duration-500 overflow-x-hidden",
        isNarrowMobile && "mobile-narrow",
        isFullBleed ? (location.pathname === '/' ? "bg-white dark:bg-slate-950" : "bg-slate-900") : "bg-slate-50 dark:bg-slate-950"
      )}>
        <MemoizedHeader 
          user={user}
          profile={profile}
          location={location}
          isSearchOpen={isSearchOpen}
          setIsSearchOpen={setIsSearchOpen}
          isTimerOpen={isTimerOpen}
          setIsTimerOpen={setIsTimerOpen}
          unreadCount={unreadCount}
          dmUnreadCount={dmUnreadCount}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
          prefetchData={memoizedPrefetch}
        />
        <main 
          ref={mainRef} 
          className={clsx(
            "flex-1 min-w-0 relative flex flex-col items-stretch justify-start md:pb-0 transition-[padding]",
            // Intelligent bottom padding: Only apply if bottom nav is actually visible and needed
            (user && !isFullBleed) && "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
            scrollClass,
            ((location.pathname === '/profile/edit') || location.pathname.startsWith('/organizer') || location.pathname.startsWith('/groups')) && "md:!pb-0 md:!mb-0"
          )}
        >
            <PageTransition>
              <Outlet />
            </PageTransition>
        {location.pathname === '/home' && (
          <footer className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:static md:mt-auto md:mb-6 left-0 right-0 z-[60] text-center px-4 pointer-events-none md:pointer-events-auto">
            <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 cyberpunk:text-emerald-500/80 tracking-normal inline-block bg-white/60 md:bg-white/10 dark:bg-slate-900/60 cyberpunk:bg-emerald-950/60 backdrop-blur-md md:backdrop-blur-none px-3 py-1.5 md:px-6 md:py-2 rounded-full border border-white/40 md:border-slate-200/20 dark:border-slate-700/50 cyberpunk:border-emerald-500/30">
              Built with <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="inline-block mx-0.5">❤️</motion.span> by Team Genesis. All rights reserved.
            </p>
          </footer>
        )}
      </main>
      {user && <MemoizedBottomNav location={location} profile={profile} prefetchData={memoizedPrefetch} />}
      <Suspense fallback={null}>
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </Suspense>
      <AnimatePresence>
        {isTimerOpen && <Suspense fallback={null}><PomodoroTimer groupId={groupId} onClose={() => setIsTimerOpen(false)} /></Suspense>}
      </AnimatePresence>
      {activeAchievement && <AchievementOverlay type={activeAchievement.type} data={activeAchievement.data} onClose={() => setActiveAchievement(null)} />}
    </div>
  );
}
