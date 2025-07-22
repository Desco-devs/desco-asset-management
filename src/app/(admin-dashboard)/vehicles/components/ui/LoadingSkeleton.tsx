"use client";

export default function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Filters Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>

      {/* Results Summary Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Vehicle Cards Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 bg-white shadow-sm animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                <div className="h-5 bg-gray-200 rounded"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded mb-2 w-2/3"></div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}