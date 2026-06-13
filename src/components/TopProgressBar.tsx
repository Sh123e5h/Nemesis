import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopProgressBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth <= 768;

    // Start progress
    setVisible(true);
    setProgress(15);
    
    // Mobile: Fast single-step completion to save CPU
    if (isMobileDevice) {
      const surge = setTimeout(() => setProgress(90), 50);
      const finish = setTimeout(() => {
        setProgress(100);
        setTimeout(() => setVisible(false), 300);
      }, 500);
      return () => {
        clearTimeout(surge);
        clearTimeout(finish);
      };
    }

    // Desktop: Liquid Trickle Logic
    const trickle = setInterval(() => {
      setProgress(prev => {
        if (prev >= 94) return prev;
        const remaining = 95 - prev;
        return prev + (Math.random() * remaining * 0.08);
      });
    }, 250);

    const finish = setTimeout(() => {
      clearInterval(trickle);
      setProgress(100);
      
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => setProgress(0), 500);
      }, 400);
    }, 650);

    return () => {
      clearInterval(trickle);
      clearTimeout(finish);
    };
  }, [location.pathname]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className="fixed top-0 left-0 right-0 h-[5px] z-[9999] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Subtle backdrop glow */}
          <div className="absolute inset-0 bg-sky-500/10 blur-[2px]" />
          
          <motion.div 
            className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-600 relative"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ 
              type: "spring", 
              stiffness: isMobile ? 100 : 80, 
              damping: 25, 
              restDelta: 0.1
            }}
          >
            {/* The YouTube-style glowing tip/head */}
            <div 
              className="absolute top-0 right-0 h-full w-[100px] flex justify-end"
              style={{
                boxShadow: isMobile 
                  ? 'none' 
                  : '0 0 12px rgba(124, 58, 237, 0.5), 0 0 4px rgba(139, 92, 246, 0.3)'
              }}
            >
              {/* Intensive leading edge light */}
              <div className="h-full w-4 bg-white/80 blur-[1px] rounded-l-full" />
              
              {/* Shimmer effect inside the bar */}
              {!isMobile && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[200px]"
                  animate={{ 
                    x: ['-200%', '300%']
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "linear"
                  }}
                />
              )}
            </div>
          </motion.div>
          
          {/* Glossy overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
