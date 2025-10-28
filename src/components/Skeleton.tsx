/**
 * Skeleton Loading Components
 * Provides visual feedback while content is loading
 */

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-[#1a1a1a] rounded ${className}`}></div>
);

export const CardSkeleton = () => (
  <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-[#1a1a1a] rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-[#1a1a1a] rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-[#1a1a1a] rounded w-1/2"></div>
      </div>
    </div>
    <div className="h-4 bg-[#1a1a1a] rounded w-full mb-2"></div>
    <div className="h-4 bg-[#1a1a1a] rounded w-5/6"></div>
  </div>
);

export const ListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-[#1a1a1a] rounded-lg p-4 border border-[#202225] animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a1a1a] rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-[#1a1a1a] rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-[#1a1a1a] rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl"></div>
      <div className="w-16 h-6 bg-[#1a1a1a] rounded-full"></div>
    </div>
    <div className="h-8 bg-[#1a1a1a] rounded w-1/2 mb-2"></div>
    <div className="h-2 bg-[#1a1a1a] rounded w-full"></div>
  </div>
);

export const MessageSkeleton = () => (
  <div className="flex items-start gap-3 mb-4 animate-pulse">
    <div className="w-10 h-10 bg-[#1a1a1a] rounded-full flex-shrink-0"></div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 bg-[#1a1a1a] rounded w-24"></div>
        <div className="h-3 bg-[#1a1a1a] rounded w-16"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-[#1a1a1a] rounded w-full"></div>
        <div className="h-4 bg-[#1a1a1a] rounded w-4/5"></div>
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {/* Header */}
      {Array.from({ length: cols }).map((_, i) => (
        <div key={`header-${i}`} className="p-4 bg-[#1a1a1a] animate-pulse">
          <div className="h-4 bg-[#0f0f0f] rounded w-3/4"></div>
        </div>
      ))}
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        Array.from({ length: cols }).map((_, colIndex) => (
          <div key={`cell-${rowIndex}-${colIndex}`} className="p-4 border-t border-[#202225] animate-pulse">
            <div className="h-4 bg-[#1a1a1a] rounded w-full"></div>
          </div>
        ))
      ))}
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225] animate-pulse">
    <div className="flex items-center gap-6 mb-6">
      <div className="w-24 h-24 bg-[#1a1a1a] rounded-full"></div>
      <div className="flex-1">
        <div className="h-6 bg-[#1a1a1a] rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-[#1a1a1a] rounded w-1/4 mb-4"></div>
        <div className="flex gap-2">
          <div className="w-20 h-8 bg-[#1a1a1a] rounded-full"></div>
          <div className="w-20 h-8 bg-[#1a1a1a] rounded-full"></div>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="text-center">
          <div className="h-8 bg-[#1a1a1a] rounded w-full mb-2"></div>
          <div className="h-4 bg-[#1a1a1a] rounded w-2/3 mx-auto"></div>
        </div>
      ))}
    </div>
  </div>
);

export const MarketplaceItemSkeleton = () => (
  <div className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-[#202225] animate-pulse">
    <div className="h-48 bg-[#1a1a1a]"></div>
    <div className="p-4">
      <div className="h-5 bg-[#1a1a1a] rounded w-3/4 mb-3"></div>
      <div className="flex gap-2 mb-3">
        <div className="h-6 bg-[#1a1a1a] rounded w-16"></div>
        <div className="h-6 bg-[#1a1a1a] rounded w-16"></div>
      </div>
      <div className="h-4 bg-[#1a1a1a] rounded w-full mb-2"></div>
      <div className="h-4 bg-[#1a1a1a] rounded w-5/6 mb-4"></div>
      <div className="flex items-center justify-between pt-3 border-t border-[#202225]">
        <div className="h-6 bg-[#1a1a1a] rounded w-20"></div>
        <div className="h-4 bg-[#1a1a1a] rounded w-24"></div>
      </div>
    </div>
  </div>
);

