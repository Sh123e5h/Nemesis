import React from 'react';
import { getOptimizedUrl } from '../lib/storage';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  width?: number;
  height?: number;
  quality?: number;
  optimize?: boolean;
}

const OptimizedImage: React.FC<Props> = ({ 
  src, 
  width, 
  height, 
  quality = 80, 
  optimize = true,
  className,
  alt = "",
  loading = "lazy",
  ...props 
}) => {
  const displaySrc = optimize ? getOptimizedUrl(src, width, height, quality) : src;

  return (
    <img
      src={displaySrc}
      alt={alt || "Nemesis Asset"}
      loading={loading}
      decoding="async"
      className={className}
      {...props}
    />
  );
};

export default React.memo(OptimizedImage);
