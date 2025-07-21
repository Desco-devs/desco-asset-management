"use client";

import { useVehiclesStore, selectIsModalOpen, selectIsCreateModalOpen, selectIsMaintenanceModalOpen, selectIsEditMode } from "@/stores/vehiclesStore";
import VehiclesListModern from "./VehiclesListModern";
import VehicleModalModern from "./VehicleModalModern";
import CreateVehicleModalModern from "./CreateVehicleModalModern";
import EditVehicleModalModern from "./EditVehicleModalModern";

export default function VehiclesPageModern() {
  // Client state from Zustand (using optimized selectors)
  const isModalOpen = useVehiclesStore(selectIsModalOpen);
  const isCreateModalOpen = useVehiclesStore(selectIsCreateModalOpen);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  const isMaintenanceModalOpen = useVehiclesStore(selectIsMaintenanceModalOpen);

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Main List Component */}
      <VehiclesListModern />

      {/* Modals - Only render when needed */}
      
      {/* Vehicle Details Modal */}
      {isModalOpen && <VehicleModalModern />}

      {/* Create Vehicle Modal */}
      {isCreateModalOpen && <CreateVehicleModalModern />}

      {/* Edit Vehicle Modal */}
      {isEditMode && <EditVehicleModalModern />}

      {/* Maintenance Modal will be added in Feature 6 */}
    </div>
  );
}