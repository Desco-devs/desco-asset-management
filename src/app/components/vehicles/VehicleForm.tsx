"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Upload, X, FileText, CalendarIcon, Car } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createVehicle } from "@/app/actions/vehicle-actions";
import { createClient } from "@supabase/supabase-js";
// import { useAuth } from "@/app/context/AuthContext";
import { Separator } from "@/components/ui/separator";
import type { 
  VehicleFormProps, 
  VehicleFormData, 
  VehicleFiles, 
  Project 
} from "./types";

export function VehicleForm({ 
  onVehicleAdded, 
  mode = 'create',
  initialData,
  showFullFeatures = true
}: VehicleFormProps) {
  // const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // Form state
  const [formData, setFormData] = useState<VehicleFormData>({
    brand: "",
    model: "",
    type: "",
    plateNumber: "",
    owner: "",
    projectId: "",
    status: "OPERATIONAL",
    remarks: "",
    inspectionDate: "",
    expiryDate: "",
    before: "",
    ...initialData
  });

  // File upload states
  const [files, setFiles] = useState<VehicleFiles>({
    front: { file: null },
    back: { file: null },
    side1: { file: null },
    side2: { file: null },
    originalReceipt: { file: null },
    carRegistration: { file: null },
    pgpcInspection: { file: null },
  });

  // Date picker states
  const [inspectionDateOpen, setInspectionDateOpen] = useState(false);
  const [expiryDateOpen, setExpiryDateOpen] = useState(false);

  // Load projects when component mounts
  useEffect(() => {
    if (projects.length === 0) {
      loadProjects();
    }
  }, [projects.length]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const result = await response.json();
      setProjects(result.data || result);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleInputChange = (field: keyof VehicleFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // File handling functions
  const handleFileChange = (type: keyof VehicleFiles, file: File | null) => {
    if (file) {
      const preview = URL.createObjectURL(file);
      setFiles(prev => ({
        ...prev,
        [type]: { file, preview }
      }));
    } else {
      setFiles(prev => ({
        ...prev,
        [type]: { file: null }
      }));
    }
  };

  const removeFile = (type: keyof VehicleFiles) => {
    if (files[type].preview) {
      URL.revokeObjectURL(files[type].preview!);
    }
    setFiles(prev => ({
      ...prev,
      [type]: { file: null }
    }));
  };

  // Date handling
  const handleDateSelect = (field: 'inspectionDate' | 'expiryDate', date: Date | undefined) => {
    if (date) {
      handleInputChange(field, format(date, 'yyyy-MM-dd'));
      if (field === 'inspectionDate') {
        setInspectionDateOpen(false);
      } else {
        setExpiryDateOpen(false);
      }
    }
  };

  // Cleanup function
  const cleanupFiles = useCallback(() => {
    Object.values(files).forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
  }, [files]);

  // Reset form function
  const resetForm = () => {
    cleanupFiles();
    setFormData({
      brand: "",
      model: "",
      type: "",
      plateNumber: "",
      owner: "",
      projectId: "",
      status: "OPERATIONAL",
      remarks: "",
      inspectionDate: "",
      expiryDate: "",
      before: "",
      ...initialData
    });
    setFiles({
      front: { file: null },
      back: { file: null },
      side1: { file: null },
      side2: { file: null },
      originalReceipt: { file: null },
      carRegistration: { file: null },
      pgpcInspection: { file: null },
    });
  };

  // Upload files directly to Supabase
  const uploadFilesToSupabase = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const uploadedUrls: Record<string, string> = {};
    
    // Get project info for human-readable paths
    const selectedProject = projects.find(p => p.id === formData.projectId);
    if (!selectedProject) throw new Error("Project not found");
    
    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const readableProject = sanitizeForPath(`${selectedProject.name}_${selectedProject.client.name}`);
    const readableVehicle = sanitizeForPath(`${formData.brand}_${formData.model}_${formData.plateNumber || 'Vehicle'}`);
    const humanReadablePath = `${readableProject}/${readableVehicle}`;
    
    const fileTypes = [
      { key: 'front', field: 'front_img_url' },
      { key: 'back', field: 'back_img_url' },
      { key: 'side1', field: 'side1_img_url' },
      { key: 'side2', field: 'side2_img_url' },
      { key: 'originalReceipt', field: 'original_receipt_url' },
      { key: 'carRegistration', field: 'car_registration_url' },
      { key: 'pgpcInspection', field: 'pgpc_inspection_image' },
    ];
    
    const uploadPromises = fileTypes
      .filter(type => files[type.key as keyof VehicleFiles].file)
      .map(async (type) => {
        const file = files[type.key as keyof VehicleFiles].file!;
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const filename = `${type.key}_${timestamp}.${ext}`;
        const filepath = `vehicles/${humanReadablePath}/${filename}`;
        
        setUploadProgress(prev => ({ ...prev, [type.key]: 0 }));
        
        const { data, error } = await supabase.storage
          .from('vehicles')
          .upload(filepath, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (error) throw new Error(`Upload ${type.key} failed: ${error.message}`);
        
        const { data: urlData } = supabase.storage
          .from('vehicles')
          .getPublicUrl(data.path);
          
        setUploadProgress(prev => ({ ...prev, [type.key]: 100 }));
        return { field: type.field, url: urlData.publicUrl };
      });
      
    const results = await Promise.all(uploadPromises);
    results.forEach(result => {
      uploadedUrls[result.field] = result.url;
    });
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.brand.trim()) {
      toast.error("Brand is required");
      return;
    }
    if (!formData.model.trim()) {
      toast.error("Model is required");
      return;
    }
    if (!formData.type.trim()) {
      toast.error("Type is required");
      return;
    }
    if (!formData.plateNumber.trim()) {
      toast.error("Plate number is required");
      return;
    }
    if (!formData.owner.trim()) {
      toast.error("Owner is required");
      return;
    }
    if (!formData.projectId) {
      toast.error("Please select a project");
      return;
    }
    if (!formData.inspectionDate) {
      toast.error("Inspection date is required");
      return;
    }
    if (!formData.expiryDate) {
      toast.error("Expiry date is required");
      return;
    }
    if (!formData.before.trim()) {
      toast.error("Before (months) is required");
      return;
    }

    setIsLoading(true);
    
    try {
      // Upload files directly to Supabase if any exist
      let fileUrls: Record<string, string> = {};
      const hasFiles = Object.values(files).some(f => f.file);
      
      if (hasFiles && showFullFeatures) {
        toast.info("Uploading files...");
        fileUrls = await uploadFilesToSupabase();
        toast.success("Files uploaded successfully");
      }
      
      // Prepare data for server action (without files, just URLs)
      const vehicleData = {
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        type: formData.type.trim(),
        plateNumber: formData.plateNumber.trim(),
        owner: formData.owner.trim(),
        projectId: formData.projectId,
        status: formData.status,
        remarks: formData.remarks.trim() || undefined,
        inspectionDate: formData.inspectionDate,
        expiryDate: formData.expiryDate,
        before: parseInt(formData.before),
        fileUrls, // Pass URLs instead of files
      };

      const result = await createVehicle(vehicleData);
      
      if (result.success) {
        // toast.success("Vehicle created successfully"); // Removed - handled by realtime listener
        resetForm();
        setUploadProgress({});
        
        if (onVehicleAdded) {
          onVehicleAdded();
        }
      } else {
        throw new Error("Failed to create vehicle");
      }
    } catch (error) {
      console.error("Error creating vehicle:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create vehicle");
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupFiles();
    };
  }, [cleanupFiles]);

  const renderFileUpload = (type: keyof VehicleFiles, label: string, accept: string = "image/*") => {
    const file = files[type];
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          {file.file ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm truncate">{file.file.name}</span>
                  {uploadProgress[type] !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      Uploading: {uploadProgress[type]}%
                    </div>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(type)}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <Label htmlFor={type} className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Click to upload {label.toLowerCase()}
                </Label>
                <Input
                  id={type}
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={(e) => handleFileChange(type, e.target.files?.[0] || null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const selectedProject = projects.find(p => p.id === formData.projectId);
  const isFormValid = formData.projectId && 
    formData.brand.trim() && 
    formData.model.trim() && 
    formData.type.trim() && 
    formData.plateNumber.trim() && 
    formData.owner.trim() &&
    formData.inspectionDate &&
    formData.expiryDate &&
    formData.before.trim();

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className={`grid w-full ${showFullFeatures ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="basic">Vehicle Info</TabsTrigger>
            {showFullFeatures && <TabsTrigger value="documents">Documents & Images</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Project Selection */}
            <div className="grid gap-2">
              <Label htmlFor="project" className="text-foreground">Project *</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => handleInputChange('projectId', value)}
                disabled={isLoading || isLoadingProjects}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    isLoadingProjects ? "Loading projects..." : "Select a project"
                  } />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{project.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {project.client.name} • {project.client.location.address}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && !isLoadingProjects && (
                <p className="text-xs text-muted-foreground">
                  No projects available. Please create a project first.
                </p>
              )}
              {selectedProject && (
                <p className="text-xs text-muted-foreground">
                  Client: {selectedProject.client.name} • Location: {selectedProject.client.location.address}
                </p>
              )}
            </div>

            {/* Basic Vehicle Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brand" className="text-foreground">Brand *</Label>
                <Input
                  id="brand"
                  placeholder="Enter brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-foreground bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model" className="text-foreground">Model *</Label>
                <Input
                  id="model"
                  placeholder="Enter model"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-foreground bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-foreground">Type *</Label>
                <Input
                  id="type"
                  placeholder="Enter vehicle type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-foreground bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plateNumber" className="text-foreground">Plate Number *</Label>
                <Input
                  id="plateNumber"
                  placeholder="Enter plate number"
                  value={formData.plateNumber}
                  onChange={(e) => handleInputChange('plateNumber', e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-foreground bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="owner" className="text-foreground">Owner *</Label>
                <Input
                  id="owner"
                  placeholder="Enter owner"
                  value={formData.owner}
                  onChange={(e) => handleInputChange('owner', e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-foreground bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-foreground">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "OPERATIONAL" | "NON_OPERATIONAL") => handleInputChange('status', value)}
                  disabled={isLoading}
                  required
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
            </div>

            {/* Dates and Before */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label className="text-foreground">Inspection Date *</Label>
                <Popover open={inspectionDateOpen} onOpenChange={setInspectionDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.inspectionDate && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.inspectionDate ? format(new Date(formData.inspectionDate), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.inspectionDate ? new Date(formData.inspectionDate) : undefined}
                      onSelect={(date) => handleDateSelect('inspectionDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground">Expiry Date *</Label>
                <Popover open={expiryDateOpen} onOpenChange={setExpiryDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.expiryDate && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expiryDate ? format(new Date(formData.expiryDate), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.expiryDate ? new Date(formData.expiryDate) : undefined}
                      onSelect={(date) => handleDateSelect('expiryDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="before" className="text-foreground">Before (Months) *</Label>
                <Input
                  id="before"
                  type="number"
                  placeholder="Enter months"
                  value={formData.before}
                  onChange={(e) => handleInputChange('before', e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-foreground bg-background"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="grid gap-2">
              <Label htmlFor="remarks" className="text-foreground">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Enter any additional remarks"
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                disabled={isLoading}
                className="text-foreground bg-background"
                rows={3}
              />
            </div>
          </TabsContent>
          
          {showFullFeatures && (
            <TabsContent value="documents" className="space-y-4 mt-4">
              <div className="grid gap-6">
                {/* Vehicle Images */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Vehicle Images
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    {renderFileUpload('front', 'Front View')}
                    {renderFileUpload('back', 'Back View')}
                    {renderFileUpload('side1', 'Side View 1')}
                    {renderFileUpload('side2', 'Side View 2')}
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {renderFileUpload('originalReceipt', 'Original Receipt', '.pdf,image/*')}
                    {renderFileUpload('carRegistration', 'Car Registration', '.pdf,image/*')}
                    {renderFileUpload('pgpcInspection', 'PGPC Inspection', '.pdf,image/*')}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <Separator className="my-6" />
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="submit" 
            disabled={isLoading || !isFormValid}
            className="min-w-[120px]"
          >
            {isLoading ? "Creating..." : mode === 'edit' ? "Update Vehicle" : "Create Vehicle"}
          </Button>
        </div>
      </form>
    </div>
  );
}