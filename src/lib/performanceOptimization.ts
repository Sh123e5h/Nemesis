/**
 * ⚡ PERFORMANCE OPTIMIZATION MODULE
 * 
 * Handles Core Web Vitals optimization:
 * - LCP (Largest Contentful Paint)
 * - FCP (First Contentful Paint)  
 * - CLS (Cumulative Layout Shift)
 * - TTL (Time to Interactive)
 * 
 * Techniques:
 * 1. Image preloading and lazy loading
 * 2. Critical resource prioritization
 * 3. Layout shift prevention
 * 4. Analytics deferred loading
 */

export const performanceConfig = {
  // ✅ LCP OPTIMIZATION
  lcp: {
    // Preload critical hero images in WebP format
    heroImageWebP: '/hero-image.webp',
    heroImageFallback: '/hero-image.png',
    fetchPriority: 'high' as const,
  },
  
  // ✅ FCP OPTIMIZATION
  fcp: {
    // Defer non-critical scripts
    deferAnalytics: true,
    analyticsDelay: 3000, // Wait 3s before loading GA
    
    // Defer complex component rendering
    deferComplexUI: true,
    complexComponentDelay: 2000,
    
    // Tree-shake unused modules
    treeShakeUnused: true,
  },
  
  // ✅ CLS PREVENTION
  cls: {
    // Reserve space for images with aspect ratios
    imageAspectRatios: {
      hero: 16/9,
      card: 1/1,
      thumbnail: 4/3,
    },
    
    // Use fixed heights for dynamic content
    dynamicContentMinHeight: true,
  },
  
  // ✅ RESOURCE HINTS
  resourceHints: {
    preconnect: [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://hzostigkcsursgbbqudn.supabase.co',
      'https://www.googletagmanager.com',
    ],
    prefetch: [
      '/assets/vendor-react-core-*.js',
      '/assets/vendor-router-*.js',
    ],
  }
};

/**
 * ✅ WEB FONTS OPTIMIZATION
 * Load fonts with optimal display strategy
 */
export const fontOptimization = {
  // Use font-display: swap for fastest perceived performance
  // Let browser render text in fallback font while custom font loads
  fontDisplay: 'swap',
  
  // Preload only critical font weights (400, 600, 700)
  preloadWeights: [400, 600, 700],
};

/**
 * ✅ IMAGE OPTIMIZATION RECOMMENDATIONS
 * 
 * 1. WebP Format
 *    - 25-35% smaller than PNG/JPEG
 *    - Use <picture> element with fallback
 * 
 * 2. Responsive Images
 *    - Use srcset for different screen sizes
 *    - Use sizes attribute for layout context
 * 
 * 3. Lazy Loading
 *    - Use loading="lazy" for below-fold images
 *    - Do NOT use for LCP images
 * 
 * 4. Image Dimensions
 *    - Always specify width/height to prevent CLS
 *    - Use aspect-ratio CSS property
 * 
 * Example:
 * <picture>
 *   <source srcset="/img.webp" type="image/webp" />
 *   <source srcset="/img.jpg" type="image/jpeg" />
 *   <img src="/img.jpg" alt="..." width="800" height="600" loading="lazy" />
 * </picture>
 */

/**
 * ✅ CODE SPLITTING STRATEGY
 * 
 * Routes are split into separate bundles:
 * - vendor-react-core: React core (loaded eagerly)
 * - vendor-router: React Router (loaded eagerly)
 * - Page components: Lazy loaded per route
 * 
 * This ensures FCP is fast by only loading essential JS
 */

/**
 * ✅ PERFORMANCE MONITORING
 * 
 * Use Web Vitals API to track Core Web Vitals
 * Send metrics to Google Analytics for monitoring
 */
export const reportWebVital = (metric: any) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'web_vitals',
      event_label: metric.id,
    });
  }
};

/**
 * ✅ CRITICAL RENDERING PATH OPTIMIZATION
 * 
 * Order of operations:
 * 1. Parse HTML
 * 2. Load critical CSS (inlined)
 * 3. Render splash screen
 * 4. Load React bundle (code-split)
 * 5. Render React app with lazy routes
 * 6. Load non-critical JS (analytics, etc.)
 */
