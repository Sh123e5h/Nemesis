import { useState, useEffect } from 'react';

/**
 * ⚡ Optimized Mobile Detection Hook
 * Uses native matchMedia for performance — 0 dependencies.
 * Also handles standard user-agent detection for specific behaviors.
 */
export function useMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches || 
           /Mobi|Android|iPhone/i.test(navigator.userAgent);
  });

  const [isNarrowMobile, setIsNarrowMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 360px)').matches;
  });

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const narrowQuery = window.matchMedia('(max-width: 360px)');

    const handler = () => {
      setIsMobile(mobileQuery.matches || /Mobi|Android|iPhone/i.test(navigator.userAgent));
      setIsNarrowMobile(narrowQuery.matches);
    };

    // Modern browsers support addEventListener on MediaQueryList
    mobileQuery.addEventListener('change', handler);
    narrowQuery.addEventListener('change', handler);

    return () => {
      mobileQuery.removeEventListener('change', handler);
      narrowQuery.removeEventListener('change', handler);
    };
  }, []);

  return { isMobile, isNarrowMobile };
}
