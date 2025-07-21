import { Suspense } from "react";
import VehiclesListOptimized from "./VehiclesListOptimized";

function VehiclesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 12 }).map((_, index) => (
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
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VehiclesContainerOptimized() {
  return (
    <Suspense fallback={<VehiclesSkeleton />}>
      <VehiclesListOptimized />
    </Suspense>
  );
}