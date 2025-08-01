"use client";

import React from "react";
import { flushSync } from "react-dom";
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
import { useEquipmentMaintenanceReports } from "@/hooks/useEquipmentQuery";
import { useProjects } from "@/hooks/api/use-projects";
import { useUsers } from "@/hooks/useUsersQuery";
import {
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectSelectedEquipment,
  selectActiveModal,
  useEquipmentStore,
} from "@/stores/equipmentStore";
// Removed old equipmentsStore import
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
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import EquipmentFormErrorBoundary from "@/components/error-boundary/EquipmentFormErrorBoundary";

export default function EquipmentModalModern() {
  // Server state from TanStack Query
  const { data: equipmentsResponse } = useEquipments();
  const equipments = equipmentsResponse || [];
  const { data: projectsData } = useProjects();
  const { data: maintenanceReports = [] } = useEquipmentMaintenanceReports();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const projects = projectsData?.data || [];
  const users = usersData?.data || [];

  // Client state from Zustand
  const selectedEquipmentFromStore = useEquipmentStore(selectSelectedEquipment);
  const isModalOpen = useEquipmentStore(selectIsModalOpen);
  const isEditMode = useEquipmentStore(selectIsEditMode);
  const isMobile = useEquipmentStore(selectIsMobile);
  const activeModal = useEquipmentStore(selectActiveModal);

  // Add maintenance report detail state for mutual exclusion
  const isMaintenanceReportDetailOpen = useEquipmentStore((state) => state.isMaintenanceReportDetailOpen);

  // Custom tab state - EXACTLY like CreateEquipmentForm with Images and Documents tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts' | 'maintenance'>('details');

  // Global edit mode state
  const [isGlobalEditMode, setIsGlobalEditMode] = useState(false);
  
  // SUPER SIMPLE: Just track uploaded files and removals (following REALTIME_PATTERN.md)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [removedFiles, setRemovedFiles] = useState<Set<string>>(new Set());
  
  // Parts deletion tracking - similar to removedFiles for images/documents
  const [deletedParts, setDeletedParts] = useState<{
    files: Array<{ fileId: string; folderPath?: string; fileName: string; fileUrl?: string }>,
    folders: Array<{ folderPath: string; folderName: string }>
  }>({ files: [], folders: [] });
  
  // DIRTY STATE TRACKING: Track which fields have been modified
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  
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
  
  // Date picker open states
  const [inspectionDateOpen, setInspectionDateOpen] = useState(false);
  const [registrationExpiryOpen, setRegistrationExpiryOpen] = useState(false);
  const [insuranceExpiryOpen, setInsuranceExpiryOpen] = useState(false);
  
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
  // Always prioritize fresh data from equipments array over store data
  const selectedEquipment = useMemo(() => {
    if (!selectedEquipmentFromStore) return null;
    
    // Always try to get the latest data from the equipments array first
    const freshEquipment = equipments.find((e) => e.id === selectedEquipmentFromStore.id);
    if (freshEquipment) {
      return freshEquipment;
    }
    
    // Fallback to store data if not found in array (shouldn't happen after successful updates)
    return selectedEquipmentFromStore;
  }, [selectedEquipmentFromStore?.id, equipments]);

  // Initialize equipment parts when entering edit mode
  useEffect(() => {
    const equipmentParts = (selectedEquipment as any)?.parts_data || (selectedEquipment as any)?.equipment_parts || (selectedEquipment as any)?.equipmentParts;
    if (isGlobalEditMode && equipmentParts) {
      // Parse the equipment_parts from the database format
      try {
        let parsedParts: any = equipmentParts;
        
        // Handle array with JSON string format
        if (Array.isArray(parsedParts) && parsedParts.length > 0 && typeof parsedParts[0] === 'string') {
          try {
            parsedParts = JSON.parse(parsedParts[0]);
          } catch (error) {
            console.warn('Failed to parse equipment parts JSON from array:', error);
            parsedParts = { rootFiles: [], folders: [] };
          }
        }
        
        // Handle string format
        if (typeof parsedParts === 'string') {
          try {
            parsedParts = JSON.parse(parsedParts);
          } catch (error) {
            console.warn('Failed to parse equipment parts JSON from string:', error);
            parsedParts = { rootFiles: [], folders: [] };
          }
        }
        
        // Initialize parts structure if it exists
        if (parsedParts && typeof parsedParts === 'object') {
          const initialData: PartsStructure = {
            rootFiles: Array.isArray(parsedParts.rootFiles) ? parsedParts.rootFiles.map((file: any) => ({
              id: file.id || `file-${Date.now()}-${Math.random()}`,
              name: file.name || 'Unknown file',
              url: file.url || file.preview,
              preview: file.preview || file.url, // CRITICAL FIX: Ensure preview is always set
              type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document')
            })) : [],
            folders: Array.isArray(parsedParts.folders) ? parsedParts.folders.map((folder: any) => ({
              id: folder.id || `folder-${Date.now()}-${Math.random()}`,
              name: folder.name,
              files: Array.isArray(folder.files) ? folder.files.map((file: any) => ({
                id: file.id || `file-${Date.now()}-${Math.random()}`,
                name: file.name || 'Unknown file',
                url: file.url || file.preview,
                preview: file.preview || file.url, // CRITICAL FIX: Ensure preview is always set
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
  }, [isGlobalEditMode, (selectedEquipment as any)?.parts_data, (selectedEquipment as any)?.equipment_parts, (selectedEquipment as any)?.equipmentParts]);

  // Initialize form data when entering edit mode - using ref to prevent re-renders
  useEffect(() => {
    const equipmentId = (selectedEquipment as any)?.id || (selectedEquipment as any)?.id;
    if (isGlobalEditMode && equipmentId && selectedEquipment) {
      editFormDataRef.current = {
        brand: selectedEquipment.brand || '',
        model: selectedEquipment.model || '',
        type: selectedEquipment.type || '',
        plate_number: (selectedEquipment as any).plate_number || (selectedEquipment as any).plate_number || '',
        owner: selectedEquipment.owner || '',
        status: selectedEquipment.status || 'OPERATIONAL',
        remarks: selectedEquipment.remarks || '',
        project_id: (selectedEquipment as any).project_id || (selectedEquipment as any).project?.id || '',
        before: typeof selectedEquipment.before === 'string' ? parseInt(selectedEquipment.before) || 6 : selectedEquipment.before || 6,
        inspection_date: (selectedEquipment as any).inspection_date || (selectedEquipment as any).inspectionDate ? new Date((selectedEquipment as any).inspection_date || (selectedEquipment as any).inspectionDate) : undefined,
        registration_expiry: (selectedEquipment as any).registration_expiry || (selectedEquipment as any).registration_expiry ? new Date((selectedEquipment as any).registration_expiry || (selectedEquipment as any).registration_expiry) : undefined,
        insurance_expiration_date: (selectedEquipment as any).insurance_expiration_date || (selectedEquipment as any).insurance_expiration_date ? new Date((selectedEquipment as any).insurance_expiration_date || (selectedEquipment as any).insurance_expiration_date) : undefined,
        created_by: (selectedEquipment as any).created_by || (selectedEquipment as any).created_at || ''
      };
      forceUpdate({}); // Single re-render to update input values
    }
  }, [isGlobalEditMode, (selectedEquipment as any)?.id, (selectedEquipment as any)?.id]); // Only depend on ID to prevent constant re-renders
  
  // Update mutation - declared before callbacks that use it
  const updateEquipmentMutation = useUpdateEquipment();

  // CRITICAL FIX: Update form data via ref without causing re-renders
  const handleFieldChange = useCallback((field: string, value: any) => {
    // DIRTY STATE: Mark field as dirty
    setDirtyFields(prev => new Set([...prev, field]));
    
    editFormDataRef.current = { ...editFormDataRef.current, [field]: value };
    // Trigger re-render for date fields to update UI immediately
    if (field === 'inspection_date' || field === 'registration_expiry' || field === 'insurance_expiration_date') {
      forceUpdate({});
    }
  }, []); // No dependencies - function is stable
  
  // Handle form submission - using ref to avoid editFormData dependency and prevent re-renders
  const handleSaveChanges = useCallback(async () => {
    if (!selectedEquipment) return;
    
    // Safety check: Warn if user is removing all files
    const allFileFields = ['image_url', 'thirdparty_inspection_image', 'pgpc_inspection_image', 'original_receipt_url', 'equipment_registration_url'];
    const hasExistingFiles = allFileFields.some(field => {
      const url = selectedEquipment[field as keyof typeof selectedEquipment] as string;
      return url && !removedFiles.has(field);
    });
    const hasNewFiles = Object.keys(uploadedFiles).some(field => 
      allFileFields.includes(field) && uploadedFiles[field]
    );
    
    if (!hasExistingFiles && !hasNewFiles && removedFiles.size > 0) {
      const confirmRemoveAll = window.confirm(
        'You are about to remove all files from this equipment. This action cannot be undone. Are you sure you want to continue?'
      );
      if (!confirmRemoveAll) {
        return;
      }
    }
    
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
      
      // PERFORMANCE OPTIMIZATION: Only send dirty fields and files that have changes
      const hasFormChanges = dirtyFields.size > 0;
      const hasFileChanges = Object.keys(uploadedFiles).length > 0 || removedFiles.size > 0;
      const hasPartsChanges = isGlobalEditMode || deletedParts.files.length > 0 || deletedParts.folders.length > 0; // Parts changes are tracked by edit mode state and deletions
      
      console.log('🔍 Save Changes Debug:', {
        hasFormChanges,
        hasFileChanges, 
        hasPartsChanges,
        dirtyFieldsCount: dirtyFields.size,
        uploadedFilesCount: Object.keys(uploadedFiles).length,
        removedFilesCount: removedFiles.size,
        deletedPartsFilesCount: deletedParts.files.length,
        deletedPartsFoldersCount: deletedParts.folders.length,
        dirtyFields: Array.from(dirtyFields),
        uploadedFileKeys: Object.keys(uploadedFiles),
        removedFileKeys: Array.from(removedFiles),
        deletedPartsFiles: deletedParts.files,
        deletedPartsFolders: deletedParts.folders
      });
      
      if (!hasFormChanges && !hasFileChanges && !hasPartsChanges) {
        toast.info('No changes to save');
        return;
      }
      
      // CRITICAL FIX: Always include required fields, then add any dirty fields
      const alwaysRequiredFields = ['brand', 'model', 'type', 'owner', 'project_id'];
      
      // Always add equipmentId first (required by API)
      const equipmentId = (selectedEquipment as any).id || (selectedEquipment as any).id;
      formData.append('equipmentId', equipmentId);
      console.log('✅ Added equipmentId:', equipmentId);
      
      // Always add required fields to prevent "Missing required fields" error
      alwaysRequiredFields.forEach(fieldName => {
        const value = currentFormData[fieldName as keyof typeof currentFormData];
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            formData.append(fieldName, value.toISOString().split('T')[0]);
          } else {
            formData.append(fieldName, value.toString());
          }
          console.log(`✅ Added required field ${fieldName}:`, value);
        } else {
          console.warn(`⚠️ Required field ${fieldName} is missing or null:`, value);
        }
      });
      
      // Add any additional dirty fields that aren't already included
      if (hasFormChanges) {
        Object.entries(currentFormData).forEach(([key, value]) => {
          // Only include fields that were actually changed and aren't required fields (already added above)
          if (dirtyFields.has(key) && !alwaysRequiredFields.includes(key) && value !== undefined && value !== null) {
            if (value instanceof Date) {
              formData.append(key, value.toISOString().split('T')[0]);
            } else {
              formData.append(key, value.toString());
            }
          }
        });
      }
      
      // SUPER SIMPLE: Send uploaded files and removals (following REALTIME_PATTERN.md)
      Object.entries(uploadedFiles).forEach(([fieldName, file]) => {
        const apiFieldMap: Record<string, string> = {
          'image_url': 'equipmentImage',
          'original_receipt_url': 'originalReceipt',
          'equipment_registration_url': 'equipmentRegistration',
          'thirdparty_inspection_image': 'thirdpartyInspection',
          'pgpc_inspection_image': 'pgpcInspection',
        };
        
        const apiFieldName = apiFieldMap[fieldName] || fieldName;
        formData.append(apiFieldName, file);
      });
      
      // Send removed files to API with validation - UPDATED to handle both images and documents
      if (removedFiles.size > 0) {
        const removedFilesArray = Array.from(removedFiles);
        console.log(`📄 Sending removal request for fields:`, removedFilesArray);
        
        // Separate image and document removals for the API
        const validImageFields = ['image_url', 'thirdparty_inspection_image', 'pgpc_inspection_image'];
        const validDocumentFields = ['original_receipt_url', 'equipment_registration_url'];
        
        const imageRemovals = removedFilesArray.filter(field => validImageFields.includes(field));
        const documentRemovals = removedFilesArray.filter(field => validDocumentFields.includes(field));
        const invalidFields = removedFilesArray.filter(field => 
          !validImageFields.includes(field) && !validDocumentFields.includes(field)
        );
        
        if (invalidFields.length > 0) {
          console.warn(`⚠️ Invalid fields in removal request:`, invalidFields);
        }
        
        // Send image removals (existing API)
        if (imageRemovals.length > 0) {
          formData.append('removedImages', JSON.stringify(imageRemovals));
          console.log(`✅ Valid image removals to process:`, imageRemovals);
        }
        
        // Send document removals (new - same format as images for consistency)
        if (documentRemovals.length > 0) {
          formData.append('removedDocuments', JSON.stringify(documentRemovals));
          console.log(`✅ Valid document removals to process:`, documentRemovals);
        }
      }
      
      // Send parts deletion requests to API - similar to removedImages/removedDocuments
      if (deletedParts.files.length > 0 || deletedParts.folders.length > 0) {
        const deletePartsPayload = {
          files: deletedParts.files,
          folders: deletedParts.folders
        };
        formData.append('deleteParts', JSON.stringify(deletePartsPayload));
      }
      
      // CRITICAL FIX: Convert equipment parts and extract File objects for upload
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
        
        // CRITICAL FIX: Extract and append actual File objects from partsStructure
        // This is what was missing - the API expects partsFile_* FormData entries
        
        // Add root files to FormData
        partsStructure.rootFiles.forEach((partFile, index) => {
          if (partFile.file && partFile.file.size > 0) {
            formData.append(`partsFile_root_${index}`, partFile.file);
            formData.append(`partsFile_root_${index}_name`, partFile.name);
            console.log(`📁 Added root parts file ${index}: ${partFile.name}`);
          }
        });
        
        // Add folder files to FormData
        partsStructure.folders.forEach((folder, folderIndex) => {
          folder.files.forEach((partFile, fileIndex) => {
            if (partFile.file && partFile.file.size > 0) {
              formData.append(`partsFile_folder_${folderIndex}_${fileIndex}`, partFile.file);
              formData.append(`partsFile_folder_${folderIndex}_${fileIndex}_name`, partFile.name);
              formData.append(`partsFile_folder_${folderIndex}_${fileIndex}_folder`, folder.name);
              console.log(`📁 Added folder parts file ${folderIndex}/${fileIndex}: ${partFile.name} in folder: ${folder.name}`);
            }
          });
        });
      }
      
      const updatedEquipment = await updateEquipmentMutation.mutateAsync(formData);
      
      console.log('🔄 Updating selectedEquipment with fresh server data:', updatedEquipment);
      console.log('📸 New image URLs:', {
        image_url: updatedEquipment.image_url,
        thirdparty_inspection_image: updatedEquipment.thirdparty_inspection_image,
        pgpc_inspection_image: updatedEquipment.pgpc_inspection_image
      });
      
      // CRITICAL FIX: Update parts structure with fresh server data to prevent duplicates
      if (updatedEquipment.equipment_parts && isGlobalEditMode) {
        try {
          let parsedParts: any = updatedEquipment.equipment_parts;
          
          // Handle array with JSON string format
          if (Array.isArray(parsedParts) && parsedParts.length > 0 && typeof parsedParts[0] === 'string') {
            try {
              parsedParts = JSON.parse(parsedParts[0]);
            } catch (error) {
              console.warn('Failed to parse equipment parts JSON from array:', error);
              parsedParts = { rootFiles: [], folders: [] };
            }
          }
          
          // Handle string format
          if (typeof parsedParts === 'string') {
            try {
              parsedParts = JSON.parse(parsedParts);
            } catch (error) {
              console.warn('Failed to parse equipment parts JSON from string:', error);
              parsedParts = { rootFiles: [], folders: [] };
            }
          }
          
          if (parsedParts && typeof parsedParts === 'object') {
            const updatedPartsStructure: PartsStructure = {
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
            
            console.log('🔄 Updating partsStructure with server data (no deduplication needed):', updatedPartsStructure);
            
            // Clean up old blob URLs before updating with server data
            cleanupBlobUrls(partsStructure);
            
            // Use server data directly - no deduplication needed since server data is already clean
            setPartsStructure(updatedPartsStructure);
          }
        } catch (error) {
          console.warn('Error parsing updated equipment parts:', error);
        }
      }
      
      // ANTI-FLICKER FIX: Update selectedEquipment first, then clear state synchronously
      // This prevents the preview from briefly showing old URLs
      console.log('🔄 BEFORE setSelectedEquipment - Current:', selectedEquipment?.image_url);
      console.log('🔄 BEFORE setSelectedEquipment - New:', updatedEquipment.image_url);
      
      // Force synchronous update to prevent flicker
      flushSync(() => {
        setSelectedEquipment(updatedEquipment as any);
      });
      
      // Then clear the upload state
      setIsGlobalEditMode(false);
      setUploadedFiles({});
      setRemovedFiles(new Set());
      setDeletedParts({ files: [], folders: [] }); // Clear parts deletions after successful save
      setDirtyFields(new Set()); // Clear dirty state after successful save
      
      console.log('✅ Updated selectedEquipment synchronously and cleared upload state');
      console.log('🧹 Anti-flicker sync update completed');
      // Note: Success toast is handled by useUpdateEquipment hook
    } catch (error) {
      console.error('Failed to update equipment:', error);
      toast.error('Failed to update equipment. Please try again.');
    }
  }, [selectedEquipment, updateEquipmentMutation, setIsGlobalEditMode, isGlobalEditMode, partsStructure, dirtyFields, deletedParts]); // Added dirtyFields and deletedParts dependencies

  // Actions
  const {
    setIsModalOpen,
    setIsMaintenanceModalOpen,
    setIsEditMode,
    setSelectedEquipment,
    setDeleteConfirmation,
    setActiveModal,
  } = useEquipmentStore();
  const { 
    setSelectedMaintenanceReportForDetail,
    setSelectedEquipmentMaintenanceReport,
    setIsMaintenanceReportDetailOpen 
  } = useEquipmentStore();

  // Mutations
  const deleteEquipmentMutation = useDeleteEquipment();

  // Removed defaultValues - no longer needed with global edit approach

  // IMPROVED: Modal state cleanup with logging
  useEffect(() => {
    if (!isModalOpen) {
      console.log('🔄 Resetting modal state - modal closed');
      setActiveTab("details");
      // Reset global edit mode when modal closes
      setIsGlobalEditMode(false);
      // Clean up blob URLs before resetting
      cleanupBlobUrls(partsStructure);
      // Reset uploaded files and removals
      setUploadedFiles({});
      setRemovedFiles(new Set());
      // Reset parts deletions
      setDeletedParts({ files: [], folders: [] });
      // Reset dirty state
      setDirtyFields(new Set());
      // Reset parts structure
      setPartsStructure({ rootFiles: [], folders: [] });
    }
  }, [isModalOpen]);

  // BLOB URL CLEANUP: Clean up on component unmount
  useEffect(() => {
    return () => {
      // Clean up blob URLs when component unmounts to prevent memory leaks
      if (partsStructure.rootFiles.length > 0 || partsStructure.folders.length > 0) {
        cleanupBlobUrls(partsStructure);
      }
    };
  }, []); // Empty dependency - only cleanup on unmount
  
  // BLOB URL CLEANUP: Utility function to revoke blob URLs to prevent memory leaks
  const cleanupBlobUrls = useCallback((structure: PartsStructure) => {
    // Clean up root files
    structure.rootFiles.forEach(file => {
      if (file.preview && file.preview.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    // Clean up folder files
    structure.folders.forEach(folder => {
      folder.files.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });
    });
  }, []);

  // DEDUPLICATION: Utility function to remove duplicate files based on name and type
  const deduplicatePartsStructure = useCallback((structure: PartsStructure): PartsStructure => {
    return {
      rootFiles: structure.rootFiles.filter((file, index, array) => {
        // Keep files with Supabase URLs over blob URLs
        const duplicateIndex = array.findIndex(f => f.name === file.name);
        if (duplicateIndex !== index) {
          // If current file has blob URL and duplicate has Supabase URL, remove current
          if (file.url && file.url.startsWith('blob:') && array[duplicateIndex].url && !array[duplicateIndex].url.startsWith('blob:')) {
            return false;
          }
          // If current file has Supabase URL and duplicate has blob URL, keep current
          if (file.url && !file.url.startsWith('blob:') && array[duplicateIndex].url && array[duplicateIndex].url.startsWith('blob:')) {
            return true;
          }
        }
        return duplicateIndex === index; // Keep first occurrence
      }),
      folders: structure.folders.map(folder => ({
        ...folder,
        files: folder.files.filter((file, index, array) => {
          // Keep files with Supabase URLs over blob URLs
          const duplicateIndex = array.findIndex(f => f.name === file.name);
          if (duplicateIndex !== index) {
            // If current file has blob URL and duplicate has Supabase URL, remove current
            if (file.url && file.url.startsWith('blob:') && array[duplicateIndex].url && !array[duplicateIndex].url.startsWith('blob:')) {
              return false;
            }
            // If current file has Supabase URL and duplicate has blob URL, keep current
            if (file.url && !file.url.startsWith('blob:') && array[duplicateIndex].url && array[duplicateIndex].url.startsWith('blob:')) {
              return true;
            }
          }
          return duplicateIndex === index; // Keep first occurrence
        })
      }))
    };
  }, []);

  // Safety cleanup function
  const resetFileStates = useCallback(() => {
    console.log('🔄 Resetting file states manually');
    
    // Clean up blob URLs before resetting parts structure
    cleanupBlobUrls(partsStructure);
    
    setUploadedFiles({});
    setRemovedFiles(new Set());
    setDeletedParts({ files: [], folders: [] });
    setDirtyFields(new Set());
    
    // Reset parts structure to empty state
    setPartsStructure({ rootFiles: [], folders: [] });
  }, [partsStructure, cleanupBlobUrls]);

  // Form data is now managed by the global edit state and editFormData


  const handleClose = () => {
    console.log('🚪 Closing modal - cleaning up all states');
    setIsModalOpen(false);
    setSelectedEquipment(null);
    setIsEditMode(false);
    // Use unified modal coordination to close all modals
    setActiveModal(null);
    // Close any maintenance report modals
    setIsMaintenanceModalOpen(false);
    setIsMaintenanceReportDetailOpen(false);
    setSelectedMaintenanceReportForDetail(null);
    setSelectedEquipmentMaintenanceReport(null);
    // Reset global edit state
    setIsGlobalEditMode(false);
    // Reset upload state using safety function
    resetFileStates();
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleDelete = () => {
    const equipmentId = (selectedEquipment as any)?.id || (selectedEquipment as any)?.id;
    if (selectedEquipment && equipmentId && !equipmentId.startsWith('temp_')) {
      setDeleteConfirmation({ isOpen: true, equipment: selectedEquipment as any });
      setIsModalOpen(false); // Close main modal to show delete confirmation
    }
  };

  // Dirty tracking is no longer needed with global edit approach

  // IMPROVED: File handlers with better validation and logging - UPDATED to support documents
  const handleFileSelect = useCallback((fieldName: string, file: File | null) => {
    console.log(`📁 File selection for ${fieldName}:`, file ? `NEW FILE: ${file.name}` : 'REMOVE EXISTING');
    
    // Validate fieldName to prevent issues - UPDATED to include document fields
    const validFieldNames = [
      'image_url',
      'thirdparty_inspection_image', 
      'pgpc_inspection_image',
      'original_receipt_url',
      'equipment_registration_url'
    ];
    
    if (!validFieldNames.includes(fieldName)) {
      console.error(`❌ Invalid field name: ${fieldName}`);
      toast.error(`Invalid field name: ${fieldName}`);
      return;
    }
    
    // DIRTY STATE: Mark file changes as dirty
    setDirtyFields(prev => new Set([...prev, fieldName]));
    
    if (file) {
      // Add to uploads - will show preview immediately
      setUploadedFiles(prev => ({ ...prev, [fieldName]: file }));
      // Remove from removed list if it was there
      setRemovedFiles(prev => {
        const updated = new Set(prev);
        updated.delete(fieldName);
        console.log(`✅ Restored ${fieldName} from removal list`);
        return updated;
      });
    } else {
      // Remove from uploads and mark as removed
      setUploadedFiles(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
      setRemovedFiles(prev => {
        const updated = new Set([...prev, fieldName]);
        console.log(`🗑️ Added ${fieldName} to removal list. Total removals:`, updated.size);
        return updated;
      });
    }
  }, []);

  // Parts deletion callbacks - similar to handleFileSelect
  const handlePartFileDelete = useCallback((fileId: string, fileName: string, folderPath?: string, fileUrl?: string) => {
    setDeletedParts(prev => ({
      ...prev,
      files: [...prev.files, { fileId, fileName, folderPath, fileUrl }]
    }));
    
    // Mark as dirty to enable save button
    setDirtyFields(prev => new Set([...prev, 'equipment_parts']));
  }, []);

  const handlePartFolderDelete = useCallback((folderPath: string, folderName: string) => {
    setDeletedParts(prev => ({
      ...prev,
      folders: [...prev.folders, { folderPath, folderName }]
    }));
    
    // Mark as dirty to enable save button
    setDirtyFields(prev => new Set([...prev, 'equipment_parts']));
  }, []);

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
    if (usersLoading) return 'Loading...';
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : userId; // Show UUID as fallback instead of 'Unknown User'
  };

  if (!selectedEquipment) return null;

  // CRITICAL: Force mutual exclusion - don't render if maintenance report detail is open
  if (isMaintenanceReportDetailOpen) {
    return null;
  }

  const daysUntilExpiry = getDaysUntilExpiry((selectedEquipment as any)?.insurance_expiration_date || (selectedEquipment as any)?.insurance_expiration_date);

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
      url: (selectedEquipment as any).thirdparty_inspection_image || (selectedEquipment as any).thirdpartyInspectionImage,
      title: "Third-party Inspection",
      icon: Shield,
    },
    {
      url: (selectedEquipment as any).pgpc_inspection_image || (selectedEquipment as any).pgpcInspectionImage,
      title: "PGPC Inspection",
      icon: Shield,
    },
  ].filter(img => img.url);

  // Equipment documents (PDFs and downloadable files)
  const documents = [
    {
      url: (selectedEquipment as any).original_receipt_url || (selectedEquipment as any).originalReceiptUrl,
      title: "Original Receipt",
      icon: Receipt,
    },
    {
      url: (selectedEquipment as any).equipment_registration_url || (selectedEquipment as any).equipmentRegistrationUrl,
      title: "Equipment Registration",
      icon: FileText,
    },
  ].filter(doc => doc.url);


  // Document Viewer Component - Enhanced with preview support

  // Simple helper functions for tab counts
  const getImagesCount = () => {
    let count = 0;
    if ((selectedEquipment as any)?.image_url) count++;
    if ((selectedEquipment as any)?.thirdparty_inspection_image || (selectedEquipment as any)?.thirdpartyInspectionImage) count++;
    if ((selectedEquipment as any)?.pgpc_inspection_image || (selectedEquipment as any)?.pgpcInspectionImage) count++;
    return count;
  };
  const getDocumentsCount = () => {
    let count = 0;
    if ((selectedEquipment as any)?.original_receipt_url || (selectedEquipment as any)?.originalReceiptUrl) count++;
    if ((selectedEquipment as any)?.equipment_registration_url || (selectedEquipment as any)?.equipmentRegistrationUrl) count++;
    return count;
  };
  // Helper function to count equipment parts for selected equipment - Enhanced with better logging
  const getEquipmentPartsCount = () => {
    const equipmentParts = (selectedEquipment as any)?.parts_data || (selectedEquipment as any)?.equipment_parts || (selectedEquipment as any)?.equipmentParts;
    
    console.log('🔍 [EquipmentModal] Counting parts for:', {
      equipmentId: (selectedEquipment as any)?.id || (selectedEquipment as any)?.id,
      hasPartsData: !!equipmentParts,
      partsDataType: typeof equipmentParts,
      partsData: equipmentParts
    });
    
    if (!selectedEquipment || !equipmentParts) {
      console.log('ℹ️ [EquipmentModal] No equipment or parts data, count = 0');
      return 0;
    }
    
    // Parse equipment parts data using the same logic as EquipmentPartsViewer
    const parsePartsData = (parts: any) => {
      if (!parts) return { rootFiles: [], folders: [] };

      // Handle database format: array with JSON string (most common)
      if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === 'string') {
        try {
          const parsed = JSON.parse(parts[0]);
          if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
            return parsed;
          }
        } catch (error) {
          console.warn('⚠️ [EquipmentModal] Failed to parse array[0] as JSON:', error);
        }
      }

      // Handle string (JSON) format
      if (typeof parts === 'string') {
        try {
          const parsed = JSON.parse(parts);
          if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
            return parsed;
          }
          return { rootFiles: [parsed], folders: [] };
        } catch {
          return { rootFiles: [], folders: [] };
        }
      }

      // Handle object format
      if (typeof parts === 'object' && !Array.isArray(parts)) {
        if (parts.rootFiles && parts.folders) {
          return parts;
        }
      }

      // Handle array format - Check if first element is structured JSON
      if (Array.isArray(parts)) {
        if (parts.length === 0) {
          return { rootFiles: [], folders: [] };
        }

        // Check if first element contains structured data (JSON)
        if (parts.length === 1 && typeof parts[0] === 'string') {
          try {
            const parsed = JSON.parse(parts[0]);
            if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
              return parsed;
            }
          } catch (error) {
            // First array element is not JSON, treating as legacy URL
          }
        }

        // LEGACY: Handle old format where each element is a URL
        return { rootFiles: parts, folders: [] };
      }

      return { rootFiles: [], folders: [] };
    };

    const parsedData = parsePartsData(equipmentParts);
    
    // Count files in rootFiles array and recursively in folders
    let count = 0;
    if (Array.isArray(parsedData.rootFiles)) {
      count += parsedData.rootFiles.length;
    }
    if (Array.isArray(parsedData.folders)) {
      parsedData.folders.forEach((folder: any) => {
        if (folder && Array.isArray(folder.files)) {
          count += folder.files.length;
        }
      });
    }
    
    console.log('✅ [EquipmentModal] Parts count calculated:', {
      totalCount: count,
      rootFilesCount: parsedData.rootFiles?.length || 0,
      foldersCount: parsedData.folders?.length || 0,
      parsedData: parsedData
    });
    
    return count;
  };  
  const getMaintenanceReportsCount = () => {
    const equipmentId = (selectedEquipment as any)?.id || (selectedEquipment as any)?.id;
    if (!equipmentId || !Array.isArray(maintenanceReports)) return 0;
    return maintenanceReports.filter(report => report.equipment_id === equipmentId).length;
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
                        <Popover open={inspectionDateOpen} onOpenChange={setInspectionDateOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
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
                              onSelect={(date) => {
                                handleFieldChange('inspection_date', date);
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
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <CalendarIcon className="h-4 w-4" />
                          Registration Expiry
                        </Label>
                        <Popover open={registrationExpiryOpen} onOpenChange={setRegistrationExpiryOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
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
                              onSelect={(date) => {
                                handleFieldChange('registration_expiry', date);
                                setRegistrationExpiryOpen(false); // Auto-close after selection
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

                      <div className="space-y-2">
                        <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                          <Shield className="h-4 w-4" />
                          Insurance Expiration
                        </Label>
                        <Popover open={insuranceExpiryOpen} onOpenChange={setInsuranceExpiryOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
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
                              onSelect={(date) => {
                                handleFieldChange('insurance_expiration_date', date);
                                setInsuranceExpiryOpen(false); // Auto-close after selection
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

                      {((selectedEquipment as any).plate_number || (selectedEquipment as any).plate_number) && (
                        <div className="space-y-2">
                          <Label className={`flex items-center gap-2 ${isMobile ? 'text-xs' : ''}`}>
                            <Hash className="h-4 w-4" />
                            Plate/Serial Number
                          </Label>
                          <div className={`font-medium text-foreground font-mono ${isMobile ? 'text-sm' : ''}`}>{(selectedEquipment as any).plate_number || (selectedEquipment as any).plate_number}</div>
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

                        {((selectedEquipment as any).plate_number || (selectedEquipment as any).plate_number) && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {(selectedEquipment as any).plate_number || (selectedEquipment as any).plate_number}
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
                      {((selectedEquipment as any).registration_expiry || (selectedEquipment as any).registration_expiry) && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Registration Expires:</Label>
                          <div className={`font-medium ${
                            (() => {
                              const dateValue = (selectedEquipment as any).registration_expiry || (selectedEquipment as any).registration_expiry;
                              if (!dateValue) return "text-foreground";
                              const now = new Date();
                              const expiry = new Date(dateValue);
                              const diffTime = expiry.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return diffDays <= 0 ? "text-red-600" : diffDays <= 30 ? "text-orange-600" : "text-foreground";
                            })()
                          }`}>
                            {(() => {
                              const dateValue = (selectedEquipment as any).registration_expiry || (selectedEquipment as any).registration_expiry;
                              return dateValue ? format(new Date(dateValue), "M/d/yyyy") : "N/A";
                            })()}
                            {(() => {
                              const dateValue = (selectedEquipment as any).registration_expiry || (selectedEquipment as any).registration_expiry;
                              if (!dateValue) return null;
                              const now = new Date();
                              const expiry = new Date(dateValue);
                              const diffTime = expiry.getTime() - now.getTime();
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return diffDays <= 0 ? <span className="text-red-600 ml-2">(Expired)</span> : null;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Insurance Expires */}
                      {((selectedEquipment as any).insurance_expiration_date || (selectedEquipment as any).insurance_expiration_date) && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Insurance Expires:</Label>
                          <div className={`font-medium ${
                            daysUntilExpiry !== null && daysUntilExpiry <= 0
                              ? "text-red-600"
                              : daysUntilExpiry !== null && daysUntilExpiry <= 30
                              ? "text-orange-600"
                              : "text-foreground"
                          }`}>
                            {(() => {
                              const dateValue = (selectedEquipment as any).insurance_expiration_date || (selectedEquipment as any).insurance_expiration_date;
                              return dateValue ? format(new Date(dateValue), "M/d/yyyy") : "N/A";
                            })()}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                              <span className="text-red-600 ml-2">(Expired)</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Last Inspection */}
                      {((selectedEquipment as any).inspection_date || (selectedEquipment as any).inspectionDate) && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Last Inspection:</Label>
                          <div className="font-medium text-foreground">
                            {(() => {
                              const dateValue = (selectedEquipment as any).inspection_date || (selectedEquipment as any).inspectionDate;
                              return dateValue ? format(new Date(dateValue), "M/d/yyyy") : "N/A";
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Next Inspection Due */}
                      {((selectedEquipment as any).inspection_date || (selectedEquipment as any).inspectionDate) && selectedEquipment.before && (
                        <div className="space-y-1">
                          <Label className="text-sm font-medium text-muted-foreground">Next Inspection Due:</Label>
                          <div className="font-medium text-foreground">
                            {(() => {
                              const dateValue = (selectedEquipment as any).inspection_date || (selectedEquipment as any).inspectionDate;
                              if (!dateValue) return "N/A";
                              const lastInspection = new Date(dateValue);
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
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Equipment Images {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload clear photos of your equipment. These images help with identification, insurance claims, and maintenance records.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <EquipmentFormErrorBoundary fallback={
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600">Equipment Image upload component failed to load</p>
                    </div>
                  }>
                    <FileUploadSectionSimple
                      label="Equipment Image"
                      accept="image/*"
                      currentFileUrl={(() => {
                        const url = !removedFiles.has('image_url') ? selectedEquipment.image_url : null;
                        console.log('🖼️ [Equipment Image View] currentFileUrl:', url, 'readOnly:', !isGlobalEditMode);
                        return url;
                      })()}
                      selectedFile={uploadedFiles['image_url'] || null}
                      onFileChange={(file) => handleFileSelect('image_url', file)}
                      onKeepExistingChange={() => {}}
                      icon={<Upload className="h-4 w-4" />}
                      readOnly={!isGlobalEditMode}
                      hideChangeButton={true}
                    />
                  </EquipmentFormErrorBoundary>
                  
                  <EquipmentFormErrorBoundary fallback={
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600">Third-party Inspection upload component failed to load</p>
                    </div>
                  }>
                    <FileUploadSectionSimple
                      label="Third-party Inspection"
                      accept="image/*"
                      currentFileUrl={!removedFiles.has('thirdparty_inspection_image') ? (selectedEquipment as any).thirdparty_inspection_image || (selectedEquipment as any).thirdpartyInspectionImage : null}
                      selectedFile={uploadedFiles['thirdparty_inspection_image'] || null}
                      onFileChange={(file) => handleFileSelect('thirdparty_inspection_image', file)}
                      onKeepExistingChange={() => {}}
                      icon={<Upload className="h-4 w-4" />}
                      readOnly={!isGlobalEditMode}
                      hideChangeButton={true}
                    />
                  </EquipmentFormErrorBoundary>
                  
                  <EquipmentFormErrorBoundary fallback={
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-sm text-red-600">PGPC Inspection upload component failed to load</p>
                    </div>
                  }>
                    <FileUploadSectionSimple
                      label="PGPC Inspection"
                      accept="image/*"
                      currentFileUrl={!removedFiles.has('pgpc_inspection_image') ? (selectedEquipment as any).pgpc_inspection_image || (selectedEquipment as any).pgpcInspectionImage : null}
                      selectedFile={uploadedFiles['pgpc_inspection_image'] || null}
                      onFileChange={(file) => handleFileSelect('pgpc_inspection_image', file)}
                      onKeepExistingChange={() => {}}
                      icon={<Upload className="h-4 w-4" />}
                      readOnly={!isGlobalEditMode}
                      hideChangeButton={true}
                    />
                  </EquipmentFormErrorBoundary>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Equipment Documents {isMobile ? '' : '(Optional)'}
              </CardTitle>       
              <p className="text-sm text-muted-foreground mt-2">
                Upload official documents and certificates. These files help with compliance, registration, and maintenance records.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <EquipmentFormErrorBoundary fallback={
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <p className="text-sm text-red-600">Purchase Receipt upload component failed to load</p>
                  </div>
                }>
                  <FileUploadSectionSimple
                    label="Purchase Receipt"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    currentFileUrl={!removedFiles.has('original_receipt_url') ? (selectedEquipment as any).original_receipt_url || (selectedEquipment as any).originalReceiptUrl : null}
                    selectedFile={uploadedFiles['original_receipt_url'] || null}
                    onFileChange={(file) => handleFileSelect('original_receipt_url', file)}
                    onKeepExistingChange={() => {}}
                    icon={<Upload className="h-4 w-4" />}
                    readOnly={!isGlobalEditMode}
                    hideChangeButton={true}
                  />
                </EquipmentFormErrorBoundary>
                
                <EquipmentFormErrorBoundary fallback={
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <p className="text-sm text-red-600">Registration Document upload component failed to load</p>
                  </div>
                }>
                  <FileUploadSectionSimple
                    label="Registration Document"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    currentFileUrl={!removedFiles.has('equipment_registration_url') ? (selectedEquipment as any).equipment_registration_url || (selectedEquipment as any).equipmentRegistrationUrl : null}
                    selectedFile={uploadedFiles['equipment_registration_url'] || null}
                    onFileChange={(file) => handleFileSelect('equipment_registration_url', file)}
                    onKeepExistingChange={() => {}}
                    icon={<Upload className="h-4 w-4" />}
                    readOnly={!isGlobalEditMode}
                    hideChangeButton={true}
                  />
                </EquipmentFormErrorBoundary>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        {/* Parts Tab - EXACT COPY FROM VEHICLES WITH EDIT MODE */}
        {activeTab === 'parts' && (
          <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Equipment Parts</h3>
              <p className="text-sm text-muted-foreground">
                {isGlobalEditMode ? 
                  "Organize parts documentation in folders or upload directly to root. This creates a structured file system for easy parts management." :
                  "View and browse parts documentation organized in folders."
                }
              </p>
            </div>
            {isGlobalEditMode ? (
              <div className={`${isMobile ? 'max-h-[45vh]' : 'max-h-[50vh]'} overflow-y-auto border rounded-lg p-4 bg-muted/20`}>
                <PartsFolderManager 
                  key={(selectedEquipment as any)?.id || (selectedEquipment as any)?.id || 'edit'} 
                  onChange={setPartsStructure}
                  initialData={partsStructure}
                  onPartFileDelete={handlePartFileDelete}
                  onPartFolderDelete={handlePartFolderDelete}
                />
              </div>
            ) : (
              <EquipmentFormErrorBoundary fallback={
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <p className="text-sm text-red-600">Equipment Parts viewer failed to load</p>
                  <p className="text-xs text-red-500 mt-1">There may be an issue with the parts data format</p>
                </div>
              }>
                <EquipmentPartsViewer 
                  equipmentParts={(() => {
                    const partsData = (selectedEquipment as any).parts_data || (selectedEquipment as any).equipment_parts || (selectedEquipment as any).equipmentParts;
                    
                    console.log('🔍 [EquipmentModal] Preparing parts data for viewer:', {
                      equipmentId: (selectedEquipment as any)?.id || (selectedEquipment as any)?.id,
                      hasData: !!partsData,
                      dataType: typeof partsData,
                      rawData: partsData
                    });
                    
                    if (!partsData) {
                      console.log('ℹ️ [EquipmentModal] No parts data, returning empty structure');
                      return { rootFiles: [], folders: [] };
                    }
                    
                    if (typeof partsData === 'string') {
                      try {
                        const parsed = JSON.parse(partsData);
                        console.log('✅ [EquipmentModal] Successfully parsed string parts data:', parsed);
                        return parsed;
                      } catch (error) {
                        console.warn('⚠️ [EquipmentModal] Failed to parse equipment parts JSON:', error);
                        return { rootFiles: [], folders: [] };
                      }
                    }
                    
                    console.log('✅ [EquipmentModal] Using parts data as-is:', partsData);
                    return partsData;
                  })()}
                  isEditable={isGlobalEditMode}
                  onPartsChange={setPartsStructure}
                  onPartFileDelete={handlePartFileDelete}
                  onPartFolderDelete={handlePartFolderDelete}
                />
              </EquipmentFormErrorBoundary>
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
                equipmentId={(selectedEquipment as any).id || (selectedEquipment as any).id}
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
        <Drawer open={isModalOpen && !isMaintenanceReportDetailOpen} onOpenChange={handleClose}>
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
                      disabled={deleteEquipmentMutation.isPending || ((selectedEquipment as any)?.id || (selectedEquipment as any)?.id)?.startsWith('temp_')}
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
                        console.log('❌ Cancel button clicked - resetting states');
                        // Check if there are unsaved changes
                        if (dirtyFields.size > 0 || Object.keys(uploadedFiles).length > 0 || removedFiles.size > 0 || deletedParts.files.length > 0 || deletedParts.folders.length > 0) {
                          const confirmCancel = window.confirm(
                            'You have unsaved changes. Are you sure you want to cancel? All changes will be lost.'
                          );
                          if (!confirmCancel) {
                            return;
                          }
                        }
                        resetFileStates();
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
      <Dialog open={isModalOpen && (activeModal === 'equipment' || activeModal === null) && !isMaintenanceReportDetailOpen} onOpenChange={handleClose}>
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
                        console.log('❌ Cancel button clicked - resetting states');
                        // Check if there are unsaved changes
                        if (dirtyFields.size > 0 || Object.keys(uploadedFiles).length > 0 || removedFiles.size > 0 || deletedParts.files.length > 0 || deletedParts.folders.length > 0) {
                          const confirmCancel = window.confirm(
                            'You have unsaved changes. Are you sure you want to cancel? All changes will be lost.'
                          );
                          if (!confirmCancel) {
                            return;
                          }
                        }
                        resetFileStates();
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
                disabled={deleteEquipmentMutation.isPending || ((selectedEquipment as any)?.id || (selectedEquipment as any)?.id)?.startsWith('temp_')}
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