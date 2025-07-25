"use client";

import { useState, useRef, useEffect, useMemo, useCallback, memo, type FormEvent, type ReactNode } from "react";
import { format } from "date-fns";
import { useVehiclesWithReferenceData, vehicleKeys } from "@/hooks/useVehiclesQuery";
import { useQueryClient } from "@tanstack/react-query";
import { updateVehicleAction } from "../../actions";
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
  ZoomIn,
  Car
} from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import { ImageDisplayWithRemove } from "@/components/equipment/ImageDisplayWithRemove";
import VehiclePartsFolderManager, { type PartsStructure } from "../forms/VehiclePartsFolderManager";
import { toast } from "sonner";
import {
  selectIsMobile,
  selectSelectedVehicle,
  useVehiclesStore,
} from "@/stores/vehiclesStore";

// Submit button component that uses loading state
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
          Saving Changes...
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

function EditVehicleDrawer() {
  
  // Server state from TanStack Query
  const { projects } = useVehiclesWithReferenceData();
  const queryClient = useQueryClient();
  
  // Client state from Zustand
  const selectedVehicle = useVehiclesStore(selectSelectedVehicle);
  const isMobile = useVehiclesStore(selectIsMobile);
  
  // Actions
  const {
    setIsEditMode,
    setIsModalOpen,
    setSelectedVehicle,
  } = useVehiclesStore();

  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form reference for resetting
  const formRef = useRef<HTMLFormElement>(null);
  
  // Tab state - EXACTLY like EditEquipmentDrawer
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts'>('details');
  
  // Date picker states for auto-close functionality
  const [inspectionDateOpen, setInspectionDateOpen] = useState(false);
  const [expiryDateOpen, setExpiryDateOpen] = useState(false);
  
  // Form state for all fields - pre-populated with existing vehicle data
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
    expiryDate: undefined as Date | undefined,
    remarks: ''
  });
  
  // File state for images and documents
  const [files, setFiles] = useState({
    frontImg: null as File | null,
    backImg: null as File | null,
    side1Img: null as File | null,
    side2Img: null as File | null,
    originalReceipt: null as File | null,
    carRegistration: null as File | null,
    pgpcInspection: null as File | null,
  });

  // Parts structure state
  const [partsStructure, setPartsStructure] = useState<PartsStructure>({
    rootFiles: [],
    folders: []
  });

  // State to track removed images/documents
  const [removedFiles, setRemovedFiles] = useState({
    frontImg: false,
    backImg: false,
    side1Img: false,
    side2Img: false,
    originalReceipt: false,
    carRegistration: false,
    pgpcInspection: false,
  });

  // Initialize form data when selectedVehicle changes
  useEffect(() => {
    if (selectedVehicle && projects.length > 0) {
      
      const newFormData = {
        brand: selectedVehicle.brand || '',
        model: selectedVehicle.model || '',
        plateNumber: selectedVehicle.plate_number || '',
        owner: selectedVehicle.owner || '',
        type: selectedVehicle.type || '',
        projectId: selectedVehicle.project?.id || '',
        status: selectedVehicle.status || 'OPERATIONAL',
        before: selectedVehicle.before?.toString() || '6',
        inspectionDate: selectedVehicle.inspection_date ? new Date(selectedVehicle.inspection_date) : new Date(),
        expiryDate: selectedVehicle.expiry_date ? new Date(selectedVehicle.expiry_date) : undefined,
        remarks: selectedVehicle.remarks || ''
      };
      
      setFormData(newFormData);

      // Initialize parts structure - handle array format properly like VehiclePartsViewer
      try {
        const rawParts = selectedVehicle.vehicle_parts;
        let parsedParts: PartsStructure;
        
        if (!rawParts) {
          parsedParts = { rootFiles: [], folders: [] };
        } else if (Array.isArray(rawParts)) {
          // Handle new array format with JSON string in first element
          if (rawParts.length === 1 && typeof rawParts[0] === 'string') {
            try {
              const parsed = JSON.parse(rawParts[0]);
              if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
                // Modern format - ensure proper structure for editing
                parsedParts = {
                  rootFiles: Array.isArray(parsed.rootFiles) ? parsed.rootFiles.map((file: any, index: number) => {
                    // If the file has a URL (from existing data), create a File-like object
                    if (file.url && typeof file.url === 'string') {
                      const fileName = file.name || file.url.split('/').pop() || `file_${index}`;
                      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
                      const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
                      
                      return {
                        id: file.id || `existing_${index}`,
                        name: fileName,
                        file: new File([''], fileName, { type: mimeType }),
                        preview: file.url, // Keep existing URL as preview
                        type: mimeType.startsWith('image/') ? 'image' : 'document'
                      };
                    }
                    return file;
                  }) : [],
                  folders: Array.isArray(parsed.folders) ? parsed.folders.map((folder: any) => ({
                    ...folder,
                    files: Array.isArray(folder.files) ? folder.files.map((file: any, index: number) => {
                      if (file.url && typeof file.url === 'string') {
                        const fileName = file.name || file.url.split('/').pop() || `file_${index}`;
                        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
                        const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
                        
                        return {
                          id: file.id || `existing_${index}`,
                          name: fileName,
                          file: new File([''], fileName, { type: mimeType }),
                          preview: file.url
                        };
                      }
                      return file;
                    }) : []
                  })) : []
                };
              } else {
                parsedParts = { rootFiles: [], folders: [] };
              }
            } catch {
              parsedParts = { rootFiles: [], folders: [] };
            }
          } else {
            // Legacy format: array of URLs - convert to root files
            parsedParts = {
              rootFiles: rawParts.map((url, index) => {
                const fileName = url.split('/').pop() || `file_${index}`;
                const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
                const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
                
                return {
                  id: `legacy_${index}`,
                  name: fileName,
                  file: new File([''], fileName, { type: mimeType }),
                  preview: url, // Use the existing URL as preview for legacy files
                  type: mimeType.startsWith('image/') ? 'image' : 'document'
                };
              }),
              folders: []
            };
          }
        } else if (typeof rawParts === 'string') {
          try {
            const parsed = JSON.parse(rawParts);
            if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
              // Handle JSON string format similar to array format above
              parsedParts = {
                rootFiles: Array.isArray(parsed.rootFiles) ? parsed.rootFiles : [],
                folders: Array.isArray(parsed.folders) ? parsed.folders : []
              };
            } else {
              parsedParts = { rootFiles: [], folders: [] };
            }
          } catch {
            parsedParts = { rootFiles: [], folders: [] };
          }
        } else if (rawParts && typeof rawParts === 'object') {
          // Already an object - ensure proper structure
          parsedParts = {
            rootFiles: Array.isArray(rawParts.rootFiles) ? rawParts.rootFiles : [],
            folders: Array.isArray(rawParts.folders) ? rawParts.folders : []
          };
        } else {
          parsedParts = { rootFiles: [], folders: [] };
        }
        
        setPartsStructure(parsedParts);
      } catch (error) {
        console.error('Failed to parse vehicle parts:', error);
        setPartsStructure({ rootFiles: [], folders: [] });
      }

      // Reset removed files state
      setRemovedFiles({
        frontImg: false,
        backImg: false,
        side1Img: false,
        side2Img: false,
        originalReceipt: false,
        carRegistration: false,
        pgpcInspection: false,
      });
    }
  }, [selectedVehicle, projects]);
  
  // File change handlers - memoized to prevent re-renders
  const handleFileChange = useCallback((fieldName: keyof typeof files) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [fieldName]: file }));
  }, []);

  // Handle file removal - memoized to prevent re-renders
  const handleFileRemove = useCallback((fieldName: keyof typeof removedFiles) => {
    setRemovedFiles(prev => ({ ...prev, [fieldName]: true }));
    setFiles(prev => ({ ...prev, [fieldName]: null }));
  }, []);

  const handleClose = useCallback(() => {
    setIsEditMode(false);
    setIsModalOpen(false);
    setSelectedVehicle(null);
  }, [setIsEditMode, setIsModalOpen, setSelectedVehicle]);

  const handleCancel = useCallback(() => {
    setIsEditMode(false);
    // Keep modal open and return to view mode
    setIsModalOpen(true);
  }, [setIsEditMode, setIsModalOpen]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedVehicle) {
      toast.error("No vehicle selected");
      return;
    }
    
    // Client-side validation before submission
    if (!formData.brand?.trim()) {
      toast.error("Please enter vehicle brand");
      setActiveTab('details');
      return;
    }
    if (!formData.model?.trim()) {
      toast.error("Please enter vehicle model");
      setActiveTab('details');
      return;
    }
    if (!formData.type) {
      toast.error("Please select vehicle type");
      setActiveTab('details');
      return;
    }
    if (!formData.owner?.trim()) {
      toast.error("Please enter vehicle owner");
      setActiveTab('details');
      return;
    }
    if (!formData.projectId) {
      toast.error("Please select a project");
      setActiveTab('details');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Create FormData for server action
      const formDataObj = new FormData();
      
      // Add vehicle ID and basic data
      formDataObj.append("vehicleId", selectedVehicle.id);
      formDataObj.append("brand", formData.brand.trim());
      formDataObj.append("model", formData.model.trim());
      formDataObj.append("type", formData.type);
      formDataObj.append("plateNumber", formData.plateNumber.trim());
      formDataObj.append("owner", formData.owner.trim());
      formDataObj.append("projectId", formData.projectId);
      formDataObj.append("status", formData.status);
      formDataObj.append("before", formData.before);
      
      if (formData.inspectionDate) {
        formDataObj.append("inspectionDate", format(formData.inspectionDate, 'yyyy-MM-dd'));
      }
      if (formData.expiryDate) {
        formDataObj.append("expiryDate", format(formData.expiryDate, 'yyyy-MM-dd'));
      }
      if (formData.remarks.trim()) {
        formDataObj.append("remarks", formData.remarks.trim());
      }

      // Add file uploads
      if (files.frontImg) formDataObj.append("frontImg", files.frontImg);
      if (files.backImg) formDataObj.append("backImg", files.backImg);
      if (files.side1Img) formDataObj.append("side1Img", files.side1Img);
      if (files.side2Img) formDataObj.append("side2Img", files.side2Img);
      if (files.originalReceipt) formDataObj.append("originalReceipt", files.originalReceipt);
      if (files.carRegistration) formDataObj.append("carRegistration", files.carRegistration);
      if (files.pgpcInspection) formDataObj.append("pgpcInspection", files.pgpcInspection);

      // Add file removal flags
      if (removedFiles.frontImg) formDataObj.append("remove_frontImg", "true");
      if (removedFiles.backImg) formDataObj.append("remove_backImg", "true");
      if (removedFiles.side1Img) formDataObj.append("remove_side1Img", "true");
      if (removedFiles.side2Img) formDataObj.append("remove_side2Img", "true");
      if (removedFiles.originalReceipt) formDataObj.append("remove_originalReceipt", "true");
      if (removedFiles.carRegistration) formDataObj.append("remove_carRegistration", "true");
      if (removedFiles.pgpcInspection) formDataObj.append("remove_pgpcInspection", "true");

      // Always add parts structure (even if empty) to ensure deletions are processed
      formDataObj.append("partsStructure", JSON.stringify(partsStructure || { rootFiles: [], folders: [] }));

      console.log('📝 Submitting vehicle update with FormData');
      
      // Call server action
      const result = await updateVehicleAction(formDataObj);
      
      if (result.success) {
        console.log('✅ Vehicle update successful');
        
        // Show success toast
        toast.success(`Vehicle "${formData.brand} ${formData.model}" updated successfully!`);
        
        // Update selected vehicle in store with the response if available
        if (result.vehicle) {
          setSelectedVehicle(result.vehicle);
        }
        
        // Invalidate and refetch vehicles query to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() });
        
        // Return to view mode
        setIsEditMode(false);
        setIsModalOpen(true);
      } else {
        console.error('❌ Vehicle update failed:', result.error);
        toast.error(result.error || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('❌ Vehicle update exception:', error);
      toast.error('An unexpected error occurred while updating the vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedVehicle) return null;

  // Helper functions to count items for tab badges - memoized to prevent re-renders
  const getImagesCount = useMemo(() => {
    let count = 0;
    if (selectedVehicle.front_img_url && !removedFiles.frontImg) count++;
    if (selectedVehicle.back_img_url && !removedFiles.backImg) count++;
    if (selectedVehicle.side1_img_url && !removedFiles.side1Img) count++;
    if (selectedVehicle.side2_img_url && !removedFiles.side2Img) count++;
    if (files.frontImg) count++;
    if (files.backImg) count++;
    if (files.side1Img) count++;
    if (files.side2Img) count++;
    return count;
  }, [selectedVehicle, removedFiles, files]);

  const getDocumentsCount = useMemo(() => {
    let count = 0;
    if (selectedVehicle.original_receipt_url && !removedFiles.originalReceipt) count++;
    if (selectedVehicle.car_registration_url && !removedFiles.carRegistration) count++;
    if (selectedVehicle.pgpc_inspection_image && !removedFiles.pgpcInspection) count++;
    if (files.originalReceipt) count++;
    if (files.carRegistration) count++;
    if (files.pgpcInspection) count++;
    return count;
  }, [selectedVehicle, removedFiles, files]);

  const getVehiclePartsCount = useMemo(() => {
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
    
    // Fallback: get count directly from selectedVehicle (for initial render)
    if (!selectedVehicle || !selectedVehicle.vehicle_parts) return 0;
    
    try {
      const rawParts = selectedVehicle.vehicle_parts;
      
      // Handle array format (new format)
      if (Array.isArray(rawParts)) {
        if (rawParts.length === 1 && typeof rawParts[0] === 'string') {
          try {
            const parsed = JSON.parse(rawParts[0]);
            const rootCount = Array.isArray(parsed?.rootFiles) ? parsed.rootFiles.length : 0;
            const folderCount = Array.isArray(parsed?.folders) 
              ? parsed.folders.reduce((acc: number, folder: any) => {
                  return acc + (Array.isArray(folder?.files) ? folder.files.length : 0);
                }, 0)
              : 0;
            return rootCount + folderCount;
          } catch {
            return 0;
          }
        }
        return rawParts.length; // Legacy format
      }
      
      // Handle string format
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
      // Error counting vehicle parts, using fallback
      return 0;
    }
  }, [partsStructure, selectedVehicle]);

  // Tab button renderer - memoized to prevent re-renders
  const renderTabButton = useCallback((tab: 'details' | 'images' | 'documents' | 'parts', label: string, icon: ReactNode, count?: number) => (
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
  ), [activeTab]);

  const ModalContent = useMemo(() => (
    <div className="flex flex-col h-full">
      
      {/* Tab Navigation - EXACTLY like EditEquipmentDrawer */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-4 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
            {renderTabButton('images', 'Images', <Camera className="h-4 w-4" />, getImagesCount > 0 ? getImagesCount : undefined)}
            {renderTabButton('documents', 'Docs', <FileText className="h-4 w-4" />, getDocumentsCount > 0 ? getDocumentsCount : undefined)}
            {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />, getVehiclePartsCount > 0 ? getVehiclePartsCount : undefined)}
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
              Vehicle Details
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
              Vehicle Images
              {getImagesCount > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getImagesCount}
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
              {getDocumentsCount > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getDocumentsCount}
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
              {getVehiclePartsCount > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getVehiclePartsCount}
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
          {/* Vehicle Details */}
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Edit detailed information about this vehicle
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Vehicle Identity Section */}
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Brand *
                    </Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Enter vehicle brand"
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
                      placeholder="Enter vehicle model"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Vehicle Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Truck">Truck</SelectItem>
                        <SelectItem value="Car">Car</SelectItem>
                        <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                        <SelectItem value="Heavy Equipment">Heavy Equipment</SelectItem>
                        <SelectItem value="Van">Van</SelectItem>
                        <SelectItem value="Bus">Bus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plateNumber" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Plate Number
                    </Label>
                    <Input
                      id="plateNumber"
                      name="plateNumber"
                      value={formData.plateNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                      placeholder="Enter plate number"
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
                      placeholder="Enter vehicle owner"
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
                          <SelectItem key={project.id} value={project.id}>
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
                    <Label htmlFor="before">Inspection Frequency (months)</Label>
                    <Select 
                      value={formData.before} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, before: value }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Monthly</SelectItem>
                        <SelectItem value="2">Every 2 months</SelectItem>
                        <SelectItem value="3">Quarterly</SelectItem>
                        <SelectItem value="6">Every 6 months</SelectItem>
                        <SelectItem value="12">Annually</SelectItem>
                      </SelectContent>
                    </Select>
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
                      Next Inspection Due
                    </Label>
                    <Popover open={expiryDateOpen} onOpenChange={setExpiryDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.expiryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expiryDate ? format(formData.expiryDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.expiryDate}
                          onSelect={(date) => {
                            setFormData(prev => ({ ...prev, expiryDate: date }));
                            setExpiryDateOpen(false); // Auto-close after selection
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
                  placeholder="Enter any additional notes or remarks about this vehicle"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Images Tab - EXACTLY like EditEquipmentDrawer */}
      {activeTab === 'images' && (
        <div className={`space-y-4 ${isMobile ? 'pb-8' : 'border-t pt-4 pb-6'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Vehicle Images {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload photos of your vehicle from different angles. These images help with identification, insurance claims, and maintenance records.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Front Image */}
                  {selectedVehicle.front_img_url && !removedFiles.frontImg && !files.frontImg ? (
                    <ImageDisplayWithRemove
                      url={selectedVehicle.front_img_url}
                      label="Front View"
                      description="Front View"
                      onRemove={() => handleFileRemove('frontImg')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Front View"
                      selectedFile={files.frontImg}
                      onFileChange={handleFileChange('frontImg')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.frontImg ? selectedVehicle.front_img_url : undefined}
                    />
                  )}
                  
                  {/* Back Image */}
                  {selectedVehicle.back_img_url && !removedFiles.backImg && !files.backImg ? (
                    <ImageDisplayWithRemove
                      url={selectedVehicle.back_img_url}
                      label="Back View"
                      description="Back View"
                      onRemove={() => handleFileRemove('backImg')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Back View"
                      selectedFile={files.backImg}
                      onFileChange={handleFileChange('backImg')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.backImg ? selectedVehicle.back_img_url : undefined}
                    />
                  )}
                  
                  {/* Side1 Image */}
                  {selectedVehicle.side1_img_url && !removedFiles.side1Img && !files.side1Img ? (
                    <ImageDisplayWithRemove
                      url={selectedVehicle.side1_img_url}
                      label="Side View 1"
                      description="Side View 1"
                      onRemove={() => handleFileRemove('side1Img')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Side View 1"
                      selectedFile={files.side1Img}
                      onFileChange={handleFileChange('side1Img')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.side1Img ? selectedVehicle.side1_img_url : undefined}
                    />
                  )}

                  {/* Side2 Image */}
                  {selectedVehicle.side2_img_url && !removedFiles.side2Img && !files.side2Img ? (
                    <ImageDisplayWithRemove
                      url={selectedVehicle.side2_img_url}
                      label="Side View 2"
                      description="Side View 2"
                      onRemove={() => handleFileRemove('side2Img')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Side View 2"
                      selectedFile={files.side2Img}
                      onFileChange={handleFileChange('side2Img')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.side2Img ? selectedVehicle.side2_img_url : undefined}
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

      {/* Documents Tab - EXACTLY like EditEquipmentDrawer */}
      {activeTab === 'documents' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Important vehicle documents for compliance and record-keeping. Accepted formats: PDF and image files.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Original Receipt (OR) */}
                  {selectedVehicle.original_receipt_url && !removedFiles.originalReceipt && !files.originalReceipt ? (
                    <ImageDisplayWithRemove
                      url={selectedVehicle.original_receipt_url}
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
                      currentFileUrl={!removedFiles.originalReceipt ? selectedVehicle.original_receipt_url : undefined}
                      hideChangeButton={true}
                    />
                  )}
                  
                  {/* Car Registration */}
                  {selectedVehicle.car_registration_url && !removedFiles.carRegistration && !files.carRegistration ? (
                    <ImageDisplayWithRemove
                      url={selectedVehicle.car_registration_url}
                      label="Car Registration (CR)"
                      description="Official vehicle registration certificate"
                      onRemove={() => handleFileRemove('carRegistration')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Car Registration (CR)"
                      selectedFile={files.carRegistration}
                      onFileChange={handleFileChange('carRegistration')}
                      onKeepExistingChange={() => {}}
                      accept=".pdf,image/*"
                      currentFileUrl={!removedFiles.carRegistration ? selectedVehicle.car_registration_url : undefined}
                      hideChangeButton={true}
                    />
                  )}

                  {/* PGPC Inspection */}
                  {selectedVehicle.pgpc_inspection_image && !removedFiles.pgpcInspection && !files.pgpcInspection ? (
                    <ImageDisplayWithRemove
                      url={selectedVehicle.pgpc_inspection_image}
                      label="PGPC Inspection"
                      description="Philippine Government Permit Certificate"
                      onRemove={() => handleFileRemove('pgpcInspection')}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="PGPC Inspection"
                      selectedFile={files.pgpcInspection}
                      onFileChange={handleFileChange('pgpcInspection')}
                      onKeepExistingChange={() => {}}
                      accept="image/*"
                      currentFileUrl={!removedFiles.pgpcInspection ? selectedVehicle.pgpc_inspection_image : undefined}
                      hideChangeButton={true}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parts Tab - EXACTLY like EditEquipmentDrawer */}
      {activeTab === 'parts' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Vehicle Parts Management {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload and organize vehicle parts documentation in folders. This helps with maintenance planning and parts ordering.
              </p>
            </CardHeader>
            <CardContent>
              <VehiclePartsFolderManager 
                onChange={setPartsStructure}
                initialData={partsStructure}
              />
            </CardContent>
          </Card>
        </div>
      )}

      </div> {/* End Tab Content Container */}
    </div>
  ), [
    isMobile, 
    activeTab, 
    renderTabButton, 
    getImagesCount, 
    getDocumentsCount, 
    getVehiclePartsCount,
    formData,
    files,
    removedFiles,
    selectedVehicle,
    projects,
    partsStructure,
    setActiveTab,
    setFormData,
    handleFileChange,
    handleFileRemove,
    setPartsStructure,
    inspectionDateOpen,
    setInspectionDateOpen,
    expiryDateOpen,
    setExpiryDateOpen
  ]);

  // Mobile drawer implementation
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={handleCancel}>
        <DrawerContent className="!max-h-[95dvh] flex flex-col">
          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
            {/* Mobile Header - Exact copy from EditEquipmentDrawer */}
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
                  Edit Vehicle
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">
                  Update vehicle details and documentation
                </p>
              </div>
            </DrawerHeader>
            
            {/* Mobile Content - Scrollable container with proper constraints */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
              <div className="p-4 pb-6">
                {ModalContent}
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <SubmitButton isLoading={isSubmitting} />
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop dialog implementation - Exact copy from EditEquipmentDrawer
  return (
    <Dialog open={true} onOpenChange={handleCancel}>
      <DialogContent 
        className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '55vw', width: '55vw' }}
      >
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full max-h-full">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl">Edit Vehicle: {selectedVehicle.brand} {selectedVehicle.model}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update vehicle details, documentation, and parts information
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-0">
              {ModalContent}
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
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <SubmitButton isLoading={isSubmitting} />
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default memo(EditVehicleDrawer);