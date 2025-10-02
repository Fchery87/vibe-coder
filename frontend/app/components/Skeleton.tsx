'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-700/50';

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Common skeleton patterns
export function CodeSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="rectangular" height={16} />
      <Skeleton variant="rectangular" width="80%" height={16} />
      <Skeleton variant="rectangular" width="90%" height={16} />
      <Skeleton variant="rectangular" width="70%" height={16} />
      <Skeleton variant="text" width="40%" height={20} />
      <Skeleton variant="rectangular" height={16} />
      <Skeleton variant="rectangular" width="85%" height={16} />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-start">
        <div className="glass-panel p-4 rounded-2xl max-w-[80%]">
          <Skeleton variant="text" width={200} height={16} />
          <Skeleton variant="text" width={150} height={16} className="mt-2" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="glass-panel p-4 rounded-2xl max-w-[80%]">
          <Skeleton variant="text" width={180} height={16} />
          <Skeleton variant="text" width={120} height={16} className="mt-2" />
        </div>
      </div>
      <div className="flex justify-start">
        <div className="glass-panel p-4 rounded-2xl max-w-[80%]">
          <Skeleton variant="text" width={160} height={16} />
        </div>
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton variant="rectangular" height={40} />
      <Skeleton variant="rectangular" height={120} />
      <Skeleton variant="rectangular" height={80} />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="rectangular" height={60} />
        <Skeleton variant="rectangular" height={60} />
      </div>
    </div>
  );
}