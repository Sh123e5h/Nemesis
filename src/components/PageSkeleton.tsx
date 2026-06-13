import React from 'react';
import { Skeleton, SkeletonCircle, SkeletonLine } from './Skeleton';

/**
 * Generic floating header used by most pages
 */
const SkeletonHeader: React.FC<{ showStats?: boolean }> = ({ showStats = false }) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-between items-center gap-8 md:gap-12 mb-12 md:mb-16 shrink-0 pt-4 md:pt-0">
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left w-full md:w-auto">
        <Skeleton variant="circle" className="w-[100px] h-[100px] md:size-24 lg:size-28" />
        <div className="space-y-4 w-full max-w-[200px] md:max-w-none">
          <SkeletonLine width="min(180px, 70%)" height="2rem" className="mx-auto md:mx-0" />
          <SkeletonLine width="min(120px, 50%)" height="1rem" className="mx-auto md:mx-0 opacity-50" />
        </div>
      </div>
      
      {showStats && (
        <div className="flex items-center gap-4 md:gap-6 bg-slate-100/30 dark:bg-slate-800/20 p-4 md:p-6 rounded-3xl w-full md:w-auto justify-center">
          <div className="flex items-center gap-4 px-4">
            <SkeletonCircle size={40} className="opacity-40" />
            <div className="space-y-2">
              <SkeletonLine width="40px" height="1.5rem" />
              <SkeletonLine width="60px" height="0.8rem" className="opacity-40" />
            </div>
          </div>
          <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block" />
          <div className="flex items-center gap-4 px-4">
            <SkeletonCircle size={40} className="opacity-40" />
            <div className="space-y-2">
              <SkeletonLine width="40px" height="1.5rem" />
              <SkeletonLine width="60px" height="0.8rem" className="opacity-40" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * HOME SKELETON (Dashboard)
 * Matches Home.tsx precisely
 */
export const HomeSkeleton: React.FC = () => (
  <div className="px-4 py-8 md:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 overflow-hidden">
    <SkeletonHeader showStats={true} />
    
    {/* Navigation Cards Row - Sync with Home.tsx */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-premium p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200/40 dark:border-slate-800/40 aspect-[4/3] flex flex-col justify-between">
          <SkeletonCircle size={56} className="bg-slate-100/50 dark:bg-slate-800/50" />
          <div className="space-y-3">
            <SkeletonLine width="60%" height="1.8rem" />
            <SkeletonLine width="90%" height="0.8rem" className="opacity-40" />
          </div>
        </div>
      ))}
    </div>

    <div className="flex flex-col md:grid md:grid-cols-2 gap-8 min-h-0">
      {/* Quick Note Card - Sync with Home.tsx responsive logic */}
      <div className="glass-premium rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-200/60 dark:border-slate-800/60 space-y-6">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={28} />
          <SkeletonLine width="120px" height="1.4rem" />
        </div>
        <div className="space-y-4">
          <SkeletonLine width="100%" height="120px" className="rounded-2xl" />
        </div>
      </div>

      {/* Upcoming Card */}
      <div className="glass-premium rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <SkeletonLine width="140px" height="1.4rem" />
          <SkeletonLine width="80px" height="1.4rem" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton variant="rectangle" className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLine width="70%" />
                <SkeletonLine width="40%" height="0.6rem" className="opacity-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * PLANNER SKELETON
 * Matches Planner.tsx precisely
 */
export const PlannerSkeleton: React.FC = () => (
  <div className="flex flex-col items-stretch justify-start px-4 md:px-8 pt-0 md:pt-8 pb-10 md:pb-6 max-w-7xl mx-auto min-w-0 w-full flex-1 animate-in fade-in duration-500">
    <div className="flex flex-col md:flex-row gap-6 md:gap-10 flex-1 min-h-0">
      {/* Main Task Area */}
      <div className="flex-1 flex flex-col min-w-0 space-y-8">
        {/* Custom Planner Header - Sync with Planner.tsx:492 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-10 shrink-0">
          <div className="space-y-3">
            <SkeletonLine width="min(280px, 90%)" height="2.5rem" className="md:h-12" />
            <SkeletonLine width="160px" height="0.8rem" className="opacity-40" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-12 w-full md:w-60 rounded-2xl" />
            <div className="flex items-center gap-2">
              <Skeleton variant="rectangle" className="w-12 h-12 rounded-xl" />
              <Skeleton variant="rectangle" className="w-12 h-12 rounded-xl" />
            </div>
            <Skeleton className="h-12 w-32 rounded-xl bg-sky-500/10" />
          </div>
        </div>

        <div className="space-y-4 mb-4">
          <div className="flex gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-xl" />)}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass-premium p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 flex gap-6">
              <Skeleton variant="rectangle" className="h-14 w-14 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3 py-1">
                <div className="flex justify-between items-start">
                  <SkeletonLine width="50%" height="1.2rem" />
                  <SkeletonCircle size={32} />
                </div>
                <SkeletonLine width="80%" height="0.6rem" className="opacity-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Area */}
      <div className="hidden lg:block w-80 space-y-6">
        <div className="glass-premium rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-slate-800/60">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <div className="glass-premium rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-slate-800/60 space-y-6">
          <SkeletonLine width="60%" height="1.4rem" />
          <div className="grid grid-cols-2 gap-4">
             <Skeleton className="h-20 rounded-2xl" />
             <Skeleton className="h-20 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * GRID SKELETON
 * For OrganizerHome and GroupsList
 */
export const GridSkeleton: React.FC = () => (
  <div className="px-4 pt-3 sm:px-4 md:p-8 max-w-5xl mx-auto flex flex-col items-stretch w-full flex-1 animate-in fade-in duration-500">
    <div className="flex items-center justify-between mb-8 md:mb-12 shrink-0">
      <div className="space-y-3 flex-1">
        <SkeletonLine width="min(300px, 85%)" height="2.5rem" className="md:h-12" />
        <SkeletonLine width="150px" height="0.8rem" className="opacity-40" />
      </div>
      <Skeleton className="h-14 w-14 sm:w-40 rounded-2xl bg-sky-500/10" />
    </div>
    
    <Skeleton className="w-full h-14 rounded-3xl mb-10" />
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="glass-premium p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 space-y-4 sm:space-y-8">
          <div className="flex items-center gap-3 sm:gap-5">
            <Skeleton variant="rectangle" className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2.5">
              <SkeletonLine width="80%" height="1.2rem" className="sm:h-[1.4rem]" />
              <SkeletonLine width="40%" height="0.6rem" className="opacity-40" />
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 sm:pt-6 border-t border-slate-100 dark:border-slate-800/40">
            <SkeletonLine width="40%" height="0.6rem" className="sm:h-[0.7rem]" />
            <Skeleton variant="rectangle" className="w-10 h-10 rounded-xl opacity-30" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * DETAIL SKELETON
 * For SubjectView, TopicView, GroupDetail
 */
export const DetailSkeleton: React.FC = () => (
  <div className="px-4 pt-3 md:p-8 max-w-5xl mx-auto flex flex-col w-full min-h-0 flex-1 animate-in fade-in duration-500">
    <div className="flex items-center gap-4 mb-8 shrink-0">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-3">
        <SkeletonLine width="60%" height="2rem" className="md:h-10" />
        <SkeletonLine width="30%" height="0.8rem" className="opacity-40" />
      </div>
      <Skeleton className="h-10 w-32 rounded-xl bg-sky-500/10 hidden sm:block" />
    </div>
    <div className="glass-premium rounded-[2rem] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden flex-1 flex flex-col min-h-0">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 flex items-center justify-between">
        <SkeletonLine width="120px" height="1rem" />
        <SkeletonLine width="80px" height="0.8rem" className="opacity-40" />
      </div>
      <div className="p-3 space-y-2 overflow-y-auto">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="p-4 flex items-center gap-5 glass-premium rounded-2xl border border-slate-50 dark:border-slate-800/40">
            <Skeleton variant="rectangle" className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonLine width="65%" height="1.2rem" />
              <SkeletonLine width="35%" height="0.6rem" className="opacity-40" />
            </div>
            <Skeleton variant="rectangle" className="w-8 h-8 rounded-lg opacity-20" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * CONFIG SKELETON
 * For Settings and specialized form pages
 */
export const ConfigSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto px-2 pt-2 md:p-8 w-full flex-1 animate-in fade-in duration-300">
    <SkeletonHeader />
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-premium p-6 md:p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 space-y-6">
          <div className="flex items-center gap-4">
            <SkeletonCircle size={40} />
            <SkeletonLine width="120px" height="1.2rem" />
          </div>
          <div className="space-y-4">
            <SkeletonLine width="100%" height="3rem" className="rounded-xl" />
            <SkeletonLine width="100%" height="3rem" className="rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * PROFILE SKELETON (Refined)
 */
export const ProfileSkeleton: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 pt-2 md:p-8 pb-8 w-full flex-1 animate-in fade-in duration-500 flex flex-col gap-6">
    <div className="glass-premium rounded-[1.5rem] overflow-hidden border border-slate-200/60 dark:border-slate-800/60 shrink-0">
      <div className="p-6 md:p-10 flex items-center gap-6">
        <SkeletonCircle size={96} className="md:size-32 border-4 border-white/50" />
        <div className="flex-1 space-y-3">
          <SkeletonLine width="60%" height="2rem" />
          <SkeletonLine width="40%" height="1rem" className="opacity-60" />
        </div>
      </div>
    </div>

    {/* Gamification Skeletons - Matches Profile.tsx:257 */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 shrink-0">
      <div className="col-span-1 md:col-span-2 glass-premium rounded-[1.5rem] p-6 md:p-10 border border-slate-200/60 dark:border-slate-800/60 space-y-10">
        <div className="flex justify-between">
           <Skeleton variant="rectangle" className="w-14 h-14 rounded-2xl" />
           <SkeletonLine width="100px" height="2rem" />
        </div>
        <div className="space-y-4">
           <SkeletonLine width="100%" height="1rem" className="rounded-full" />
           <SkeletonLine width="40%" height="0.8rem" className="opacity-40" />
        </div>
      </div>
      <div className="col-span-1 glass-premium rounded-[1.5rem] p-6 md:p-10 border border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center justify-center gap-6">
        <SkeletonCircle size={64} className="md:size-20" />
        <SkeletonLine width="60%" height="2rem" />
      </div>
    </div>

    <div className="glass-premium p-6 md:p-10 rounded-[1.5rem] border border-slate-200/60 dark:border-slate-800/60 space-y-8 flex-1">
      <SkeletonLine width="180px" height="1rem" className="mb-4" />
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/40">
          <div className="space-y-2 flex-1">
            <SkeletonLine width="40%" height="0.8rem" />
            <SkeletonLine width="70%" height="0.6rem" className="opacity-40" />
          </div>
          <Skeleton variant="rectangle" className="w-12 h-6 rounded-full opacity-30" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * GENERIC SKELETON
 */
export const GenericSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto px-2 pt-2 md:p-8 space-y-8 animate-in fade-in duration-300">
    <SkeletonHeader />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div className="glass-premium p-6 rounded-3xl space-y-4 border border-slate-200/60 dark:border-slate-800/60">
          <SkeletonLine width="40%" height="1.5rem" />
          <div className="space-y-3"><SkeletonLine /><SkeletonLine /><SkeletonLine width="80%" /></div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="glass-premium p-6 rounded-3xl space-y-4 border border-slate-200/60 dark:border-slate-800/60">
           <SkeletonCircle size={100} className="mx-auto" />
           <SkeletonLine width="60%" className="mx-auto" />
        </div>
      </div>
    </div>
  </div>
);

/**
 * WELCOME SKELETON
 * Matches Welcome.tsx centered card precisely
 */
export const WelcomeSkeleton: React.FC = () => (
  <div className="min-h-[100dvh] bg-transparent flex flex-col items-center justify-center p-4 overflow-hidden animate-in fade-in duration-500">
    <div className="w-full max-w-md flex flex-col space-y-8">
      {/* Fake Header */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <SkeletonCircle size={32} />
          <SkeletonLine width="100px" height="1.5rem" />
        </div>
        <SkeletonLine width="60px" height="1rem" />
      </div>

      {/* Centered Card */}
      <div className="glass-premium rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-2xl">
        <Skeleton variant="rectangle" className="h-64 sm:h-72 w-full" />
        <div className="p-8 pb-12 space-y-6 flex flex-col items-center">
          <SkeletonLine width="80%" height="2.5rem" className="mx-auto" />
          <div className="space-y-3 w-full">
            <SkeletonLine width="100%" />
            <SkeletonLine width="100%" />
            <SkeletonLine width="60%" className="mx-auto" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-10">
        <div className="flex justify-center gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCircle key={i} size={8} className="opacity-30" />)}
        </div>
        <Skeleton className="h-16 w-full rounded-2xl bg-white shadow-xl" />
      </div>
    </div>
  </div>
);

export const PageSkeleton = GenericSkeleton;
