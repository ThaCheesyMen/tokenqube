import React from 'react';
import { Loader2, Zap } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  fullScreen = false,
  size = 'md' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <Loader2 className={`${sizeClasses[size]} text-indigo-500 animate-spin`} />
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-50 animate-pulse"></div>
      </div>
      {message && (
        <p className="text-gray-400 font-medium animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
}

// Skeleton Loader Component
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`}></div>
  );
}

// Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <SkeletonLoader className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SkeletonLoader className="h-32" />
        <SkeletonLoader className="h-32" />
        <SkeletonLoader className="h-32" />
      </div>
      <SkeletonLoader className="h-64" />
      <SkeletonLoader className="h-48" />
    </div>
  );
}

