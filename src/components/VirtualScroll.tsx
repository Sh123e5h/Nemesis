import React, { memo } from 'react';
import * as RW from 'react-window';

// Handle potentially inconsistent export styles in react-window v2.x/forks
const { FixedSizeList } = RW as any;

interface VirtualScrollProps {
  items: any[];
  itemSize: number;
  height: number;
  width?: string | number;
  renderItem: (index: number, style: any) => React.ReactNode;
  className?: string;
  overscanCount?: number;
}

/**
 * VirtualScroll Component
 * 
 * Renders large lists efficiently using react-window's virtual scrolling.
 * Only renders items visible in viewport, dramatically improving performance
 * for lists with 100+ items.
 */
const VirtualScrollComponent = ({
  items,
  itemSize,
  height,
  width = '100%',
  renderItem,
  className = '',
  overscanCount = 5,
}: VirtualScrollProps) => {
  return (
    <div className={`virtual-scroll-container ${className}`}>
      <FixedSizeList
        height={typeof height === 'number' ? height : 500}
        itemCount={items.length}
        itemSize={itemSize}
        width={width}
        overscanCount={overscanCount}
        className="custom-scrollbar"
      >
        {({ index, style }: { index: number; style: any }) => (
          <div style={style} className="virtual-scroll-item">
            {renderItem(index, style)}
          </div>
        )}
      </FixedSizeList>
    </div>
  );
};

export const VirtualScroll = memo(VirtualScrollComponent);
(VirtualScroll as any).displayName = 'VirtualScroll';
