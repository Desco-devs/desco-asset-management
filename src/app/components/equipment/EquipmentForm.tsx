"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Upload, X, Image, FileText } from "lucide-react";
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
import { createEquipment } from "@/app/actions/equipment-actions";
import { Separator } from "@/components/ui/separator";
import EquipmentPartsManager from "@/app/(admin-dashboard)/equipments/equipment-components/EquipmentPartsManager";
import type { EquipmentPart, EquipmentFolder } from "@/types/equipment-parts";
import type { 
  EquipmentFormProps, 
  EquipmentFormData, 
  EquipmentFiles, 
  Project 
} from "./types";

export function EquipmentForm({ 
  onEquipmentAdded, 
  mode = 'create',
  initialData,
  showFullFeatures = true
}: EquipmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<EquipmentFormData>({
    brand: "",
    model: "",
    type: "",
    owner: "",
    projectId: "",
    status: "OPERATIONAL",
    remarks: "",
    plateNumber: "",
    inspectionDate: "",
    insuranceExpirationDate: "",
    before: "",
    ...initialData
  });

  // File upload states
  const [files, setFiles] = useState<EquipmentFiles>({
    image: { file: null },
    originalReceipt: { file: null },
    equipmentRegistration: { file: null },
    thirdpartyInspection: { file: null },
    pgpcInspection: { file: null },
  });

  // Equipment parts state - only if full features enabled
  const [equipmentParts, setEquipmentParts] = useState<EquipmentPart[]>([]);
  const [equipmentFolders, setEquipmentFolders] = useState<EquipmentFolder[]>([]);

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

  const handleInputChange = (field: keyof EquipmentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // File handling functions
  const handleFileChange = (type: keyof EquipmentFiles, file: File | null) => {
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

  const removeFile = (type: keyof EquipmentFiles) => {
    if (files[type].preview) {
      URL.revokeObjectURL(files[type].preview!);
    }
    setFiles(prev => ({
      ...prev,
      [type]: { file: null }
    }));
  };

  // Helper function to convert equipment parts for server action
  const convertPartsForSubmission = () => {
    if (!showFullFeatures) return [];
    
    const allParts: { file: File; folderPath: string }[] = [];
    
    // Add root level parts
    equipmentParts.forEach(part => {
      if (part.file && !part.isExisting) {
        allParts.push({
          file: part.file,
          folderPath: "main"
        });
      }
    });
    
    // Add parts from folders recursively
    const collectPartsFromFolders = (folders: EquipmentFolder[], path: string = "") => {
      folders.forEach(folder => {
        const folderPath = path ? `${path}/${folder.name}` : folder.name;
        
        folder.parts.forEach(part => {
          if (part.file && !part.isExisting) {
            allParts.push({
              file: part.file,
              folderPath
            });
          }
        });
        
        if (folder.subfolders.length > 0) {
          collectPartsFromFolders(folder.subfolders, folderPath);
        }
      });
    };
    
    collectPartsFromFolders(equipmentFolders);
    return allParts;
  };

  // Cleanup function
  const cleanupFiles = useCallback(() => {
    Object.values(files).forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    if (showFullFeatures) {
      // Cleanup equipment parts
      equipmentParts.forEach(part => {
        if (part.preview && !part.isExisting) {
          URL.revokeObjectURL(part.preview);
        }
      });
      
      // Cleanup folder parts recursively
      const cleanupFolder = (folder: EquipmentFolder) => {
        folder.parts.forEach(part => {
          if (part.preview && !part.isExisting) {
            URL.revokeObjectURL(part.preview);
          }
        });
        folder.subfolders.forEach(cleanupFolder);
      };
      equipmentFolders.forEach(cleanupFolder);
    }
  }, [files, equipmentParts, equipmentFolders, showFullFeatures]);

  // Reset form function
  const resetForm = () => {
    cleanupFiles();
    setFormData({
      brand: "",
      model: "",
      type: "",
      owner: "",
      projectId: "",
      status: "OPERATIONAL",
      remarks: "",
      plateNumber: "",
      inspectionDate: "",
      insuranceExpirationDate: "",
      before: "",
      ...initialData
    });
    setFiles({
      image: { file: null },
      originalReceipt: { file: null },
      equipmentRegistration: { file: null },
      thirdpartyInspection: { file: null },
      pgpcInspection: { file: null },
    });
    if (showFullFeatures) {
      setEquipmentParts([]);
      setEquipmentFolders([]);
    }
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
    if (!formData.owner.trim()) {
      toast.error("Owner is required");
      return;
    }
    if (!formData.projectId) {
      toast.error("Please select a project");
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare data for server action
      const equipmentData = {
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        type: formData.type.trim(),
        owner: formData.owner.trim(),
        projectId: formData.projectId,
        status: formData.status,
        remarks: formData.remarks.trim() || undefined,
        plateNumber: formData.plateNumber.trim() || undefined,
        inspectionDate: formData.inspectionDate || undefined,
        insuranceExpirationDate: formData.insuranceExpirationDate || undefined,
        before: formData.before ? parseInt(formData.before) : undefined,
        files: {
          image: files.image.file || undefined,
          originalReceipt: files.originalReceipt.file || undefined,
          equipmentRegistration: files.equipmentRegistration.file || undefined,
          thirdpartyInspection: files.thirdpartyInspection.file || undefined,
          pgpcInspection: files.pgpcInspection.file || undefined,
        },
        equipmentParts: convertPartsForSubmission()
      };

      const result = await createEquipment(equipmentData);
      
      if (result.success) {
        toast.success("Equipment created successfully");
        resetForm();
        
        if (onEquipmentAdded) {
          onEquipmentAdded();
        }
      } else {
        throw new Error("Failed to create equipment");
      }
    } catch (error) {
      console.error("Error creating equipment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create equipment");
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

  const renderFileUpload = (type: keyof EquipmentFiles, label: string, accept: string = "image/*") => {
    const file = files[type];
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          {file.file ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm truncate">{file.file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(type)}
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
  const isFormValid = formData.projectId && formData.brand.trim() && formData.model.trim() && formData.type.trim() && formData.owner.trim();

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className={`grid w-full ${showFullFeatures ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            {showFullFeatures && <TabsTrigger value="parts">Equipment Parts</TabsTrigger>}
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

            {/* Basic Equipment Info */}
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
                  placeholder="Enter type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-foreground bg-background"
                />
              </div>
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
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <div className="grid gap-2">
                <Label htmlFor="plateNumber" className="text-foreground">Plate Number</Label>
                <Input
                  id="plateNumber"
                  placeholder="Enter plate number"
                  value={formData.plateNumber}
                  onChange={(e) => handleInputChange('plateNumber', e.target.value)}
                  disabled={isLoading}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="before" className="text-foreground">Before (Hours)</Label>
                <Input
                  id="before"
                  type="number"
                  placeholder="Enter hours"
                  value={formData.before}
                  onChange={(e) => handleInputChange('before', e.target.value)}
                  disabled={isLoading}
                  className="text-foreground bg-background"
                />
              </div>
            </div>

            {/* Optional Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="inspectionDate" className="text-foreground">Inspection Date</Label>
                <Input
                  id="inspectionDate"
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => handleInputChange('inspectionDate', e.target.value)}
                  disabled={isLoading}
                  className="text-foreground bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="insuranceExpirationDate" className="text-foreground">Insurance Expiry</Label>
                <Input
                  id="insuranceExpirationDate"
                  type="date"
                  value={formData.insuranceExpirationDate}
                  onChange={(e) => handleInputChange('insuranceExpirationDate', e.target.value)}
                  disabled={isLoading}
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
          
          <TabsContent value="documents" className="space-y-4 mt-4">
            <div className="grid gap-4">
              {renderFileUpload('image', 'Equipment Image')}
              {renderFileUpload('originalReceipt', 'Original Receipt', '.pdf,image/*')}
              {renderFileUpload('equipmentRegistration', 'Equipment Registration', '.pdf,image/*')}
              {renderFileUpload('thirdpartyInspection', '3rd Party Inspection', '.pdf,image/*')}
              {renderFileUpload('pgpcInspection', 'PGPC Inspection', '.pdf,image/*')}
            </div>
          </TabsContent>
          
          {showFullFeatures && (
            <TabsContent value="parts" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="h-4 w-4" />
                    Equipment Parts Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EquipmentPartsManager
                    equipmentParts={equipmentParts}
                    setEquipmentParts={setEquipmentParts}
                    equipmentFolders={equipmentFolders}
                    setEquipmentFolders={setEquipmentFolders}
                  />
                </CardContent>
              </Card>
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
            {isLoading ? "Creating..." : mode === 'edit' ? "Update Equipment" : "Create Equipment"}
          </Button>
        </div>
      </form>
    </div>
  );
}