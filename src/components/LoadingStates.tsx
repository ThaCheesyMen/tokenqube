import { Loader2 } from 'lucide-react';

// Full page loading
export function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#8B5CF6] animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#202225] animate-pulse">
      <div className="h-4 bg-[#2f3136] rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-[#2f3136] rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-[#2f3136] rounded w-2/3"></div>
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] rounded-lg animate-pulse">
      <div className="w-12 h-12 bg-[#2f3136] rounded-full flex-shrink-0"></div>
      <div className="flex-1">
        <div className="h-4 bg-[#2f3136] rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-[#2f3136] rounded w-1/2"></div>
      </div>
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-[#1a1a1a] rounded-lg">
          <div className="h-4 bg-[#2f3136] rounded w-1/4"></div>
          <div className="h-4 bg-[#2f3136] rounded w-1/3"></div>
          <div className="h-4 bg-[#2f3136] rounded w-1/4"></div>
          <div className="h-4 bg-[#2f3136] rounded w-1/6"></div>
        </div>
      ))}
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden animate-pulse">
      <div className="h-48 bg-[#2f3136]"></div>
      <div className="p-6 -mt-16 relative">
        <div className="w-32 h-32 bg-[#2f3136] rounded-full mb-4"></div>
        <div className="h-6 bg-[#2f3136] rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-[#2f3136] rounded w-1/2 mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-[#2f3136] rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Chat message skeleton
export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 p-4 animate-pulse">
      <div className="w-10 h-10 bg-[#2f3136] rounded-full flex-shrink-0"></div>
      <div className="flex-1">
        <div className="h-4 bg-[#2f3136] rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-[#2f3136] rounded w-3/4 mb-1"></div>
        <div className="h-3 bg-[#2f3136] rounded w-2/3"></div>
      </div>
    </div>
  );
}

// Grid skeleton (for game cards, etc.)
export function GridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video bg-[#2f3136] rounded-lg mb-2"></div>
          <div className="h-4 bg-[#2f3136] rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-[#2f3136] rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-[#202225] animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-[#2f3136] rounded w-1/3"></div>
        <div className="w-8 h-8 bg-[#2f3136] rounded-lg"></div>
      </div>
      <div className="h-8 bg-[#2f3136] rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-[#2f3136] rounded w-2/3"></div>
    </div>
  );
}

// Inline spinner
export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <Loader2 className={`animate-spin ${className}`} />
  );
}

// Button loading state
export function ButtonLoader() {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Loading...</span>
    </div>
  );
}

// Skeleton wrapper for conditional loading
export function SkeletonWrapper({
  isLoading,
  skeleton,
  children,
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  return isLoading ? <>{skeleton}</> : <>{children}</>;
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          {/* Header */}
          <div className="h-8 bg-[#2f3136] rounded w-1/4 mb-8"></div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <div className="space-y-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 mb-6 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

