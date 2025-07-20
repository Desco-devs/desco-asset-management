"use client";

import * as React from "react";
import { useActionState, useEffect, useState, startTransition, useCallback, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Wrench, Upload, X, FileText, Image } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createEquipmentAction } from "@/app/actions/equipment-actions";
import EquipmentPartsManager from "@/app/(admin-dashboard)/equipments/equipment-components/EquipmentPartsManager";
import type { EquipmentPart, EquipmentFolder } from "@/types/equipment-parts";

interface Project {
  id: string;
  name: string;
  client: {
    id: string;
    name: string;
    location: {
      id: string;
      address: string;
    };
  };
}

interface EquipmentFormDialogProps {
  trigger?: React.ReactNode;
  onEquipmentAdded?: () => void;
  title?: string;
  description?: string;
  showFullFeatures?: boolean; // For enabling/disabling equipment parts
}

// Submit Button Component with useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="min-w-[120px]"
    >
      {pending ? "Creating..." : "Create Equipment"}
    </Button>
  );
}

export function EquipmentFormDialog({ 
  trigger, 
  onEquipmentAdded,
  title = "Add New Equipment",
  description = "Register new equipment with documents and basic information.",
  showFullFeatures = true
}: EquipmentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  
  // Equipment parts state - only if full features enabled
  const [equipmentParts, setEquipmentParts] = useState<EquipmentPart[]>([]);
  const [equipmentFolders, setEquipmentFolders] = useState<EquipmentFolder[]>([]);
  
  // Form ref for manual reset
  const formRef = useRef<HTMLFormElement>(null);

  // Modern useActionState for progressive enhancement
  const initialState = {
    success: null,
    message: "",
    fieldErrors: {}
  };
  const [state, formAction, isPending] = useActionState(createEquipmentAction, initialState);

  // Define loadProjects function first
  const loadProjects = useCallback(async () => {
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
  }, []);

  // Load projects when dialog opens
  useEffect(() => {
    if (open && projects.length === 0) {
      loadProjects();
    }
  }, [open, projects.length, loadProjects]);

  // Handle successful submission
  useEffect(() => {
    // Process results when state changes and we're not currently pending
    if (state.success !== null && !isPending) {
      if (state.success === true) {
        toast.success(state.message);
        // Reset form and equipment parts only on success
        if (formRef.current) {
          formRef.current.reset();
        }
        if (showFullFeatures) {
          setEquipmentParts([]);
          setEquipmentFolders([]);
        }
        // Close dialog and trigger callback
        setOpen(false);
        // Force dialog to reset by changing key
        setDialogKey(prev => prev + 1);
        if (onEquipmentAdded) {
          onEquipmentAdded();
        }
      } else if (state.success === false && state.message) {
        // Don't reset form or close dialog on validation failure - just show error
        toast.error(state.message);
      }
    }
  }, [state.success, state.message, isPending, onEquipmentAdded, showFullFeatures]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form when opening dialog
      if (formRef.current) {
        formRef.current.reset();
      }
      if (showFullFeatures) {
        setEquipmentParts([]);
        setEquipmentFolders([]);
      }
    }
  }, [open, showFullFeatures]);

  // Helper function to enhance FormData with equipment parts
  const enhanceFormDataWithParts = useCallback((formData: FormData) => {
    if (!showFullFeatures) return formData;
    
    // Add equipment parts to FormData
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
    
    // Add parts to FormData
    allParts.forEach((part, index) => {
      formData.append(`equipmentPart_${index}`, part.file);
      formData.append(`equipmentPartPath_${index}`, part.folderPath);
    });
    
    // Add count for server processing
    formData.append('equipmentPartsCount', allParts.length.toString());
    
    return formData;
  }, [showFullFeatures, equipmentParts, equipmentFolders]);

  // Enhanced form action that includes equipment parts
  const enhancedFormAction = useCallback((formData: FormData) => {
    const enhancedData = enhanceFormDataWithParts(formData);
    startTransition(() => {
      formAction(enhancedData);
    });
  }, [formAction, enhanceFormDataWithParts]);

  const renderFileUpload = (name: string, label: string, accept: string = "image/*") => {
    const fieldError = state.fieldErrors?.[name];
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <Label htmlFor={name} className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Click to upload {label.toLowerCase()}
              </Label>
              <Input
                id={name}
                name={name}
                type="file"
                accept={accept}
                className="hidden"
              />
            </div>
          </div>
        </div>
        {fieldError && (
          <p className="text-sm text-red-500">{fieldError}</p>
        )}
      </div>
    );
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Wrench className="h-4 w-4 mr-2" />
      Add Equipment
    </Button>
  );

  return (
    <Dialog key={dialogKey} open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent 
        className="max-w-[95%] max-h-[90vh] flex flex-col p-4" 
        style={{ maxWidth: "800px" }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {/* Progressive Enhancement Form */}
          <form 
            ref={formRef}
            action={enhancedFormAction} 
            className="space-y-6"
          >
            {/* General Error Message */}
            {state.success === false && !Object.keys(state.fieldErrors || {}).length && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{state.message}</p>
              </div>
            )}

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className={`grid w-full ${showFullFeatures ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                {showFullFeatures && <TabsTrigger value="parts">Equipment Parts</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">

            {/* Project Selection */}
            <div className="grid gap-2">
              <Label htmlFor="projectId" className="text-foreground">Project *</Label>
              <Select name="projectId" required disabled={isLoadingProjects}>
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
              {state.fieldErrors?.projectId && (
                <p className="text-sm text-red-500">{state.fieldErrors.projectId}</p>
              )}
              {projects.length === 0 && !isLoadingProjects && (
                <p className="text-xs text-muted-foreground">
                  No projects available. Please create a project first.
                </p>
              )}
            </div>

            {/* Basic Equipment Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brand" className="text-foreground">Brand *</Label>
                <Input
                  id="brand"
                  name="brand"
                  placeholder="Enter brand"
                  required
                  className="text-foreground bg-background"
                />
                {state.fieldErrors?.brand && (
                  <p className="text-sm text-red-500">{state.fieldErrors.brand}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model" className="text-foreground">Model *</Label>
                <Input
                  id="model"
                  name="model"
                  placeholder="Enter model"
                  required
                  className="text-foreground bg-background"
                />
                {state.fieldErrors?.model && (
                  <p className="text-sm text-red-500">{state.fieldErrors.model}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type" className="text-foreground">Type *</Label>
                <Input
                  id="type"
                  name="type"
                  placeholder="Enter type"
                  required
                  className="text-foreground bg-background"
                />
                {state.fieldErrors?.type && (
                  <p className="text-sm text-red-500">{state.fieldErrors.type}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner" className="text-foreground">Owner *</Label>
                <Input
                  id="owner"
                  name="owner"
                  placeholder="Enter owner"
                  required
                  className="text-foreground bg-background"
                />
                {state.fieldErrors?.owner && (
                  <p className="text-sm text-red-500">{state.fieldErrors.owner}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status" className="text-foreground">Status *</Label>
                <Select name="status" defaultValue="OPERATIONAL" required>
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
                  name="plateNumber"
                  placeholder="Enter plate number"
                  className="text-foreground bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="before" className="text-foreground">Before (Hours)</Label>
                <Input
                  id="before"
                  name="before"
                  type="number"
                  placeholder="Enter hours"
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
                  name="inspectionDate"
                  type="date"
                  className="text-foreground bg-background"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="insuranceExpirationDate" className="text-foreground">Insurance Expiry</Label>
                <Input
                  id="insuranceExpirationDate"
                  name="insuranceExpirationDate"
                  type="date"
                  className="text-foreground bg-background"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="grid gap-2">
              <Label htmlFor="remarks" className="text-foreground">Remarks</Label>
              <Textarea
                id="remarks"
                name="remarks"
                placeholder="Enter any additional remarks"
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

            {/* Submit Button */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <SubmitButton />
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}