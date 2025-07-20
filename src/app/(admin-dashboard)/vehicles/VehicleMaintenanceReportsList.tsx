"use client";

import { useState, useEffect } from "react";
import { getAllVehicleMaintenanceReportsAction, deleteVehicleMaintenanceReportAction } from "@/app/actions/vehicle-maintenance-actions";

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
  onEditReport?: (report: MaintenanceReport) => void;
}

export default function VehicleMaintenanceReportsList({ vehicleId, onEditReport }: VehicleMaintenanceReportsListProps) {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load maintenance reports
  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAllVehicleMaintenanceReportsAction(vehicleId);
      
      if (result.success) {
        setReports(result.data);
      } else {
        setError("Failed to load maintenance reports");
      }
    } catch (err) {
      console.error("Error loading reports:", err);
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  // Load reports on mount
  useEffect(() => {
    loadReports();
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
        alert("✅ Maintenance report deleted successfully!");
        // Reload reports
        loadReports();
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("❌ Error: " + (error instanceof Error ? error.message : "Failed to delete report"));
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

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded mb-1 w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={loadReports}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
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
        <button 
          onClick={loadReports}
          className="text-blue-500 hover:text-blue-700 text-sm"
        >
          Refresh
        </button>
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