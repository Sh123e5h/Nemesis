import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Brain, X, Minimize2, Users } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { RealtimeChannel } from '@supabase/supabase-js';

type TimerMode = 'work' | 'short' | 'long';

interface PomodoroTimerProps {
  groupId?: string | null;
  onClose: () => void;
}

// Separate component for the display to prevent re-rendering the whole draggable container
const TimerDisplay = memo(({ timeLeft, mode }: { timeLeft: number, mode: TimerMode }) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span 
        className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums leading-none text-white drop-shadow-sm mt-0.5 sm:mt-0"
      >
        {formatTime(timeLeft)}
      </span>
      <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] mt-0.5 sm:mt-2 text-sky-300 opacity-80 pl-1">
        {mode === 'work' ? 'Focusing' : 'Break'}
      </span>
    </div>

  );
});


export default function PomodoroTimer({ groupId, onClose }: PomodoroTimerProps) {
  const { profile, user } = useAuthStore();

  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isLowPerf, setIsLowPerf] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('low-perf')
  );

  useEffect(() => {
    const sync = () => setIsLowPerf(document.documentElement.classList.contains('low-perf'));
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const settings = useMemo<Record<TimerMode, number>>(() => ({
    work: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
  }), []);

  // Sync with Supabase Realtime
  useEffect(() => {
    if (!groupId || !profile) {
      const t = setTimeout(() => setIsSynced(false), 0);
      return () => clearTimeout(t);
    }

    const channel = supabase.channel(`focus-room:${groupId}`)
      .on('broadcast', { event: 'timer-update' }, ({ payload }) => {
        if (payload.senderId !== profile.id) {
          setMode(payload.mode);
          setTimeLeft(payload.timeLeft);
          setIsActive(payload.isActive);
          setIsSynced(true);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsSynced(true);
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, profile]);

  const broadcastUpdate = useCallback((overrides: any = {}) => {
    if (channelRef.current && profile) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'timer-update',
        payload: {
          mode: overrides.mode ?? mode,
          timeLeft: overrides.timeLeft ?? timeLeft,
          isActive: overrides.isActive ?? isActive,
          senderId: profile.id
        }
      });
    }
  }, [mode, timeLeft, isActive, profile]);

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(settings[newMode]);
    setIsActive(false);
    broadcastUpdate({ mode: newMode, timeLeft: settings[newMode], isActive: false });
  }, [settings, broadcastUpdate]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // Save session to database if it was a work session
      if (mode === 'work' && user?.id) {
        supabase.from('pomodoro_sessions').insert({
          user_id: user?.id || '',
          mode: 'work',
          duration_seconds: settings.work,
          group_id: groupId || null
        }).then(() => {
          // console.log('Pomodoro session saved');
        });
      }

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`Focus session over! Time for a ${mode === 'work' ? 'break' : 'session'}.`);
      }
      
      const t = setTimeout(() => {
        setIsActive(false);
        if (mode === 'work') switchMode('short');
        else switchMode('work');
      }, 0);
      
      return () => clearTimeout(t);
    }


    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, switchMode, user?.id, settings.work, groupId]);

  const toggleTimer = () => {
    const newState = !isActive;
    setIsActive(newState);
    broadcastUpdate({ isActive: newState });
  };
  
  const resetTimer = () => {
    setIsActive(false);
    const newTime = settings[mode];
    setTimeLeft(newTime);
    broadcastUpdate({ isActive: false, timeLeft: newTime });
  };

  const progress = (timeLeft / settings[mode]) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.8 }}
      drag
      dragMomentum={true}
      dragTransition={{ power: 0, timeConstant: 200 }}
      whileDrag={{ 
        scale: 1.02, 
        cursor: 'grabbing',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        zIndex: 1000
      }}
      className={`fixed bottom-28 right-2 sm:bottom-24 sm:right-4 z-[100] ${
        isMinimized ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-[250px] sm:w-[300px] shadow-xl sm:shadow-[0_20px_60px_rgba(0,0,0,0.3)]'
      } rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden select-none touch-none`}



      style={{ 
        backgroundColor: isMinimized ? 'rgba(2, 6, 23, 0.92)' : 'rgba(15, 23, 42, 0.55)',
        backdropFilter: isLowPerf ? 'none' : 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: isLowPerf ? 'none' : 'blur(12px) saturate(180%)'
      }}





    >

      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button 
            key="minimized"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsMinimized(false)}
            className="w-full h-full flex items-center justify-center relative group overflow-hidden rounded-full"
          >
            <div className="absolute inset-0 bg-sky-500/10 group-hover:bg-sky-500/20 transition-colors" />
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
              <motion.circle 
                cx="32" cy="32" r="28" 
                stroke="#0ea5e9" strokeWidth="4" 
                fill="transparent" 
                strokeDasharray={2 * Math.PI * 28} 
                animate={{ strokeDashoffset: 2 * Math.PI * 28 - (progress / 100) * (2 * Math.PI * 28) }}
                strokeLinecap="round" 
              />
            </svg>
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[16px] font-black text-white leading-none tabular-nums drop-shadow-md">
                {Math.floor(timeLeft / 60)}
              </span>
              <span className="text-[8px] font-black text-sky-300 uppercase tracking-[0.2em] mt-1 drop-shadow-sm">
                min
              </span>
            </div>

          </motion.button>

        ) : (
          <motion.div key="maximized" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <div className="flex items-center justify-between p-4 sm:p-5 pb-2 sm:pb-5 cursor-grab active:cursor-grabbing">

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-sky-500 text-white rounded-lg sm:rounded-xl shadow-lg shadow-sky-500/20">
                    <Brain size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <div>
                    <span className="text-sm font-black uppercase tracking-widest leading-none block text-white">Focus</span>
                    {isSynced && (
                      <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        Live Sync
                      </span>
                    )}
                  </div>
                </div>

              <div className="flex items-center gap-2">
                <button 
                  onPointerDown={(e) => e.stopPropagation()} 
                  onClick={() => setIsMinimized(true)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition active:scale-90"
                >
                  <Minimize2 size={16} strokeWidth={2.5} />
                </button>
                <button 
                  onPointerDown={(e) => e.stopPropagation()} 
                  onClick={onClose}
                  className="p-2 hover:bg-red-500/20 rounded-full text-white/80 hover:text-red-400 transition active:scale-90"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

            </div>

            <div className="px-4 sm:px-6 pb-5 sm:pb-6 flex flex-col items-center gap-4 sm:gap-6">
              <div className="flex p-0.5 sm:p-1 rounded-xl sm:rounded-2xl w-full" style={{ backgroundColor: 'var(--pomodoro-mode-bg)' }} onPointerDown={(e) => e.stopPropagation()}>
                {(['work', 'short', 'long'] as TimerMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${
                      mode === m ? 'shadow-sm' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: mode === m ? 'var(--pomodoro-mode-btn-bg)' : 'transparent',
                      color: mode === m ? 'var(--pomodoro-mode-btn-text)' : 'var(--pomodoro-text)'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="relative flex items-center justify-center my-0 sm:my-0 h-32 w-32 sm:h-48 sm:w-48">
                <svg className="w-full h-full transform -rotate-90 pointer-events-none drop-shadow-2xl">
                  <circle cx="50%" cy="50%" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
                  <motion.circle
                    cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference}
                    animate={{ 
                      strokeDashoffset,
                      stroke: isActive ? '#0ea5e9' : '#ffffff22'
                    }} 
                    transition={{ duration: 0.2 }} 
                    strokeLinecap="round" 
                    className="text-sky-500"
                  />
                  {isActive && (
                    <motion.circle
                      cx="50%" cy="50%" r={radius} stroke="#0ea5e9" strokeWidth="12" fill="transparent" strokeDasharray={circumference}
                      initial={{ opacity: 0, scale: 1 }}
                      animate={{ opacity: [0, 0.2, 0], scale: [1, 1.1, 1.2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                      className="pointer-events-none"
                    />
                  )}
                </svg>
                <TimerDisplay timeLeft={timeLeft} mode={mode} />

              </div>

              <div className="flex items-center gap-3 w-full" onPointerDown={(e) => e.stopPropagation()}>
                <button
                  onClick={toggleTimer}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition shadow-lg ${
                    isActive ? 'bg-black/5 dark:bg-white/10 text-slate-600 hover:bg-black/10 shadow-none' : 'bg-gradient-to-br from-sky-400 to-sky-600 text-white hover:shadow-sky-200 dark:hover:shadow-none'
                  }`}
                >
                  {isActive ? <><Pause size={16} /> Pause</> : <><Play size={16} fill="currentColor" /> Start</>}
                </button>
                <button
                  onClick={resetTimer}
                  className="p-3 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-2xl transition"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex flex-col gap-2 sm:gap-3">
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] pomodoro-secondary-text">Studying with Nemesis</span>
               </div>
               {groupId && (
                 <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-sky-50 dark:bg-sky-900/10 rounded-full">
                   <Users size={10} className="text-sky-500" />
                   <span className="text-[8px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest">Focus Room Active</span>
                 </div>
               )}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
