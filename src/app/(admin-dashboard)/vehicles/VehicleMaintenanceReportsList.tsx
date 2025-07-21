"use client";

import { useState, useEffect, useRef } from "react";
import { deleteVehicleMaintenanceReportAction } from "@/app/actions/vehicle-maintenance-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

interface MaintenanceReport {
  id: string;
  issue_description: string;
  remarks?: string;
  inspection_details?: string;
  action_taken?: string;
  parts_replaced: string[];
  priority?: string;
  status?: string;
  downtime_hours?: string;
  date_reported: string;
  date_repaired?: string;
  attachment_urls: string[];
  vehicle: {
    brand: string;
    model: string;
    plate_number: string;
  };
  location: {
    address: string;
  };
  reported_user?: {
    full_name: string;
    username: string;
  };
  repaired_user?: {
    full_name: string;
    username: string;
  };
}

interface VehicleMaintenanceReportsListProps {
  vehicleId: string;
  refreshTrigger?: number;
  onEditReport?: (report: MaintenanceReport) => void;
  initialUsers?: Array<{
    id: string;
    full_name: string;
  }>;
  initialLocations?: Array<{
    id: string;
    address: string;
  }>;
  currentVehicle?: {
    brand: string;
    model: string;
    plate_number: string;
  };
  initialMaintenanceReports?: any[];
}

export default function VehicleMaintenanceReportsList({ 
  vehicleId, 
  refreshTrigger, 
  onEditReport, 
  initialUsers = [], 
  initialLocations = [],
  currentVehicle,
  initialMaintenanceReports = []
}: VehicleMaintenanceReportsListProps) {
  // 🔥 MASTERPIECE PATTERN: Use pre-loaded data, filter by vehicleId
  const vehicleReports = initialMaintenanceReports.filter(report => report.vehicle_id === vehicleId);
  const [reports, setReports] = useState<MaintenanceReport[]>(vehicleReports);
  const [error, setError] = useState<string | null>(null);

  // Use refs to avoid subscription recreation
  const usersRef = useRef(initialUsers);
  const locationsRef = useRef(initialLocations);
  const vehicleRef = useRef(currentVehicle);

  // Update refs when props change
  usersRef.current = initialUsers;
  locationsRef.current = initialLocations;
  vehicleRef.current = currentVehicle;

  // Sync with pre-loaded data when initialMaintenanceReports changes
  useEffect(() => {
    const vehicleReports = initialMaintenanceReports.filter(report => report.vehicle_id === vehicleId);
    setReports(vehicleReports);
  }, [initialMaintenanceReports, vehicleId]);


  // Real-time subscription for maintenance reports
  useEffect(() => {
    if (!vehicleId) return;
    
    const supabase = createClient();
    
    const channel = supabase
      .channel(`maintenance-reports-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_vehicle_reports',
          filter: `vehicle_id=eq.${vehicleId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const reportId = payload.new.id;

            // Find the actual users and location from the existing reference data (MASTERPIECE PATTERN)
            const reportedUser = usersRef.current.find(u => u.id === payload.new.reported_by);
            const repairedUser = payload.new.repaired_by ? usersRef.current.find(u => u.id === payload.new.repaired_by) : null;
            const location = locationsRef.current.find(l => l.id === payload.new.location_id);
            
            // Create complete maintenance report object with complete realtime data - NO FALLBACKS, use actual data!
            const newReport: MaintenanceReport = {
              id: reportId,
              issue_description: payload.new.issue_description,
              remarks: payload.new.remarks,
              inspection_details: payload.new.inspection_details,
              action_taken: payload.new.action_taken,
              parts_replaced: payload.new.parts_replaced || [],
              priority: payload.new.priority,
              status: payload.new.status,
              downtime_hours: payload.new.downtime_hours,
              date_reported: payload.new.date_reported,
              date_repaired: payload.new.date_repaired,
              attachment_urls: payload.new.attachment_urls || [],
              vehicle: {
                brand: vehicleRef.current?.brand || 'Unknown',
                model: vehicleRef.current?.model || 'Unknown',
                plate_number: vehicleRef.current?.plate_number || 'Unknown',
              },
              location: location ? {
                address: location.address
              } : {
                address: 'Unknown Location'
              },
              reported_user: reportedUser ? {
                full_name: reportedUser.full_name,
                username: reportedUser.id
              } : undefined,
              repaired_user: repairedUser ? {
                full_name: repairedUser.full_name,
                username: repairedUser.id
              } : undefined,
            };

            // Add new report to the top of the list
            setReports(prev => [newReport, ...prev]);
            
          } else if (payload.eventType === 'UPDATE') {
            
            const reportedUser = usersRef.current.find(u => u.id === payload.new.reported_by);
            const repairedUser = payload.new.repaired_by ? usersRef.current.find(u => u.id === payload.new.repaired_by) : null;
            const location = locationsRef.current.find(l => l.id === payload.new.location_id);
            
            const updatedReport: MaintenanceReport = {
              id: payload.new.id,
              issue_description: payload.new.issue_description,
              remarks: payload.new.remarks,
              inspection_details: payload.new.inspection_details,
              action_taken: payload.new.action_taken,
              parts_replaced: payload.new.parts_replaced || [],
              priority: payload.new.priority,
              status: payload.new.status,
              downtime_hours: payload.new.downtime_hours,
              date_reported: payload.new.date_reported,
              date_repaired: payload.new.date_repaired,
              attachment_urls: payload.new.attachment_urls || [],
              vehicle: {
                brand: vehicleRef.current?.brand || 'Unknown',
                model: vehicleRef.current?.model || 'Unknown',
                plate_number: vehicleRef.current?.plate_number || 'Unknown',
              },
              location: location ? {
                address: location.address
              } : {
                address: 'Unknown Location'
              },
              reported_user: reportedUser ? {
                full_name: reportedUser.full_name,
                username: reportedUser.id
              } : undefined,
              repaired_user: repairedUser ? {
                full_name: repairedUser.full_name,
                username: repairedUser.id
              } : undefined,
            };
            
            setReports(prev => prev.map(report => 
              report.id === payload.new.id ? updatedReport : report
            ));
            
          } else if (payload.eventType === 'DELETE') {
            if (payload.old?.id) {
              setReports(prev => prev.filter(report => report.id !== payload.old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [vehicleId]);

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this maintenance report? This action cannot be undone.")) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append("reportId", reportId);
      
      const result = await deleteVehicleMaintenanceReportAction(formData);
      
      if (result.success) {
        toast.success("Maintenance report deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : "Failed to delete report"));
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REPORTED':
        return 'bg-yellow-100 text-yellow-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-orange-100 text-orange-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No maintenance reports found for this vehicle.</p>
        <p className="text-sm mt-2">Create your first maintenance report to track vehicle issues and repairs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {reports.length} maintenance report{reports.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {reports.map((report) => (
        <div key={report.id} className="border rounded-lg p-4 bg-white shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.status || 'REPORTED')}`}>
                {report.status || 'REPORTED'}
              </span>
              {report.priority && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(report.priority)}`}>
                  {report.priority}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {onEditReport && (
                <button
                  onClick={() => onEditReport(report)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDeleteReport(report.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Issue Description */}
          <div className="mb-3">
            <h4 className="font-medium text-gray-900 mb-1">Issue Description</h4>
            <p className="text-gray-700">{report.issue_description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-sm text-gray-500">Location:</p>
              <p className="text-sm">{report.location.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date Reported:</p>
              <p className="text-sm">{formatDate(report.date_reported)}</p>
            </div>
            {report.date_repaired && (
              <div>
                <p className="text-sm text-gray-500">Date Repaired:</p>
                <p className="text-sm">{formatDate(report.date_repaired)}</p>
              </div>
            )}
            {report.downtime_hours && (
              <div>
                <p className="text-sm text-gray-500">Downtime:</p>
                <p className="text-sm">{report.downtime_hours}</p>
              </div>
            )}
          </div>

          {/* Parts Replaced */}
          {report.parts_replaced && report.parts_replaced.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Parts Replaced:</p>
              <div className="flex flex-wrap gap-1">
                {report.parts_replaced.map((part, index) => (
                  <span key={index} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                    {part}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Taken */}
          {report.action_taken && (
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Action Taken:</p>
              <p className="text-sm text-gray-700">{report.action_taken}</p>
            </div>
          )}

          {/* Inspection Details */}
          {report.inspection_details && (
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Inspection Details:</p>
              <p className="text-sm text-gray-700">{report.inspection_details}</p>
            </div>
          )}

          {/* Remarks */}
          {report.remarks && (
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-1">Remarks:</p>
              <p className="text-sm text-gray-700">{report.remarks}</p>
            </div>
          )}

          {/* Attachments */}
          {report.attachment_urls && report.attachment_urls.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">Attachments ({report.attachment_urls.length}):</p>
              <div className="flex flex-wrap gap-2">
                {report.attachment_urls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 text-sm underline"
                  >
                    Attachment {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-3 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>
                Reported by: {report.reported_user?.full_name || 'Unknown'}
              </span>
              {report.repaired_user && (
                <span>
                  Repaired by: {report.repaired_user.full_name}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}