import React from 'react';
import clsx from 'clsx';

interface Props {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<Props> = ({ 
  className, 
  variant = 'rect', 
  width, 
  height 
}) => {
  const variantStyles = {
    text: "h-3 w-full rounded-md",
    rect: "rounded-xl",
    circle: "rounded-full"
  };

  return (
    <div 
      className={clsx("relative overflow-hidden isolate", variantStyles[variant], className)}
      style={{ 
        width, 
        height, 
        // fallback to solid light-mode gray if theme variable is missing/transparent
        backgroundColor: 'var(--skeleton-bg, #e8ecf0)'
      }}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
    </div>
  );
};

export default React.memo(Skeleton);

