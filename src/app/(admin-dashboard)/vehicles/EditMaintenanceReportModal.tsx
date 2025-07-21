"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Trash2, Edit } from "lucide-react";
import { useVehiclesStore } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData, useUpdateMaintenanceReport } from "@/hooks/useVehiclesQuery";
import { toast } from "sonner";

export default function EditMaintenanceReportModal() {
  const selectedMaintenanceReport = useVehiclesStore(state => state.selectedMaintenanceReport);
  const { setSelectedMaintenanceReport } = useVehiclesStore();
  const { locations } = useVehiclesWithReferenceData();
  const updateMaintenanceReportMutation = useUpdateMaintenanceReport();
  
  const isOpen = Boolean(selectedMaintenanceReport);
  
  // Form state
  const [formData, setFormData] = useState({
    issue_description: '',
    remarks: '',
    inspection_details: '',
    action_taken: '',
    priority: 'MEDIUM',
    status: 'REPORTED',
    downtime_hours: '',
    location_id: '',
    parts_replaced: [''] as string[],
    attachment_urls: [''] as string[]
  });

  // Initialize form when modal opens with existing data
  useEffect(() => {
    if (selectedMaintenanceReport) {
      setFormData({
        issue_description: selectedMaintenanceReport.issue_description || '',
        remarks: selectedMaintenanceReport.remarks || '',
        inspection_details: selectedMaintenanceReport.inspection_details || '',
        action_taken: selectedMaintenanceReport.action_taken || '',
        priority: selectedMaintenanceReport.priority || 'MEDIUM',
        status: selectedMaintenanceReport.status || 'REPORTED',
        downtime_hours: selectedMaintenanceReport.downtime_hours || '',
        location_id: selectedMaintenanceReport.location_id || selectedMaintenanceReport.location?.id || '',
        parts_replaced: selectedMaintenanceReport.parts_replaced?.length > 0 
          ? selectedMaintenanceReport.parts_replaced 
          : [''],
        attachment_urls: selectedMaintenanceReport.attachment_urls?.length > 0 
          ? selectedMaintenanceReport.attachment_urls 
          : ['']
      });
    }
  }, [selectedMaintenanceReport]);

  const handleClose = () => {
    setSelectedMaintenanceReport(null);
    // Reset form
    setFormData({
      issue_description: '',
      remarks: '',
      inspection_details: '',
      action_taken: '',
      priority: 'MEDIUM',
      status: 'REPORTED',
      downtime_hours: '',
      location_id: '',
      parts_replaced: [''],
      attachment_urls: ['']
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'parts_replaced' | 'attachment_urls', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'parts_replaced' | 'attachment_urls') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'parts_replaced' | 'attachment_urls', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMaintenanceReport) return;
    
    // Validation
    if (!formData.issue_description.trim()) {
      toast.error('Issue description is required');
      return;
    }
    
    if (!formData.location_id) {
      toast.error('Location is required');
      return;
    }

    // Clean up arrays - remove empty strings
    const cleanData = {
      id: selectedMaintenanceReport.id,
      ...formData,
      parts_replaced: formData.parts_replaced.filter(part => part.trim() !== ''),
      attachment_urls: formData.attachment_urls.filter(url => url.trim() !== ''),
      downtime_hours: formData.downtime_hours || null
    };

    try {
      await updateMaintenanceReportMutation.mutateAsync(cleanData);
      handleClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  if (!selectedMaintenanceReport) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Maintenance Report
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="issue_description">Issue Description *</Label>
            <Textarea
              id="issue_description"
              value={formData.issue_description}
              onChange={(e) => handleInputChange('issue_description', e.target.value)}
              placeholder="Describe the issue or maintenance needed..."
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location_id">Location *</Label>
            <Select value={formData.location_id} onValueChange={(value) => handleInputChange('location_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPORTED">Reported</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Downtime Hours */}
          <div className="space-y-2">
            <Label htmlFor="downtime_hours">Downtime Hours</Label>
            <Input
              id="downtime_hours"
              type="number"
              value={formData.downtime_hours}
              onChange={(e) => handleInputChange('downtime_hours', e.target.value)}
              placeholder="0"
              min="0"
            />
          </div>

          {/* Inspection Details */}
          <div className="space-y-2">
            <Label htmlFor="inspection_details">Inspection Details</Label>
            <Textarea
              id="inspection_details"
              value={formData.inspection_details}
              onChange={(e) => handleInputChange('inspection_details', e.target.value)}
              placeholder="Detailed inspection findings..."
              className="min-h-[80px]"
            />
          </div>

          {/* Action Taken */}
          <div className="space-y-2">
            <Label htmlFor="action_taken">Action Taken</Label>
            <Textarea
              id="action_taken"
              value={formData.action_taken}
              onChange={(e) => handleInputChange('action_taken', e.target.value)}
              placeholder="Actions taken to resolve the issue..."
              className="min-h-[80px]"
            />
          </div>

          {/* Parts Replaced */}
          <div className="space-y-2">
            <Label>Parts Replaced</Label>
            {formData.parts_replaced.map((part, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={part}
                  onChange={(e) => handleArrayChange('parts_replaced', index, e.target.value)}
                  placeholder="Part name/description"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem('parts_replaced', index)}
                  disabled={formData.parts_replaced.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('parts_replaced')}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </div>

          {/* Attachment URLs */}
          <div className="space-y-2">
            <Label>Attachment URLs</Label>
            {formData.attachment_urls.map((url, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => handleArrayChange('attachment_urls', index, e.target.value)}
                  placeholder="https://example.com/file.pdf"
                  type="url"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem('attachment_urls', index)}
                  disabled={formData.attachment_urls.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addArrayItem('attachment_urls')}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Attachment
            </Button>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Additional notes or comments..."
              className="min-h-[80px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={updateMaintenanceReportMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={updateMaintenanceReportMutation.isPending}
            >
              {updateMaintenanceReportMutation.isPending ? 'Updating...' : 'Update Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}