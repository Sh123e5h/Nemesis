import React from 'react';
import clsx from 'clsx';
import { getGravatarUrl } from '../lib/utils';
import OptimizedImage from './OptimizedImage';

interface UserAvatarProps {
  url?: string | null;
  email?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  ring?: boolean;
  ringColor?: string;
  shape?: 'circle' | 'square';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  url, 
  email,
  name = 'User', 
  size = 'md', 
  className,
  ring = false,
  ringColor = 'ring-white',
  shape = 'circle'
}) => {
  const [imageError, setImageError] = React.useState(false);
  // Map size presets to pixel values for Google URL optimization
  const sizeMap: Record<string, number> = {
    'xs': 24,
    'sm': 32,
    'md': 48,
    'lg': 64,
    'xl': 96,
    '2xl': 128
  };

  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 48;

  // Upgrade Google Profile Photo resolution if applicable
  const getAvatarUrl = (src: string) => {
    if (src.includes('googleusercontent.com')) {
      // Handle =sXX-c pattern
      if (src.includes('=s')) {
        return src.replace(/=s\d+(-c)?/, `=s${pixelSize * 2}-c`);
      }
      // Handle ?sz=XX pattern
      if (src.includes('sz=')) {
        return src.replace(/sz=\d+/, `sz=${pixelSize * 2}`);
      }
      // If no size suffix, add it
      return `${src}${src.includes('?') ? '&' : '?'}sz=${pixelSize * 2}`;
    }
    return src;
  };

  const initial = (name || 'U').charAt(0).toUpperCase();

  const sizeClasses: Record<string, string> = {
    'xs': 'w-6 h-6 text-[10px]',
    'sm': 'w-8 h-8 text-xs',
    'md': 'w-10 h-10 text-sm',
    'lg': 'w-12 h-12 text-base',
    'xl': 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl'
  };

  const baseClasses = clsx(
    shape === 'circle' ? "rounded-full" : "rounded-2xl",
    "flex items-center justify-center font-bold shrink-0 overflow-hidden bg-slate-100",
    typeof size === 'string' ? sizeClasses[size] : `w-[${size}px] h-[${size}px]`,
    ring && `ring-2 ${ringColor} ring-offset-2`,
    className
  );

  if ((url || email) && !imageError) {
    const finalUrl = url ? getAvatarUrl(url) : (email ? getGravatarUrl(email, pixelSize * 2) : null);
    
    if (finalUrl) {
      return (
        <div className={baseClasses}>
          <OptimizedImage
            src={finalUrl}
            alt={name || 'Avatar'}
            width={pixelSize * 2}
            height={pixelSize * 2}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
  }

  return (
    <div className={clsx(baseClasses, "bg-sky-100 text-sky-600 shadow-sm")}>
      {initial}
    </div>
  );
};

export default UserAvatar;
