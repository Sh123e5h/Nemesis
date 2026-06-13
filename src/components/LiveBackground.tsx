import React from 'react';
import clsx from 'clsx';

/** Static fallback: one composited gradient — avoids large blurred layers + continuous animation (Firefox/Chrome/Edge). */
function LiveBackgroundStatic() {
  return (
    <div
      className="fixed inset-0 opacity-60 overflow-hidden pointer-events-none z-[-1] select-none"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-sky-400/30 via-indigo-200/25 to-violet-300/30" />
    </div>
  );
}

// Detect Firefox (Gecko): backdrop-filter is CPU-bound in Firefox — blobs cause will-change budget overrun
const isFirefox = typeof CSS !== 'undefined' && CSS.supports('-moz-appearance', 'none');

interface LiveBackgroundProps {
  isScrolling?: boolean;
  isVisible?: boolean;
}

const LiveBackground: React.FC<LiveBackgroundProps> = ({ isVisible = true }) => {
  const isLowPerf = typeof document !== 'undefined' && document.documentElement.classList.contains('low-perf');

  // Firefox: blobs with blur cause 'will-change memory budget' errors → use static instead
  if (isLowPerf || isFirefox) {
    return <LiveBackgroundStatic />;
  }

  // ⚡ COMPOSITOR FIX: filter:blur() must be a STATIC property (not animated).
  // Only transform + opacity are GPU-composited. By setting blur as an inline style
  // (which never changes), the browser can promote the layer once and re-use it.
  return (
    <div
      className={clsx(
        "fixed inset-0 overflow-hidden pointer-events-none z-[-1] select-none transition-opacity duration-700",
        "main-layout-ambient",
        !isVisible ? "opacity-0" : "opacity-60"
      )}
      aria-hidden
    >
      {/*
        ⚡ Static filter:blur() via inline style = compositor-promoted layer (set once, never repainted).
        Animated properties: transform + opacity only — both GPU compositor-safe.
        Increased saturation (400/500) and blur (80/100px) for Premium "WOW" factor.
      */}
      <div
        className="animate-blob-1 absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-sky-400/30 rounded-full"
        style={{ filter: 'blur(80px)', opacity: 0.8, transform: 'translate3d(0, 0, 0)', willChange: 'transform, opacity' }}
      />
      <div
        className="animate-blob-2 absolute bottom-[-15%] right-[-10%] w-[50vw] h-[50vw] bg-indigo-500/25 rounded-full"
        style={{ filter: 'blur(100px)', opacity: 0.8, transform: 'translate3d(0, 0, 0)', willChange: 'transform, opacity' }}
      />
      <div
        className="animate-blob-3 absolute top-1/3 left-1/3 w-[40vw] h-[40vw] bg-violet-400/20 rounded-full"
        style={{ filter: 'blur(80px)', opacity: 0.8, transform: 'translate3d(0, 0, 0)', willChange: 'transform, opacity' }}
      />
    </div>
  );
};

export default LiveBackground;
