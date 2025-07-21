import { Suspense } from "react";
import VehiclesContainerOptimized from "./VehiclesContainerOptimized";
import VehicleSkeleton from "./VehicleSkeleton";

export default function VehiclePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Vehicles</h1>
      
      <Suspense fallback={<VehicleSkeleton />}>
        <VehiclesContainerOptimized />
      </Suspense>
    </div>
  );
}