"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { useCreateEquipment } from "@/hooks/useEquipmentQuery";
import { useUsers } from "@/hooks/useUsersQuery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Settings, Camera, FileText, Upload, CalendarIcon, User, Building2, Wrench, Hash, Shield, Loader2, ClipboardCheck, Package, ImageIcon, Plus, Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import PartsFolderManager, { type PartsStructure } from "./PartsFolderManager";
import EquipmentFormErrorBoundary, { useErrorHandler } from "@/components/error-boundary/EquipmentFormErrorBoundary";
import { toast } from "sonner";

// Submit button component that uses mutation state
function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <Button 
      type="submit" 
      disabled={isLoading}
      className="w-full"
      size="lg"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? "Creating Equipment..." : "Create Equipment"}
    </Button>
  );
}

interface CreateEquipmentFormProps {
  projects: Array<{
    id: string;
    name: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  isMobile?: boolean;
  projectsLoading?: boolean;
  projectsError?: Error | null;
}

export default function CreateEquipmentForm({ projects, onSuccess, onCancel, isMobile = false, projectsLoading, projectsError }: CreateEquipmentFormProps) {
  // Error handling
  const { handleError } = useErrorHandler();
  
  // Fast server action mutation hook
  const createEquipmentMutation = useCreateEquipment();
  
  // Fetch users for repaired by selection
  const { data: usersData } = useUsers();
  
  // Form reference for resetting
  const formRef = useRef<HTMLFormElement>(null);
  
  // Tab state for mobile
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'documents' | 'parts' | 'maintenance'>('details');
  
  // Date picker states
  const [inspectionDateOpen, setInspectionDateOpen] = useState(false);
  const [registrationExpiryDateOpen, setRegistrationExpiryDateOpen] = useState(false);
  const [insuranceExpirationDateOpen, setInsuranceExpirationDateOpen] = useState(false);
  const [dateRepairedOpen, setDateRepairedOpen] = useState(false);
  
  // Maintenance-specific state
  const [dateRepaired, setDateRepaired] = useState<Date | undefined>();
  const [isPartsReplacedOpen, setIsPartsReplacedOpen] = useState(true);
  const [openParts, setOpenParts] = useState<{ [key: number]: boolean }>({});
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(true);
  const [openAttachments, setOpenAttachments] = useState<{ [key: number]: boolean }>({});
  
  // Form state for all fields
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    plateNumber: '',
    owner: '',
    type: '',
    projectId: '',
    status: 'OPERATIONAL',
    before: '',
    inspectionDate: undefined as Date | undefined,
    registrationExpiry: undefined as Date | undefined,
    insuranceExpirationDate: undefined as Date | undefined,
    remarks: ''
  });
  
  // Maintenance report form state
  const [maintenanceData, setMaintenanceData] = useState({
    issueDescription: '',
    remarks: '',
    inspectionDetails: '',
    actionTaken: '',
    partsReplaced: [{ name: '', image: null }] as Array<{ name: string; image: File | null }>,
    priority: 'MEDIUM',
    status: 'REPORTED',
    downtimeHours: '',
    dateReported: new Date(),
    repairedBy: ''
  });
  
  // File state for images and documents
  const [files, setFiles] = useState({
    equipmentImage: null as File | null,
    thirdpartyInspection: null as File | null,
    pgpcInspection: null as File | null,
    originalReceipt: null as File | null,
    equipmentRegistration: null as File | null,
    maintenanceAttachments: [null] as (File | null)[],
  });

  // Parts structure state
  const [partsStructure, setPartsStructure] = useState<PartsStructure>({
    rootFiles: [],
    folders: []
  });
  
  // File change handlers
  const handleFileChange = (fieldName: keyof typeof files) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [fieldName]: file }));
  };
  
  // Maintenance file handlers
  const handleMaintenanceFileChange = (newFiles: File[]) => {
    setFiles(prev => ({ ...prev, maintenanceAttachments: newFiles }));
  };
  
  // Parts management handlers
  const addPartReplaced = () => {
    setMaintenanceData(prev => ({
      ...prev,
      partsReplaced: [...prev.partsReplaced, { name: '', image: null }]
    }));
  };
  
  const removePartReplaced = (index: number) => {
    setMaintenanceData(prev => ({
      ...prev,
      partsReplaced: prev.partsReplaced.filter((_, i) => i !== index)
    }));
  };
  
  const handlePartImageUpload = (index: number, file: File | null) => {
    setMaintenanceData(prev => ({
      ...prev,
      partsReplaced: prev.partsReplaced.map((part, i) => 
        i === index ? { ...part, image: file } : part
      )
    }));
  };
  
  const togglePartOpen = (index: number) => {
    setOpenParts(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const toggleAttachmentOpen = (index: number) => {
    setOpenAttachments(prev => ({ ...prev, [index]: !prev[index] }));
  };
  
  const addMaintenanceAttachment = () => {
    const newIndex = files.maintenanceAttachments.length;
    setFiles(prev => ({ 
      ...prev, 
      maintenanceAttachments: [...prev.maintenanceAttachments, null as any] 
    }));
    // Auto-open the new attachment
    setOpenAttachments(prev => ({ ...prev, [newIndex]: true }));
  };
  
  const removeMaintenanceAttachment = (index: number) => {
    setFiles(prev => ({
      ...prev,
      maintenanceAttachments: prev.maintenanceAttachments.filter((_, i) => i !== index)
    }));
    // Remove from open state
    setOpenAttachments(prev => {
      const newState = { ...prev };
      delete newState[index];
      // Reindex remaining attachments
      const reindexed: { [key: number]: boolean } = {};
      Object.keys(newState).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          reindexed[keyNum - 1] = newState[keyNum];
        } else {
          reindexed[keyNum] = newState[keyNum];
        }
      });
      return reindexed;
    });
  };
  
  const handleSingleAttachmentChange = (index: number, file: File | null) => {
    setFiles(prev => ({
      ...prev,
      maintenanceAttachments: prev.maintenanceAttachments.map((f, i) => i === index ? file : f)
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      const formDataFromForm = new FormData(e.currentTarget);
    
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
    
    // Add parts structure data - EXACT COPY FROM VEHICLES
    formDataFromForm.append('partsStructure', JSON.stringify(partsStructure));
    
    // Add all parts files to formData with folder information - EXACT COPY FROM VEHICLES
    partsStructure.rootFiles.forEach((partFile, index) => {
      formDataFromForm.append(`partsFile_root_${index}`, partFile.file);
      formDataFromForm.append(`partsFile_root_${index}_name`, partFile.name);
    });

    partsStructure.folders.forEach((folder, folderIndex) => {
      folder.files.forEach((partFile, fileIndex) => {
        formDataFromForm.append(`partsFile_folder_${folderIndex}_${fileIndex}`, partFile.file);
        formDataFromForm.append(`partsFile_folder_${folderIndex}_${fileIndex}_name`, partFile.name);
        formDataFromForm.append(`partsFile_folder_${folderIndex}_${fileIndex}_folder`, folder.name);
      });
    });

    // Add all the files to formData
    Object.entries(files).forEach(([key, file]) => {
      if (key === 'maintenanceAttachments' && Array.isArray(file)) {
        // Handle maintenance attachments array
        file.forEach((attachment, index) => {
          if (attachment) {
            formDataFromForm.append(`maintenanceAttachment_${index}`, attachment);
          }
        });
      } else if (file && !Array.isArray(file)) {
        formDataFromForm.append(key, file);
      }
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
    if (formData.registrationExpiry) {
      formDataFromForm.append('registrationExpiry', format(formData.registrationExpiry, 'yyyy-MM-dd'));
    }
    if (formData.insuranceExpirationDate) {
      formDataFromForm.append('insuranceExpirationDate', format(formData.insuranceExpirationDate, 'yyyy-MM-dd'));
    }
    
    // Add maintenance report data if any meaningful field is filled
    const hasMaintenanceData = (
      maintenanceData.issueDescription.trim() !== '' ||
      maintenanceData.remarks.trim() !== '' ||
      maintenanceData.inspectionDetails.trim() !== '' ||
      maintenanceData.actionTaken.trim() !== '' ||
      maintenanceData.downtimeHours.trim() !== '' ||
      dateRepaired ||
      maintenanceData.partsReplaced.some(part => part.name.trim() !== '' || part.image) ||
      files.maintenanceAttachments.some(file => file !== null)
    );
    
    if (hasMaintenanceData) {
      // Add parts images to formData
      maintenanceData.partsReplaced.forEach((part, index) => {
        if (part.image) {
          formDataFromForm.append(`partImage_${index}`, part.image);
          formDataFromForm.append(`partImageName_${index}`, part.name);
        }
      });
      
      // Convert parts with images to just names for the JSON data
      const partsForJson = maintenanceData.partsReplaced.map(part => part.name);
      
      formDataFromForm.append('maintenanceReport', JSON.stringify({
        ...maintenanceData,
        partsReplaced: partsForJson,
        dateRepaired: dateRepaired ? format(dateRepaired, 'yyyy-MM-dd') : null
      }));
    }
    
      // Use fast mutation with optimistic updates
      createEquipmentMutation.mutate(formDataFromForm, {
        onSuccess: () => {
          // Reset form state only on successful submission
          setFormData({
            brand: '',
            model: '',
            plateNumber: '',
            owner: '',
            type: '',
            projectId: '',
            status: 'OPERATIONAL',
            before: '',
            inspectionDate: undefined,
            registrationExpiry: undefined,
            insuranceExpirationDate: undefined,
            remarks: ''
          });
          setFiles({
            equipmentImage: null,
            thirdpartyInspection: null,
            pgpcInspection: null,
            originalReceipt: null,
            equipmentRegistration: null,
            maintenanceAttachments: [null],
          });
          setMaintenanceData({
            issueDescription: '',
            remarks: '',
            inspectionDetails: '',
            actionTaken: '',
            partsReplaced: [{ name: '', image: null }],
            priority: 'MEDIUM',
            status: 'REPORTED',
            downtimeHours: '',
            dateReported: new Date(),
            repairedBy: ''
          });
          setDateRepaired(undefined);
          setPartsStructure({
            rootFiles: [],
            folders: []
          });
          
          // Reset the actual form inputs
          if (formRef.current) {
            formRef.current.reset();
          }
          
          if (onSuccess) {
            onSuccess();
          }
        },
        onError: (error) => {
          // Form data is preserved on error - no reset
          // Error toast is already handled by the mutation hook
          handleError(error as Error);
        }
      });
    } catch (error) {
      console.error('Form submission error:', error);
      handleError(error as Error);
      toast.error('Failed to submit form. Please check your input and try again.');
    }
  };

  // Helper functions to count items for tab badges
  const getPhotosCount = () => {
    // Count only image/photo fields
    const photoFields = ['equipmentImage', 'thirdpartyInspection', 'pgpcInspection'];
    return photoFields.filter(field => files[field as keyof typeof files] !== null).length;
  };

  const getDocumentsCount = () => {
    // Count only document fields (PDFs and downloadable files)
    const documentFields = ['originalReceipt', 'equipmentRegistration'];
    return documentFields.filter(field => files[field as keyof typeof files] !== null).length;
  };

  const getPartsCount = () => {
    const totalRootFiles = partsStructure.rootFiles.length;
    const totalFolderFiles = partsStructure.folders.reduce((sum, folder) => sum + folder.files.length, 0);
    return totalRootFiles + totalFolderFiles;
  };
  

  // Tab content components
  const renderTabButton = (tab: 'details' | 'photos' | 'documents' | 'parts' | 'maintenance', label: string, icon: React.ReactNode) => (
    <Button
      type="button"
      variant={activeTab === tab ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(tab)}
      className="flex-1 flex items-center gap-2"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );

  // Handle keyboard events to prevent accidental submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Prevent Enter key from submitting form unless it's the submit button
    if (e.key === 'Enter' && e.target !== e.currentTarget) {
      const target = e.target as HTMLElement;
      // Allow Enter on textarea and specific buttons
      if (target.tagName !== 'TEXTAREA' && (target as HTMLInputElement).type !== 'submit') {
        e.preventDefault();
        return false;
      }
    }
  };

  return (
    <EquipmentFormErrorBoundary>
      <form 
        ref={formRef} 
        onSubmit={handleSubmit} 
        onKeyDown={handleKeyDown}
        className="space-y-4"
      >
      {/* Tab Navigation - All Screen Sizes */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-5 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
            {renderTabButton('photos', 'Photos', <Camera className="h-4 w-4" />)}
            {renderTabButton('documents', 'Documents', <FileText className="h-4 w-4" />)}
            {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />)}
            {renderTabButton('maintenance', 'Report', <ClipboardCheck className="h-4 w-4" />)}
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
              onClick={() => setActiveTab('photos')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'photos'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Camera className="h-4 w-4" />
              Equipment Images
              {getPhotosCount() > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getPhotosCount()}
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
              {getPartsCount() > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getPartsCount()}
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
              <ClipboardCheck className="h-4 w-4" />
              Maintenance Report
            </button>
          </>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className={`${isMobile ? 'space-y-6' : 'space-y-8'}`}>
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Equipment Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter the basic information about your equipment
              </p>
            </CardHeader>
            <CardContent>
              {/* Equipment Identity Section - Wide Grid */}
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                <div className="space-y-2">
                  <Label htmlFor="equipment-brand" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Brand *
                  </Label>
                  <Input
                    id="equipment-brand"
                    name="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    required
                    placeholder="e.g. Caterpillar, Komatsu, JCB"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    aria-describedby="equipment-brand-description"
                  />
                  <div id="equipment-brand-description" className="sr-only">
                    Enter the equipment manufacturer brand name
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment-model" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Model *
                  </Label>
                  <Input
                    id="equipment-model"
                    name="model"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    required
                    placeholder="e.g. 320D, PC200, JS130"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    aria-describedby="equipment-model-description"
                  />
                  <div id="equipment-model-description" className="sr-only">
                    Enter the specific equipment model number
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment-type">Equipment Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger id="equipment-type" className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500" aria-describedby="equipment-type-description">
                      <SelectValue placeholder="Select equipment type" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="Excavator">Excavator</SelectItem>
                      <SelectItem value="Bulldozer">Bulldozer</SelectItem>
                      <SelectItem value="Loader">Loader</SelectItem>
                      <SelectItem value="Crane">Crane</SelectItem>
                      <SelectItem value="Compactor">Compactor</SelectItem>
                      <SelectItem value="Generator">Generator</SelectItem>
                      <SelectItem value="Pump">Pump</SelectItem>
                      <SelectItem value="Drill">Drill</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <div id="equipment-type-description" className="sr-only">
                    Select the category of equipment from the available options
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment-plate-number" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Plate/Serial Number
                  </Label>
                  <Input
                    id="equipment-plate-number"
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                    placeholder="e.g. EQP-001 or Serial Number"
                    className="font-mono transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    aria-describedby="equipment-plate-description"
                  />
                  <div id="equipment-plate-description" className="sr-only">
                    Enter the equipment plate number or serial number for identification
                  </div>
                </div>
              </div>

              {/* Ownership & Project Section */}
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="equipment-owner" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Owner *
                  </Label>
                  <Input
                    id="equipment-owner"
                    name="owner"
                    value={formData.owner}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                    required
                    placeholder="Owner name or company"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                    aria-describedby="equipment-owner-description"
                  />
                  <div id="equipment-owner-description" className="sr-only">
                    Enter the name of the company or person who owns this equipment
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipment-project">Assigned Project *</Label>
                  <Select 
                    value={formData.projectId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                    disabled={projectsLoading}
                  >
                    <SelectTrigger id="equipment-project" className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500" aria-describedby="equipment-project-description">
                      <SelectValue placeholder={
                        projectsLoading 
                          ? "Loading projects..." 
                          : projectsError 
                          ? "Error loading projects" 
                          : projects.length === 0 
                          ? "No projects available" 
                          : "Select project"
                      } />
                    </SelectTrigger>
                    <SelectContent className="w-full max-h-[200px] overflow-y-auto">
                      {projectsLoading ? (
                        <SelectItem value="loading" disabled>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading projects...
                          </div>
                        </SelectItem>
                      ) : projectsError ? (
                        <SelectItem value="error" disabled>
                          <div className="flex items-center gap-2 text-red-600">
                            <X className="h-4 w-4" />
                            Failed to load projects
                          </div>
                        </SelectItem>
                      ) : projects.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            No projects available
                          </div>
                        </SelectItem>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <div id="equipment-project-description" className="sr-only">
                    Select the project this equipment will be assigned to
                  </div>
                  {/* Debug information */}
                  {projects.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {projects.length} project{projects.length !== 1 ? 's' : ''} available
                    </p>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="equipment-status" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Operational Status *
                </Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger id="equipment-status" className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500" aria-describedby="equipment-status-description">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
                  </SelectContent>
                </Select>
                <div id="equipment-status-description" className="sr-only">
                  Select whether the equipment is currently operational or non-operational
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspection Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Dates & Inspection
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Equipment registration, inspection dates and scheduling information
              </p>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {/* Registration Expires */}
                <div className="space-y-2">
                  <Label htmlFor="registration-expiry-button">Registration Expires</Label>
                  <Popover open={registrationExpiryDateOpen} onOpenChange={setRegistrationExpiryDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="registration-expiry-button"
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                          !formData.registrationExpiry && "text-muted-foreground"
                        )}
                        aria-describedby="registration-expiry-description"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.registrationExpiry ? (
                          format(formData.registrationExpiry, "PPP")
                        ) : (
                          <span>Pick registration date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.registrationExpiry}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, registrationExpiry: date }));
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
                  <p id="registration-expiry-description" className="text-xs text-muted-foreground">
                    Select the date when the equipment registration expires
                  </p>
                </div>

                {/* Last Inspection Date */}
                <div className="space-y-2">
                  <Label htmlFor="inspection-date-button">Last Inspection Date</Label>
                  <Popover open={inspectionDateOpen} onOpenChange={setInspectionDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="inspection-date-button"
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                          !formData.inspectionDate && "text-muted-foreground"
                        )}
                        aria-describedby="inspection-date-description"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.inspectionDate ? (
                          format(formData.inspectionDate, "PPP")
                        ) : (
                          <span>Pick inspection date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.inspectionDate}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, inspectionDate: date }));
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
                  <div id="inspection-date-description" className="sr-only">
                    Select the date when the equipment was last inspected
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance-expiration-button">Insurance Expires</Label>
                  <Popover open={insuranceExpirationDateOpen} onOpenChange={setInsuranceExpirationDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="insurance-expiration-button"
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                          !formData.insuranceExpirationDate && "text-muted-foreground"
                        )}
                        aria-describedby="insurance-expiration-description"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.insuranceExpirationDate ? (
                          format(formData.insuranceExpirationDate, "PPP")
                        ) : (
                          <span>Pick expiration date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.insuranceExpirationDate}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, insuranceExpirationDate: date }));
                          setInsuranceExpirationDateOpen(false); // Auto-close after selection
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
                  <div id="insurance-expiration-description" className="sr-only">
                    Select the date when the equipment insurance expires
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspection-frequency">Inspection Frequency</Label>
                  <Select value={formData.before} onValueChange={(value) => setFormData(prev => ({ ...prev, before: value }))}>
                    <SelectTrigger id="inspection-frequency" className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500" aria-describedby="inspection-frequency-description">
                      <SelectValue placeholder="Select inspection frequency" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="1">Monthly</SelectItem>
                      <SelectItem value="2">Every 2 months</SelectItem>
                      <SelectItem value="3">Quarterly</SelectItem>
                      <SelectItem value="6">Every 6 months</SelectItem>
                      <SelectItem value="12">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                  <div id="inspection-frequency-description" className="sr-only">
                    Select how often this equipment should be inspected
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Additional Notes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add any additional information or special notes about this equipment
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="equipment-remarks">Remarks (Optional)</Label>
                <Textarea
                  id="equipment-remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  placeholder="Enter any special notes, conditions, or important information about this equipment..."
                  className="resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  aria-describedby="equipment-remarks-description"
                />
                <div id="equipment-remarks-description" className="sr-only">
                  Enter any additional notes or special information about this equipment
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
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
                      onFileChange={handleFileChange('equipmentImage')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.equipmentImage}
                      icon={<Upload className="h-4 w-4" />}
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
                      onFileChange={handleFileChange('thirdpartyInspection')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.thirdpartyInspection}
                      icon={<Upload className="h-4 w-4" />}
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
                      onFileChange={handleFileChange('pgpcInspection')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.pgpcInspection}
                      icon={<Upload className="h-4 w-4" />}
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
                Documents {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload important equipment documents for compliance and record-keeping. Accepted formats: PDF and image files.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div className="space-y-2">
                    <EquipmentFormErrorBoundary fallback={
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <p className="text-sm text-red-600">Original Receipt upload component failed to load</p>
                      </div>
                    }>
                      <FileUploadSectionSimple
                        label="Original Receipt (OR)"
                        accept=".pdf,image/*"
                        onFileChange={handleFileChange('originalReceipt')}
                        onKeepExistingChange={() => {}} // Not needed for create form
                        selectedFile={files.originalReceipt}
                        icon={<FileText className="h-4 w-4" />}
                      />
                    </EquipmentFormErrorBoundary>
                    <p className="text-xs text-muted-foreground">Proof of purchase document</p>
                  </div>
                  
                  <div className="space-y-2">
                    <EquipmentFormErrorBoundary fallback={
                      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                        <p className="text-sm text-red-600">Equipment Registration upload component failed to load</p>
                      </div>
                    }>
                      <FileUploadSectionSimple
                        label="Equipment Registration"
                        accept=".pdf,image/*"
                        onFileChange={handleFileChange('equipmentRegistration')}
                        onKeepExistingChange={() => {}} // Not needed for create form
                        selectedFile={files.equipmentRegistration}
                        icon={<FileText className="h-4 w-4" />}
                      />
                    </EquipmentFormErrorBoundary>
                    <p className="text-xs text-muted-foreground">Official equipment registration certificate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parts Tab */}
      {activeTab === 'parts' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipment Parts Management {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Organize parts documentation in folders or upload directly to root. 
                This creates a structured file system for easy parts management.
              </p>
            </CardHeader>
            <CardContent>
              <PartsFolderManager 
                onChange={setPartsStructure}
                initialData={partsStructure}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance Report Tab */}
      {activeTab === 'maintenance' && (
        <div className={`space-y-4 ${isMobile ? 'px-1' : 'border-t pt-4'}`}>
          {/* Main Report Information */}
          <Card className={isMobile ? 'mx-0' : ''}>
            <CardHeader className={`pb-3 ${isMobile ? 'px-4 py-3' : 'pb-4'}`}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                <ClipboardCheck className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Report Information</span>
              </CardTitle>
              <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Create an initial maintenance report for this equipment.
              </p>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'px-4 pb-4' : 'space-y-6'}`}>
              {/* Issue Description & Inspection Details */}
              <div className="grid gap-4 grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="maintenance-issue-description" className={isMobile ? 'text-sm font-medium' : ''}>Issue Description</Label>
                  <Textarea
                    id="maintenance-issue-description"
                    value={maintenanceData.issueDescription}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, issueDescription: e.target.value }))}
                    rows={isMobile ? 2 : 3}
                    placeholder="Describe the maintenance issue or work needed..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                    aria-describedby="maintenance-issue-description-help"
                  />
                  <div id="maintenance-issue-description-help" className="sr-only">
                    Describe the specific maintenance issue or work that needs to be performed
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="inspectionDetails" className={isMobile ? 'text-sm font-medium' : ''}>Inspection Details</Label>
                  <Textarea
                    id="inspectionDetails"
                    value={maintenanceData.inspectionDetails}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, inspectionDetails: e.target.value }))}
                    rows={isMobile ? 2 : 3}
                    placeholder="Detail the inspection findings..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                  />
                </div>
              </div>
              
              {/* Action Taken & Remarks */}
              <div className="grid gap-4 grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="actionTaken" className={isMobile ? 'text-sm font-medium' : ''}>Action Taken</Label>
                  <Textarea
                    id="actionTaken"
                    value={maintenanceData.actionTaken}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, actionTaken: e.target.value }))}
                    rows={isMobile ? 2 : 3}
                    placeholder="Describe the action taken or repairs made..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maintenanceRemarks" className={isMobile ? 'text-sm font-medium' : ''}>Additional Remarks</Label>
                  <Textarea
                    id="maintenanceRemarks"
                    value={maintenanceData.remarks}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={isMobile ? 2 : 3}
                    placeholder="Any additional notes or observations..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                  />
                </div>
              </div>
              
              {/* Priority, Status, and Smart Fields */}
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                <div className="space-y-2">
                  <Label className={isMobile ? 'text-sm font-medium' : ''}>Priority</Label>
                  <Select value={maintenanceData.priority} onValueChange={(value) => setMaintenanceData(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className={`w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className={isMobile ? 'text-sm font-medium' : ''}>Status</Label>
                  <Select value={maintenanceData.status} onValueChange={(value) => setMaintenanceData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className={`w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPORTED">Reported</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Show Downtime only for IN_PROGRESS and COMPLETED status */}
                {(maintenanceData.status === 'IN_PROGRESS' || maintenanceData.status === 'COMPLETED') && (
                  <div className="space-y-2">
                    <Label htmlFor="downtimeHours" className={isMobile ? 'text-sm font-medium' : ''}>Downtime (Hours)</Label>
                    <Input
                      id="downtimeHours"
                      type="number"
                      min="0"
                      step="0.1"
                      value={maintenanceData.downtimeHours}
                      onChange={(e) => setMaintenanceData(prev => ({ ...prev, downtimeHours: e.target.value }))}
                      placeholder="0.0"
                      className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}
                    />
                  </div>
                )}
              </div>
              
              {/* Completion Fields - Only show when status is COMPLETED */}
              {maintenanceData.status === 'COMPLETED' && (
                <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label className={isMobile ? 'text-sm font-medium' : ''}>Repaired By</Label>
                    <Select value={maintenanceData.repairedBy} onValueChange={(value) => setMaintenanceData(prev => ({ ...prev, repairedBy: value }))}>
                      <SelectTrigger className={`w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}>
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersData?.data?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={isMobile ? 'text-sm font-medium' : ''}>Date Repaired</Label>
                    <Popover open={dateRepairedOpen} onOpenChange={setDateRepairedOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                            !dateRepaired && "text-muted-foreground",
                            isMobile ? 'h-10 text-sm' : ''
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          {dateRepaired ? (
                            <span className="truncate">{format(dateRepaired, isMobile ? "MMM d, yyyy" : "PPP")}</span>
                          ) : (
                            <span className="truncate">Pick repair date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRepaired}
                          onSelect={(date) => {
                            setDateRepaired(date);
                            setDateRepairedOpen(false);
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
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Parts Replaced Section */}
          <Collapsible open={isPartsReplacedOpen} onOpenChange={setIsPartsReplacedOpen}>
            <Card className={isMobile ? 'mx-0' : ''}>
              <CollapsibleTrigger asChild>
                <CardHeader className={`pb-3 ${isMobile ? 'px-4 py-3' : 'pb-4'} cursor-pointer hover:bg-muted/50 transition-colors`}>
                  <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    <Package className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Parts Replaced</span>
                    {isPartsReplacedOpen ? (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    )}
                  </CardTitle>
                  <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Upload images and details of parts that were replaced during maintenance
                  </p>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className={`space-y-4 ${isMobile ? 'px-4 pb-4' : ''}`}>
                  {maintenanceData.partsReplaced.map((part, index) => {
                    const isPartOpen = openParts[index] ?? (index === 0); // First part open by default
                    return (
                      <Collapsible key={index} open={isPartOpen} onOpenChange={() => togglePartOpen(index)}>
                        <div className={`border rounded-lg ${isMobile ? '' : ''}`}>
                          <CollapsibleTrigger asChild>
                            <div className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                  Part {index + 1}
                                  {part.name && ` - ${part.name.slice(0, 30)}${part.name.length > 30 ? '...' : ''}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {maintenanceData.partsReplaced.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removePartReplaced(index);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                                {isPartOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className={`space-y-3 ${isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}`}>
                              <EquipmentFormErrorBoundary fallback={
                                <div className="p-2 border border-red-200 rounded bg-red-50">
                                  <p className="text-xs text-red-600">Part image upload failed to load</p>
                                </div>
                              }>
                                <FileUploadSectionSimple
                                  label={`Part ${index + 1} Image`}
                                  accept="image/*"
                                  onFileChange={(file) => handlePartImageUpload(index, file)}
                                  onKeepExistingChange={() => {}}
                                  selectedFile={part.image}
                                  required={false}
                                />
                              </EquipmentFormErrorBoundary>
                              <Input
                                value={part.name}
                                onChange={(e) => {
                                  setMaintenanceData(prev => ({
                                    ...prev,
                                    partsReplaced: prev.partsReplaced.map((p, i) => 
                                      i === index ? { ...p, name: e.target.value } : p
                                    )
                                  }));
                                }}
                                placeholder="Part name or description..."
                                className={`${isMobile ? 'h-10 text-sm' : ''}`}
                              />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addPartReplaced()}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Part
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
          
          {/* Attachments & Images Section */}
          <Collapsible open={isAttachmentsOpen} onOpenChange={setIsAttachmentsOpen}>
            <Card className={isMobile ? 'mx-0' : ''}>
              <CollapsibleTrigger asChild>
                <CardHeader className={`pb-3 ${isMobile ? 'px-4 py-3' : 'pb-4'} cursor-pointer hover:bg-muted/50 transition-colors`}>
                  <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    <ImageIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Attachments & Images</span>
                    {isAttachmentsOpen ? (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    )}
                  </CardTitle>
                  <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    Upload photos and documents related to this maintenance work.
                  </p>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className={`space-y-4 ${isMobile ? 'px-4 pb-4' : ''}`}>
                  {files.maintenanceAttachments.map((attachment, index) => {
                    const isAttachmentOpen = openAttachments[index] ?? (index === 0); // First attachment open by default
                    return (
                      <Collapsible key={index} open={isAttachmentOpen} onOpenChange={() => toggleAttachmentOpen(index)}>
                        <div className={`border rounded-lg ${isMobile ? '' : ''}`}>
                          <CollapsibleTrigger asChild>
                            <div className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                                  Attachment {index + 1}
                                  {attachment && ` - ${attachment.name.slice(0, 30)}${attachment.name.length > 30 ? '...' : ''}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {files.maintenanceAttachments.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeMaintenanceAttachment(index);
                                    }}
                                    className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                                {isAttachmentOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className={`space-y-3 ${isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}`}>
                              <EquipmentFormErrorBoundary fallback={
                                <div className="p-2 border border-red-200 rounded bg-red-50">
                                  <p className="text-xs text-red-600">Attachment upload failed to load</p>
                                </div>
                              }>
                                <FileUploadSectionSimple
                                  label={`Attachment ${index + 1}`}
                                  accept="image/*,.pdf"
                                  onFileChange={(file) => handleSingleAttachmentChange(index, file)}
                                  onKeepExistingChange={() => {}}
                                  selectedFile={attachment}
                                  required={false}
                                />
                              </EquipmentFormErrorBoundary>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addMaintenanceAttachment()}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Another Attachment
                    </Button>
                  </div>
                  
                  {files.maintenanceAttachments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Label className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>
                      Uploaded Files ({files.maintenanceAttachments.length})
                    </Label>
                  </div>
                  <div className={`bg-muted/30 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className="space-y-2">
                      {files.maintenanceAttachments.map((file, index) => {
                        if (!file) return null;
                        const isImage = file.type?.startsWith('image/') || false;
                        return (
                          <div key={index} className={`flex items-center justify-between bg-background border rounded-md shadow-sm ${isMobile ? 'px-2 py-2 text-xs' : 'px-3 py-2 text-sm'}`}>
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                              {isImage ? (
                                <ImageIcon className={`text-blue-500 flex-shrink-0 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              ) : (
                                <FileText className={`text-red-500 flex-shrink-0 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className={`truncate font-medium block ${isMobile ? 'text-xs' : ''}`}>{file.name}</span>
                                {isMobile && (
                                  <span className="text-xs text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(1)} MB
                                  </span>
                                )}
                              </div>
                              {!isMobile && (
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                </span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newFiles = files.maintenanceAttachments.filter((_, i) => i !== index).filter(f => f !== null);
                                handleMaintenanceFileChange(newFiles);
                              }}
                              className={`hover:bg-destructive hover:text-destructive-foreground flex-shrink-0 ${isMobile ? 'h-6 w-6 p-0' : 'h-6 w-6 p-0 ml-2'}`}
                            >
                              ×
                            </Button>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                </div>
              )}
              
              {files.maintenanceAttachments.length === 0 && (
                <div className={`text-center text-muted-foreground ${isMobile ? 'py-6' : 'py-8'}`}>
                  <div className={`flex items-center justify-center gap-2 mb-2 ${isMobile ? 'gap-1' : 'gap-2'}`}>
                    <ImageIcon className={`opacity-50 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
                    <FileText className={`opacity-50 ${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
                  </div>
                  <p className={isMobile ? 'text-xs' : 'text-sm'}>No files uploaded yet</p>
                  <p className={isMobile ? 'text-xs' : 'text-xs'}>Add photos and documents for this maintenance work</p>
                </div>
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            size="lg"
          >
            Cancel
          </Button>
        )}
        <div className="flex-1">
          <SubmitButton isLoading={createEquipmentMutation.isPending} />
        </div>
      </div>
      </form>
    </EquipmentFormErrorBoundary>
  );
}