import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MaintenanceSchedule {
  active: boolean;
  start_at: string;
  message?: string;
}

export default function MaintenanceBanner() {
  const [schedule, setSchedule] = useState<MaintenanceSchedule | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const fetchSchedule = useCallback(async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_schedule').maybeSingle();
    if (data) setSchedule(data.value as MaintenanceSchedule);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchSchedule(), 0);
    const channel = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, (payload) => {
        if (payload.new.key === 'maintenance_mode') {
          fetchSchedule();
        }
      })
      .subscribe();

    return () => {
      clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [fetchSchedule]);

  useEffect(() => {
    if (!schedule || !schedule.active || !schedule.start_at) {
      const t = setTimeout(() => setTimeLeft(null), 0);
      return () => clearTimeout(t);
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(schedule.start_at).getTime();
      const diff = start - now;

      if (diff <= 0) {
        setTimeLeft('Starting Now');
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [schedule]);

  if (!schedule?.active || !timeLeft || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-amber-500 text-white py-2 px-4 shadow-lg fixed top-0 left-0 right-0 z-[100] flex items-center justify-between"
      >
        <div className="flex items-center gap-3 font-bold text-sm tracking-tight overflow-hidden">
          <AlertCircle size={18} className="shrink-0 animate-pulse" />
          <span className="truncate">{schedule.message || 'Scheduled Maintenance'}</span>
          <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-lg border border-white/10 shrink-0">
             <Clock size={14} />
             <span>T-Minus: {timeLeft}</span>
          </div>
        </div>
        <button onClick={() => setIsVisible(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
