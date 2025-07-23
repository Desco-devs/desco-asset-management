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
import { cn } from "@/lib/utils";
import { Settings, Camera, FileText, Upload, CalendarIcon, User, Building2, Car, Hash, Shield, Loader2, Wrench } from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import PartsFolderManager, { type PartsStructure } from "@/app/(admin-dashboard)/equipments/components/forms/PartsFolderManager";

// Submit button component that uses useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="w-full"
      size="lg"
    >
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? "Creating Vehicle..." : "Create Vehicle"}
    </Button>
  );
}

interface CreateVehicleFormProps {
  projects: Array<{
    id: string;
    name: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  isMobile?: boolean;
}

export default function CreateVehicleForm({ projects, onSuccess, onCancel, isMobile = false }: CreateVehicleFormProps) {
  // Tab state for mobile
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'documents' | 'parts'>('details');
  
  // Form state for select fields and dates
  const [formData, setFormData] = useState({
    type: '',
    projectId: '',
    status: 'OPERATIONAL',
    before: '6',
    inspectionDate: new Date(),
    expiryDate: undefined as Date | undefined
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
  
  // File change handlers
  const handleFileChange = (fieldName: keyof typeof files) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [fieldName]: file }));
  };

  const handleAction = async (formDataFromForm: FormData) => {
    try {
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
      
      await createVehicleAction(formDataFromForm);
      
      // Success message will be shown by the mutation hook's toast
      // No need for alert here since realtime updates will show the vehicle immediately
      
      // Form will reset automatically after successful submission
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      // Error will be handled by the mutation hook's toast
    }
  };

  // Tab content components
  const renderTabButton = (tab: 'details' | 'photos' | 'documents' | 'parts', label: string, icon: React.ReactNode) => (
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
    <form action={handleAction} className="space-y-4">
      {/* Tab Navigation - All Screen Sizes */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-4 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
            {renderTabButton('photos', 'Photos', <Camera className="h-4 w-4" />)}
            {renderTabButton('documents', 'Documents', <FileText className="h-4 w-4" />)}
            {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />)}
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
          </>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className={`${isMobile ? 'space-y-6' : 'space-y-6'}`}>
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
                      {projects.map((project) => (
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
                  <Popover>
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
                        onSelect={(date) => setFormData(prev => ({ ...prev, inspectionDate: date || new Date() }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Next Inspection Due *</Label>
                  <Popover>
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
                        onSelect={(date) => setFormData(prev => ({ ...prev, expiryDate: date }))}
                        initialFocus
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
              <PartsFolderManager 
                onChange={setPartsStructure}
                initialData={partsStructure}
              />
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
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}