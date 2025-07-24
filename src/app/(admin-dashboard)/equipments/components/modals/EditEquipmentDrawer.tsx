"use client";

import { useState, useRef, useEffect, useMemo, memo } from "react";
import { format } from "date-fns";
import { useUpdateEquipment, useEquipmentsWithReferenceData } from "@/hooks/useEquipmentsQuery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { 
  Settings, 
  Camera, 
  FileText, 
  Upload, 
  CalendarIcon, 
  User, 
  Building2, 
  Wrench, 
  Hash, 
  Shield, 
  Loader2,
  X,
  Save,
  Receipt,
  CheckCircle,
  Eye,
  ZoomIn
} from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import { ImageDisplayWithRemove } from "@/components/equipment/ImageDisplayWithRemove";
import PartsFolderManager, { type PartsStructure } from "../forms/PartsFolderManager";
import { toast } from "sonner";
import {
  selectIsMobile,
  selectSelectedEquipment,
  useEquipmentsStore,
} from "@/stores/equipmentsStore";

// Submit button component that uses mutation state
function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <Button 
      type="submit" 
      disabled={isLoading}
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating Equipment...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </>
      )}
    </Button>
  );
}

function EditEquipmentDrawer() {
  
  // Server state from TanStack Query
  const { projects } = useEquipmentsWithReferenceData();
  
  // Client state from Zustand
  const selectedEquipment = useEquipmentsStore(selectSelectedEquipment);
  const isMobile = useEquipmentsStore(selectIsMobile);
  
  // Actions
  const {
    setIsEditMode,
    setIsModalOpen,
    setSelectedEquipment,
  } = useEquipmentsStore();

  // Mutations
  const updateEquipmentMutation = useUpdateEquipment();
  
  // Form reference for resetting
  const formRef = useRef<HTMLFormElement>(null);
  
  // Tab state - EXACTLY like CreateEquipmentForm and EquipmentModalModern
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts'>('details');
  
  // Date picker states for auto-close functionality
  const [inspectionDateOpen, setInspectionDateOpen] = useState(false);
  const [insuranceDateOpen, setInsuranceDateOpen] = useState(false);
  
  // Form state for all fields - pre-populated with existing equipment data
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    plateNumber: '',
    owner: '',
    type: '',
    projectId: '',
    status: 'OPERATIONAL' as 'OPERATIONAL' | 'NON_OPERATIONAL',
    before: '6',
    inspectionDate: new Date(),
    insuranceExpirationDate: undefined as Date | undefined,
    remarks: ''
  });
  
  // File state for images and documents
  const [files, setFiles] = useState({
    equipmentImage: null as File | null,
    thirdpartyInspection: null as File | null,
    pgpcInspection: null as File | null,
    originalReceipt: null as File | null,
    equipmentRegistration: null as File | null,
  });

  // Parts structure state
  const [partsStructure, setPartsStructure] = useState<PartsStructure>({
    rootFiles: [],
    folders: []
  });

  // State to track removed images/documents
  const [removedFiles, setRemovedFiles] = useState({
    equipmentImage: false,
    thirdpartyInspection: false,
    pgpcInspection: false,
    originalReceipt: false,
    equipmentRegistration: false,
  });

  // Initialize form data when selectedEquipment changes
  useEffect(() => {
    if (selectedEquipment) {
      
      const newFormData = {
        brand: selectedEquipment.brand || '',
        model: selectedEquipment.model || '',
        plateNumber: selectedEquipment.plateNumber || '',
        owner: selectedEquipment.owner || '',
        type: selectedEquipment.type || '',
        projectId: selectedEquipment.project?.uid || '',
        status: selectedEquipment.status || 'OPERATIONAL',
        before: selectedEquipment.before?.toString() || '6',
        inspectionDate: selectedEquipment.inspectionDate ? new Date(selectedEquipment.inspectionDate) : new Date(),
        insuranceExpirationDate: selectedEquipment.insuranceExpirationDate ? new Date(selectedEquipment.insuranceExpirationDate) : undefined,
        remarks: selectedEquipment.remarks || ''
      };
      
      setFormData(newFormData);

      // Initialize parts structure - handle legacy format properly
      try {
        const rawParts = selectedEquipment.equipmentParts;
        let parsedParts;
        
        if (!rawParts) {
          parsedParts = { rootFiles: [], folders: [] };
        } else if (typeof rawParts === 'string') {
          try {
            parsedParts = JSON.parse(rawParts);
          } catch {
            parsedParts = { rootFiles: [], folders: [] };
          }
        } else if (Array.isArray(rawParts)) {
          // Legacy format: array of URLs - convert to root files
          parsedParts = {
            rootFiles: rawParts.map((url, index) => ({
              id: `legacy_${index}`,
              name: url.split('/').pop() || `image_${index}`,
              file: new File([], url.split('/').pop() || `image_${index}`, { type: 'image/jpeg' }),
              preview: url
            })),
            folders: []
          };
        } else if (rawParts && typeof rawParts === 'object') {
          parsedParts = rawParts;
        } else {
          parsedParts = { rootFiles: [], folders: [] };
        }
        
        // Ensure valid structure
        const safeParts = {
          rootFiles: Array.isArray(parsedParts?.rootFiles) ? parsedParts.rootFiles : [],
          folders: Array.isArray(parsedParts?.folders) ? parsedParts.folders : []
        };
        
        setPartsStructure(safeParts);
      } catch (error) {
        // Failed to parse equipment parts, using fallback
        setPartsStructure({ rootFiles: [], folders: [] });
      }

      // Reset removed files state
      setRemovedFiles({
        equipmentImage: false,
        thirdpartyInspection: false,
        pgpcInspection: false,
        originalReceipt: false,
        equipmentRegistration: false,
      });
    }
  }, [selectedEquipment]);
  
  // File change handlers
  const handleFileChange = (fieldName: keyof typeof files) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [fieldName]: file }));
  };

  // Handle file removal
  const handleFileRemove = (fieldName: keyof typeof removedFiles) => {
    setRemovedFiles(prev => ({ ...prev, [fieldName]: true }));
    setFiles(prev => ({ ...prev, [fieldName]: null }));
  };

  const handleClose = () => {
    setIsEditMode(false);
    setIsModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Keep modal open and return to view mode
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedEquipment) {
      toast.error("No equipment selected");
      return;
    }
    
    // Client-side validation before submission
    if (!formData.brand?.trim()) {
      toast.error("Please enter equipment brand");
      return;
    }
    if (!formData.model?.trim()) {
      toast.error("Please enter equipment model");
      return;
    }
    if (!formData.type) {
      toast.error("Please select equipment type");
      return;
    }
    if (!formData.owner?.trim()) {
      toast.error("Please enter equipment owner");
      return;
    }
    if (!formData.projectId) {
      toast.error("Please select a project");
      return;
    }
    
    // Prepare update data
    const updateData = {
      uid: selectedEquipment.uid,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      plateNumber: formData.plateNumber.trim() || undefined,
      owner: formData.owner.trim(),
      type: formData.type,
      projectId: formData.projectId, // Send project ID for assignment
      status: formData.status,
      before: formData.before,
      inspectionDate: formData.inspectionDate ? format(formData.inspectionDate, 'yyyy-MM-dd') : undefined,
      insuranceExpirationDate: formData.insuranceExpirationDate ? format(formData.insuranceExpirationDate, 'yyyy-MM-dd') : undefined,
      remarks: formData.remarks.trim() || undefined,
      // Handle file uploads and removals
      image_url: removedFiles.equipmentImage ? null : selectedEquipment.image_url,
      thirdpartyInspectionImage: removedFiles.thirdpartyInspection ? null : selectedEquipment.thirdpartyInspectionImage,
      pgpcInspectionImage: removedFiles.pgpcInspection ? null : selectedEquipment.pgpcInspectionImage,
      originalReceiptUrl: removedFiles.originalReceipt ? null : selectedEquipment.originalReceiptUrl,
      equipmentRegistrationUrl: removedFiles.equipmentRegistration ? null : selectedEquipment.equipmentRegistrationUrl,
      equipmentParts: partsStructure, // Send as object, not string
    };

    // Debug log the data being sent
    console.log('📝 Submitting equipment update with data:', updateData);
    
    // Submit equipment update
    
    // Use mutation with optimistic updates
    updateEquipmentMutation.mutate(updateData, {
      onSuccess: (updatedEquipment) => {
        console.log('✅ Equipment update successful:', updatedEquipment);
        
        // Show success toast
        toast.success(`Equipment "${formData.brand} ${formData.model}" updated successfully!`);
        
        // Update selected equipment in store with the response
        setSelectedEquipment(updatedEquipment);
        
        // Return to view mode
        setIsEditMode(false);
        setIsModalOpen(true);
      },
      onError: (error) => {
        console.error('❌ Equipment update failed:', error);
        toast.error('Failed to update equipment: ' + error.message);
      }
    });
  };

  if (!selectedEquipment) return null;

  // Helper function to count items for tab badges
  const getImagesCount = () => {
    let count = 0;
    if (selectedEquipment.image_url && !removedFiles.equipmentImage) count++;
    if (selectedEquipment.thirdpartyInspectionImage && !removedFiles.thirdpartyInspection) count++;
    if (selectedEquipment.pgpcInspectionImage && !removedFiles.pgpcInspection) count++;
    if (files.equipmentImage) count++;
    if (files.thirdpartyInspection) count++;
    if (files.pgpcInspection) count++;
    return count;
  };

  const getDocumentsCount = () => {
    let count = 0;
    if (selectedEquipment.originalReceiptUrl && !removedFiles.originalReceipt) count++;
    if (selectedEquipment.equipmentRegistrationUrl && !removedFiles.equipmentRegistration) count++;
    if (files.originalReceipt) count++;
    if (files.equipmentRegistration) count++;
    return count;
  };

  const getEquipmentPartsCount = () => {
    // Always use current partsStructure state for count
    if (partsStructure) {
      const rootFilesCount = Array.isArray(partsStructure.rootFiles) ? partsStructure.rootFiles.length : 0;
      const foldersCount = Array.isArray(partsStructure.folders) 
        ? partsStructure.folders.reduce((acc, folder) => {
            return acc + (folder && Array.isArray(folder.files) ? folder.files.length : 0);
          }, 0)
        : 0;
      
      const totalCount = rootFilesCount + foldersCount;
      return totalCount;
    }
    
    // Fallback: get count directly from selectedEquipment (for initial render)
    if (!selectedEquipment || !selectedEquipment.equipmentParts) return 0;
    
    try {
      const rawParts = selectedEquipment.equipmentParts;
      
      // Handle legacy format (array of URLs)
      if (Array.isArray(rawParts)) {
        return rawParts.length;
      }
      
      // Handle modern format (object with rootFiles and folders)
      if (typeof rawParts === 'string') {
        const parsed = JSON.parse(rawParts);
        const rootCount = Array.isArray(parsed?.rootFiles) ? parsed.rootFiles.length : 0;
        const folderCount = Array.isArray(parsed?.folders) 
          ? parsed.folders.reduce((acc: number, folder: any) => {
              return acc + (Array.isArray(folder?.files) ? folder.files.length : 0);
            }, 0)
          : 0;
        return rootCount + folderCount;
      }
      
      if (typeof rawParts === 'object') {
        const rootCount = Array.isArray(rawParts?.rootFiles) ? rawParts.rootFiles.length : 0;
        const folderCount = Array.isArray(rawParts?.folders) 
          ? rawParts.folders.reduce((acc: number, folder: any) => {
              return acc + (Array.isArray(folder?.files) ? folder.files.length : 0);
            }, 0)
          : 0;
        return rootCount + folderCount;
      }
      
      return 0;
    } catch (error) {
      // Error counting equipment parts, using fallback
      return 0;
    }
  };

  // Tab content components - EXACTLY like CreateEquipmentForm
  const renderTabButton = (tab: 'details' | 'images' | 'documents' | 'parts', label: string, icon: React.ReactNode, count?: number) => (
    <Button
      type="button"
      variant={activeTab === tab ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(tab)}
      className="flex-1 flex items-center gap-2"
    >
      <div className="relative">
        {icon}
        {count !== undefined && count > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] leading-none">
            {count}
          </span>
        )}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  const ModalContent = () => (
    <div className="flex flex-col h-full">
      
      {/* Tab Navigation - EXACTLY like CreateEquipmentForm */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-4 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
            {renderTabButton('images', 'Images', <Camera className="h-4 w-4" />, getImagesCount() > 0 ? getImagesCount() : undefined)}
            {renderTabButton('documents', 'Docs', <FileText className="h-4 w-4" />, getDocumentsCount() > 0 ? getDocumentsCount() : undefined)}
            {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />, getEquipmentPartsCount() > 0 ? getEquipmentPartsCount() : undefined)}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'details'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Settings className="h-4 w-4" />
              Equipment Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'images'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Camera className="h-4 w-4" />
              Equipment Images
              {getImagesCount() > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getImagesCount()}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'documents'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
              Documents
              {getDocumentsCount() > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getDocumentsCount()}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                // Desktop Parts tab clicked
                setActiveTab('parts');
              }}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'parts'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Wrench className="h-4 w-4" />
              Parts Management
              {getEquipmentPartsCount() > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getEquipmentPartsCount()}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Tab Content Container with Scroll */}
      <div className="flex-1 overflow-y-auto min-h-0">
        
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className={`${isMobile ? 'space-y-6' : 'space-y-8'}`}>
          {/* Equipment Details */}
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Equipment Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Edit detailed information about this equipment
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Equipment Identity Section */}
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Brand *
                    </Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Enter equipment brand"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Model *
                    </Label>
                    <Input
                      id="model"
                      name="model"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Enter equipment model"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Equipment Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                      required
                    >
                      <SelectTrigger className="w-full">
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
                    <Label htmlFor="plateNumber" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Plate/Serial Number
                    </Label>
                    <Input
                      id="plateNumber"
                      name="plateNumber"
                      value={formData.plateNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                      placeholder="Enter plate or serial number"
                    />
                  </div>
                </div>
              </div>

              {/* Ownership & Project Section */}
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label htmlFor="owner" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner *
                    </Label>
                    <Input
                      id="owner"
                      name="owner"
                      value={formData.owner}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                      placeholder="Enter equipment owner"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectId">Assigned Project *</Label>
                    <Select 
                      value={formData.projectId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.uid} value={project.uid}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Operational Status
                    </Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: 'OPERATIONAL' | 'NON_OPERATIONAL') => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPERATIONAL">Operational</SelectItem>
                        <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="before">Inspection Period (months)</Label>
                    <Input
                      id="before"
                      name="before"
                      type="number"
                      min="1"
                      max="12"
                      value={formData.before}
                      onChange={(e) => setFormData(prev => ({ ...prev, before: e.target.value }))}
                      placeholder="6"
                    />
                  </div>
                </div>
              </div>

              {/* Inspection & Compliance Section */}
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Last Inspection Date
                    </Label>
                    <Popover open={inspectionDateOpen} onOpenChange={setInspectionDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.inspectionDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.inspectionDate ? format(formData.inspectionDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.inspectionDate}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, inspectionDate: date || new Date() }));
                            setInspectionDateOpen(false); // Auto-close after selection
                          }}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1990}
                          toYear={2030}
                          classNames={{
                            caption_dropdowns: "flex gap-2 justify-center",
                            vhidden: "hidden",
                            caption_label: "hidden"
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Insurance Expiration Date
                    </Label>
                    <Popover open={insuranceDateOpen} onOpenChange={setInsuranceDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.insuranceExpirationDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.insuranceExpirationDate ? format(formData.insuranceExpirationDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.insuranceExpirationDate}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, insuranceExpirationDate: date }));
                            setInsuranceDateOpen(false); // Auto-close after selection
                          }}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1990}
                          toYear={2050}
                          classNames={{
                            caption_dropdowns: "flex gap-2 justify-center",
                            vhidden: "hidden",
                            caption_label: "hidden"
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="remarks">Additional Notes</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Enter any additional notes or remarks about this equipment"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Images Tab - EXACTLY like CreateEquipmentForm */}
      {activeTab === 'images' && (
        <div className={`space-y-4 ${isMobile ? 'pb-8' : 'border-t pt-4 pb-6'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Equipment Images {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload photos and inspection images for this equipment. These images help with identification, insurance claims, and maintenance records.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Equipment Image */}
                  {selectedEquipment.image_url && !removedFiles.equipmentImage && !files.equipmentImage ? (
                    <ImageDisplayWithRemove
                      url={selectedEquipment.image_url}
                      label="Equipment Image"
                      description="Equipment Image"
                      onRemove={() => handleFileRemove('equipmentImage')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Equipment Image"
                      selectedFile={files.equipmentImage}
                      onFileChange={handleFileChange('equipmentImage')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.equipmentImage ? selectedEquipment.image_url : undefined}
                    />
                  )}
                  
                  {/* Third-party Inspection */}
                  {selectedEquipment.thirdpartyInspectionImage && !removedFiles.thirdpartyInspection && !files.thirdpartyInspection ? (
                    <ImageDisplayWithRemove
                      url={selectedEquipment.thirdpartyInspectionImage}
                      label="Third-party Inspection"
                      description="Third-party Inspection"
                      onRemove={() => handleFileRemove('thirdpartyInspection')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Third-party Inspection"
                      selectedFile={files.thirdpartyInspection}
                      onFileChange={handleFileChange('thirdpartyInspection')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.thirdpartyInspection ? selectedEquipment.thirdpartyInspectionImage : undefined}
                    />
                  )}
                  
                  {/* PGPC Inspection */}
                  {selectedEquipment.pgpcInspectionImage && !removedFiles.pgpcInspection && !files.pgpcInspection ? (
                    <ImageDisplayWithRemove
                      url={selectedEquipment.pgpcInspectionImage}
                      label="PGPC Inspection"
                      description="PGPC Inspection"
                      onRemove={() => handleFileRemove('pgpcInspection')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="PGPC Inspection"
                      selectedFile={files.pgpcInspection}
                      onFileChange={handleFileChange('pgpcInspection')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.pgpcInspection ? selectedEquipment.pgpcInspectionImage : undefined}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Add extra bottom padding for mobile to ensure save buttons are always accessible */}
          {isMobile && <div className="h-4" />}
        </div>
      )}

      {/* Documents Tab - EXACTLY like CreateEquipmentForm */}
      {activeTab === 'documents' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Important equipment documents for compliance and record-keeping. Accepted formats: PDF and image files.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Original Receipt (OR) */}
                  {selectedEquipment.originalReceiptUrl && !removedFiles.originalReceipt && !files.originalReceipt ? (
                    <ImageDisplayWithRemove
                      url={selectedEquipment.originalReceiptUrl}
                      label="Original Receipt (OR)"
                      description="Proof of purchase document"
                      onRemove={() => handleFileRemove('originalReceipt')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Original Receipt (OR)"
                      selectedFile={files.originalReceipt}
                      onFileChange={handleFileChange('originalReceipt')}
                      onKeepExistingChange={() => {}}
                      accept=".pdf,image/*"
                      currentFileUrl={!removedFiles.originalReceipt ? selectedEquipment.originalReceiptUrl : undefined}
                      hideChangeButton={true}
                    />
                  )}
                  
                  {/* Equipment Registration */}
                  {selectedEquipment.equipmentRegistrationUrl && !removedFiles.equipmentRegistration && !files.equipmentRegistration ? (
                    <ImageDisplayWithRemove
                      url={selectedEquipment.equipmentRegistrationUrl}
                      label="Equipment Registration"
                      description="Official equipment registration certificate"
                      onRemove={() => handleFileRemove('equipmentRegistration')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Equipment Registration"
                      selectedFile={files.equipmentRegistration}
                      onFileChange={handleFileChange('equipmentRegistration')}
                      onKeepExistingChange={() => {}}
                      accept=".pdf,image/*"
                      currentFileUrl={!removedFiles.equipmentRegistration ? selectedEquipment.equipmentRegistrationUrl : undefined}
                      hideChangeButton={true}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parts Tab - EXACTLY like CreateEquipmentForm */}
      {activeTab === 'parts' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Equipment Parts Management</h3>
            <p className="text-sm text-muted-foreground">
              Upload and organize equipment parts documentation in folders. This helps with maintenance planning and parts ordering.
            </p>
          </div>
          <PartsFolderManager 
            onChange={setPartsStructure}
            initialData={partsStructure}
          />
        </div>
      )}

      </div> {/* End Tab Content Container */}
    </div>
  );

  // Mobile drawer implementation
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={handleCancel}>
        <DrawerContent className="!max-h-[95dvh] flex flex-col">
          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
            {/* Mobile Header - Exact copy from CreateEquipmentModalModern */}
            <DrawerHeader className="p-4 pb-4 flex-shrink-0 border-b relative">
              <DrawerClose asChild>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-4 top-4 rounded-full h-8 w-8 p-0"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
              <div className="text-center space-y-2">
                <DrawerTitle className="text-xl font-bold">
                  Edit Equipment
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">
                  Update equipment details and documentation
                </p>
              </div>
            </DrawerHeader>
            
            {/* Mobile Content - Scrollable container with proper constraints */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
              <div className="p-4 pb-6">
                <ModalContent />
              </div>
            </div>
            
            {/* Mobile Action Buttons in Footer - Fixed at bottom */}
            <DrawerFooter className="flex-shrink-0 p-4 pt-2 border-t bg-background">
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  size="lg"
                  disabled={updateEquipmentMutation.isPending}
                >
                  Cancel
                </Button>
                <SubmitButton isLoading={updateEquipmentMutation.isPending} />
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop dialog implementation - Exact copy from CreateEquipmentModalModern
  return (
    <Dialog open={true} onOpenChange={handleCancel}>
      <DialogContent 
        className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '55vw', width: '55vw' }}
      >
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full max-h-full">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl">Edit Equipment: {selectedEquipment.brand} {selectedEquipment.model}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update equipment details, documentation, and parts information
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-0">
              <ModalContent />
            </div>
          </div>
          
          {/* Desktop Action Buttons in Footer */}
          <DialogFooter className="pt-4 border-t bg-background">
            <div className="flex gap-2 w-full justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                size="lg"
                disabled={updateEquipmentMutation.isPending}
              >
                Cancel
              </Button>
              <SubmitButton isLoading={updateEquipmentMutation.isPending} />
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(EditEquipmentDrawer);