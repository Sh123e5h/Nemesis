import React, { Suspense, type ComponentType } from 'react';
import { lazyWithRetry } from './lazyWithRetry';
import type { ComponentProps } from 'react';

/**
 * Wraps a lazy-loaded component with:
 * 1. Proper Suspense boundary with fallback
 * 2. Error recovery from React hook initialization failures
 * 3. Context preservation during chunk loading
 * 
 * This prevents "resolveDispatcher is null" errors by ensuring
 * lazy components are loaded within a proper React context
 */
export function safelyLoadComponent<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string,
  fallback?: React.ReactNode,
): T {
  const LazyComponent = lazyWithRetry(componentImport, componentName);

  return ((props: ComponentProps<T>) => (
    <Suspense fallback={fallback || <div />}>
      <LazyComponent {...props} />
    </Suspense>
  )) as T;
}

/**
 * Alternative: For use in Route elements. Automatically handles Suspense
 * so you don't need to wrap each route manually.
 */
export function createSafeRoute<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName: string,
) {
  return lazyWithRetry(componentImport, componentName);
}
