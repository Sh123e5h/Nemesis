import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Zap, X } from 'lucide-react';

interface AchievementOverlayProps {
  type: 'LEVEL_UP' | 'BADGE_EARNED';
  data: {
    level?: number;
    badge_name?: string;
    content?: string;
  };
  onClose: () => void;
}

export const AchievementOverlay: React.FC<AchievementOverlayProps> = ({ type, data, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 500); // Wait for exit animation
  }, [onClose]);

  useEffect(() => {
    // ⚡ FIRE CONFETTI: Different patterns based on type
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    if (type === 'LEVEL_UP') {
      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#0EA5E9', '#6366F1']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#0EA5E9', '#6366F1']
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#0EA5E9']
        });
    }

    // Auto-close after 8 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, [type, handleClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 pointer-events-none">
          {/* Backdrop Blur Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
            onClick={handleClose}
          />

          {/* Achievement Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl p-8 text-center pointer-events-auto overflow-hidden group"
          >
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${type === 'LEVEL_UP' ? 'from-sky-500 to-indigo-500' : 'from-amber-400 to-emerald-500'}`} />
            
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition text-slate-400"
            >
              <X size={18} />
            </button>

            <div className="space-y-6">
              {/* Icon Container */}
              <motion.div 
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center shadow-lg transform rotate-3 ${
                  type === 'LEVEL_UP' 
                    ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-sky-200' 
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200'
                }`}
              >
                {type === 'LEVEL_UP' ? <Zap size={44} strokeWidth={2.5} /> : <Trophy size={44} strokeWidth={2.5} />}
              </motion.div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {type === 'LEVEL_UP' ? 'New Milestone' : 'Award Unlocked'}
                </p>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  {type === 'LEVEL_UP' ? `Level ${data.level}!` : data.badge_name}
                </h2>
                <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
                  {data.content}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleClose}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition active:scale-95 shadow-lg ${
                  type === 'LEVEL_UP'
                    ? 'bg-sky-500 text-white shadow-sky-200 hover:bg-sky-600'
                    : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600'
                }`}
              >
                Awesome!
              </button>
            </div>

            {/* Decorative background flair */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-slate-50 rounded-full -z-10 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-slate-50 rounded-full -z-10" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
