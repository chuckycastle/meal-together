/**
 * LoadingSkeleton Component
 * Placeholder skeleton for loading content
 */

interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'list' | 'avatar';
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'text',
  count = 1,
  className = '',
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = () => {
    switch (type) {
      case 'avatar':
        return <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />;

      case 'card':
        return (
          <div className={`rounded-lg border border-gray-200 p-4 dark:border-gray-700 ${className}`}>
            <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        );

      case 'list':
        return (
          <div className={`flex items-center gap-3 ${className}`}>
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="mb-1 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        );

      case 'text':
      default:
        return (
          <div className={`h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
        );
    }
  };

  return (
    <div className="space-y-3">
      {skeletons.map((i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
