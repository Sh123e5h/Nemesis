import React, { useMemo } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { useMobile } from '../hooks/useMobile';

interface PageTransitionProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

// Firefox's Gecko compositor handles simultaneous transform + opacity animations
// much worse than Chrome/Safari. Detect once at module load (stable across renders).
const isFirefox = typeof CSS !== 'undefined' && CSS.supports('-moz-appearance', 'none');

/**
 * PageTransition Component
 * Provides a unified, "alive" entry animation for all pages.
 * Optimized with high-performance spring dynamics to prevent "layout-lag" feel.
 * On Firefox: uses a lightweight CSS fade to avoid Gecko compositor overload.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children, className, ...props }) => {
  const { isMobile } = useMobile();

  // ⚠️ Hooks must be called unconditionally — compute variants before any early return
  const variants = useMemo(() => ({
    initial: { 
      opacity: 0, 
      y: isMobile ? 4 : 8, 
      scale: isMobile ? 1 : 0.99 
    },
    animate: { 
      opacity: 1, 
      y: 0, 
      scale: 1 
    },
    exit: { 
      opacity: 0, 
      y: isMobile ? -2 : -4, 
      scale: isMobile ? 1 : 0.995 
    }
  }), [isMobile]);

  // Firefox: skip motion entirely — CSS animation-based fade is 10× cheaper in Gecko
  if (isFirefox) {
    return (
      <div
        className={`page-transition-wrapper w-full flex-1 flex flex-col min-w-0 firefox-fade-in ${className || ''}`}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={isMobile ? {
        type: 'tween',
        ease: 'easeOut',
        duration: 0.25
      } : {
        type: 'spring',
        stiffness: 260,
        damping: 32,
        mass: 1,
      }}
      className={`page-transition-wrapper w-full flex-1 flex flex-col min-w-0 ${className || ''}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;

