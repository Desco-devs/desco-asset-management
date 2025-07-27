"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { format } from "date-fns";
import { createVehicleAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Settings, Camera, FileText, Upload, CalendarIcon, User, Building2, Car, Hash, Shield, Loader2, Wrench, ClipboardCheck, Package, ImageIcon, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import VehiclePartsFolderManager, { type PartsStructure } from "./VehiclePartsFolderManager";
import { toast } from "sonner";

// Submit button component that uses local loading state
function SubmitButton({ isLoading }: { isLoading: boolean }) {
  return (
    <Button 
      type="submit" 
      disabled={isLoading}
      className="w-full"
      size="lg"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? "Creating Vehicle..." : "Create Vehicle"}
    </Button>
  );
}

interface CreateVehicleFormProps {
  projects: Array<{
    id: string;
    name: string;
  }>;
  locations?: Array<{
    id: string;
    address: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  isMobile?: boolean;
}

export default function CreateVehicleForm({ projects, locations = [], onSuccess, onCancel, isMobile = false }: CreateVehicleFormProps) {
  // Debug: Log projects data
  console.log('🔍 Projects in form:', projects);
  
  // Tab state for mobile
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'documents' | 'parts' | 'maintenance'>('details');
  
  // Loading state for submit button
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Date picker states
  const [inspectionDateOpen, setInspectionDateOpen] = useState(false);
  const [expiryDateOpen, setExpiryDateOpen] = useState(false);
  const [dateRepairedOpen, setDateRepairedOpen] = useState(false);
  
  // Maintenance-specific state
  const [dateRepaired, setDateRepaired] = useState<Date | undefined>();
  const [isPartsReplacedOpen, setIsPartsReplacedOpen] = useState(true);
  const [openParts, setOpenParts] = useState<{ [key: number]: boolean }>({});
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(true);
  const [openAttachments, setOpenAttachments] = useState<{ [key: number]: boolean }>({});
  
  // Form state for all form fields to prevent reset on tab switch or validation error
  const [formData, setFormData] = useState({
    // Select fields and dates
    type: '',
    projectId: '',
    status: 'OPERATIONAL',
    before: '6',
    inspectionDate: new Date(),
    expiryDate: undefined as Date | undefined,
    // Text input fields
    brand: '',
    model: '',
    plateNumber: '',
    owner: '',
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
    maintenanceAttachments: [null] as Array<File | null>,
  });

  // Parts structure state
  const [partsStructure, setPartsStructure] = useState<PartsStructure>({
    rootFiles: [],
    folders: []
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
    dateReported: new Date()
  });
  
  // File change handlers
  const handleFileChange = (fieldName: keyof typeof files) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [fieldName]: file }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent form reset
    setIsSubmitting(true); // Start loading
    
    try {
      // Client-side validation before submission - use setTimeout to ensure state is current
      await new Promise(resolve => setTimeout(resolve, 0));
    
    // Collect all missing fields first, then show single error message
    const missingFields: string[] = [];
    
    if (!formData.brand?.trim()) {
      missingFields.push("Brand");
    }
    if (!formData.model?.trim()) {
      missingFields.push("Model");
    }
    if (!formData.plateNumber?.trim()) {
      missingFields.push("Plate Number");
    }
    if (!formData.owner?.trim()) {
      missingFields.push("Owner");
    }
    if (!formData.type) {
      missingFields.push("Vehicle Type");
    }
    if (!formData.projectId) {
      missingFields.push("Assigned Project");
    }
    
      // If any fields are missing, show single error and switch to details tab
      if (missingFields.length > 0) {
        toast.error(`Please fill in the following required fields: ${missingFields.join(", ")}`);
        setActiveTab('details'); // Switch to details tab to show the fields
        return;
      }
      
      // Create FormData and manually add all values (don't rely on form elements)
      const formDataFromForm = new FormData();
      // Add all required text fields manually from state
      formDataFromForm.append('brand', formData.brand.trim());
      formDataFromForm.append('model', formData.model.trim());
      formDataFromForm.append('plateNumber', formData.plateNumber.trim());
      formDataFromForm.append('owner', formData.owner.trim());
      formDataFromForm.append('remarks', formData.remarks.trim());
      
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

      // Add parts structure data
      formDataFromForm.append('partsStructure', JSON.stringify(partsStructure));
      
      // Add all parts files to formData with folder information
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
      
      // Add select field values to formData
      formDataFromForm.append('type', formData.type);
      formDataFromForm.append('projectId', formData.projectId);
      formDataFromForm.append('status', formData.status);
      formDataFromForm.append('before', formData.before);
      
      // Add date values to formData
      if (formData.inspectionDate) {
        formDataFromForm.append('inspectionDate', format(formData.inspectionDate, 'yyyy-MM-dd'));
      }
      if (formData.expiryDate) {
        formDataFromForm.append('expiryDate', format(formData.expiryDate, 'yyyy-MM-dd'));
      }
      
      // Add maintenance report data
      formDataFromForm.append('maintenanceData', JSON.stringify(maintenanceData));
      if (dateRepaired) {
        formDataFromForm.append('dateRepaired', format(dateRepaired, 'yyyy-MM-dd'));
      }
      
      // Add maintenance attachments
      files.maintenanceAttachments.forEach((file, index) => {
        if (file) {
          formDataFromForm.append(`maintenanceAttachment_${index}`, file);
        }
      });
      
      // Add parts replaced images
      maintenanceData.partsReplaced.forEach((part, index) => {
        if (part.image) {
          formDataFromForm.append(`partReplacedImage_${index}`, part.image);
          formDataFromForm.append(`partReplacedName_${index}`, part.name);
        }
      });
      
      const result = await createVehicleAction(formDataFromForm);
      
      if (result.success) {
        // Success - show single success toast and reset form manually
        toast.success("Vehicle created successfully!");
        
        // Reset form state manually only on success
        setFormData({
          type: '',
          projectId: '',
          status: 'OPERATIONAL',
          before: '6',
          inspectionDate: new Date(),
          expiryDate: undefined,
          brand: '',
          model: '',
          plateNumber: '',
          owner: '',
          remarks: ''
        });
        setFiles({
          frontImg: null,
          backImg: null,
          side1Img: null,
          side2Img: null,
          originalReceipt: null,
          carRegistration: null,
          pgpcInspection: null,
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
          dateReported: new Date()
        });
        setDateRepaired(undefined);
        setPartsStructure({
          rootFiles: [],
          folders: []
        });
        
        // No need to reset DOM form elements since we're using controlled inputs
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Handle different types of errors with appropriate toasts
        if (result.validationError) {
          toast.error(result.error);
        } else if (result.authError) {
          toast.error(result.error);
        } else if (result.permissionError) {
          toast.error(result.error);
        } else if (result.dbError) {
          toast.error(result.error);
        } else {
          toast.error(result.error || "Failed to create vehicle");
        }
      }
    } catch (error) {
      console.error("Unexpected form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false); // Always stop loading
    }
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Hidden fields to ensure all required data is always present in form submission */}
      <input type="hidden" name="brand" value={formData.brand} />
      <input type="hidden" name="model" value={formData.model} />
      <input type="hidden" name="plateNumber" value={formData.plateNumber} />
      <input type="hidden" name="owner" value={formData.owner} />
      <input type="hidden" name="type" value={formData.type} />
      <input type="hidden" name="projectId" value={formData.projectId} />
      <input type="hidden" name="status" value={formData.status} />
      <input type="hidden" name="before" value={formData.before} />
      <input type="hidden" name="remarks" value={formData.remarks} />
      {formData.inspectionDate && (
        <input type="hidden" name="inspectionDate" value={format(formData.inspectionDate, 'yyyy-MM-dd')} />
      )}
      {formData.expiryDate && (
        <input type="hidden" name="expiryDate" value={format(formData.expiryDate, 'yyyy-MM-dd')} />
      )}

      {/* Tab Navigation - All Screen Sizes */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-5 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
            {renderTabButton('photos', 'Photos', <Camera className="h-4 w-4" />)}
            {renderTabButton('documents', 'Documents', <FileText className="h-4 w-4" />)}
            {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />)}
            {renderTabButton('maintenance', 'Maintenance', <ClipboardCheck className="h-4 w-4" />)}
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
              onClick={() => setActiveTab('photos')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'photos'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Camera className="h-4 w-4" />
              Vehicle Images
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
          {/* Vehicle Information - Full Width Layout */}
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter the basic information about your vehicle
              </p>
            </CardHeader>
            <CardContent>
              {/* Vehicle Identity Section - Wide Grid */}
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
                    required
                    placeholder="e.g. Toyota, Ford, Caterpillar"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
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
                    required
                    placeholder="e.g. Hilux, F-150, 320D"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Vehicle Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
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
                    Plate Number *
                  </Label>
                  <Input
                    id="plateNumber"
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, plateNumber: e.target.value }))}
                    required
                    placeholder="e.g. ABC-1234"
                    className="font-mono transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

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
                    required
                    placeholder="Owner name or company"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assigned Project *</Label>
                  <Select value={formData.projectId} onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}>
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent className="w-full max-h-[200px] overflow-y-auto">
                      {projects
                        .filter((project) => project.id && project.name)
                        .map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Operational Status *
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="OPERATIONAL">Operational</SelectItem>
                      <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inspection & Compliance - Wide Layout */}
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Inspection & Compliance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set up inspection schedules and compliance dates
              </p>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                <div className="space-y-2">
                  <Label>Last Inspection Date *</Label>
                  <Popover open={inspectionDateOpen} onOpenChange={setInspectionDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                          !formData.inspectionDate && "text-muted-foreground"
                        )}
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
                  <Label>Next Inspection Due *</Label>
                  <Popover open={expiryDateOpen} onOpenChange={setExpiryDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                          !formData.expiryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.expiryDate ? (
                          format(formData.expiryDate, "PPP")
                        ) : (
                          <span>Pick expiry date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
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

                <div className="space-y-2">
                  <Label>Inspection Frequency *</Label>
                  <Select value={formData.before} onValueChange={(value) => setFormData(prev => ({ ...prev, before: value }))}>
                    <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="1">Monthly</SelectItem>
                      <SelectItem value="2">Every 2 months</SelectItem>
                      <SelectItem value="3">Quarterly</SelectItem>
                      <SelectItem value="6">Every 6 months</SelectItem>
                      <SelectItem value="12">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes - Full Width */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Additional Notes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add any additional information or special notes about this vehicle
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  placeholder="Enter any special notes, conditions, or important information about this vehicle..."
                  className="resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Vehicle Images {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload clear photos of your vehicle from different angles. These images help with identification, insurance claims, and maintenance records.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <FileUploadSectionSimple
                    label="Front View"
                    accept="image/*"
                    onFileChange={handleFileChange('frontImg')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.frontImg}
                    icon={<Upload className="h-4 w-4" />}
                  />
                  
                  <FileUploadSectionSimple
                    label="Back View"
                    accept="image/*"
                    onFileChange={handleFileChange('backImg')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.backImg}
                    icon={<Upload className="h-4 w-4" />}
                  />
                  
                  <FileUploadSectionSimple
                    label="Side View 1"
                    accept="image/*"
                    onFileChange={handleFileChange('side1Img')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.side1Img}
                    icon={<Upload className="h-4 w-4" />}
                  />
                  
                  <FileUploadSectionSimple
                    label="Side View 2"
                    accept="image/*"
                    onFileChange={handleFileChange('side2Img')}
                    onKeepExistingChange={() => {}} // Not needed for create form
                    selectedFile={files.side2Img}
                    icon={<Upload className="h-4 w-4" />}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Upload important vehicle documents for compliance and record-keeping. Accepted formats: PDF and image files.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div className="space-y-2">
                    <FileUploadSectionSimple
                      label="Original Receipt (OR)"
                      accept=".pdf,image/*"
                      onFileChange={handleFileChange('originalReceipt')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.originalReceipt}
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <p className="text-xs text-muted-foreground">Proof of purchase document</p>
                  </div>
                  
                  <div className="space-y-2">
                    <FileUploadSectionSimple
                      label="Car Registration (CR)"
                      accept=".pdf,image/*"
                      onFileChange={handleFileChange('carRegistration')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.carRegistration}
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <p className="text-xs text-muted-foreground">Official vehicle registration certificate</p>
                  </div>
                  
                  <div className="space-y-2">
                    <FileUploadSectionSimple
                      label="PGPC Inspection"
                      accept="image/*"
                      onFileChange={handleFileChange('pgpcInspection')}
                      onKeepExistingChange={() => {}} // Not needed for create form
                      selectedFile={files.pgpcInspection}
                      icon={<FileText className="h-4 w-4" />}
                    />
                    <p className="text-xs text-muted-foreground">Philippine Government Permit Certificate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parts Tab */}
      {activeTab === 'parts' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Vehicle Parts Management {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Organize parts documentation in folders or upload directly to root. 
                This creates a structured file system for easy parts management.
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

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Maintenance Report {isMobile ? '' : '(Optional)'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Create an initial maintenance report for this vehicle. This is useful for documenting any pre-existing conditions or immediate maintenance needs.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDescription">Issue Description *</Label>
                  <Textarea
                    id="issueDescription"
                    value={maintenanceData.issueDescription}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, issueDescription: e.target.value }))}
                    placeholder="Describe the issue or maintenance requirement..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={maintenanceData.priority} onValueChange={(value) => setMaintenanceData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
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
                    <Label>Status</Label>
                    <Select value={maintenanceData.status} onValueChange={(value) => setMaintenanceData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REPORTED">Reported</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inspectionDetails">Inspection Details</Label>
                  <Textarea
                    id="inspectionDetails"
                    value={maintenanceData.inspectionDetails}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, inspectionDetails: e.target.value }))}
                    placeholder="Detail the inspection findings..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionTaken">Action Taken</Label>
                  <Textarea
                    id="actionTaken"
                    value={maintenanceData.actionTaken}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, actionTaken: e.target.value }))}
                    placeholder="Describe the action taken or planned..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="downtimeHours">Downtime Hours</Label>
                    <Input
                      id="downtimeHours"
                      value={maintenanceData.downtimeHours}
                      onChange={(e) => setMaintenanceData(prev => ({ ...prev, downtimeHours: e.target.value }))}
                      placeholder="e.g., 4.5"
                      type="number"
                      step="0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date Repaired</Label>
                    <Popover open={dateRepairedOpen} onOpenChange={setDateRepairedOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRepaired && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRepaired ? (
                            format(dateRepaired, "PPP")
                          ) : (
                            <span>Pick date (if completed)</span>
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
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenanceRemarks">Additional Remarks</Label>
                  <Textarea
                    id="maintenanceRemarks"
                    value={maintenanceData.remarks}
                    onChange={(e) => setMaintenanceData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Any additional notes or comments..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Parts Replaced Section */}
                <Collapsible open={isPartsReplacedOpen} onOpenChange={setIsPartsReplacedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex w-full items-center justify-between p-4"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Parts Replaced ({maintenanceData.partsReplaced.filter(p => p.name.trim()).length})
                      </span>
                      {isPartsReplacedOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {maintenanceData.partsReplaced.map((part, index) => (
                      <Collapsible
                        key={index}
                        open={openParts[index]}
                        onOpenChange={(open) => setOpenParts(prev => ({ ...prev, [index]: open }))}
                      >
                        <div className="rounded-lg border p-4">
                          <div className="flex items-center justify-between">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                                {openParts[index] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                Part {index + 1}
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newParts = maintenanceData.partsReplaced.filter((_, i) => i !== index);
                                setMaintenanceData(prev => ({ ...prev, partsReplaced: newParts }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CollapsibleContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor={`partName_${index}`}>Part Name</Label>
                              <Input
                                id={`partName_${index}`}
                                value={part.name}
                                onChange={(e) => {
                                  const newParts = [...maintenanceData.partsReplaced];
                                  newParts[index] = { ...newParts[index], name: e.target.value };
                                  setMaintenanceData(prev => ({ ...prev, partsReplaced: newParts }));
                                }}
                                placeholder="Enter part name..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`partImage_${index}`}>Part Image</Label>
                              <FileUploadSectionSimple
                                label=""
                                accept="image/*"
                                onFileChange={(file) => {
                                  const newParts = [...maintenanceData.partsReplaced];
                                  newParts[index] = { ...newParts[index], image: file };
                                  setMaintenanceData(prev => ({ ...prev, partsReplaced: newParts }));
                                }}
                                onKeepExistingChange={() => {}}
                                selectedFile={part.image}
                                icon={<ImageIcon className="h-4 w-4" />}
                              />
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setMaintenanceData(prev => ({
                          ...prev,
                          partsReplaced: [...prev.partsReplaced, { name: '', image: null }]
                        }));
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Part
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

                {/* Maintenance Attachments Section */}
                <Collapsible open={isAttachmentsOpen} onOpenChange={setIsAttachmentsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex w-full items-center justify-between p-4"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Maintenance Attachments ({files.maintenanceAttachments.filter(f => f).length})
                      </span>
                      {isAttachmentsOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {files.maintenanceAttachments.map((attachment, index) => (
                      <Collapsible
                        key={index}
                        open={openAttachments[index]}
                        onOpenChange={(open) => setOpenAttachments(prev => ({ ...prev, [index]: open }))}
                      >
                        <div className="rounded-lg border p-4">
                          <div className="flex items-center justify-between">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                                {openAttachments[index] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                Attachment {index + 1}
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newAttachments = files.maintenanceAttachments.filter((_, i) => i !== index);
                                setFiles(prev => ({ ...prev, maintenanceAttachments: newAttachments }));
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <CollapsibleContent className="pt-4">
                            <FileUploadSectionSimple
                              label=""
                              accept="image/*,.pdf,.doc,.docx"
                              onFileChange={(file) => {
                                const newAttachments = [...files.maintenanceAttachments];
                                newAttachments[index] = file;
                                setFiles(prev => ({ ...prev, maintenanceAttachments: newAttachments }));
                              }}
                              onKeepExistingChange={() => {}}
                              selectedFile={attachment}
                              icon={<Upload className="h-4 w-4" />}
                            />
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFiles(prev => ({
                          ...prev,
                          maintenanceAttachments: [...prev.maintenanceAttachments, null]
                        }));
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Attachment
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </CardContent>
          </Card>
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
          <SubmitButton isLoading={isSubmitting} />
        </div>
      </div>
    </form>
  );
}