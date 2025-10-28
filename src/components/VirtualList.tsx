/**
 * Virtual List Component
 * Renders only visible items for optimal performance with large lists
 */

import { memo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

function VirtualListComponent<T>({
  items,
  itemHeight,
  renderItem,
  emptyMessage = 'No items to display',
  className = '',
}: VirtualListProps<T>) {
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style}>{renderItem(items[index], index)}</div>
  );

  return (
    <div className={`h-full ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width={width}
            overscanCount={5} // Render 5 extra items outside viewport
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

export const VirtualList = memo(VirtualListComponent) as typeof VirtualListComponent;

// =====================================================
// VARIABLE SIZE VIRTUAL LIST
// =====================================================

import { VariableSizeList } from 'react-window';

interface VariableVirtualListProps<T> {
  items: T[];
  getItemSize: (index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

function VariableVirtualListComponent<T>({
  items,
  getItemSize,
  renderItem,
  emptyMessage = 'No items to display',
  className = '',
}: VariableVirtualListProps<T>) {
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style}>{renderItem(items[index], index)}</div>
  );

  return (
    <div className={`h-full ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <VariableSizeList
            height={height}
            itemCount={items.length}
            itemSize={getItemSize}
            width={width}
            overscanCount={5}
          >
            {Row}
          </VariableSizeList>
        )}
      </AutoSizer>
    </div>
  );
}

export const VariableVirtualList = memo(VariableVirtualListComponent) as typeof VariableVirtualListComponent;

// =====================================================
// GRID VIRTUAL LIST (for marketplaces, galleries)
// =====================================================

import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';

interface VirtualGridProps<T> {
  items: T[];
  columnCount: number;
  rowHeight: number;
  columnWidth: number;
  renderItem: (item: T, rowIndex: number, columnIndex: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

function VirtualGridComponent<T>({
  items,
  columnCount,
  rowHeight,
  columnWidth,
  renderItem,
  emptyMessage = 'No items to display',
  className = '',
}: VirtualGridProps<T>) {
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const rowCount = Math.ceil(items.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= items.length) return null;
    
    return (
      <div style={style}>
        {renderItem(items[index], rowIndex, columnIndex)}
      </div>
    );
  };

  return (
    <div className={`h-full ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <Grid
            columnCount={columnCount}
            columnWidth={columnWidth}
            height={height}
            rowCount={rowCount}
            rowHeight={rowHeight}
            width={width}
            overscanRowCount={2}
            overscanColumnCount={2}
          >
            {Cell}
          </Grid>
        )}
      </AutoSizer>
    </div>
  );
}

export const VirtualGrid = memo(VirtualGridComponent) as typeof VirtualGridComponent;

