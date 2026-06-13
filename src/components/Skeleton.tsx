import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'text';
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rectangle', style }) => {
  return (
    <div 
      className={clsx(
        "relative overflow-hidden isolate",
        variant === 'circle' && "rounded-full",
        variant === 'rectangle' && "rounded-xl",
        variant === 'text' && "rounded-md h-4 w-full",
        className
      )}
      style={{ 
        // Use CSS variable (set per-theme) with a solid light-mode fallback
        backgroundColor: 'var(--skeleton-bg, #e8ecf0)',
        ...style 
      }}
    >
      {/* Use the global .animate-shimmer class which maps to the @keyframes shimmer in index.css */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
    </div>
  );
};

export const SkeletonCircle: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => (
  <Skeleton variant="circle" className={className} style={{ width: size, height: size }} />
);

export const SkeletonLine: React.FC<{ width?: string; height?: string; className?: string }> = ({ 
  width = '100%', 
  height = '1rem', 
  className 
}) => (
  <Skeleton variant="text" className={className} style={{ width, height }} />
);
