"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Download, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { useExportEquipmentMaintenanceReports } from "@/hooks/useEquipmentQuery";
import type { ExportFilters } from "@/hooks/useEquipmentQuery";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipments?: Array<{ id: string; brand: string; model: string; plate_number?: string }>;
}

export function ExportDialog({ isOpen, onClose, equipments = [] }: ExportDialogProps) {
  const [filters, setFilters] = useState<Partial<ExportFilters>>({
    format: 'pdf',
    reportType: 'summary',
    status: 'ALL_STATUS',
    priority: 'ALL_PRIORITIES',
    equipmentId: 'ALL_EQUIPMENTS',
  });
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const exportMutation = useExportEquipmentMaintenanceReports();

  const handleExport = () => {
    const exportFilters: Partial<ExportFilters> = {
      ...filters,
      // Convert "ALL_" values to undefined to match API expectations
      equipmentId: filters.equipmentId === 'ALL_EQUIPMENTS' ? undefined : filters.equipmentId,
      status: filters.status === 'ALL_STATUS' ? undefined : filters.status,
      priority: filters.priority === 'ALL_PRIORITIES' ? undefined : filters.priority,
      startDate: startDate?.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
    };

    exportMutation.mutate(exportFilters, {
      onSuccess: () => {
        onClose();
        // Reset form
        setFilters({ 
          format: 'pdf', 
          reportType: 'summary',
          status: 'ALL_STATUS',
          priority: 'ALL_PRIORITIES',
          equipmentId: 'ALL_EQUIPMENTS',
        });
        setStartDate(undefined);
        setEndDate(undefined);
      }
    });
  };

  const formatOptions = [
    { value: 'pdf', label: 'PDF', icon: FileText },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
  ];

  const reportTypeOptions = [
    { value: 'summary', label: 'Summary Report' },
    { value: 'detailed', label: 'Detailed Report' },
  ];

  const statusOptions = [
    { value: 'ALL_STATUS', label: 'All Status' },
    { value: 'REPORTED', label: 'Reported' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'ALL_PRIORITIES', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Equipment Maintenance Reports
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {formatOptions.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant={filters.format === value ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setFilters(prev => ({ ...prev, format: value as 'pdf' | 'excel' }))}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select
              value={filters.reportType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, reportType: value as 'summary' | 'detailed' }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypeOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipment Filter */}
          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment (Optional)</Label>
            <Select
              value={filters.equipmentId || 'ALL_EQUIPMENTS'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, equipmentId: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All equipment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_EQUIPMENTS">All equipment</SelectItem>
                {equipments.map(equipment => (
                  <SelectItem key={equipment.id} value={equipment.id}>
                    {equipment.brand} {equipment.model} {equipment.plate_number ? `(${equipment.plate_number})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Status Filter</Label>
            <Select
              value={filters.status || 'ALL_STATUS'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority Filter</Label>
            <Select
              value={filters.priority || 'ALL_PRIORITIES'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <Label>Date Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) =>
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={exportMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {filters.format?.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;