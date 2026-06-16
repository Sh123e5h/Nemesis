import { useState, useEffect } from 'react';
import { AlertCircle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MaintenanceSchedule {
  active: boolean;
  start_at: string;
  message?: string;
}

interface Props {
  schedule?: MaintenanceSchedule | null;
}

export default function MaintenanceBanner({ schedule }: Props) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!schedule || !schedule.active || !schedule.start_at) {
      setTimeLeft(null);
      return;
    }

    const update = () => {
      const diff = new Date(schedule.start_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Starting Now');
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    };

    update();
    const timer = setInterval(update, 1000);
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

