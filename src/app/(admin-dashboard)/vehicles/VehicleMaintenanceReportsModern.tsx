"use client";

import { Button } from "@/components/ui/button";
import { Plus, Wrench } from "lucide-react";
import { useVehiclesStore } from "@/stores/vehiclesStore";
import { useMaintenanceReports } from "@/hooks/useVehiclesQuery";

interface VehicleMaintenanceReportsModernProps {
  vehicleId: string;
}

export default function VehicleMaintenanceReportsModern({ vehicleId }: VehicleMaintenanceReportsModernProps) {
  const { data: maintenanceReports = [], isLoading } = useMaintenanceReports();
  const { setIsMaintenanceModalOpen } = useVehiclesStore();

  // Filter reports for this specific vehicle (with safety check)
  const vehicleReports = Array.isArray(maintenanceReports) 
    ? maintenanceReports.filter(report => report.vehicle_id === vehicleId)
    : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Loading maintenance reports...</p>
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" />
            Add Report
          </Button>
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded mb-1 w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {vehicleReports.length} maintenance report{vehicleReports.length !== 1 ? 's' : ''} found
        </p>
        <Button onClick={() => setIsMaintenanceModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Report
        </Button>
      </div>

      {vehicleReports.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Wrench className="h-8 w-8 mx-auto text-gray-400 mb-3" />
          <p className="text-muted-foreground mb-2">No maintenance reports yet</p>
          <p className="text-sm text-muted-foreground">Add your first maintenance report to track vehicle issues and repairs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicleReports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{report.issue_description}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  report.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  report.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {report.status || 'REPORTED'}
                </span>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Priority: {report.priority || 'MEDIUM'}</p>
                <p>Date: {new Date(report.date_reported).toLocaleDateString()}</p>
                {report.action_taken && (
                  <p className="mt-2 text-sm">Action: {report.action_taken}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}