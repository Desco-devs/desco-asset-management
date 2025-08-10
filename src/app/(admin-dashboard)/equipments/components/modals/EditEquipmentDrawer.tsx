"use client";

import { useState, useEffect } from "react";
import { useUpdateEquipment } from "@/hooks/useEquipmentQuery";
import { useProjects } from "@/hooks/api/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  selectSelectedEquipment,
  useEquipmentStore,
} from "@/stores/equipmentStore";

export default function EditEquipmentDrawer() {
  // Store state
  const selectedEquipment = useEquipmentStore(selectSelectedEquipment);
  const { setIsEditMode, setIsModalOpen } = useEquipmentStore();

  // Server data
  const { data: projects = [] } = useProjects();
  const projectsArray = Array.isArray(projects) ? projects : (projects?.data || []);
  const updateEquipmentMutation = useUpdateEquipment();

  // Simple form state - NO COMPLEX STATE MANAGEMENT
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [owner, setOwner] = useState('');
  const [type, setType] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<'OPERATIONAL' | 'NON_OPERATIONAL'>('OPERATIONAL');
  const [remarks, setRemarks] = useState('');

  // Initialize form ONCE
  useEffect(() => {
    if (selectedEquipment) {
      setBrand(selectedEquipment.brand || '');
      setModel(selectedEquipment.model || '');
      setPlateNumber(selectedEquipment.plate_number || '');
      setOwner(selectedEquipment.owner || '');
      setType(selectedEquipment.type || '');
      setProjectId(selectedEquipment.project?.id || '');
      setStatus(selectedEquipment.status || 'OPERATIONAL');
      setRemarks(selectedEquipment.remarks || '');
    }
  }, [selectedEquipment?.id]); // Only when equipment ID changes

  const handleCancel = () => {
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEquipment) {
      toast.error("No equipment selected");
      return;
    }

    // Basic validation
    if (!brand.trim()) {
      toast.error("Please enter equipment brand");
      return;
    }
    if (!model.trim()) {
      toast.error("Please enter equipment model");
      return;
    }
    if (!type) {
      toast.error("Please select equipment type");
      return;
    }
    if (!owner.trim()) {
      toast.error("Please enter equipment owner");
      return;
    }
    if (!projectId) {
      toast.error("Please select a project");
      return;
    }

    const formData = new FormData();
    formData.append('equipmentId', selectedEquipment.id);
    formData.append('brand', brand);
    formData.append('model', model);
    formData.append('plateNumber', plateNumber);
    formData.append('owner', owner);
    formData.append('type', type);
    formData.append('projectId', projectId);
    formData.append('status', status);
    formData.append('remarks', remarks);

    updateEquipmentMutation.mutate(formData, {
      onSuccess: () => {
        toast.success(`Equipment "${brand} ${model}" updated successfully!`);
        setIsEditMode(false);
        setIsModalOpen(true);
      },
      onError: () => {
        // Error handled by mutation hook
      }
    });
  };

  if (!selectedEquipment) return null;

  const FormContent = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand *</Label>
          <Input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Enter equipment brand"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model *</Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Enter equipment model"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plateNumber">Plate/Serial Number</Label>
          <Input
            id="plateNumber"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            placeholder="Enter plate or serial number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="owner">Owner *</Label>
          <Input
            id="owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Enter equipment owner"
            required
          />
        </div>
      </div>

      {/* Selects - Using simple HTML select to avoid focus issues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Equipment Type *</Label>
          <select 
            id="type"
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            required
          >
            <option value="">Select equipment type</option>
            <option value="Excavator">Excavator</option>
            <option value="Bulldozer">Bulldozer</option>
            <option value="Crane">Crane</option>
            <option value="Loader">Loader</option>
            <option value="Grader">Grader</option>
            <option value="Compactor">Compactor</option>
            <option value="Dump Truck">Dump Truck</option>
            <option value="Mixer">Mixer</option>
            <option value="Generator">Generator</option>
            <option value="Pump">Pump</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectId">Assigned Project *</Label>
          <select 
            id="projectId"
            value={projectId} 
            onChange={(e) => setProjectId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            required
          >
            <option value="">Select a project</option>
            {projectsArray.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Operational Status</Label>
          <select 
            id="status"
            value={status} 
            onChange={(e) => setStatus(e.target.value as 'OPERATIONAL' | 'NON_OPERATIONAL')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="OPERATIONAL">Operational</option>
            <option value="NON_OPERATIONAL">Non-Operational</option>
          </select>
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <Label htmlFor="remarks">Additional Notes</Label>
        <Textarea
          id="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter any additional notes or remarks about this equipment"
          rows={3}
        />
      </div>
    </div>
  );

  // Simple overlay - no complex focus management
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">Edit Equipment: {selectedEquipment?.brand} {selectedEquipment?.model}</h2>
            <button 
              type="button" 
              onClick={handleCancel} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={updateEquipmentMutation.isPending}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <FormContent />
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={updateEquipmentMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateEquipmentMutation.isPending}>
              {updateEquipmentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}