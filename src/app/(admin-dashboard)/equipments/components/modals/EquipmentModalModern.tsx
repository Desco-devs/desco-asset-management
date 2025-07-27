"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  useDeleteEquipment,
  useEquipments,
  useUpdateEquipment,
} from "@/hooks/useEquipmentQuery";
import { useEquipmentMaintenanceReports } from "@/hooks/useEquipmentsQuery";
import { useProjects } from "@/hooks/api/use-projects";
import { useUsers } from "@/hooks/useUsersQuery";
import {
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectSelectedEquipment,
  useEquipmentStore,
} from "@/stores/equipmentStore";
import {
  Building2,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit,
  Eye,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Receipt,
  Settings,
  Shield,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
  ZoomIn,
  CalendarIcon,
  Save,
  CheckCircle,
  FolderPlus,
  Plus,
  File,
  Folder,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import EditEquipmentModalModern from "./EditEquipmentModalModern";
import EquipmentMaintenanceReportsEnhanced from "../EquipmentMaintenanceReportsEnhanced";
import EquipmentPartsViewer from "../EquipmentPartsViewer";
import PartsFolderManager from "../forms/PartsFolderManager";
import type { PartsStructure } from "../forms/PartsFolderManager";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { useImagePreview } from "@/hooks/useImagePreview";
import ImagePreviewSection from "./ImagePreviewSection";

export default function EquipmentModalModern() {
  // Server state from TanStack Query
  const { data: equipmentsResponse } = useEquipments();
  const equipments = equipmentsResponse || [];
  const { data: projectsData } = useProjects();
  const { data: maintenanceReports = [] } = useEquipmentMaintenanceReports();
  const { data: usersData } = useUsers();
  const projects = projectsData?.data || [];
  const users = usersData?.data || [];

  // Client state from Zustand
  const selectedEquipmentFromStore = useEquipmentStore(selectSelectedEquipment);
  const isModalOpen = useEquipmentStore(selectIsModalOpen);
  const isEditMode = useEquipmentStore(selectIsEditMode);
  const isMobile = useEquipmentStore(selectIsMobile);

  // Custom tab state - EXACTLY like CreateEquipmentForm with Images and Documents tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts' | 'maintenance'>('details');

  // Global edit mode state
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
  
  // Image preview management (following REALTIME_PATTERN.md)
  const {
    newFileUploads,
    newFilePreviewUrls,
    removedItems,
    handleFileSelect,
    handleFileRemove,
    resetPreviewState,
    cleanupPreviewUrls,
  } = useImagePreview();
  
  // CRITICAL FIX: Use ref for form data to prevent re-renders entirely
  const editFormDataRef = useRef({
    brand: '',
    model: '',
    type: '',
    plate_number: '',
    owner: '',
    status: 'OPERATIONAL',
    remarks: '',
    project_id: '',
    before: 6,
    inspection_date: undefined as Date | undefined,
    registration_expiry: undefined as Date | undefined,
    insurance_expiration_date: undefined as Date | undefined,
    created_by: ''
  });
  
  // Force re-render trigger for controlled inputs
  const [, forceUpdate] = useState({});
  
  // Equipment parts state for PartsFolderManager
  const [partsStructure, setPartsStructure] = useState<PartsStructure>({
    rootFiles: [],
    folders: []
  });
  
  // CRITICAL FIX: Memoize dynamic classNames to prevent DOM re-creation and focus loss
  const gridClassName = useMemo(() => 
    `grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`, 
    [isMobile]
  );
  
  const gridClassName2 = useMemo(() => 
    `grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`, 
    [isMobile]
  );
  
  const gridClassName3 = useMemo(() => 
    `grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`, 
    [isMobile]
  );
  
  const gridClassName4 = useMemo(() => 
    `grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`, 
    [isMobile]
  );
  
  // CRITICAL FIX: Memoize selectedEquipment to prevent re-renders and focus loss
  const selectedEquipment = useMemo(() => {
    if (!selectedEquipmentFromStore) return null;
    return equipments.find((e) => e.id === selectedEquipmentFromStore.id) || selectedEquipmentFromStore;
  }, [selectedEquipmentFromStore?.id, equipments]);

  // Initialize equipment parts when entering edit mode
  useEffect(() => {
    if (isGlobalEditMode && selectedEquipment?.equipment_parts) {
      // Parse the equipment_parts from the database format
      try {
        let parsedParts: any = selectedEquipment.equipment_parts;
        
        // Handle array with JSON string format
        if (Array.isArray(parsedParts) && parsedParts.length > 0 && typeof parsedParts[0] === 'string') {
          parsedParts = JSON.parse(parsedParts[0]);
        }
        
        // Handle string format
        if (typeof parsedParts === 'string') {
          parsedParts = JSON.parse(parsedParts);
        }
        
        // Initialize parts structure if it exists
        if (parsedParts && typeof parsedParts === 'object') {
          const initialData: PartsStructure = {
            rootFiles: Array.isArray(parsedParts.rootFiles) ? parsedParts.rootFiles.map((file: any) => ({
              id: file.id || `file-${Date.now()}-${Math.random()}`,
              name: file.name || 'Unknown file',
              url: file.url || file.preview,
              type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document')
            })) : [],
            folders: Array.isArray(parsedParts.folders) ? parsedParts.folders.map((folder: any) => ({
              id: folder.id || `folder-${Date.now()}-${Math.random()}`,
              name: folder.name,
              files: Array.isArray(folder.files) ? folder.files.map((file: any) => ({
                id: file.id || `file-${Date.now()}-${Math.random()}`,
                name: file.name || 'Unknown file',
                url: file.url || file.preview,
                type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document')
              })) : [],
              created_at: new Date(folder.created_at || Date.now())
            })) : []
          };
          setPartsStructure(initialData);
        } else {
          // Reset if no valid data
          setPartsStructure({ rootFiles: [], folders: [] });
        }
      } catch (error) {
        console.warn('Error parsing equipment parts:', error);
        setPartsStructure({ rootFiles: [], folders: [] });
      }
    } else if (!isGlobalEditMode) {
      // Clear state when exiting edit mode
      setPartsStructure({ rootFiles: [], folders: [] });
    }
  }, [isGlobalEditMode, selectedEquipment?.equipment_parts]);

  // Initialize form data when entering edit mode - using ref to prevent re-renders
  useEffect(() => {
    if (isGlobalEditMode && selectedEquipment?.id) {
      editFormDataRef.current = {
        brand: selectedEquipment.brand || '',
        model: selectedEquipment.model || '',
        type: selectedEquipment.type || '',
        plate_number: selectedEquipment.plate_number || '',
        owner: selectedEquipment.owner || '',
        status: selectedEquipment.status || 'OPERATIONAL',
        remarks: selectedEquipment.remarks || '',
        project_id: selectedEquipment.project_id || '',
        before: selectedEquipment.before || 6,
        inspection_date: selectedEquipment.inspection_date ? new Date(selectedEquipment.inspection_date) : undefined,
        registration_expiry: selectedEquipment.registration_expiry ? new Date(selectedEquipment.registration_expiry) : undefined,
        insurance_expiration_date: selectedEquipment.insurance_expiration_date ? new Date(selectedEquipment.insurance_expiration_date) : undefined,
        created_by: selectedEquipment.created_by || ''
      };
      forceUpdate({}); // Single re-render to update input values
    }
  }, [isGlobalEditMode, selectedEquipment?.id]); // Only depend on ID to prevent constant re-renders
  
  // Update mutation - declared before callbacks that use it
  const updateEquipmentMutation = useUpdateEquipment();

  // CRITICAL FIX: Update form data via ref without causing re-renders
  const handleFieldChange = useCallback((field: string, value: any) => {
    editFormDataRef.current = { ...editFormDataRef.current, [field]: value };
    // Don't trigger re-render - just update the ref
  }, []); // No dependencies - function is stable
  
  // Handle form submission - using ref to avoid editFormData dependency and prevent re-renders
  const handleSaveChanges = useCallback(async () => {
    if (!selectedEquipment) return;
    
    try {
      // Access current form data from ref - this prevents callback recreation on form changes
      const currentFormData = editFormDataRef.current;
      
      // Custom validation since we're using uncontrolled inputs
      const requiredFields = {
        brand: 'Brand is required',
        model: 'Model is required', 
        type: 'Equipment type is required',
        owner: 'Owner is required'
      };
      
      for (const [field, message] of Object.entries(requiredFields)) {
        const value = currentFormData[field as keyof typeof currentFormData];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          toast.error(message);
          return;
        }
      }
      
      const formData = new FormData();
      
      // Add all form fields with correct API field names (no mapping needed)
      Object.entries(currentFormData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            formData.append(key, value.toISOString().split('T')[0]);
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      
      // Handle file uploads
      Object.entries(newFileUploads).forEach(([fieldName, file]) => {
        if (file && file.size > 0) {
          // Map field names to expected API field names
          const apiFieldMap: Record<string, string> = {
            'image_url': 'equipmentImage',
            'original_receipt_url': 'originalReceipt',
            'equipment_registration_url': 'equipmentRegistration',
            'thirdparty_inspection_image': 'thirdpartyInspection',
            'pgpc_inspection_image': 'pgpcInspection'
          };
          
          const apiFieldName = apiFieldMap[fieldName] || fieldName;
          formData.append(apiFieldName, file);
        }
      });
      
      // Handle file removals by setting keep flags
      const fileFields = ['image_url', 'original_receipt_url', 'equipment_registration_url', 'thirdparty_inspection_image', 'pgpc_inspection_image'];
      fileFields.forEach(field => {
        const keepFlagMap: Record<string, string> = {
          'image_url': 'keepExistingImage',
          'original_receipt_url': 'keepExistingReceipt',
          'equipment_registration_url': 'keepExistingRegistration',
          'thirdparty_inspection_image': 'keepExistingThirdpartyInspection',
          'pgpc_inspection_image': 'keepExistingPgpcInspection'
        };
        
        const flagName = keepFlagMap[field];
        if (flagName) {
          // If the item is removed or has a new upload, don't keep existing
          const shouldKeep = !removedItems.has(field) && !newFileUploads[field];
          formData.append(flagName, shouldKeep ? 'true' : 'false');
        }
      });
      
      // Convert equipment parts back to database format using correct field name
      if (isGlobalEditMode) {
        const equipmentPartsData = {
          rootFiles: partsStructure.rootFiles.map((file) => ({
            id: file.id,
            name: file.name,
            url: file.url || file.preview,
            preview: file.preview,
            type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document')
          })),
          folders: partsStructure.folders.map(folder => ({
            id: folder.id,
            name: folder.name,
            files: folder.files.map((file) => ({
              id: file.id,
              name: file.name,
              url: file.url || file.preview,
              preview: file.preview,
              type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document')
            })),
            created_at: folder.created_at.toISOString()
          }))
        };
        
        // Use the correct field name that API expects
        formData.append('partsStructure', JSON.stringify(equipmentPartsData));
      }
      
      formData.append('equipmentId', selectedEquipment.id);
      
      await updateEquipmentMutation.mutateAsync(formData);
      setIsGlobalEditMode(false);
      resetPreviewState(); // Clear all preview state after successful save
      toast.success('Equipment updated successfully!');
    } catch (error) {
      console.error('Failed to update equipment:', error);
      toast.error('Failed to update equipment. Please try again.');
    }
  }, [selectedEquipment, updateEquipmentMutation, setIsGlobalEditMode, isGlobalEditMode, partsStructure]); // No editFormData dependency!

  // Actions
  const {
    setIsModalOpen,
    setIsEditMode,
    setSelectedEquipment,
    setDeleteConfirmation,
  } = useEquipmentStore();

  // Mutations
  const deleteEquipmentMutation = useDeleteEquipment();

  // Removed defaultValues - no longer needed with global edit approach

  useEffect(() => {
    if (!isModalOpen) {
      setActiveTab("details");
      // Reset global edit mode when modal closes
      setIsGlobalEditMode(false);
      // Reset image preview state
      resetPreviewState();
    }
  }, [isModalOpen]);

  // Form data is now managed by the global edit state and editFormData


  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
    setIsEditMode(false);
    // Reset global edit state
    setIsGlobalEditMode(false);
    // Reset image preview state
    resetPreviewState();
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleDelete = () => {
    if (selectedEquipment && !selectedEquipment.id.startsWith('temp_')) {
      setDeleteConfirmation({ isOpen: true, equipment: selectedEquipment });
      setIsModalOpen(false); // Close main modal to show delete confirmation
    }
  };

  // Dirty tracking is no longer needed with global edit approach

  // Old handlers removed - now using global edit form with handleFieldChange

  // Old tab handlers removed - now using global edit with handleSaveChanges


  // Helper function to calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string | Date | null | undefined) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to get user full name from ID
  const getUserFullName = (userId: string | null | undefined) => {
    if (!userId) return 'Unknown User';
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Unknown User';
  };

  if (!selectedEquipment) return null;

  const daysUntilExpiry = getDaysUntilExpiry(selectedEquipment.insurance_expiration_date);

  // Dynamic descriptions based on active tab
  const getTabDescription = () => {
    switch (activeTab) {
      case 'details':
        return 'View equipment specifications, project assignment, and inspection schedules';
      case 'images':
        return 'View equipment photos and inspection images';
      case 'documents':
        return 'View official documents and certificates';
      case 'parts':
        return 'View equipment parts and components';
      case 'maintenance':
        return 'View maintenance history and service reports';
      default:
        return 'View equipment details and maintenance records';
    }
  };

  // Equipment images
  const images = [
    {
      url: selectedEquipment.image_url,
      title: "Equipment Image",
      icon: Camera,
    },
  ].filter(img => img.url);

  // Inspection images
  const inspectionImages = [
    {
      url: selectedEquipment.thirdparty_inspection_image,
      title: "Third-party Inspection",
      icon: Shield,
    },
    {
      url: selectedEquipment.pgpc_inspection_image,
      title: "PGPC Inspection",
      icon: Shield,
    },
  ].filter(img => img.url);

  // Equipment documents (PDFs and downloadable files)
  const documents = [
    {
      url: selectedEquipment.original_receipt_url,
      title: "Original Receipt",
      icon: Receipt,
    },
    {
      url: selectedEquipment.equipment_registration_url,
      title: "Equipment Registration",
      icon: FileText,
    },
  ].filter(doc => doc.url);


  // Document Viewer Component - Enhanced with preview support

  // Simple helper functions for tab counts
  const getImagesCount = () => {
    let count = 0;
    if (selectedEquipment?.image_url) count++;
    if (selectedEquipment?.thirdparty_inspection_image) count++;
    if (selectedEquipment?.pgpc_inspection_image) count++;
    return count;
  };
  const getDocumentsCount = () => {
    let count = 0;
    if (selectedEquipment?.original_receipt_url) count++;
    if (selectedEquipment?.equipment_registration_url) count++;
    return count;
  };
  const getEquipmentPartsCount = () => {
    if (!selectedEquipment?.equipment_parts || selectedEquipment.equipment_parts.length === 0) return 0;
    
    try {
      // Parse the equipment_parts from the database format
      let parsedParts: any = selectedEquipment.equipment_parts;
      
      // Handle array with JSON string format
      if (Array.isArray(parsedParts) && parsedParts.length > 0 && typeof parsedParts[0] === 'string') {
        parsedParts = JSON.parse(parsedParts[0]);
      }
      
      // Handle string format
      if (typeof parsedParts === 'string') {
        parsedParts = JSON.parse(parsedParts);
      }
      
      // Count actual files in the structure
      if (parsedParts && typeof parsedParts === 'object') {
        const rootFilesCount = Array.isArray(parsedParts.rootFiles) ? parsedParts.rootFiles.length : 0;
        const folderFilesCount = Array.isArray(parsedParts.folders) 
          ? parsedParts.folders.reduce((sum: number, folder: any) => {
              return sum + (Array.isArray(folder.files) ? folder.files.length : 0);
            }, 0)
          : 0;
        return rootFilesCount + folderFilesCount;
      }
    } catch (error) {
      // If parsing fails, return 0
      return 0;
    }
    
    return 0;
  };  
  const getMaintenanceReportsCount = () => {
    if (!selectedEquipment?.id || !Array.isArray(maintenanceReports)) return 0;
    return maintenanceReports.filter(report => report.equipment_id === selectedEquipment.id).length;
  };

  // Tab content components - EXACTLY like CreateEquipmentForm
  const renderTabButton = (tab: 'details' | 'images' | 'documents' | 'parts' | 'maintenance', label: string, icon: React.ReactNode, count?: number) => (
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
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] leading-none">
            {count}
          </span>
        )}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );


  const ModalContent = () => (
    <div className="space-y-4">

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div>
          {/* Tab Title and Description */}
          <div className={`mb-6 ${isMobile ? 'mb-4' : ''}`}>
            <h2 className={`font-semibold flex items-center gap-2 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <Settings className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Equipment Details
            </h2>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Complete equipment information including specifications, project assignment, and inspection schedules
            </p>
          </div>

          <Card>
            <CardHeader className="pb-6">
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Equipment Information Section */}
              {isGlobalEditMode ? (
                // Global Edit Mode Form
                <form className="space-y-8">
                  {/* Equipment Identity Section */}
                  <div className="space-y-4">
                    <div className={gridClassName}>
                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Wrench className="h-4 w-4" />
                          Brand
                        </Label>
                        <Input
                          name="brand"
                          placeholder="Enter equipment brand"
                          onChange={(e) => handleFieldChange('brand', e.target.value)}
                          defaultValue={editFormDataRef.current.brand}
                          className={`${isMobile ? 'text-xs' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Building2 className="h-4 w-4" />
                          Model
                        </Label>
                        <Input
                          name="model"
                          placeholder="Enter equipment model"
                          onChange={(e) => handleFieldChange('model', e.target.value)}
                          defaultValue={editFormDataRef.current.model}
                          className={`${isMobile ? 'text-xs' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className={`${isMobile ? 'text-xs' : ''}`}>Equipment Type</Label>
                        <Select 
                          defaultValue={editFormDataRef.current.type} 
                          onValueChange={(value) => handleFieldChange('type', value)}
                        >
                          <SelectTrigger className={`w-full ${isMobile ? 'text-xs' : ''}`}>
                            <SelectValue placeholder="Select equipment type" />
                          </SelectTrigger>
                          <SelectContent className={`${isMobile ? 'max-w-[90vw]' : ''}`}>
                            <SelectItem value="Excavator" className={`${isMobile ? 'text-xs' : ''}`}>Excavator</SelectItem>
                            <SelectItem value="Bulldozer" className={`${isMobile ? 'text-xs' : ''}`}>Bulldozer</SelectItem>
                            <SelectItem value="Crane" className={`${isMobile ? 'text-xs' : ''}`}>Crane</SelectItem>
                            <SelectItem value="Loader" className={`${isMobile ? 'text-xs' : ''}`}>Loader</SelectItem>
                            <SelectItem value="Grader" className={`${isMobile ? 'text-xs' : ''}`}>Grader</SelectItem>
                            <SelectItem value="Compactor" className={`${isMobile ? 'text-xs' : ''}`}>Compactor</SelectItem>
                            <SelectItem value="Dump Truck" className={`${isMobile ? 'text-xs' : ''}`}>Dump Truck</SelectItem>
                            <SelectItem value="Mixer" className={`${isMobile ? 'text-xs' : ''}`}>Mixer</SelectItem>
                            <SelectItem value="Generator" className={`${isMobile ? 'text-xs' : ''}`}>Generator</SelectItem>
                            <SelectItem value="Pump" className={`${isMobile ? 'text-xs' : ''}`}>Pump</SelectItem>
                            <SelectItem value="Other" className={`${isMobile ? 'text-xs' : ''}`}>Other</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Custom type input when "Other" is selected */}
                        {editFormDataRef.current.type === "Other" && (
                          <Input
                            name="customType"
                            defaultValue={editFormDataRef.current.type === "Other" ? editFormDataRef.current.type : ''}
                            onChange={(e) => handleFieldChange('type', e.target.value)}
                            placeholder="Enter custom equipment type"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Hash className="h-4 w-4" />
                          Plate/Serial Number
                        </Label>
                        <Input
                          name="plateNumber"
                          placeholder="Enter plate/serial number"
                          onChange={(e) => handleFieldChange('plate_number', e.target.value)}
                          defaultValue={editFormDataRef.current.plate_number}
                          className={`${isMobile ? 'text-xs' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ownership & Project Section */}
                  <div className="space-y-4">
                    <div className={gridClassName2}>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Owner
                        </Label>
                        <Input
                          name="owner"
                          placeholder="Enter equipment owner"
                          onChange={(e) => handleFieldChange('owner', e.target.value)}
                          defaultValue={editFormDataRef.current.owner}
                          className={`${isMobile ? 'text-xs' : ''}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className={`${isMobile ? 'text-xs' : ''}`}>Assigned Project</Label>
                        <Select 
                          name="projectId" 
                          defaultValue={editFormDataRef.current.project_id}
                          onValueChange={(value) => handleFieldChange('project_id', value)}
                        >
                          <SelectTrigger className={`${isMobile ? 'text-xs' : ''}`}>
                            <SelectValue placeholder="Select a project" className="truncate" />
                          </SelectTrigger>
                          <SelectContent className={`${isMobile ? 'max-w-[90vw]' : ''}`}>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id} className={`${isMobile ? 'text-xs' : ''}`}>
                                <div className="truncate max-w-full">
                                  {project.name} - {project.client?.name || 'No Client'}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Status & Additional Fields Section */}
                  <div className="space-y-4">
                    <div className={gridClassName3}>
                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Shield className="h-4 w-4" />
                          Operational Status
                        </Label>
                        <Select 
                          name="status" 
                          defaultValue={editFormDataRef.current.status}
                          onValueChange={(value) => handleFieldChange('status', value)}
                        >
                          <SelectTrigger className={`${isMobile ? 'text-xs' : ''}`}>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className={`${isMobile ? 'max-w-[90vw]' : ''}`}>
                            <SelectItem value="OPERATIONAL" className={`${isMobile ? 'text-xs' : ''}`}>Operational</SelectItem>
                            <SelectItem value="NON_OPERATIONAL" className={`${isMobile ? 'text-xs' : ''}`}>Non-Operational</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <CalendarDays className="h-4 w-4" />
                          Before (months)
                        </Label>
                        <Input
                          name="before"
                          type="number"
                          min="1"
                          max="24"
                          defaultValue={editFormDataRef.current.before}
                          onChange={(e) => handleFieldChange('before', parseInt(e.target.value) || 6)}
                          placeholder="Months before inspection"
                          className={`${isMobile ? 'text-xs' : ''}`}
                        />
                      </div>

                    </div>
                  </div>

                  {/* Date Fields Section */}
                  <div className="space-y-4">
                    <div className={gridClassName4}>
                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <CalendarIcon className="h-4 w-4" />
                          Inspection Date
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !editFormDataRef.current.inspection_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editFormDataRef.current.inspection_date ? format(editFormDataRef.current.inspection_date, "PPP") : "Pick inspection date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={editFormDataRef.current.inspection_date}
                              onSelect={(date) => handleFieldChange('inspection_date', date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <CalendarIcon className="h-4 w-4" />
                          Registration Expiry
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !editFormDataRef.current.registration_expiry && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editFormDataRef.current.registration_expiry ? format(editFormDataRef.current.registration_expiry, "PPP") : "Pick registration expiry"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={editFormDataRef.current.registration_expiry}
                              onSelect={(date) => handleFieldChange('registration_expiry', date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Shield className="h-4 w-4" />
                          Insurance Expiration
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !editFormDataRef.current.insurance_expiration_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editFormDataRef.current.insurance_expiration_date ? format(editFormDataRef.current.insurance_expiration_date, "PPP") : "Pick insurance expiry"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={editFormDataRef.current.insurance_expiration_date}
                              onSelect={(date) => handleFieldChange('insurance_expiration_date', date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                    </div>
                  </div>

                  {/* Additional Fields Section */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                        <User className="h-4 w-4" />
                        Added by
                      </Label>
                      <Select 
                        name="created_by" 
                        defaultValue={editFormDataRef.current.created_by}
                        onValueChange={(value) => handleFieldChange('created_by', value)}
                      >
                        <SelectTrigger className={`${isMobile ? 'text-xs' : ''}`}>
                          <SelectValue placeholder="Select who added this equipment" className="truncate" />
                        </SelectTrigger>
                        <SelectContent className={`${isMobile ? 'max-w-[90vw]' : ''}`}>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id} className={`${isMobile ? 'text-xs' : ''}`}>
                              <div className="truncate max-w-full">
                                {user.full_name} ({user.username})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Remarks Section */}
                  <div className="space-y-2">
                    <Label className={`${isMobile ? 'text-xs' : ''}`}>Remarks</Label>
                    <Textarea
                      name="remarks"
                      placeholder="Enter any additional notes or remarks"
                      defaultValue={editFormDataRef.current.remarks}
                      onChange={(e) => handleFieldChange('remarks', e.target.value)}
                      rows={3}
                      className={`${isMobile ? 'text-xs' : ''}`}
                    />
                  </div>
                </form>
              ) : (
                // View Mode
                <>
                  {/* Equipment Identity Section */}
                  <div className="space-y-4">
                    <div className={gridClassName}>
                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Wrench className="h-4 w-4" />
                          Brand
                        </Label>
                        <div className={`font-medium text-foreground ${isMobile ? 'text-sm' : ''}`}>{selectedEquipment.brand}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Building2 className="h-4 w-4" />
                          Model
                        </Label>
                        <div className={`font-medium text-foreground ${isMobile ? 'text-sm' : ''}`}>{selectedEquipment.model}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className={`${isMobile ? 'text-xs' : ''}`}>Equipment Type</Label>
                        <div className={`font-medium text-foreground ${isMobile ? 'text-sm' : ''}`}>{selectedEquipment.type}</div>
                      </div>

                      {selectedEquipment.plate_number && (
                        <div className="space-y-2">
                          <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                            <Hash className="h-4 w-4" />
                            Plate/Serial Number
                          </Label>
                          <div className={`font-medium text-foreground font-mono ${isMobile ? 'text-sm' : ''}`}>{selectedEquipment.plate_number}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ownership & Project Section */}
                  <div className="space-y-4">
                    <div className={gridClassName2}>
                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <User className="h-4 w-4" />
                          Owner
                        </Label>
                        <div className={`font-medium text-foreground ${isMobile ? 'text-sm' : ''}`}>{selectedEquipment.owner}</div>
                      </div>

                      <div className="space-y-2">
                        <Label>Assigned Project</Label>
                        <div className="font-medium text-foreground">{selectedEquipment.project?.name || "Unassigned"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Status Section */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Operational Status
                      </Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={
                            selectedEquipment.status === "OPERATIONAL"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }
                        >
                          {selectedEquipment.status}
                        </Badge>

                        {selectedEquipment.plate_number && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {selectedEquipment.plate_number}
                          </Badge>
                        )}

                        {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                          <Badge
                            className={
                              daysUntilExpiry <= 7
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                            }
                          >
                            {daysUntilExpiry <= 0 ? "Insurance Expired" : "Insurance Expiring Soon"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remarks Section */}
                  {selectedEquipment.remarks && (
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-medium text-muted-foreground">Remarks:</Label>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground">
                        {selectedEquipment.remarks}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Separator */}
              <div className="border-t"></div>

              {/* Dates & Inspection Section - Hide in edit mode */}
              {!isGlobalEditMode && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <h3 className="font-medium">Dates & Inspection</h3>
                </div>
                
                {/* Inspection tab shows actual date information */}
                <div className="space-y-4">
                  {!isGlobalEditMode && (
                    <p className="text-sm text-muted-foreground">
                      Use the Edit Equipment button to modify inspection dates and frequency.
                    </p>
                  )}
                  
                  {/* Date Information Display */}
                  <div className="space-y-4">
                    <div className={gridClassName3}>
                      {/* Registration Expires */}
                      {selectedEquipment.registration_expiry && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Registration Expires:</Label>
                          <div className={`font-medium ${
                            (() => {
                              if (!selectedEquipment.registration_expiry) return "text-foreground";
                              const now = new Date();
                              const expiry = new Date(selectedEquipment.registration_expiry);
                              const diffTime = expiry.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return diffDays <= 0 ? "text-red-600" : diffDays <= 30 ? "text-orange-600" : "text-foreground";
                            })()
                          }`}>
                            {format(new Date(selectedEquipment.registration_expiry), "M/d/yyyy")}
                            {(() => {
                              if (!selectedEquipment.registration_expiry) return null;
                              const now = new Date();
                              const expiry = new Date(selectedEquipment.registration_expiry);
                              const diffTime = expiry.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return diffDays <= 0 ? <span className="text-red-600 ml-2">(Expired)</span> : null;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Insurance Expires */}
                      {selectedEquipment.insurance_expiration_date && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Insurance Expires:</Label>
                          <div className={`font-medium ${
                            daysUntilExpiry !== null && daysUntilExpiry <= 0
                              ? "text-red-600"
                              : daysUntilExpiry !== null && daysUntilExpiry <= 30
                              ? "text-orange-600"
                              : "text-foreground"
                          }`}>
                            {format(new Date(selectedEquipment.insurance_expiration_date), "M/d/yyyy")}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                              <span className="text-red-600 ml-2">(Expired)</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Last Inspection */}
                      {selectedEquipment.inspection_date && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Last Inspection:</Label>
                          <div className="font-medium text-foreground">
                            {format(new Date(selectedEquipment.inspection_date), "M/d/yyyy")}
                          </div>
                        </div>
                      )}

                      {/* Next Inspection Due */}
                      {selectedEquipment.inspection_date && selectedEquipment.before && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Next Inspection Due:</Label>
                          <div className="font-medium text-foreground">
                            {(() => {
                              const lastInspection = new Date(selectedEquipment.inspection_date);
                              const frequency = parseInt(selectedEquipment.before.toString());
                              const nextInspection = new Date(lastInspection);
                              nextInspection.setMonth(nextInspection.getMonth() + frequency);
                              return format(nextInspection, "M/d/yyyy");
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Inspection Frequency */}
                      {selectedEquipment.before && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Inspection Frequency:</Label>
                          <div className="font-medium text-foreground">
                            Every {selectedEquipment.before} month{parseInt(selectedEquipment.before.toString()) > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}

                      {/* Date Added */}
                      {selectedEquipment.created_at && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Date Added:</Label>
                          <div className="font-medium text-foreground">
                            {format(new Date(selectedEquipment.created_at), "M/d/yyyy")}
                          </div>
                        </div>
                      )}

                      {/* Added by */}
                      {selectedEquipment.created_by && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Added by:</Label>
                          <div className="font-medium text-foreground">
                            {getUserFullName(selectedEquipment.created_by)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <div>
          {/* Tab Title and Description */}
          <div className={`mb-6 ${isMobile ? 'mb-4' : ''}`}>
            <h2 className={`font-semibold flex items-center gap-2 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <Camera className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Equipment Images
            </h2>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Visual documentation of the equipment including main photo and inspection images
            </p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                {/* Equipment Image */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Equipment Image
                  </h3>
                  <ImagePreviewSection
                    fieldName="image_url"
                    url={selectedEquipment.image_url}
                    label="Equipment Image"
                    description="Main equipment photo"
                    accept="image/*"
                    isEditMode={isGlobalEditMode}
                    previewUrl={newFilePreviewUrls['image_url']}
                    onFileSelect={(fieldName, file) => {
                      handleFileSelect(fieldName, file);
                      handleFieldChange('image_url', file);
                    }}
                    onRemove={(fieldName) => {
                      handleFileRemove(fieldName);
                      handleFieldChange('image_url', null);
                    }}
                  />
                </div>

                {/* Third-party Inspection */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Third-party Inspection
                  </h3>
                  <ImagePreviewSection
                    fieldName="thirdparty_inspection_image"
                    url={selectedEquipment.thirdparty_inspection_image}
                    label="Third-party Inspection"
                    description="Third-party inspection documentation"
                    accept="image/*"
                    isEditMode={isGlobalEditMode}
                    previewUrl={newFilePreviewUrls['thirdparty_inspection_image']}
                    onFileSelect={(fieldName, file) => {
                      handleFileSelect(fieldName, file);
                      handleFieldChange('thirdparty_inspection_image', file);
                    }}
                    onRemove={(fieldName) => {
                      handleFileRemove(fieldName);
                      handleFieldChange('thirdparty_inspection_image', null);
                    }}
                  />
                </div>

                {/* PGPC Inspection */}
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    PGPC Inspection
                  </h3>
                  <ImagePreviewSection
                    fieldName="pgpc_inspection_image"
                    url={!removedItems.has('pgpc_inspection_image') ? selectedEquipment.pgpc_inspection_image : null}
                    label="PGPC Inspection"
                    description="PGPC inspection documentation"
                    accept="image/*"
                    isEditMode={isGlobalEditMode}
                    previewUrl={newFilePreviewUrls['pgpc_inspection_image']}
                    onFileSelect={handleFileSelect}
                    onRemove={handleFileRemove}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          {/* Tab Title and Description */}
          <div className={`mb-6 ${isMobile ? 'mb-4' : ''}`}>
            <h2 className={`font-semibold flex items-center gap-2 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <FileText className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Equipment Documents
            </h2>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Official documents and certificates related to equipment purchase and registration
            </p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {/* Purchase Receipt */}
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2 mb-2">
                    <Receipt className="h-4 w-4" />
                    Purchase Receipt
                  </h3>
                  <ImagePreviewSection
                    fieldName="original_receipt_url"
                    url={!removedItems.has('original_receipt_url') ? selectedEquipment.original_receipt_url : null}
                    label="Purchase Receipt"
                    description="Equipment purchase documentation"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    isEditMode={isGlobalEditMode}
                    previewUrl={newFilePreviewUrls['original_receipt_url']}
                    onFileSelect={handleFileSelect}
                    onRemove={handleFileRemove}
                  />
                </div>

                {/* Registration Document */}
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Registration Document
                  </h3>
                  <ImagePreviewSection
                    fieldName="equipment_registration_url"
                    url={!removedItems.has('equipment_registration_url') ? selectedEquipment.equipment_registration_url : null}
                    label="Registration Document"
                    description="Official equipment registration certificate"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    isEditMode={isGlobalEditMode}
                    previewUrl={newFilePreviewUrls['equipment_registration_url']}
                    onFileSelect={handleFileSelect}
                    onRemove={handleFileRemove}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parts Tab */}
      {activeTab === 'parts' && (
        <div className="space-y-6">
          {/* Tab Title and Description */}
          <div className={`mb-6 ${isMobile ? 'mb-4' : ''}`}>
            <h2 className={`font-semibold flex items-center gap-2 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <Wrench className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Equipment Parts
            </h2>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Components and parts associated with this equipment for inventory tracking
            </p>
          </div>
          {isGlobalEditMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Equipment Parts Management (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                  Organize parts documentation in folders or upload directly to root. This creates a structured file system for easy parts management.
                </p>
              </div>
              <PartsFolderManager
                onChange={setPartsStructure}
                initialData={partsStructure}
              />
            </div>
          ) : (
            <EquipmentPartsViewer 
              equipmentParts={selectedEquipment.equipment_parts} 
              isEditable={false}
            />
          )}
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Tab Title and Description */}
          <div className={`mb-6 ${isMobile ? 'mb-4' : ''}`}>
            <h2 className={`font-semibold flex items-center gap-2 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              <ClipboardList className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              Maintenance Reports
            </h2>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Maintenance history, service reports, and repair records for this equipment
            </p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <EquipmentMaintenanceReportsEnhanced 
                equipmentId={selectedEquipment.id} 
                isEditMode={isGlobalEditMode}
              />
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );

  // Show edit modal instead if in edit mode
  if (isEditMode) {
    return <EditEquipmentModalModern />;
  }

  // Mobile drawer implementation with fixed tabs in header
  if (isMobile) {
    return (
      <>
        <Drawer open={isModalOpen} onOpenChange={handleClose}>
          <DrawerContent className="!max-h-[95dvh] flex flex-col">
            {/* Mobile Header */}
            <DrawerHeader className="flex-shrink-0 p-4 pb-0 border-b relative">
              <DrawerClose asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-4 top-4 rounded-full h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
              <div className="text-center space-y-2">
                <div>
                  <DrawerTitle className="text-lg font-bold">
                    {selectedEquipment.brand} {selectedEquipment.model}
                  </DrawerTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isGlobalEditMode ? 'Edit equipment information across all tabs' : getTabDescription()}
                  </p>
                </div>
                
              </div>
            </DrawerHeader>

            {/* Mobile Tab Navigation - Fixed in header */}
            <div className="flex-shrink-0 p-4 pt-3 pb-3">
              <div className="w-full grid grid-cols-5 bg-muted rounded-md p-1">
                {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
                {renderTabButton('images', 'Images', <Camera className="h-4 w-4" />, getImagesCount() > 0 ? getImagesCount() : undefined)}
                {renderTabButton('documents', 'Docs', <FileText className="h-4 w-4" />, getDocumentsCount() > 0 ? getDocumentsCount() : undefined)}
                {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />, getEquipmentPartsCount() > 0 ? getEquipmentPartsCount() : undefined)}
                {renderTabButton('maintenance', 'Maintenance', <ClipboardList className="h-4 w-4" />, getMaintenanceReportsCount())}
              </div>
            </div>
            
            {/* Mobile Content - Enhanced to ensure footer visibility */}
            <div className="flex-1 overflow-y-auto p-4 pt-0 pb-6">
              <ModalContent />
            </div>
            
            {/* Mobile Action Buttons in Footer */}
            <DrawerFooter className="flex-shrink-0 p-4 pt-2 border-t bg-background">
              <div className="flex gap-2">
                {!isGlobalEditMode ? (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteEquipmentMutation.isPending || selectedEquipment?.id?.startsWith('temp_')}
                      className="flex-1"
                      size="lg"
                    >
                      {deleteEquipmentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Equipment
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsGlobalEditMode(true)}
                      className="flex-1"
                      size="lg"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Equipment
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Clean up preview state on cancel
                        resetPreviewState();
                        setIsGlobalEditMode(false);
                      }}
                      className="flex-1"
                      size="lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={updateEquipmentMutation.isPending}
                      className="flex-1"
                      size="lg"
                    >
                      {updateEquipmentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop dialog implementation - With fixed tab navigation in header
  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-0"
          style={{ maxWidth: '55vw', width: '55vw' }}
        >
          <DialogHeader className="flex-shrink-0 p-6 pb-0">
            <div className="space-y-4">
              <div>
                <DialogTitle className="text-xl">{selectedEquipment.brand} {selectedEquipment.model}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {isGlobalEditMode ? 'Edit equipment information across all tabs' : getTabDescription()}
                </p>
              </div>
              
              {/* Edit Controls Row */}
              <div className="flex items-center justify-end">
                {!isGlobalEditMode ? (
                  <Button
                    type="button"
                    onClick={() => setIsGlobalEditMode(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Equipment
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Clean up preview state on cancel
                        resetPreviewState();
                        setIsGlobalEditMode(false);
                      }}
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={updateEquipmentMutation.isPending}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {updateEquipmentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Desktop Tab Navigation - Fixed in header */}
          <div className="flex-shrink-0 px-6 pt-4">
            <div className="flex justify-center border-b">
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
                onClick={() => setActiveTab('parts')}
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
              <button
                type="button"
                onClick={() => setActiveTab('maintenance')}
                className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                  activeTab === 'maintenance'
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                Maintenance Reports
                {getMaintenanceReportsCount() > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                    {getMaintenanceReportsCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <ModalContent />
          </div>
          
          {/* Desktop Action Buttons in Footer */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t bg-background px-6 pb-6">
            <div className="flex justify-center w-full">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEquipmentMutation.isPending || selectedEquipment?.id?.startsWith('temp_')}
                size="lg"
              >
                {deleteEquipmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Equipment
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}