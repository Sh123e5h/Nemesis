import React from 'react';
import { Skeleton, SkeletonCircle, SkeletonLine } from '../Skeleton';

export const AuthSkeleton: React.FC = () => {
  return (
    <div className="flex min-h-screen min-h-[100dvh] min-w-0 w-full max-w-full overflow-hidden bg-transparent animate-in fade-in duration-500">
      {/* Left: Desktop Quote Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50/50 dark:bg-slate-900/50 relative items-center justify-center p-12 overflow-hidden border-r border-slate-200/40 dark:border-slate-800/40">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-sky-400/20 to-indigo-500/20" />
        <div className="relative z-10 w-full max-w-lg space-y-8">
          <div className="flex items-center gap-4">
            <SkeletonCircle size={56} className="bg-slate-200/50 dark:bg-slate-800/50" />
            <SkeletonLine width="180px" height="2.5rem" className="bg-slate-200/50 dark:bg-slate-800/50" />
          </div>
          <div className="space-y-4">
            <SkeletonLine width="100%" height="1.5rem" className="bg-slate-200/30 dark:bg-slate-800/30 opacity-60" />
            <SkeletonLine width="90%" height="1.5rem" className="bg-slate-200/30 dark:bg-slate-800/30 opacity-60" />
            <SkeletonLine width="40%" height="1.5rem" className="bg-slate-200/30 dark:bg-slate-800/30 opacity-60" />
          </div>
          <SkeletonLine width="120px" height="1.2rem" className="bg-slate-200/50 dark:bg-slate-800/50" />
        </div>
      </div>

      {/* Right: Auth Card Content */}
      <div className="w-full min-w-0 lg:w-1/2 bg-transparent flex flex-col items-center justify-center min-h-[100dvh] p-4 sm:p-6 lg:p-12 relative">
        <div className="glass-premium w-full max-w-md p-6 sm:p-8 md:p-10 rounded-[1.5rem] flex flex-col space-y-8 relative z-10 border border-slate-200/60 dark:border-slate-700/60 cyberpunk:border-emerald-500/30">
          
          {/* Mobile Logo Placeholder */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-2">
            <SkeletonCircle size={48} className="bg-sky-100/50" />
            <SkeletonLine width="120px" height="1.5rem" className="bg-sky-100/50" />
          </div>

          <div className="space-y-4 text-center">
            <SkeletonLine width="60%" height="2rem" className="mx-auto" />
            <SkeletonLine width="80%" height="1rem" className="mx-auto opacity-50" />
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <SkeletonLine width="40%" height="0.8rem" className="ml-1" />
              <Skeleton className="h-12 w-full rounded-2xl bg-slate-50 border-2 border-slate-100" />
            </div>
            <div className="space-y-3">
              <SkeletonLine width="30%" height="0.8rem" className="ml-1" />
              <Skeleton className="h-12 w-full rounded-2xl bg-slate-50 border-2 border-slate-100" />
            </div>
            <div className="pt-2">
              <Skeleton className="h-14 w-full rounded-2xl bg-slate-900 opacity-90 shadow-lg" />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-center">
            <SkeletonLine width="50%" height="1rem" />
          </div>

          <div className="pt-4 flex flex-col items-center gap-2">
             <SkeletonLine width="80px" height="0.8rem" className="opacity-40" />
          </div>
        </div>

        {/* Decorative elements for brand consistency */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-400/10 blur-[100px] rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400/5 blur-[100px] rounded-full -ml-32 -mb-32" />
      </div>
    </div>
  );
};

export default AuthSkeleton;
