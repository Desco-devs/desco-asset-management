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
  useEquipmentsWithReferenceData,
} from "@/hooks/useEquipmentsQuery";
import {
  selectIsDocumentsCollapsed,
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectIsPhotosCollapsed,
  selectSelectedEquipment,
  useEquipmentsStore,
} from "@/stores/equipmentsStore";
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
  User,
  Wrench,
  X,
  ZoomIn,
  Trash2,
  CalendarIcon,
  Save,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import EditEquipmentModalModern from "./EditEquipmentModalModern";
import EquipmentMaintenanceReportsEnhanced from "../EquipmentMaintenanceReportsEnhanced";
import EquipmentPartsViewer from "../EquipmentPartsViewer";
import { ImageDisplayWithRemove } from "@/components/equipment/ImageDisplayWithRemove";
import PartsFolderManager, { type PartsStructure } from "../forms/PartsFolderManager";
import { useUpdateEquipmentAction } from "@/hooks/useEquipmentsQuery";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EquipmentModalModern() {
  // Server state from TanStack Query
  const { equipments, maintenanceReports, projects } = useEquipmentsWithReferenceData();

  // Client state from Zustand
  const selectedEquipmentFromStore = useEquipmentsStore(selectSelectedEquipment);
  const isModalOpen = useEquipmentsStore(selectIsModalOpen);
  const isEditMode = useEquipmentsStore(selectIsEditMode);
  const isMobile = useEquipmentsStore(selectIsMobile);
  const isPhotosCollapsed = useEquipmentsStore(selectIsPhotosCollapsed);
  const isDocumentsCollapsed = useEquipmentsStore(selectIsDocumentsCollapsed);

  // Custom tab state - EXACTLY like CreateEquipmentForm with Images and Documents tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts' | 'maintenance'>('details');

  // Individual edit states for each tab
  const [overviewEdit, setOverviewEdit] = useState(false);
  const [imagesEdit, setImagesEdit] = useState(false);
  const [documentsEdit, setDocumentsEdit] = useState(false);
  const [partsEdit, setPartsEdit] = useState(false);
  const [maintenanceEdit, setMaintenanceEdit] = useState(false);
  const [inspectionEdit, setInspectionEdit] = useState(false);

  // Equipment type state for dynamic input
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>("");
  const customEquipmentTypeRef = useRef<HTMLInputElement>(null);

  // Dirty field tracking for Equipment Information - use refs to avoid re-renders
  const originalEquipmentDataRef = useRef<any>({});
  const [dirtyEquipmentFields, setDirtyEquipmentFields] = useState<Set<string>>(new Set());

  // Dirty field tracking for Dates & Inspection - use refs to avoid re-renders
  const originalInspectionDataRef = useRef<any>({});
  const [dirtyInspectionFields, setDirtyInspectionFields] = useState<Set<string>>(new Set());

  // Date picker states for auto-close functionality
  const [registrationExpiryDateOpen, setRegistrationExpiryDateOpen] = useState(false);
  const [insuranceExpiryDateOpen, setInsuranceExpiryDateOpen] = useState(false);
  const [lastInspectionDateOpen, setLastInspectionDateOpen] = useState(false);

  // Form state for inspection dates - initialized with default values
  const [inspectionFormData, setInspectionFormData] = useState({
    registrationExpiry: undefined as Date | undefined,
    insuranceExpirationDate: undefined as Date | undefined,
    inspectionDate: undefined as Date | undefined,
    before: '6'
  });

  // Form refs and state for each tab
  const overviewFormRef = useRef<HTMLFormElement>(null);
  const imagesFormRef = useRef<HTMLFormElement>(null);
  const documentsFormRef = useRef<HTMLFormElement>(null);
  const partsFormRef = useRef<HTMLFormElement>(null);
  const inspectionFormRef = useRef<HTMLFormElement>(null);

  // Update mutation
  const updateEquipmentMutation = useUpdateEquipmentAction();

  // Actions
  const {
    setIsModalOpen,
    setIsEditMode,
    setSelectedEquipment,
    setIsPhotosCollapsed,
    setIsDocumentsCollapsed,
    setDeleteConfirmation,
    setIsEquipmentMaintenanceModalOpen,
  } = useEquipmentsStore();

  // Mutations
  const deleteEquipmentMutation = useDeleteEquipment();

  // CRITICAL FIX: Memoize selectedEquipment to prevent re-renders and focus loss
  const selectedEquipment = useMemo(() => {
    if (!selectedEquipmentFromStore) return null;
    return equipments.find((e) => e.uid === selectedEquipmentFromStore.uid) || selectedEquipmentFromStore;
  }, [selectedEquipmentFromStore?.uid, equipments]);

  // CRITICAL FIX: Memoize default values to prevent input re-creation and focus loss
  const defaultValues = useMemo(() => {
    if (!selectedEquipment) return {};
    return {
      brand: selectedEquipment.brand || '',
      model: selectedEquipment.model || '',
      type: selectedEquipment.type || '',
      plateNumber: selectedEquipment.plateNumber || '',
      owner: selectedEquipment.owner || '',
      projectId: selectedEquipment.project?.uid || '',
      status: selectedEquipment.status || 'OPERATIONAL',
      remarks: selectedEquipment.remarks || ''
    };
  }, [
    selectedEquipment?.brand,
    selectedEquipment?.model, 
    selectedEquipment?.type,
    selectedEquipment?.plateNumber,
    selectedEquipment?.owner,
    selectedEquipment?.project?.uid,
    selectedEquipment?.status,
    selectedEquipment?.remarks
  ]);

  useEffect(() => {
    if (!isModalOpen) {
      setActiveTab("details");
      // Reset all edit states when modal closes
      setOverviewEdit(false);
      setImagesEdit(false);
      setDocumentsEdit(false);
      setPartsEdit(false);
      setMaintenanceEdit(false);
      setInspectionEdit(false);
      // Reset date picker states
      setRegistrationExpiryDateOpen(false);
      setLastInspectionDateOpen(false);
      // Reset equipment type state
      setSelectedEquipmentType("");
      // Reset dirty field tracking
      originalEquipmentDataRef.current = {};
      setDirtyEquipmentFields(new Set());
      originalInspectionDataRef.current = {};
      setDirtyInspectionFields(new Set());
    }
  }, [isModalOpen]);

  // Update inspection form data when selectedEquipment changes
  useEffect(() => {
    if (selectedEquipment) {
      setInspectionFormData({
        registrationExpiry: selectedEquipment.registrationExpiry ? new Date(selectedEquipment.registrationExpiry) : undefined,
        insuranceExpirationDate: selectedEquipment.insuranceExpirationDate ? new Date(selectedEquipment.insuranceExpirationDate) : undefined,
        inspectionDate: selectedEquipment.inspectionDate ? new Date(selectedEquipment.inspectionDate) : undefined,
        before: selectedEquipment.before?.toString() || '6'
      });

      // Initialize equipment type state
      const equipmentType = selectedEquipment.type || "";
      const predefinedTypes = ["Excavator", "Bulldozer", "Crane", "Loader", "Grader", "Compactor", "Dump Truck", "Mixer", "Generator", "Pump"];
      
      if (predefinedTypes.includes(equipmentType)) {
        setSelectedEquipmentType(equipmentType);
      } else {
        setSelectedEquipmentType("Other");
      }

      // Initialize original data for dirty tracking
      originalEquipmentDataRef.current = {
        brand: selectedEquipment.brand || '',
        model: selectedEquipment.model || '',
        type: selectedEquipment.type || '',
        plateNumber: selectedEquipment.plateNumber || '',
        owner: selectedEquipment.owner || '',
        projectId: selectedEquipment.project?.uid || '',
        status: selectedEquipment.status || 'OPERATIONAL',
        remarks: selectedEquipment.remarks || ''
      };

      originalInspectionDataRef.current = {
        registrationExpiry: selectedEquipment.registrationExpiry || null,
        insuranceExpirationDate: selectedEquipment.insuranceExpirationDate || null,
        inspectionDate: selectedEquipment.inspectionDate || null,
        before: selectedEquipment.before?.toString() || '6'
      };

      // Reset dirty fields
      setDirtyEquipmentFields(new Set());
      setDirtyInspectionFields(new Set());
    }
  }, [selectedEquipment]);


  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
    setIsEditMode(false);
    // Close any open maintenance modals
    setIsEquipmentMaintenanceModalOpen(false);
    // Reset all edit states
    setOverviewEdit(false);
    setImagesEdit(false);
    setDocumentsEdit(false);
    setPartsEdit(false);
    setMaintenanceEdit(false);
    setInspectionEdit(false);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleDelete = () => {
    if (selectedEquipment && !selectedEquipment.uid.startsWith('temp_')) {
      setDeleteConfirmation({ isOpen: true, equipment: selectedEquipment });
      setIsModalOpen(false); // Close main modal to show delete confirmation
    }
  };

  // Helper function to mark equipment field as dirty - using ref for stable access
  const markEquipmentFieldDirty = useCallback((fieldName: string, newValue: any) => {
    const originalValue = originalEquipmentDataRef.current[fieldName];
    setDirtyEquipmentFields(prev => {
      if (newValue !== originalValue) {
        return new Set(prev).add(fieldName);
      } else {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      }
    });
  }, []);

  // Helper function to mark inspection field as dirty - using ref for stable access
  const markInspectionFieldDirty = useCallback((fieldName: string, newValue: any) => {
    const originalValue = originalInspectionDataRef.current[fieldName];
    // Handle date comparison
    const originalFormatted = originalValue ? (originalValue instanceof Date ? originalValue.toISOString().split('T')[0] : originalValue) : null;
    const newFormatted = newValue ? (newValue instanceof Date ? newValue.toISOString().split('T')[0] : newValue) : null;
    
    setDirtyInspectionFields(prev => {
      if (newFormatted !== originalFormatted) {
        return new Set(prev).add(fieldName);
      } else {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      }
    });
  }, []);

  // Stable callback handlers for equipment type - NO DEPENDENCIES
  const handleEquipmentTypeChange = useCallback((value: string) => {
    setSelectedEquipmentType(value);
    if (value !== "Other") {
      if (customEquipmentTypeRef.current) {
        customEquipmentTypeRef.current.value = "";
      }
      markEquipmentFieldDirty('type', value);
    } else {
      // For "Other", we'll mark dirty when custom input changes
    }
  }, []);

  const handleCustomTypeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    markEquipmentFieldDirty('type', e.target.value);
  }, []);

  // Stable change handlers for equipment fields - NO DEPENDENCIES
  const handleBrandChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    markEquipmentFieldDirty('brand', e.target.value);
  }, []);

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    markEquipmentFieldDirty('model', e.target.value);
  }, []);

  const handlePlateNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    markEquipmentFieldDirty('plateNumber', e.target.value);
  }, []);

  const handleOwnerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    markEquipmentFieldDirty('owner', e.target.value);
  }, []);

  const handleProjectIdChange = useCallback((value: string) => {
    markEquipmentFieldDirty('projectId', value);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    markEquipmentFieldDirty('status', value);
  }, []);

  const handleRemarksChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    markEquipmentFieldDirty('remarks', e.target.value);
  }, []);

  // Stable handler for inspection frequency
  const handleInspectionFrequencyChange = useCallback((value: string) => {
    setInspectionFormData(prev => ({ ...prev, before: value }));
    markInspectionFieldDirty('before', value);
  }, []);

  // Individual tab edit handlers
  const handleTabEditToggle = (tab: 'overview' | 'images' | 'documents' | 'parts' | 'maintenance' | 'inspection', editState: boolean) => {
    switch (tab) {
      case 'overview':
        setOverviewEdit(editState);
        break;
      case 'images':
        setImagesEdit(editState);
        break;
      case 'documents':
        setDocumentsEdit(editState);
        break;
      case 'parts':
        setPartsEdit(editState);
        break;
      case 'maintenance':
        setMaintenanceEdit(editState);
        break;
      case 'inspection':
        setInspectionEdit(editState);
        break;
    }
  };

  const handleTabCancel = (tab: 'overview' | 'images' | 'documents' | 'parts' | 'maintenance' | 'inspection') => {
    handleTabEditToggle(tab, false);
    
    // Reset form data when canceling inspection edit
    if (tab === 'inspection' && selectedEquipment) {
      setInspectionFormData({
        registrationExpiry: selectedEquipment.registrationExpiry ? new Date(selectedEquipment.registrationExpiry) : undefined,
        insuranceExpirationDate: selectedEquipment.insuranceExpirationDate ? new Date(selectedEquipment.insuranceExpirationDate) : undefined,
        inspectionDate: selectedEquipment.inspectionDate ? new Date(selectedEquipment.inspectionDate) : undefined,
        before: selectedEquipment.before?.toString() || '6'
      });
      // Close any open date pickers
      setRegistrationExpiryDateOpen(false);
      setInsuranceExpiryDateOpen(false);
      setLastInspectionDateOpen(false);
    }
  };

  const handleTabSave = async (tab: 'overview' | 'images' | 'documents' | 'parts' | 'maintenance' | 'inspection') => {
    if (!selectedEquipment) return;

    let formRef: React.RefObject<HTMLFormElement | null>;
    switch (tab) {
      case 'overview':
        formRef = overviewFormRef;
        break;
      case 'images':
        formRef = imagesFormRef;
        break;
      case 'documents':
        formRef = documentsFormRef;
        break;
      case 'parts':
        formRef = partsFormRef;
        break;
      case 'inspection':
        formRef = inspectionFormRef;
        break;
      default:
        return;
    }

    if (!formRef.current) return;

    const formData = new FormData();
    formData.append('equipmentId', selectedEquipment.uid);

    // Handle dirty fields for Equipment Information (overview tab)
    if (tab === 'overview') {
      if (dirtyEquipmentFields.size === 0) {
        toast.info("No changes detected");
        return;
      }
      
      // Only append changed fields
      const formEl = formRef.current as HTMLFormElement;
      const formDataFromForm = new FormData(formEl);
      
      dirtyEquipmentFields.forEach(fieldName => {
        const value = formDataFromForm.get(fieldName);
        if (value !== null) {
          formData.append(fieldName, value);
        }
      });
    }

    // Handle dirty fields for Dates & Inspection
    if (tab === 'inspection') {
      if (dirtyInspectionFields.size === 0) {
        toast.info("No changes detected");
        return;
      }

      // Only append changed inspection fields
      dirtyInspectionFields.forEach(fieldName => {
        if (fieldName === 'registrationExpiry' && inspectionFormData.registrationExpiry) {
          formData.append('registrationExpiry', format(inspectionFormData.registrationExpiry, 'yyyy-MM-dd'));
        } else if (fieldName === 'insuranceExpirationDate' && inspectionFormData.insuranceExpirationDate) {
          formData.append('insuranceExpirationDate', format(inspectionFormData.insuranceExpirationDate, 'yyyy-MM-dd'));
        } else if (fieldName === 'inspectionDate' && inspectionFormData.inspectionDate) {
          formData.append('inspectionDate', format(inspectionFormData.inspectionDate, 'yyyy-MM-dd'));
        } else if (fieldName === 'before') {
          formData.append('before', inspectionFormData.before);
        }
      });
    }

    // For other tabs (images, documents, parts), use existing logic
    if (tab !== 'overview' && tab !== 'inspection') {
      const formEl = formRef.current as HTMLFormElement;
      const formDataFromForm = new FormData(formEl);
      for (const [key, value] of formDataFromForm.entries()) {
        formData.append(key, value);
      }
    }

    // Special handling for parts tab - get data from PartsFolderManager
    if (tab === 'parts') {
      // Note: PartsFolderManager handles its own state internally
      // The parts data will be handled by the component's internal logic
      // For now, we'll use the existing structure
      const currentPartsStructure = selectedEquipment.equipmentParts 
        ? (Array.isArray(selectedEquipment.equipmentParts) && selectedEquipment.equipmentParts.length > 0
            ? JSON.parse(selectedEquipment.equipmentParts[0])
            : typeof selectedEquipment.equipmentParts === 'string'
            ? JSON.parse(selectedEquipment.equipmentParts)
            : selectedEquipment.equipmentParts)
        : { rootFiles: [], folders: [] };
      
      formData.append('partsStructure', JSON.stringify(currentPartsStructure));
    }

    try {
      await updateEquipmentMutation.mutateAsync(formData);
      handleTabEditToggle(tab, false);
      
      // Clear dirty fields after successful save
      if (tab === 'overview') {
        setDirtyEquipmentFields(new Set());
      } else if (tab === 'inspection') {
        setDirtyInspectionFields(new Set());
      }
      
      toast.success(`${tab.charAt(0).toUpperCase() + tab.slice(1)} updated successfully`);
    } catch (error) {
      console.error(`Error updating ${tab}:`, error);
      toast.error(`Failed to update ${tab}`);
    }
  };


  // Helper function to calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!selectedEquipment) return null;

  const daysUntilExpiry = getDaysUntilExpiry(selectedEquipment.insuranceExpirationDate);

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
      url: selectedEquipment.thirdpartyInspectionImage,
      title: "Third-party Inspection",
      icon: Shield,
    },
    {
      url: selectedEquipment.pgpcInspectionImage,
      title: "PGPC Inspection",
      icon: Shield,
    },
  ].filter(img => img.url);

  // Equipment documents (PDFs and downloadable files)
  const documents = [
    {
      url: selectedEquipment.originalReceiptUrl,
      title: "Original Receipt",
      icon: Receipt,
    },
    {
      url: selectedEquipment.equipmentRegistrationUrl,
      title: "Equipment Registration",
      icon: FileText,
    },
  ].filter(doc => doc.url);

  // Image/Document Viewer Component - EXACTLY like FileUploadSectionSimple
  const ImageViewerSection = ({ url, label, description }: { url: string; label: string; description: string }) => {
    const [showImageViewer, setShowImageViewer] = useState(false);
    
    return (
      <div className="space-y-2">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="space-y-2">
            <div className="relative w-full max-w-[200px] mx-auto group">
              <div 
                className="relative cursor-pointer"
                onClick={() => {
                  setShowImageViewer(true);
                }}
              >
                <Image
                  src={url}
                  alt={label}
                  width={200}
                  height={200}
                  className="w-full h-[200px] object-cover rounded hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-0 transition-opacity bg-black/40 rounded">
                  <Eye className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">{description}</p>

        {/* Image Viewer Modal - Responsive sizing for mobile and desktop like FileUploadSectionSimple */}
        {showImageViewer && (
          <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
            <DialogContent 
              className="!max-w-none p-4 
                w-[95vw] max-h-[85vh] sm:w-[80vw] sm:max-h-[70vh] lg:w-[60vw] lg:max-h-[65vh] xl:w-[40vw] xl:max-h-[60vh]" 
              style={{ 
                maxWidth: 'min(95vw, 800px)', 
                width: 'min(95vw, 800px)'
              }}
            >
              <DialogHeader className="pb-4">
                <DialogTitle className="text-center">
                  {label}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center">
                <Image
                  src={url}
                  alt={label}
                  width={800}
                  height={600}
                  className="max-w-full max-h-[70vh] sm:max-h-[55vh] lg:max-h-[50vh] xl:max-h-[45vh] object-contain"
                  onClick={(e) => e.stopPropagation()}
                  onError={(e) => {
                  }}
                  onLoad={() => {
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  };

  // Helper function to count maintenance issues for selected equipment
  const getMaintenanceIssueCount = () => {
    if (!selectedEquipment || !maintenanceReports) return 0;
    
    return maintenanceReports.filter(report => 
      report.equipment_id === selectedEquipment.uid && 
      report.status && 
      !['COMPLETED', 'RESOLVED'].includes(report.status.toUpperCase())
    ).length;
  };

  // Helper function to count total maintenance reports for selected equipment
  const getMaintenanceReportsCount = () => {
    if (!selectedEquipment || !maintenanceReports) return 0;
    
    return maintenanceReports.filter(report => 
      report.equipment_id === selectedEquipment.uid
    ).length;
  };

  // Helper function to count images for selected equipment
  const getImagesCount = () => {
    if (!selectedEquipment) return 0;
    
    let count = 0;
    if (selectedEquipment.image_url) count++;
    if (selectedEquipment.thirdpartyInspectionImage) count++;
    if (selectedEquipment.pgpcInspectionImage) count++;
    
    return count;
  };

  // Helper function to count documents for selected equipment
  const getDocumentsCount = () => {
    if (!selectedEquipment) return 0;
    
    let count = 0;
    if (selectedEquipment.originalReceiptUrl) count++;
    if (selectedEquipment.equipmentRegistrationUrl) count++;
    
    return count;
  };

  // Helper function to count equipment parts for selected equipment
  const getEquipmentPartsCount = () => {
    if (!selectedEquipment || !selectedEquipment.equipmentParts) return 0;
    
    try {
      let partsData;
      
      // Handle different storage formats
      if (typeof selectedEquipment.equipmentParts === 'string') {
        partsData = JSON.parse(selectedEquipment.equipmentParts);
      } else if (Array.isArray(selectedEquipment.equipmentParts)) {
        if (selectedEquipment.equipmentParts.length === 0) return 0;
        // Parse the first element which contains the JSON string - with safety check
        try {
          const rawData = selectedEquipment.equipmentParts[0];
          
          // Safety check - ensure it's a valid JSON string
          if (typeof rawData !== 'string') {
            return 0;
          }
          
          // Additional safety - check if it starts with bucket (corrupted data)
          if (rawData.startsWith('bucket') || rawData.includes('"bucket"')) {
            return 0;
          }
          
          partsData = JSON.parse(rawData);
        } catch (error) {
          return 0;
        }
      } else if (typeof selectedEquipment.equipmentParts === 'object') {
        partsData = selectedEquipment.equipmentParts;
      } else {
        return 0;
      }
      
      if (!partsData) return 0;
    
      // Count only actual files with content (url, preview, or file), not empty structures
      let count = 0;
      
      // Count root files that have actual content
      if (partsData.rootFiles && Array.isArray(partsData.rootFiles)) {
        count += partsData.rootFiles.filter((file: any) => 
          file && (file.url || file.preview || file.file)
        ).length;
      }
      
      // Count files in folders that have actual content
      if (partsData.folders && Array.isArray(partsData.folders)) {
        partsData.folders.forEach((folder: any) => {
          if (folder && folder.files && Array.isArray(folder.files)) {
            count += folder.files.filter((file: any) => 
              file && (file.url || file.preview || file.file)
            ).length;
          }
        });
      }
      
      return count;
    } catch (error) {
      return 0;
    }
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

  // Helper function to render edit button for each tab
  const renderTabEditButton = (tab: 'overview' | 'images' | 'documents' | 'parts' | 'maintenance' | 'inspection', editState: boolean) => {
    if (editState) {
      return (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleTabCancel(tab)}
            disabled={updateEquipmentMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleTabSave(tab)}
            disabled={updateEquipmentMutation.isPending}
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
      );
    }

    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => handleTabEditToggle(tab, true)}
        className="flex items-center gap-2"
      >
        <Edit className="h-4 w-4" />
        Edit
      </Button>
    );
  };

  const ModalContent = () => (
    <div className="space-y-4">

      {/* Tab Navigation - EXACTLY like CreateEquipmentForm */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-5 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
            {renderTabButton('images', 'Images', <Camera className="h-4 w-4" />, getImagesCount() > 0 ? getImagesCount() : undefined)}
            {renderTabButton('documents', 'Docs', <FileText className="h-4 w-4" />, getDocumentsCount() > 0 ? getDocumentsCount() : undefined)}
            {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />, getEquipmentPartsCount() > 0 ? getEquipmentPartsCount() : undefined)}
            {renderTabButton('maintenance', 'Maintenance', <ClipboardList className="h-4 w-4" />, getMaintenanceReportsCount())}
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
          </>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className={`${isMobile ? 'space-y-6' : 'space-y-8'}`}>
          {/* Equipment Details */}
          <Card>
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Equipment Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {overviewEdit ? 'Edit equipment details' : 'View detailed information about this equipment'}
                  </p>
                </div>
                {renderTabEditButton('overview', overviewEdit)}
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {overviewEdit ? (
                // Edit Mode Form
                <form ref={overviewFormRef} className="space-y-8">
                  {/* Equipment Identity Section */}
                  <div className="space-y-4">
                    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Brand
                        </Label>
                        <Input
                          name="brand"
                          defaultValue={defaultValues.brand}
                          placeholder="Enter equipment brand"
                          onChange={handleBrandChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Model
                        </Label>
                        <Input
                          name="model"
                          defaultValue={defaultValues.model}
                          placeholder="Enter equipment model"
                          onChange={handleModelChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Equipment Type</Label>
                        <Select 
                          value={selectedEquipmentType} 
                          onValueChange={handleEquipmentTypeChange}
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
                        
                        {/* Custom type input when "Other" is selected */}
                        {selectedEquipmentType === "Other" && (
                          <Input
                            ref={customEquipmentTypeRef}
                            name="customType"
                            defaultValue={defaultValues.type}
                            onChange={handleCustomTypeChange}
                            placeholder="Enter custom equipment type"
                            required
                            autoFocus
                          />
                        )}
                        
                        {/* Hidden input to submit the correct value */}
                        <input
                          type="hidden"
                          name="type"
                          value={selectedEquipmentType === "Other" ? (customEquipmentTypeRef.current?.value || "") : selectedEquipmentType}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Plate/Serial Number
                        </Label>
                        <Input
                          name="plateNumber"
                          defaultValue={defaultValues.plateNumber}
                          placeholder="Enter plate/serial number"
                          onChange={handlePlateNumberChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ownership & Project Section */}
                  <div className="space-y-4">
                    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Owner
                        </Label>
                        <Input
                          name="owner"
                          defaultValue={defaultValues.owner}
                          placeholder="Enter equipment owner"
                          onChange={handleOwnerChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Assigned Project</Label>
                        <Select 
                          name="projectId" 
                          defaultValue={defaultValues.projectId}
                          onValueChange={handleProjectIdChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.uid} value={project.uid}>
                                {project.name} - {project.client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Status & Additional Fields Section */}
                  <div className="space-y-4">
                    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Operational Status
                        </Label>
                        <Select 
                          name="status" 
                          defaultValue={defaultValues.status}
                          onValueChange={handleStatusChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPERATIONAL">Operational</SelectItem>
                            <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  </div>

                  {/* Remarks Section */}
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Textarea
                      name="remarks"
                      defaultValue={defaultValues.remarks}
                      placeholder="Enter any additional notes or remarks"
                      onChange={handleRemarksChange}
                      rows={3}
                    />
                  </div>
                </form>
              ) : (
                // View Mode
                <>
                  {/* Equipment Identity Section */}
                  <div className="space-y-4">
                    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Brand
                        </Label>
                        <div className="font-medium text-foreground">{selectedEquipment.brand}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Model
                        </Label>
                        <div className="font-medium text-foreground">{selectedEquipment.model}</div>
                      </div>

                      <div className="space-y-2">
                        <Label>Equipment Type</Label>
                        <div className="font-medium text-foreground">{selectedEquipment.type}</div>
                      </div>

                      {selectedEquipment.plateNumber && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Plate/Serial Number
                          </Label>
                          <div className="font-medium text-foreground font-mono">{selectedEquipment.plateNumber}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ownership & Project Section */}
                  <div className="space-y-4">
                    <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Owner
                        </Label>
                        <div className="font-medium text-foreground">{selectedEquipment.owner}</div>
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

                        {selectedEquipment.plateNumber && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {selectedEquipment.plateNumber}
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
            </CardContent>
          </Card>

          {/* Dates & Inspection Card */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Dates & Inspection
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {inspectionEdit ? 'Edit equipment dates and inspection schedule' : 'Equipment registration, inspection dates and scheduling information'}
                  </p>
                </div>
                {renderTabEditButton('inspection', inspectionEdit)}
              </div>
            </CardHeader>
            <CardContent>
              {inspectionEdit ? (
                // Edit Mode Form
                <form ref={inspectionFormRef} className="space-y-6">
                  <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                    {/* Registration Expires */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Registration Expires
                      </Label>
                      <Popover open={registrationExpiryDateOpen} onOpenChange={setRegistrationExpiryDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !inspectionFormData.registrationExpiry && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {inspectionFormData.registrationExpiry ? (
                              format(inspectionFormData.registrationExpiry, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={inspectionFormData.registrationExpiry}
                            onSelect={(date) => {
                              setInspectionFormData(prev => ({ ...prev, registrationExpiry: date }));
                              markInspectionFieldDirty('registrationExpiry', date);
                              setRegistrationExpiryDateOpen(false); // Auto-close after selection
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

                    {/* Insurance Expiration */}
                    <div className="space-y-2">
                      <Label>Insurance Expires</Label>
                      <Popover open={insuranceExpiryDateOpen} onOpenChange={setInsuranceExpiryDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !inspectionFormData.insuranceExpirationDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {inspectionFormData.insuranceExpirationDate ? (
                              format(inspectionFormData.insuranceExpirationDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={inspectionFormData.insuranceExpirationDate}
                            onSelect={(date) => {
                              setInspectionFormData(prev => ({ ...prev, insuranceExpirationDate: date }));
                              markInspectionFieldDirty('insuranceExpirationDate', date);
                              setInsuranceExpiryDateOpen(false); // Auto-close after selection
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

                    {/* Last Inspection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        Last Inspection
                      </Label>
                      <Popover open={lastInspectionDateOpen} onOpenChange={setLastInspectionDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !inspectionFormData.inspectionDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {inspectionFormData.inspectionDate ? (
                              format(inspectionFormData.inspectionDate, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={inspectionFormData.inspectionDate}
                            onSelect={(date) => {
                              setInspectionFormData(prev => ({ ...prev, inspectionDate: date }));
                              markInspectionFieldDirty('inspectionDate', date);
                              setLastInspectionDateOpen(false); // Auto-close after selection
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

                    {/* Inspection Frequency */}
                    <div className="space-y-2">
                      <Label>Inspection Frequency</Label>
                      <Select 
                        value={inspectionFormData.before} 
                        onValueChange={handleInspectionFrequencyChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Every 1 month</SelectItem>
                          <SelectItem value="2">Every 2 months</SelectItem>
                          <SelectItem value="3">Every 3 months</SelectItem>
                          <SelectItem value="6">Every 6 months</SelectItem>
                          <SelectItem value="12">Every 12 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                </form>
              ) : (
                // View Mode
                <div className="space-y-4">
                  <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                    {/* Registration Expires */}
                    {selectedEquipment.registrationExpiry && (
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">Registration Expires:</Label>
                        <div className={`font-medium ${
                          (() => {
                            if (!selectedEquipment.registrationExpiry) return "text-foreground";
                            const now = new Date();
                            const expiry = new Date(selectedEquipment.registrationExpiry);
                            const diffTime = expiry.getTime() - now.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays <= 0 ? "text-red-600" : diffDays <= 30 ? "text-orange-600" : "text-foreground";
                          })()
                        }`}>
                          {format(new Date(selectedEquipment.registrationExpiry), "M/d/yyyy")}
                          {(() => {
                            if (!selectedEquipment.registrationExpiry) return null;
                            const now = new Date();
                            const expiry = new Date(selectedEquipment.registrationExpiry);
                            const diffTime = expiry.getTime() - now.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays <= 0 ? <span className="text-red-600 ml-2">(Expired)</span> : null;
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Insurance Expires */}
                    {selectedEquipment.insuranceExpirationDate && (
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">Insurance Expires:</Label>
                        <div className={`font-medium ${
                          daysUntilExpiry !== null && daysUntilExpiry <= 0
                            ? "text-red-600"
                            : daysUntilExpiry !== null && daysUntilExpiry <= 30
                            ? "text-orange-600"
                            : "text-foreground"
                        }`}>
                          {format(new Date(selectedEquipment.insuranceExpirationDate), "M/d/yyyy")}
                          {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                            <span className="text-red-600 ml-2">(Expired)</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Last Inspection */}
                    {selectedEquipment.inspectionDate && (
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">Last Inspection:</Label>
                        <div className="font-medium text-foreground">
                          {format(new Date(selectedEquipment.inspectionDate), "M/d/yyyy")}
                        </div>
                      </div>
                    )}

                    {/* Next Inspection Due */}
                    {selectedEquipment.inspectionDate && selectedEquipment.before && (
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-muted-foreground">Next Inspection Due:</Label>
                        <div className="font-medium text-foreground">
                          {(() => {
                            const lastInspection = new Date(selectedEquipment.inspectionDate);
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
                          {selectedEquipment.created_by}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Images Tab - EXACTLY like CreateEquipmentForm */}
      {activeTab === 'images' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Equipment Images {isMobile ? '' : ''}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {imagesEdit ? 'Upload or replace equipment images' : 'Photos and inspection images for this equipment. These images help with identification, insurance claims, and maintenance records.'}
                  </p>
                </div>
                {renderTabEditButton('images', imagesEdit)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {imagesEdit ? (
                // Edit Mode Form
                <form ref={imagesFormRef} className="space-y-6">
                  <div className="space-y-4">
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {/* Equipment Image */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Equipment Image</Label>
                        {selectedEquipment.image_url ? (
                          <ImageDisplayWithRemove
                            url={selectedEquipment.image_url}
                            onRemove={() => {}}
                            label="Equipment Image"
                            description="Equipment image for identification"
                          />
                        ) : (
                          <div className="text-center py-8">
                            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No equipment image available</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Third-party Inspection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Third-party Inspection</Label>
                        {selectedEquipment.thirdpartyInspectionImage ? (
                          <ImageDisplayWithRemove
                            url={selectedEquipment.thirdpartyInspectionImage}
                            onRemove={() => {}}
                            label="Third-party Inspection"
                            description="Third-party inspection certificate"
                          />
                        ) : (
                          <div className="text-center py-8">
                            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No third-party inspection available</p>
                          </div>
                        )}
                      </div>
                      
                      {/* PGPC Inspection */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">PGPC Inspection</Label>
                        {selectedEquipment.pgpcInspectionImage ? (
                          <ImageDisplayWithRemove
                            url={selectedEquipment.pgpcInspectionImage}
                            onRemove={() => {}}
                            label="PGPC Inspection"
                            description="PGPC inspection certificate"
                          />
                        ) : (
                          <div className="text-center py-8">
                            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No PGPC inspection available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                // View Mode
                <div className="space-y-4">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {/* Equipment Image */}
                    {selectedEquipment.image_url && (
                      <ImageViewerSection 
                        url={selectedEquipment.image_url}
                        label="Equipment Image" 
                        description="Equipment Image"
                      />
                    )}
                    
                    {/* Third-party Inspection */}
                    {selectedEquipment.thirdpartyInspectionImage && (
                      <ImageViewerSection 
                        url={selectedEquipment.thirdpartyInspectionImage}
                        label="Third-party Inspection" 
                        description="Third-party Inspection"
                      />
                    )}
                    
                    {/* PGPC Inspection */}
                    {selectedEquipment.pgpcInspectionImage && (
                      <ImageViewerSection 
                        url={selectedEquipment.pgpcInspectionImage}
                        label="PGPC Inspection" 
                        description="PGPC Inspection"
                      />
                    )}
                  </div>
                  {!selectedEquipment.image_url && !selectedEquipment.thirdpartyInspectionImage && !selectedEquipment.pgpcInspectionImage && (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No images available for this equipment</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab - EXACTLY like CreateEquipmentForm */}
      {activeTab === 'documents' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents {isMobile ? '' : ''}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {documentsEdit ? 'Upload or replace equipment documents' : 'Important equipment documents for compliance and record-keeping. Accepted formats: PDF and image files.'}
                  </p>
                </div>
                {renderTabEditButton('documents', documentsEdit)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {documentsEdit ? (
                // Edit Mode Form
                <form ref={documentsFormRef} className="space-y-6">
                  <div className="space-y-4">
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {/* Original Receipt (OR) */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Original Receipt (OR)</Label>
                        {selectedEquipment.originalReceiptUrl ? (
                          <ImageDisplayWithRemove
                            url={selectedEquipment.originalReceiptUrl}
                            onRemove={() => {}}
                            label="Original Receipt"
                            description="Proof of purchase document"
                          />
                        ) : (
                          <div className="text-center py-8">
                            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No original receipt available</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Equipment Registration */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Equipment Registration</Label>
                        {selectedEquipment.equipmentRegistrationUrl ? (
                          <ImageDisplayWithRemove
                            url={selectedEquipment.equipmentRegistrationUrl}
                            onRemove={() => {}}
                            label="Equipment Registration"
                            description="Official equipment registration certificate"
                          />
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No equipment registration available</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                // View Mode
                <div className="space-y-4">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {/* Original Receipt (OR) */}
                    {selectedEquipment.originalReceiptUrl && (
                      <ImageViewerSection 
                        url={selectedEquipment.originalReceiptUrl}
                        label="Original Receipt (OR)" 
                        description="Proof of purchase document"
                      />
                    )}
                    
                    {/* Equipment Registration */}
                    {selectedEquipment.equipmentRegistrationUrl && (
                      <ImageViewerSection 
                        url={selectedEquipment.equipmentRegistrationUrl}
                        label="Equipment Registration" 
                        description="Official equipment registration certificate"
                      />
                    )}
                  </div>
                  {!selectedEquipment.originalReceiptUrl && !selectedEquipment.equipmentRegistrationUrl && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No documents available for this equipment</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parts Tab */}
      {activeTab === 'parts' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Equipment Parts
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    {partsEdit ? 'Manage parts documentation with folders and files' : 'View and browse parts documentation organized in folders.'}
                  </p>
                </div>
                {renderTabEditButton('parts', partsEdit)}
              </div>
            </CardHeader>
            <CardContent>
              {partsEdit ? (
                // Edit Mode Form
                <form ref={partsFormRef} className="space-y-6">
                  <PartsFolderManager
                    initialData={
                      selectedEquipment.equipmentParts 
                        ? (Array.isArray(selectedEquipment.equipmentParts) && selectedEquipment.equipmentParts.length > 0
                            ? JSON.parse(selectedEquipment.equipmentParts[0])
                            : typeof selectedEquipment.equipmentParts === 'string'
                            ? JSON.parse(selectedEquipment.equipmentParts)
                            : selectedEquipment.equipmentParts)
                        : { rootFiles: [], folders: [] }
                    }
                    onChange={() => {}} // Parts manager handles its own state
                  />
                </form>
              ) : (
                // View Mode
                <EquipmentPartsViewer 
                  equipmentParts={
                    selectedEquipment.equipmentParts 
                      ? (Array.isArray(selectedEquipment.equipmentParts) && selectedEquipment.equipmentParts.length > 0
                          ? JSON.parse(selectedEquipment.equipmentParts[0])
                          : typeof selectedEquipment.equipmentParts === 'string'
                          ? JSON.parse(selectedEquipment.equipmentParts)
                          : selectedEquipment.equipmentParts)
                      : { rootFiles: [], folders: [] }
                  } 
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <EquipmentMaintenanceReportsEnhanced equipmentId={selectedEquipment.uid} />
        </div>
      )}

    </div>
  );

  // Show edit modal instead if in edit mode
  if (isEditMode) {
    return <EditEquipmentModalModern />;
  }

  // Mobile drawer implementation
  if (isMobile) {
    return (
      <>
        <Drawer open={isModalOpen} onOpenChange={handleClose}>
          <DrawerContent className="!max-h-[95dvh]">
            {/* Mobile Header - Exact copy from CreateEquipmentModalModern */}
            <DrawerHeader className="p-4 pb-4 flex-shrink-0 border-b relative">
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
                <DrawerTitle className="text-xl font-bold">
                  {selectedEquipment.brand} {selectedEquipment.model}
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">
                  View equipment details and maintenance records
                </p>
              </div>
            </DrawerHeader>
            
            {/* Mobile Content - Enhanced to ensure footer visibility */}
            <div className="flex-1 overflow-y-auto p-4 pb-6">
              <ModalContent />
            </div>
            
            {/* Mobile Action Buttons in Footer */}
            <DrawerFooter className="flex-shrink-0 p-4 pt-2 border-t bg-background">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteEquipmentMutation.isPending || selectedEquipment?.uid.startsWith('temp_')}
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
                  variant="outline"
                  onClick={handleEdit}
                  className="flex-1"
                  size="lg"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Equipment
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop dialog implementation - Exact copy from CreateEquipmentModalModern
  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
          style={{ maxWidth: '55vw', width: '55vw' }}
        >
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl">{selectedEquipment.brand} {selectedEquipment.model}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              View equipment details, maintenance records, and documentation
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pb-4">
            <ModalContent />
          </div>
          
          {/* Desktop Action Buttons in Footer */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t bg-background">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEquipmentMutation.isPending || selectedEquipment?.uid.startsWith('temp_')}
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
                variant="outline"
                onClick={handleEdit}
                className="flex-1"
                size="lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Equipment
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}