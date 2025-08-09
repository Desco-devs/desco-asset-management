"use client";

import { useState, useEffect } from "react";
import { useUpdateEquipment } from "@/hooks/useEquipmentQuery";
import { useProjects } from "@/hooks/api/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  selectIsMobile,
  selectSelectedEquipment,
  useEquipmentStore,
} from "@/stores/equipmentStore";

export default function EditEquipmentDrawer() {
  // Store state
  const selectedEquipment = useEquipmentStore(selectSelectedEquipment);
  const isMobile = useEquipmentStore(selectIsMobile);
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

      {/* Selects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Equipment Type *</Label>
          <Select value={type} onValueChange={setType} required>
            <SelectTrigger>
              <SelectValue placeholder="Select equipment type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Excavator">Excavator</SelectItem>
              <SelectItem value="Bulldozer">Bulldozer</SelectItem>
              <SelectItem value="Crane">Crane</SelectItem>
              <SelectItem value="Loader">Loader</SelectItem>
              <SelectItem value="Grader">Grader</SelectItem>
              <SelectItem value="Compactor">Compactor</SelectItem>
              <SelectItem value="Dump Truck">Dump Truck</SelectItem>
              <SelectItem value="Mixer">Mixer</SelectItem>
              <SelectItem value="Generator">Generator</SelectItem>
              <SelectItem value="Pump">Pump</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectId">Assigned Project *</Label>
          <Select value={projectId} onValueChange={setProjectId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projectsArray.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Operational Status</Label>
          <Select value={status} onValueChange={(value: 'OPERATIONAL' | 'NON_OPERATIONAL') => setStatus(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPERATIONAL">Operational</SelectItem>
              <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
            </SelectContent>
          </Select>
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

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={handleCancel}>
        <DrawerContent className="max-h-[90vh]">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <DrawerHeader>
              <DrawerTitle>Edit Equipment</DrawerTitle>
            </DrawerHeader>
            
            <div className="flex-1 overflow-y-auto p-4">
              <FormContent />
            </div>
            
            <DrawerFooter>
              <div className="flex gap-2">
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
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop dialog
  return (
    <Dialog open={true} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>Edit Equipment: {selectedEquipment?.brand} {selectedEquipment?.model}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-1">
            <FormContent />
          </div>
          
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}