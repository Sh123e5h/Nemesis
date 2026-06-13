import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PremiumSplashScreenProps {
  isVisible: boolean;
  onFinish?: () => void;
}

/** 
 * Premium SplashScreen component
 * Features:
 * 1. LiveBackground (mesh gradient) matching Admin/Maintenance
 * 2. Centered Logo with entry animation
 * 3. "written by Team Genesis" credit at the bottom
 * 4. Smooth opacity fade-out
 */
const PremiumSplashScreen: React.FC<PremiumSplashScreenProps> = ({ isVisible, onFinish }) => {
  useEffect(() => {
    if (isVisible) {
      // 1.5s duration for a snappier entry
      const timer = setTimeout(() => {
        onFinish?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onFinish]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "linear" }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#f8fafc]"
        >
          {/* 🛡️ Solid Opaque Foundation Case */}
          <div className="absolute inset-0 bg-[#f8fafc] z-0" />

          {/* ⚡ Exact Background from Maintenance Page (LiveBackground Implementation) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80 select-none z-1">
            <div
              className="animate-blob-1 absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-sky-200/50 rounded-full"
              style={{ filter: 'blur(80px)', willChange: 'transform, opacity' }}
            />
            <div
              className="animate-blob-2 absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-200/50 rounded-full"
              style={{ filter: 'blur(100px)', willChange: 'transform, opacity' }}
            />
            <div
              className="animate-blob-3 absolute top-1/3 left-1/3 w-[40vw] h-[40vw] bg-violet-200/50 rounded-full"
              style={{ filter: 'blur(80px)', willChange: 'transform, opacity' }}
            />
          </div>
          
          {/* Centered Logo with presence animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            {/* Subtle glow behind the logo */}
            <div className="absolute inset-0 bg-sky-500/10 blur-3xl rounded-full scale-150 animate-pulse" />
            <img
              src="/icon-512.png"
              alt="Nemesis"
              className="w-36 h-36 md:w-52 md:h-52 max-w-[70vw] relative z-10 drop-shadow-[0_20px_30px_rgba(0,0,0,0.1)]"
            />
          </motion.div>

          {/* Bottom Credit - "from Genesis" (Refined Gradient Branding) */}
          <div className="absolute bottom-12 md:bottom-16 left-0 right-0 z-10 flex flex-col items-center select-none cursor-default pb-safe">
            <span className="text-slate-400 text-[10px] md:text-[11px] font-medium lowercase mb-0.5" style={{ fontFamily: 'Outfit, sans-serif' }}>from</span>
            <span 
              className="text-lg md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-600 bg-clip-text text-transparent"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Genesis
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumSplashScreen;
