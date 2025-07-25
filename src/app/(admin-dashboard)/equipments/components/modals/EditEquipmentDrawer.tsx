"use client";

import { useState, useRef, useEffect, useMemo, memo, useCallback } from "react";
import { format } from "date-fns";
import { useUpdateEquipmentAction, useEquipmentsWithReferenceData } from "@/hooks/useEquipmentsQuery";
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
  type Equipment,
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
  const { projects, equipments } = useEquipmentsWithReferenceData();
  
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
  const updateEquipmentMutation = useUpdateEquipmentAction();
  
  // Form reference for resetting
  const formRef = useRef<HTMLFormElement>(null);
  
  // Focus preservation refs
  const brandInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const plateNumberInputRef = useRef<HTMLInputElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const remarksInputRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedInput = useRef<string | null>(null);
  
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

      // Initialize parts structure - handle legacy format properly like EquipmentPartsViewer
      try {
        const rawParts = selectedEquipment.equipmentParts;
        let parsedParts: PartsStructure;
        
        if (!rawParts) {
          parsedParts = { rootFiles: [], folders: [] };
        } else if (typeof rawParts === 'string') {
          try {
            const parsed = JSON.parse(rawParts);
            if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
              // Modern format - ensure proper structure
              parsedParts = {
                rootFiles: Array.isArray(parsed.rootFiles) ? parsed.rootFiles.map((file: any, index: number) => {
                  // If the file has a preview URL (from existing data), use it
                  if (file.preview && typeof file.preview === 'string') {
                    const fileName = file.name || file.preview.split('/').pop() || `image_${index}`;
                    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
                    const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
                    
                    return {
                      id: file.id || `existing_${index}`,
                      name: fileName,
                      file: new File([''], fileName, { type: mimeType }),
                      preview: file.preview // Keep existing preview URL
                    };
                  }
                  return file;
                }) : [],
                folders: Array.isArray(parsed.folders) ? parsed.folders.map((folder: any) => ({
                  ...folder,
                  files: Array.isArray(folder.files) ? folder.files.map((file: any, index: number) => {
                    if (file.preview && typeof file.preview === 'string') {
                      const fileName = file.name || file.preview.split('/').pop() || `image_${index}`;
                      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
                      const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
                      
                      return {
                        id: file.id || `existing_${index}`,
                        name: fileName,
                        file: new File([''], fileName, { type: mimeType }),
                        preview: file.preview
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
        } else if (Array.isArray(rawParts)) {
          // Legacy format: array of URLs - convert to root files
          parsedParts = {
            rootFiles: rawParts.map((url, index) => {
              const fileName = url.split('/').pop() || `image_${index}`;
              const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
              const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
              
              return {
                id: `legacy_${index}`,
                name: fileName,
                file: new File([''], fileName, { type: mimeType }),
                preview: url // Use the existing URL as preview for legacy files
              };
            }),
            folders: []
          };
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
        console.error('Failed to parse equipment parts:', error);
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

      // Reset files state to ensure form is clean
      setFiles({
        equipmentImage: null,
        thirdpartyInspection: null,
        pgpcInspection: null,
        originalReceipt: null,
        equipmentRegistration: null,
      });

      // Reset tab to details when switching equipment
      setActiveTab('details');
    }
  }, [selectedEquipment?.uid]); // Only depend on the UID to prevent excessive re-runs

  // Focus restoration effect - restore focus after re-renders
  useEffect(() => {
    if (lastFocusedInput.current) {
      const inputRefs = {
        brand: brandInputRef,
        model: modelInputRef,
        plateNumber: plateNumberInputRef,
        owner: ownerInputRef,
        before: beforeInputRef,
        remarks: remarksInputRef
      };
      
      const targetRef = inputRefs[lastFocusedInput.current as keyof typeof inputRefs];
      if (targetRef?.current) {
        // Use setTimeout to ensure the input is rendered
        setTimeout(() => {
          targetRef.current?.focus();
        }, 0);
      }
    }
  }, [formData]); // Run after form data changes

  // REMOVED: Problematic cache sync useEffect that was causing focus issues
  // We'll rely on the onSuccess callback in the mutation to update the store
  
  // Stable file change handlers using useCallback
  const handleEquipmentImageChange = useCallback((file: File | null) => {
    setFiles(prev => ({ ...prev, equipmentImage: file }));
  }, []);
  
  const handleThirdpartyInspectionChange = useCallback((file: File | null) => {
    setFiles(prev => ({ ...prev, thirdpartyInspection: file }));
  }, []);
  
  const handlePgpcInspectionChange = useCallback((file: File | null) => {
    setFiles(prev => ({ ...prev, pgpcInspection: file }));
  }, []);
  
  const handleOriginalReceiptChange = useCallback((file: File | null) => {
    setFiles(prev => ({ ...prev, originalReceipt: file }));
  }, []);
  
  const handleEquipmentRegistrationChange = useCallback((file: File | null) => {
    setFiles(prev => ({ ...prev, equipmentRegistration: file }));
  }, []);

  // Create stable onChange handlers using useCallback to prevent focus loss
  const handleBrandChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    lastFocusedInput.current = 'brand';
    setFormData(prev => ({ ...prev, brand: e.target.value }));
  }, []);
  
  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    lastFocusedInput.current = 'model';
    setFormData(prev => ({ ...prev, model: e.target.value }));
  }, []);
  
  const handlePlateNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    lastFocusedInput.current = 'plateNumber';
    setFormData(prev => ({ ...prev, plateNumber: e.target.value }));
  }, []);
  
  const handleOwnerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    lastFocusedInput.current = 'owner';
    setFormData(prev => ({ ...prev, owner: e.target.value }));
  }, []);
  
  const handleTypeChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, type: value }));
  }, []);
  
  const handleProjectChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, projectId: value }));
  }, []);
  
  const handleStatusChange = useCallback((value: 'OPERATIONAL' | 'NON_OPERATIONAL') => {
    setFormData(prev => ({ ...prev, status: value }));
  }, []);
  
  const handleBeforeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    lastFocusedInput.current = 'before';
    setFormData(prev => ({ ...prev, before: e.target.value }));
  }, []);
  
  const handleRemarksChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    lastFocusedInput.current = 'remarks';
    setFormData(prev => ({ ...prev, remarks: e.target.value }));
  }, []);
  
  // Stable date picker handlers
  const handleInspectionDateChange = useCallback((date: Date | undefined) => {
    setFormData(prev => ({ ...prev, inspectionDate: date || new Date() }));
    setInspectionDateOpen(false);
  }, []);
  
  const handleInsuranceDateChange = useCallback((date: Date | undefined) => {
    setFormData(prev => ({ ...prev, insuranceExpirationDate: date }));
    setInsuranceDateOpen(false);
  }, []);
  
  // Stable tab handlers
  const handleDetailsTabClick = useCallback(() => setActiveTab('details'), []);
  const handleImagesTabClick = useCallback(() => setActiveTab('images'), []);
  const handleDocumentsTabClick = useCallback(() => setActiveTab('documents'), []);
  const handlePartsTabClick = useCallback(() => setActiveTab('parts'), []);

  // Stable counting functions using useCallback to prevent re-renders
  const getImagesCount = useCallback(() => {
    let count = 0;
    if (selectedEquipment?.image_url && !removedFiles.equipmentImage) count++;
    if (selectedEquipment?.thirdpartyInspectionImage && !removedFiles.thirdpartyInspection) count++;
    if (selectedEquipment?.pgpcInspectionImage && !removedFiles.pgpcInspection) count++;
    if (files.equipmentImage) count++;
    if (files.thirdpartyInspection) count++;
    if (files.pgpcInspection) count++;
    return count;
  }, [selectedEquipment?.image_url, selectedEquipment?.thirdpartyInspectionImage, selectedEquipment?.pgpcInspectionImage, removedFiles.equipmentImage, removedFiles.thirdpartyInspection, removedFiles.pgpcInspection, files.equipmentImage, files.thirdpartyInspection, files.pgpcInspection]);

  const getDocumentsCount = useCallback(() => {
    let count = 0;
    if (selectedEquipment?.originalReceiptUrl && !removedFiles.originalReceipt) count++;
    if (selectedEquipment?.equipmentRegistrationUrl && !removedFiles.equipmentRegistration) count++;
    if (files.originalReceipt) count++;
    if (files.equipmentRegistration) count++;
    return count;
  }, [selectedEquipment?.originalReceiptUrl, selectedEquipment?.equipmentRegistrationUrl, removedFiles.originalReceipt, removedFiles.equipmentRegistration, files.originalReceipt, files.equipmentRegistration]);

  const getEquipmentPartsCount = useCallback(() => {
    const rootCount = partsStructure.rootFiles?.length || 0;
    const folderCount = partsStructure.folders?.reduce((acc, folder) => acc + (folder.files?.length || 0), 0) || 0;
    return rootCount + folderCount;
  }, [partsStructure.rootFiles, partsStructure.folders]);

  // Stable file removal handlers using useCallback
  const handleEquipmentImageRemove = useCallback(() => {
    setRemovedFiles(prev => ({ ...prev, equipmentImage: true }));
    setFiles(prev => ({ ...prev, equipmentImage: null }));
  }, []);

  const handleThirdpartyInspectionRemove = useCallback(() => {
    setRemovedFiles(prev => ({ ...prev, thirdpartyInspection: true }));
    setFiles(prev => ({ ...prev, thirdpartyInspection: null }));
  }, []);

  const handlePgpcInspectionRemove = useCallback(() => {
    setRemovedFiles(prev => ({ ...prev, pgpcInspection: true }));
    setFiles(prev => ({ ...prev, pgpcInspection: null }));
  }, []);

  const handleOriginalReceiptRemove = useCallback(() => {
    setRemovedFiles(prev => ({ ...prev, originalReceipt: true }));
    setFiles(prev => ({ ...prev, originalReceipt: null }));
  }, []);

  const handleEquipmentRegistrationRemove = useCallback(() => {
    setRemovedFiles(prev => ({ ...prev, equipmentRegistration: true }));
    setFiles(prev => ({ ...prev, equipmentRegistration: null }));
  }, []);

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
    
    const formDataFromForm = new FormData(e.currentTarget);
    
    // Client-side validation before submission
    console.log("Client-side validation:", {
      brand: formData.brand || 'MISSING',
      model: formData.model || 'MISSING',
      type: formData.type || 'MISSING',
      owner: formData.owner || 'MISSING',
      projectId: formData.projectId || 'MISSING'
    });

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
    
    // Add equipment ID for update
    formDataFromForm.append('equipmentId', selectedEquipment.uid);
    
    // Add all the files to formData
    Object.entries(files).forEach(([key, file]) => {
      if (file) {
        formDataFromForm.append(key, file);
      }
    });

    // Add parts structure data
    formDataFromForm.append('partsStructure', JSON.stringify(partsStructure));
    
    // Add all parts files to formData with folder information
    partsStructure.rootFiles.forEach((partFile, index) => {
      if (partFile.file && partFile.file.size > 0) {
        formDataFromForm.append(`partsFile_root_${index}`, partFile.file);
        formDataFromForm.append(`partsFile_root_${index}_name`, partFile.name);
      }
    });

    partsStructure.folders.forEach((folder, folderIndex) => {
      folder.files.forEach((partFile, fileIndex) => {
        if (partFile.file && partFile.file.size > 0) {
          formDataFromForm.append(`partsFile_folder_${folderIndex}_${fileIndex}`, partFile.file);
          formDataFromForm.append(`partsFile_folder_${folderIndex}_${fileIndex}_name`, partFile.name);
          formDataFromForm.append(`partsFile_folder_${folderIndex}_${fileIndex}_folder`, folder.name);
        }
      });
    });
    
    // Add all form field values to formData
    formDataFromForm.append('brand', formData.brand);
    formDataFromForm.append('model', formData.model);
    formDataFromForm.append('plateNumber', formData.plateNumber);
    formDataFromForm.append('owner', formData.owner);
    formDataFromForm.append('remarks', formData.remarks);
    formDataFromForm.append('type', formData.type);
    formDataFromForm.append('projectId', formData.projectId);
    formDataFromForm.append('status', formData.status);
    formDataFromForm.append('before', formData.before);
    
    // Add date values to formData
    if (formData.inspectionDate) {
      formDataFromForm.append('inspectionDate', format(formData.inspectionDate, 'yyyy-MM-dd'));
    }
    if (formData.insuranceExpirationDate) {
      formDataFromForm.append('insuranceExpirationDate', format(formData.insuranceExpirationDate, 'yyyy-MM-dd'));
    }
    
    // Use fast mutation with optimistic updates
    updateEquipmentMutation.mutate(formDataFromForm, {
      onSuccess: (result) => {
        // Show success toast
        toast.success(`Equipment "${formData.brand} ${formData.model}" updated successfully!`);
        
        // CRITICAL FIX: Update the selected equipment in Zustand store with fresh data
        // This ensures that when user reopens edit mode, they see the updated data
        if (result?.equipment && selectedEquipment) {
          // Transform the result to match our Equipment interface
          const updatedEquipment: Equipment = {
            uid: result.equipment.id || selectedEquipment.uid,
            brand: result.equipment.brand || selectedEquipment.brand,
            model: result.equipment.model || selectedEquipment.model,
            type: result.equipment.type || selectedEquipment.type,
            insuranceExpirationDate: result.equipment.insurance_expiration_date || selectedEquipment.insuranceExpirationDate,
            before: result.equipment.before?.toString() || selectedEquipment.before,
            status: result.equipment.status || selectedEquipment.status,
            remarks: result.equipment.remarks || selectedEquipment.remarks,
            owner: result.equipment.owner || selectedEquipment.owner,
            image_url: result.equipment.image_url || selectedEquipment.image_url,
            inspectionDate: result.equipment.inspection_date || selectedEquipment.inspectionDate,
            plateNumber: result.equipment.plate_number || selectedEquipment.plateNumber,
            originalReceiptUrl: result.equipment.original_receipt_url || selectedEquipment.originalReceiptUrl,
            equipmentRegistrationUrl: result.equipment.equipment_registration_url || selectedEquipment.equipmentRegistrationUrl,
            thirdpartyInspectionImage: result.equipment.thirdparty_inspection_image || selectedEquipment.thirdpartyInspectionImage,
            pgpcInspectionImage: result.equipment.pgpc_inspection_image || selectedEquipment.pgpcInspectionImage,
            equipmentParts: result.equipment.equipment_parts || selectedEquipment.equipmentParts,
            project: result.equipment.project || selectedEquipment.project,
          };
          
          // Update the selected equipment in Zustand store
          setSelectedEquipment(updatedEquipment);
        }
        
        // Return to view mode
        setIsEditMode(false);
        setIsModalOpen(true);
      },
      onError: (error) => {
        // Error toast is already handled by the mutation hook
        console.error("Equipment update failed:", error);
      }
    });
  };

  if (!selectedEquipment) return null;


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

  const ModalContent = useMemo(() => (
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
              onClick={handleDetailsTabClick}
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
              onClick={handleImagesTabClick}
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
              onClick={handleDocumentsTabClick}
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
                handlePartsTabClick();
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
                      onChange={handleBrandChange}
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
                      onChange={handleModelChange}
                      placeholder="Enter equipment model"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Equipment Type *</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={handleTypeChange}
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
                      onChange={handlePlateNumberChange}
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
                      onChange={handleOwnerChange}
                      placeholder="Enter equipment owner"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectId">Assigned Project *</Label>
                    <Select 
                      value={formData.projectId} 
                      onValueChange={handleProjectChange}
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
                      onValueChange={handleStatusChange}
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
                      onChange={handleBeforeChange}
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
                          onSelect={handleInspectionDateChange}
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
                          onSelect={handleInsuranceDateChange}
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
                  onChange={handleRemarksChange}
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
                      onRemove={handleEquipmentImageRemove}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Equipment Image"
                      selectedFile={files.equipmentImage}
                      onFileChange={handleEquipmentImageChange}
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
                      onRemove={handleThirdpartyInspectionRemove}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Third-party Inspection"
                      selectedFile={files.thirdpartyInspection}
                      onFileChange={handleThirdpartyInspectionChange}
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
                      onRemove={handlePgpcInspectionRemove}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="PGPC Inspection"
                      selectedFile={files.pgpcInspection}
                      onFileChange={handlePgpcInspectionChange}
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
                      onRemove={handleOriginalReceiptRemove}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Original Receipt (OR)"
                      selectedFile={files.originalReceipt}
                      onFileChange={handleOriginalReceiptChange}
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
                      onRemove={handleEquipmentRegistrationRemove}
                    />
                  ) : (
                    <FileUploadSectionSimple
                      label="Equipment Registration"
                      selectedFile={files.equipmentRegistration}
                      onFileChange={handleEquipmentRegistrationChange}
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipment Parts Management {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload and organize equipment parts documentation in folders. This helps with maintenance planning and parts ordering.
              </p>
            </CardHeader>
            <CardContent>
              <PartsFolderManager 
                key={selectedEquipment?.uid || 'new'} // Force re-mount when equipment changes
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
    formData, 
    files, 
    removedFiles, 
    partsStructure, 
    selectedEquipment,
    inspectionDateOpen,
    insuranceDateOpen,
    projects,
    // Include all the handlers to ensure they're stable
    handleBrandChange,
    handleModelChange,
    handlePlateNumberChange,
    handleOwnerChange,
    handleTypeChange,
    handleProjectChange,
    handleStatusChange,
    handleBeforeChange,
    handleRemarksChange,
    handleInspectionDateChange,
    handleInsuranceDateChange,
    handleDetailsTabClick,
    handleImagesTabClick,
    handleDocumentsTabClick,
    handlePartsTabClick,
    handleEquipmentImageChange,
    handleThirdpartyInspectionChange,
    handlePgpcInspectionChange,
    handleOriginalReceiptChange,
    handleEquipmentRegistrationChange,
    handleEquipmentImageRemove,
    handleThirdpartyInspectionRemove,
    handlePgpcInspectionRemove,
    handleOriginalReceiptRemove,
    handleEquipmentRegistrationRemove,
    getImagesCount,
    getDocumentsCount,
    getEquipmentPartsCount,
    setPartsStructure
  ]);

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