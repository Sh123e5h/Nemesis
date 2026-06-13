import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { User, Palette, LogOut, Check, Edit2, Trophy, Zap, Flame, Star, Award, Rocket, Cloud } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { ProfileSkeleton } from '../components/PageSkeleton';
import { SkeletonLine } from '../components/Skeleton';
import { motion } from 'framer-motion';
import { useDataStore } from '../store/useDataStore';

const MotionLink = motion.create(Link);

const THEMES = [
  { id: 'glassmorphism', name: 'Glassmorphism (Default)', desc: 'Frosted glass effects' },
  { id: 'minimalist', name: 'Minimalist', desc: 'Clean, light interface' },
  { id: 'dark', name: 'Dark Mode', desc: 'Easy on the eyes for night studying' },
  { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon colors on dark background' }
];

export default function Profile() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const isThemeSwitching = useRef(false);
  const [updating, setUpdating] = useState(false);

  const handleThemeChange = useCallback((themeId: string) => {
    if (!user || !profile || isThemeSwitching.current) return;
    isThemeSwitching.current = true;

    const root = document.documentElement;
    root.classList.add('no-transitions');

    // Single rAF — remove old theme, add new, restore transitions
    requestAnimationFrame(() => {
      const currentClasses = Array.from(root.classList);
      currentClasses.forEach(cls => {
        if (cls.startsWith('theme-')) root.classList.remove(cls);
      });
      root.classList.add(`theme-${themeId}`);
      useAuthStore.setState({ profile: { ...profile, theme_preference: themeId } });

      setTimeout(() => {
        root.classList.remove('no-transitions');
        isThemeSwitching.current = false;
      }, 50); // 50ms vs 100ms — halved for snappier feel
    });

    // Persist async — fire and forget (no await blocking UI)
    setUpdating(true);
    supabase.from('profiles').update({ theme_preference: themeId }).eq('id', user.id)
      .then(({ error }) => { 
        setUpdating(false);
        if (error) console.error('Failed to persist theme:', error); 
      });
  }, [user, profile]);

  const handleLogout = useCallback(async () => {
    await signOut();
    navigate('/login', { replace: true });
  }, [signOut, navigate]);

  if (!user || !profile) return <ProfileSkeleton />;

  // On mobile: skip stagger variants entirely — instant render

  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 md:p-8 pb-4 md:pb-8 min-w-0 w-full flex-1 flex flex-col items-stretch justify-start min-h-0 mobile-hardened">
      <div className="space-y-4 pb-0.5 md:pb-0">

        {/* Profile Header */}
        <div className="glass-premium rounded-[1.5rem] overflow-hidden">
          <div className="flex items-center gap-3 md:gap-4 p-4 md:p-6 lg:p-8">
            <UserAvatar 
              url={profile?.avatar_url} 
              email={user?.email}
              name={profile?.full_name} 
              size="2xl" 
              className="border-4 border-white/50 shadow-xl mx-auto md:mx-0 ring-4 ring-sky-500/10" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">
                  {profile?.full_name}
                </h1>
                {(profile?.gdrive_refresh_token || sessionStorage.getItem('gdrive_refresh_token') || sessionStorage.getItem('gdrive_access_token')) && (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                    <Cloud size={10} fill="currentColor" /> Verified
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-black text-xs md:text-sm tracking-widest uppercase opacity-60">@{profile?.username}</p>
            </div>
            <MotionLink
              to="/profile/edit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="edit-profile-btn h-11 px-4 rounded-2xl bg-white/40 backdrop-blur-md text-slate-700 flex items-center justify-center gap-2 border border-slate-200/60 transition-all shadow-sm hover:shadow-md hover:border-sky-300 group"
            >
              <Edit2 size={16} className="text-slate-500 group-hover:text-sky-600 transition-colors" />
              <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Edit</span>
            </MotionLink>
          </div>
        </div>

        {/* Gamification */}
        <GamificationSection userId={user?.id} />

        {/* Theme Section */}
        <div className="glass-premium rounded-[1.5rem] p-5 md:p-8">
          <h2 className="text-[11px] font-black text-slate-400 flex items-center gap-2 mb-6 uppercase tracking-[0.2em]">
            <Palette size={18} className="text-sky-500" /> System Aesthetics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {THEMES.map(theme => {
              const isActive = (THEMES.some(t => t.id === profile?.theme_preference) ? profile?.theme_preference : 'glassmorphism') === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  disabled={updating}
                  className={`p-4 md:p-5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between h-full group active:scale-[0.98] ${
                    isActive
                      ? theme.id === 'cyberpunk'
                        ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                        : theme.id === 'dark'
                        ? 'border-slate-700 bg-slate-800 shadow-[0_0_20px_rgba(30,41,59,0.3)]'
                        : 'border-sky-500 bg-sky-50 shadow-[0_0_20px_rgba(14,165,233,0.2)]'
                      : 'border-slate-100 bg-white/50 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 pr-4">
                    <div className={`font-black text-xs md:text-sm leading-tight uppercase tracking-widest ${
                      isActive && (theme.id === 'cyberpunk' || theme.id === 'dark') ? 'text-white' : 'text-slate-900'
                    }`}>{theme.name}</div>
                    <div className={`text-[10px] md:text-xs mt-1.5 leading-snug font-medium ${
                      isActive && (theme.id === 'cyberpunk' || theme.id === 'dark') ? 'text-white/70' : 'text-slate-500'
                    }`}>{theme.desc}</div>
                  </div>
                  {isActive && (
                    <div className={`absolute top-3 right-3 md:top-5 md:right-5 rounded-full p-1 shadow-lg ${
                      theme.id === 'cyberpunk'
                        ? 'bg-black text-emerald-400'
                        : theme.id === 'dark'
                        ? 'bg-slate-700 text-sky-400'
                        : 'bg-white text-sky-500'
                    }`}>
                      <Check size={14} strokeWidth={3} className="md:w-5 md:h-5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Account Identity */}
        <div className="glass-premium rounded-[1.5rem] p-5 md:p-8">
          <h2 className="text-[11px] font-black text-slate-400 flex items-center gap-2 mb-6 uppercase tracking-[0.2em]">
            <User size={18} className="text-slate-500" /> Member Identity
          </h2>
          <div className="space-y-4 text-xs md:text-sm">
            <div className="flex justify-between items-center py-3 border-b border-slate-200/40 gap-4 min-w-0">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Email Anchor</span>
              <span className="font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 truncate min-w-0 text-right">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-200/40">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Node Created</span>
              <span className="font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400">{user ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
            <div
              onClick={() => navigate('/settings/team')}
              className="creators-card bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl shadow-slate-200 cursor-pointer group relative overflow-hidden ring-1 ring-white/10 active:scale-[0.99] transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between relative z-10 p-5 md:p-8">
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white tracking-tighter uppercase leading-none">Meet the Creators</h2>
                  <p className="text-slate-400 text-[10px] font-medium tracking-normal">Built with ❤️ by Team Genesis</p>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/20 group-hover:bg-white group-hover:text-slate-900 transition duration-300">
                  <Rocket size={20} />
                </div>
              </div>
            </div>

            {/* Legal & Support Links */}
            <div className="flex justify-center mt-4 mb-2">
              <div className="flex items-center gap-3 sm:gap-5 px-5 py-2 rounded-full border border-slate-200/50 bg-white/30 backdrop-blur-sm text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Link to="/terms" className="hover:text-sky-500 transition-colors">Terms</Link>
                <span className="text-slate-300 select-none">&bull;</span>
                <Link to="/privacy" className="hover:text-sky-500 transition-colors">Privacy</Link>
                <span className="text-slate-300 select-none">&bull;</span>
                <a href="mailto:support@nemesiss.in" className="hover:text-sky-500 transition-colors">Support</a>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full sm:w-fit mx-auto flex items-center justify-center gap-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-[11px] md:text-xs uppercase tracking-widest transition-colors duration-200 px-8 py-3.5 rounded-2xl border border-red-100 shadow-sm active:scale-95 my-1"
            >
              <LogOut size={16} strokeWidth={2.5} />
              Sign Out Securely
            </button>

            {/* Integrated Footer (Static) */}
            <div className="flex flex-col items-center justify-center mt-6 mb-4">
              <p className="text-[10px] md:text-xs font-medium text-slate-500 text-center opacity-100 tracking-normal">
                Built with <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} className="inline-block mx-0.5">❤️</motion.span> by Team Genesis. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

function GamificationSection({ userId }: { userId: string | undefined }) {
  const { gamification, fetchGamification: syncGamification } = useDataStore();
  const [loading, setLoading] = useState(gamification === null);

  const fetchGamification = useCallback(async () => {
    if (!userId) return;
    await syncGamification(userId);
    setLoading(false);
  }, [userId, syncGamification]);

  useEffect(() => {
    fetchGamification();

    // Live sync: re-fetch when XP, badges, or profile data changes via MainLayout broadcast
    const handleSync = (e: Event) => {
      const { table } = (e as CustomEvent).detail || {};
      if (table === 'user_points' || table === 'user_badges' || table === 'profiles' || table === 'user_notifications') {
        fetchGamification();
      }
    };
    window.addEventListener('nemesis_sync', handleSync);

    return () => {
      window.removeEventListener('nemesis_sync', handleSync);
    };
  }, [fetchGamification]);

  const xpPercent = Math.min(100, ((gamification?.points?.total_points || 0) / ((gamification?.points?.level || 1) * 1000)) * 100);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* XP Card */}
        <div className="col-span-1 md:col-span-2 glass-premium rounded-[1.5rem] p-4 md:p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-[-10%] right-[-5%] p-4 md:p-8 opacity-[0.05] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">
            <Zap size={120} className="text-amber-500" />
          </div>
          {loading ? (
            <div className="space-y-4">
              <SkeletonLine width="100px" height="16px" />
              <SkeletonLine width="100%" height="8px" className="rounded-full" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:mb-8">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-500/20 shrink-0 border border-white/20">
                    <Trophy size={18} className="md:w-8 md:h-8" />
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 cyberpunk:bg-none cyberpunk:text-emerald-400 tracking-tighter leading-none drop-shadow-sm px-3 py-1.5 rounded-xl inline-block transition-all">LV.{gamification?.points?.level || 1}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs md:text-lg font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 uppercase tracking-tight leading-tight">Intelligence Level</h2>
                  <p className="text-[9px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.2em] opacity-60">Rank: {gamification?.points?.title || 'Scholar'}</p>
                </div>
              </div>

              <div className="space-y-2 mt-auto">
                <div className="flex justify-between items-end px-0.5">
                  <span className="text-[10px] md:text-base font-black text-slate-800 dark:text-white cyberpunk:text-emerald-400 uppercase tracking-tighter">
                    {gamification?.points?.total_points || 0} <span className="text-[8px] md:text-[10px] text-slate-400 dark:text-slate-500 cyberpunk:text-emerald-700">XP</span>
                  </span>
                  <span className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-right opacity-60">
                    {((gamification?.points?.level || 1) * 1000)} XP
                  </span>
                </div>
                <div className="h-2 md:h-3 bg-slate-100/50 dark:bg-slate-800/50 cyberpunk:bg-emerald-950/50 rounded-full border border-slate-200/50 dark:border-slate-700/50 cyberpunk:border-emerald-500/30 overflow-hidden relative shadow-inner">
                   <div
                    className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 rounded-full relative z-10 transition-[width] duration-1000 ease-out shimmer"
                    style={{ width: `${xpPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 skew-x-[-20deg] animate-shimmer" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Streak Card */}
        <div className="col-span-1 glass-premium rounded-[1.5rem] p-4 md:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 cyberpunk:bg-emerald-900/30 rounded-full animate-pulse mb-4" />
              <SkeletonLine width="60px" height="24px" />
            </div>
          ) : (
            <>
              <div className="w-12 h-12 md:w-20 md:h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center text-white mb-4 z-10 border border-white/20 shadow-xl shadow-orange-500/20 group-hover:rotate-6 transition-transform duration-500">
                <Flame size={24} className="md:w-10 md:h-10" />
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 tracking-tighter z-10 truncate w-full">{gamification?.points?.streak_days || 0}D</h3>
              <p className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] mt-1 z-10 opacity-60">Study Streak</p>
              <div className="mt-4 px-3 py-1 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950 dark:to-red-950 cyberpunk:from-emerald-900/60 cyberpunk:to-emerald-800/60 text-orange-700 dark:text-orange-400 cyberpunk:text-emerald-400 rounded-xl text-[9px] md:text-[10px] font-black border border-orange-200 dark:border-orange-500/30 cyberpunk:border-emerald-500/50 z-10 leading-none uppercase tracking-widest animate-pulse">
                On Fire
              </div>
            </>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="glass-premium rounded-[1.5rem] p-5 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[11px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-[0.2em]">
            <Star size={18} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" /> Accomplishments
          </h2>
          <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-sky-100 shadow-sm">{gamification?.badges?.length || 0} Badges</span>
        </div>

        {loading ? (
          <div className="flex flex-wrap justify-center gap-4">
            {[1, 2, 3].map(i => <div key={i} className="w-20 h-20 bg-slate-50/50 dark:bg-slate-800/50 cyberpunk:bg-emerald-900/30 rounded-2xl animate-pulse" />)}
          </div>
        ) : gamification?.badges && gamification.badges.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 pb-4 pt-2">
            {gamification.badges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ y: -5, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center p-3 group relative w-[28%] min-w-[90px] max-w-[120px]"
              >
                <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-800/50 cyberpunk:from-black cyberpunk:to-emerald-950/50 rounded-3xl flex items-center justify-center text-2xl md:text-5xl mb-3 shadow-md border border-slate-100/50 dark:border-slate-700/50 cyberpunk:border-emerald-500/30 group-hover:shadow-xl group-hover:border-amber-200 transition-all duration-300">
                  <span className="drop-shadow-sm">{badge.icon || '🏆'}</span>
                </div>
                <span className="text-[10px] md:text-xs font-black text-slate-800 dark:text-white cyberpunk:text-emerald-400 text-center line-clamp-2 uppercase tracking-tight leading-tight">{badge.name}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/50 cyberpunk:bg-black/50 rounded-3xl border-2 border-dashed border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/40 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/20 dark:to-slate-800/20 cyberpunk:to-emerald-900/20 pointer-events-none" />
            <Award size={48} className="mx-auto mb-4 text-slate-200 dark:text-slate-700 cyberpunk:text-emerald-900 drop-shadow-sm" />
            <p className="text-sm font-black text-slate-900 dark:text-white cyberpunk:text-emerald-400 uppercase tracking-tight">Zero Badges Detected</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-bold">Initiate protocols to earn recognition</p>
          </div>
        )}
      </div>
    </>
  );
}
