"use client";

import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  useVehiclesWithReferenceData,
  vehicleKeys,
} from "@/hooks/useVehiclesQuery";
import {
  selectIsDocumentsCollapsed,
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectSelectedVehicle,
  useVehiclesStore,
} from "@/stores/vehiclesStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Settings,
  Shield,
  Upload,
  X,
  Wrench,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import EditVehicleForm from "../forms/EditVehicleForm";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  inspection_date: string;
  before: number;
  expiry_date: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  project: {
    id: string;
    name: string;
  };
}

export default function EditVehicleModalModern() {
  const selectedVehicle = useVehiclesStore(selectSelectedVehicle);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  const isMobile = useVehiclesStore(selectIsMobile);
  const isModalOpen = useVehiclesStore(selectIsModalOpen);
  const isDocumentsCollapsed = useVehiclesStore(selectIsDocumentsCollapsed);
  const {
    setIsEditMode,
    setIsMobile,
    setIsModalOpen,
    setIsDocumentsCollapsed,
    setSelectedVehicle,
  } = useVehiclesStore();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Get reference data
  const { projects } = useVehiclesWithReferenceData();

  // Custom tab state - EXACTLY like EditEquipmentDrawer with tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts'>('details');

  // Loading states for better UX
  const [isUpdatingPhotos, setIsUpdatingPhotos] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Ref to maintain scroll position
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // Vehicle files state
  interface VehicleFilesState {
    frontImg: { file: File | null; keep: boolean };
    backImg: { file: File | null; keep: boolean };
    side1Img: { file: File | null; keep: boolean };
    side2Img: { file: File | null; keep: boolean };
    originalReceipt: { file: File | null; keep: boolean };
    carRegistration: { file: File | null; keep: boolean };
    pgpcInspection: { file: File | null; keep: boolean };
  }

  const [files, setFiles] = useState<VehicleFilesState>({
    frontImg: { file: null, keep: !!selectedVehicle?.front_img_url },
    backImg: { file: null, keep: !!selectedVehicle?.back_img_url },
    side1Img: { file: null, keep: !!selectedVehicle?.side1_img_url },
    side2Img: { file: null, keep: !!selectedVehicle?.side2_img_url },
    originalReceipt: {
      file: null,
      keep: !!selectedVehicle?.original_receipt_url,
    },
    carRegistration: {
      file: null,
      keep: !!selectedVehicle?.car_registration_url,
    },
    pgpcInspection: {
      file: null,
      keep: !!selectedVehicle?.pgpc_inspection_image,
    },
  });

  // Reset file state when selectedVehicle ID changes (only when switching vehicles)
  useEffect(() => {
    if (selectedVehicle) {
      setFiles({
        frontImg: { file: null, keep: !!selectedVehicle.front_img_url },
        backImg: { file: null, keep: !!selectedVehicle.back_img_url },
        side1Img: { file: null, keep: !!selectedVehicle.side1_img_url },
        side2Img: { file: null, keep: !!selectedVehicle.side2_img_url },
        originalReceipt: {
          file: null,
          keep: !!selectedVehicle.original_receipt_url,
        },
        carRegistration: {
          file: null,
          keep: !!selectedVehicle.car_registration_url,
        },
        pgpcInspection: {
          file: null,
          keep: !!selectedVehicle.pgpc_inspection_image,
        },
      });
    }
  }, [selectedVehicle]); // Include selectedVehicle in dependencies

  // Mobile detection using Zustand
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, [setIsMobile]);

  // Close details modal when edit mode opens
  useEffect(() => {
    if (isEditMode && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [isEditMode, isModalOpen, setIsModalOpen]);

  const handleSuccess = () => {
    setIsEditMode(false);
    // Reopen the details modal after successful edit
    setIsModalOpen(true);
    // React Query cache will be invalidated by the mutation and realtime updates
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Reopen the details modal when cancelled
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsEditMode(false);
    // Reopen the details modal when closed
    setIsModalOpen(true);
  };

  // File state update helper
  const updateFileState = useCallback(
    (
      key: keyof VehicleFilesState,
      update: Partial<VehicleFilesState[keyof VehicleFilesState]>
    ) => {
      setFiles((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...update },
      }));
    },
    []
  );

  // Callback functions for each file type
  const handleFrontImgFileChange = useCallback(
    (file: File | null) => updateFileState("frontImg", { file }),
    [updateFileState]
  );
  const handleFrontImgKeepChange = useCallback(
    (keep: boolean) => updateFileState("frontImg", { keep }),
    [updateFileState]
  );

  const handleBackImgFileChange = useCallback(
    (file: File | null) => updateFileState("backImg", { file }),
    [updateFileState]
  );
  const handleBackImgKeepChange = useCallback(
    (keep: boolean) => updateFileState("backImg", { keep }),
    [updateFileState]
  );

  const handleSide1ImgFileChange = useCallback(
    (file: File | null) => updateFileState("side1Img", { file }),
    [updateFileState]
  );
  const handleSide1ImgKeepChange = useCallback(
    (keep: boolean) => updateFileState("side1Img", { keep }),
    [updateFileState]
  );

  const handleSide2ImgFileChange = useCallback(
    (file: File | null) => updateFileState("side2Img", { file }),
    [updateFileState]
  );
  const handleSide2ImgKeepChange = useCallback(
    (keep: boolean) => updateFileState("side2Img", { keep }),
    [updateFileState]
  );

  const handleReceiptFileChange = useCallback(
    (file: File | null) => updateFileState("originalReceipt", { file }),
    [updateFileState]
  );
  const handleReceiptKeepChange = useCallback(
    (keep: boolean) => updateFileState("originalReceipt", { keep }),
    [updateFileState]
  );

  const handleRegistrationFileChange = useCallback(
    (file: File | null) => updateFileState("carRegistration", { file }),
    [updateFileState]
  );
  const handleRegistrationKeepChange = useCallback(
    (keep: boolean) => updateFileState("carRegistration", { keep }),
    [updateFileState]
  );

  const handlePgpcFileChange = useCallback(
    (file: File | null) => updateFileState("pgpcInspection", { file }),
    [updateFileState]
  );
  const handlePgpcKeepChange = useCallback(
    (keep: boolean) => updateFileState("pgpcInspection", { keep }),
    [updateFileState]
  );

  // Handle photo and document updates
  const handlePhotosSubmit = async (
    event?: React.MouseEvent<HTMLButtonElement>
  ) => {
    // Prevent any default behavior that might cause scrolling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsUpdatingPhotos(true);
    try {
      // Create FormData and add all required vehicle fields
      const formData = new FormData();
      formData.append("vehicleId", vehicleForForm.id);

      // Add required vehicle fields (to pass validation)
      formData.append("brand", vehicleForForm.brand);
      formData.append("model", vehicleForForm.model);
      formData.append("type", vehicleForForm.type);
      formData.append("plateNumber", vehicleForForm.plate_number);
      formData.append("owner", vehicleForForm.owner);
      formData.append("projectId", vehicleForForm.project.id);
      formData.append("status", vehicleForForm.status);
      formData.append("inspectionDate", vehicleForForm.inspection_date);
      formData.append("expiryDate", vehicleForForm.expiry_date);
      formData.append("before", vehicleForForm.before.toString());
      formData.append("remarks", vehicleForForm.remarks || "");

      // Add files and removal flags
      Object.entries(files).forEach(([key, { file, keep }]) => {
        if (file) {
          // New file to upload
          formData.append(key, file);
        } else if (!keep) {
          // Mark for removal (no file and keep is false means user wants to remove it)
          formData.append(`remove_${key}`, "true");
        }
      });

      // Import the action dynamically
      const { updateVehicleAction } = await import("../../actions");
      const result = await updateVehicleAction(formData);

      // Update the Zustand store's selectedVehicle with the fresh data
      if (result && result.vehicle) {
        // Convert Date fields to strings and null to undefined for Vehicle type compatibility
        const vehicleWithCompatibleTypes = {
          ...result.vehicle,
          // Convert Date fields to strings
          inspection_date:
            result.vehicle.inspection_date instanceof Date
              ? result.vehicle.inspection_date.toISOString()
              : result.vehicle.inspection_date,
          expiry_date:
            result.vehicle.expiry_date instanceof Date
              ? result.vehicle.expiry_date.toISOString()
              : result.vehicle.expiry_date,
          created_at:
            result.vehicle.created_at instanceof Date
              ? result.vehicle.created_at.toISOString()
              : result.vehicle.created_at,
          // Convert null fields to undefined
          remarks: result.vehicle.remarks ?? undefined,
          front_img_url: result.vehicle.front_img_url ?? undefined,
          side1_img_url: result.vehicle.side1_img_url ?? undefined,
          side2_img_url: result.vehicle.side2_img_url ?? undefined,
          back_img_url: result.vehicle.back_img_url ?? undefined,
          car_registration_url:
            result.vehicle.car_registration_url ?? undefined,
          original_receipt_url:
            result.vehicle.original_receipt_url ?? undefined,
          pgpc_inspection_image:
            result.vehicle.pgpc_inspection_image ?? undefined,
        };
        setSelectedVehicle(vehicleWithCompatibleTypes);

        // Also update TanStack Query cache to keep everything in sync
        queryClient.setQueryData(vehicleKeys.vehicles(), (oldData: unknown) => {
          if (!oldData) return [result.vehicle];

          // Find and update the vehicle in the array
          const updatedData = (oldData as Vehicle[]).map((vehicle: Vehicle) =>
            vehicle.id === result.vehicle.id ? result.vehicle : vehicle
          );

          return updatedData;
        });
      }

      // Show success state briefly
      setUpdateSuccess(true);

      // Show success toast
      const { toast } = await import("sonner");
      toast.success("Photos & Documents updated successfully!");

      // Show success for a moment, then reset
      setTimeout(() => {
        setUpdateSuccess(false);
        setIsUpdatingPhotos(false);
      }, 1500); // Show success for 1.5 seconds
    } catch (error) {
      console.error("Photo update error:", error);
      const { toast } = await import("sonner");
      toast.error(
        "Error: " +
          (error instanceof Error ? error.message : "Failed to update photos")
      );
    } finally {
      if (!updateSuccess) {
        setIsUpdatingPhotos(false);
      }
    }
  };

  // Helper function to count images for selected vehicle
  const getImagesCount = () => {
    if (!selectedVehicle) return 0;
    
    let count = 0;
    if (selectedVehicle.front_img_url && files.frontImg.keep) count++;
    if (selectedVehicle.back_img_url && files.backImg.keep) count++;
    if (selectedVehicle.side1_img_url && files.side1Img.keep) count++;
    if (selectedVehicle.side2_img_url && files.side2Img.keep) count++;
    if (files.frontImg.file) count++;
    if (files.backImg.file) count++;
    if (files.side1Img.file) count++;
    if (files.side2Img.file) count++;
    
    return count;
  };

  // Helper function to count documents for selected vehicle
  const getDocumentsCount = () => {
    if (!selectedVehicle) return 0;
    
    let count = 0;
    if (selectedVehicle.original_receipt_url && files.originalReceipt.keep) count++;
    if (selectedVehicle.car_registration_url && files.carRegistration.keep) count++;
    if (selectedVehicle.pgpc_inspection_image && files.pgpcInspection.keep) count++;
    if (files.originalReceipt.file) count++;
    if (files.carRegistration.file) count++;
    if (files.pgpcInspection.file) count++;
    
    return count;
  };

  // Helper function to count vehicle parts for selected vehicle
  const getVehiclePartsCount = () => {
    if (!selectedVehicle || !selectedVehicle.vehicle_parts) return 0;
    
    // Count files in rootFiles array and recursively in folders
    const countFiles = (partsData: any): number => {
      if (!partsData) return 0;
      
      let count = 0;
      if (partsData.rootFiles && Array.isArray(partsData.rootFiles)) {
        count += partsData.rootFiles.length;
      }
      if (partsData.folders && Array.isArray(partsData.folders)) {
        partsData.folders.forEach((folder: any) => {
          count += countFiles(folder);
        });
      }
      
      return count;
    };
    
    return countFiles(selectedVehicle.vehicle_parts);
  };

  // Tab content components - EXACTLY like EditEquipmentDrawer
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

  if (!selectedVehicle) return null;

  // Transform vehicle data to match form interface
  const vehicleForForm = {
    id: selectedVehicle.id,
    brand: selectedVehicle.brand,
    model: selectedVehicle.model,
    type: selectedVehicle.type,
    plate_number: selectedVehicle.plate_number,
    inspection_date: selectedVehicle.inspection_date,
    before: selectedVehicle.before,
    expiry_date: selectedVehicle.expiry_date,
    status: selectedVehicle.status,
    remarks: selectedVehicle.remarks,
    owner: selectedVehicle.owner,
    project: {
      id: selectedVehicle.project?.id || "",
      name: selectedVehicle.project?.name || "",
    },
  };

  // Shared content component
  const EditContent = () => (
    <>
      {/* Custom Tab Implementation */}
      <div className="flex-1 overflow-y-auto scroll-none p-4">
        <div className="w-full">
          {/* Custom Tab Buttons */}
          <div className="grid w-full grid-cols-2 mb-4 bg-muted rounded-md p-1">
            <Button
              type="button"
              variant={activeTab === "info" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("info")}
              className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Vehicle Info</span>
              <span className="sm:hidden">Info</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === "photos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("photos")}
              className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Camera className="h-4 w-4" />
              Photos
            </Button>
          </div>

          {/* Info Tab Content */}
          {activeTab === "info" && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-6">
                  <EditVehicleForm
                    vehicle={vehicleForForm}
                    projects={projects.map((p) => ({
                      id: p.id,
                      name: p.name,
                    }))}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Photos Tab Content */}
          {activeTab === "photos" && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Vehicle Photos & Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Vehicle Images Section */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-medium">Vehicle Images</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FileUploadSectionSimple
                        label="Front View"
                        accept="image/*"
                        currentFileUrl={selectedVehicle?.front_img_url}
                        onFileChange={handleFrontImgFileChange}
                        onKeepExistingChange={handleFrontImgKeepChange}
                        selectedFile={files.frontImg.file}
                        keepExisting={files.frontImg.keep}
                        icon={<Upload className="h-4 w-4" />}
                      />

                      <FileUploadSectionSimple
                        label="Back View"
                        accept="image/*"
                        currentFileUrl={selectedVehicle?.back_img_url}
                        onFileChange={handleBackImgFileChange}
                        onKeepExistingChange={handleBackImgKeepChange}
                        selectedFile={files.backImg.file}
                        keepExisting={files.backImg.keep}
                        icon={<Upload className="h-4 w-4" />}
                      />

                      <FileUploadSectionSimple
                        label="Side View 1"
                        accept="image/*"
                        currentFileUrl={selectedVehicle?.side1_img_url}
                        onFileChange={handleSide1ImgFileChange}
                        onKeepExistingChange={handleSide1ImgKeepChange}
                        selectedFile={files.side1Img.file}
                        keepExisting={files.side1Img.keep}
                        icon={<Upload className="h-4 w-4" />}
                      />

                      <FileUploadSectionSimple
                        label="Side View 2"
                        accept="image/*"
                        currentFileUrl={selectedVehicle?.side2_img_url}
                        onFileChange={handleSide2ImgFileChange}
                        onKeepExistingChange={handleSide2ImgKeepChange}
                        selectedFile={files.side2Img.file}
                        keepExisting={files.side2Img.keep}
                        icon={<Upload className="h-4 w-4" />}
                      />
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-medium">Documents</h4>
                        {(() => {
                          const documentsCount = [
                            selectedVehicle?.original_receipt_url ||
                              files.originalReceipt.file,
                            selectedVehicle?.car_registration_url ||
                              files.carRegistration.file,
                            selectedVehicle?.pgpc_inspection_image ||
                              files.pgpcInspection.file,
                          ].filter(Boolean).length;

                          return documentsCount > 0 && isDocumentsCollapsed ? (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              {documentsCount}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setIsDocumentsCollapsed(!isDocumentsCollapsed)
                        }
                        className="h-8 w-8 p-0"
                      >
                        {isDocumentsCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {!isDocumentsCollapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FileUploadSectionSimple
                          label="Original Receipt (OR)"
                          accept=".pdf,image/*"
                          currentFileUrl={selectedVehicle?.original_receipt_url}
                          onFileChange={handleReceiptFileChange}
                          onKeepExistingChange={handleReceiptKeepChange}
                          selectedFile={files.originalReceipt.file}
                          keepExisting={files.originalReceipt.keep}
                          icon={<FileText className="h-4 w-4" />}
                        />

                        <FileUploadSectionSimple
                          label="Car Registration (CR)"
                          accept=".pdf,image/*"
                          currentFileUrl={selectedVehicle?.car_registration_url}
                          onFileChange={handleRegistrationFileChange}
                          onKeepExistingChange={handleRegistrationKeepChange}
                          selectedFile={files.carRegistration.file}
                          keepExisting={files.carRegistration.keep}
                          icon={<FileText className="h-4 w-4" />}
                        />

                        <FileUploadSectionSimple
                          label="PGPC Inspection"
                          accept="image/*"
                          currentFileUrl={
                            selectedVehicle?.pgpc_inspection_image
                          }
                          onFileChange={handlePgpcFileChange}
                          onKeepExistingChange={handlePgpcKeepChange}
                          selectedFile={files.pgpcInspection.file}
                          keepExisting={files.pgpcInspection.keep}
                          icon={<Shield className="h-4 w-4" />}
                        />
                      </div>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <Button
                      ref={saveButtonRef}
                      onClick={handlePhotosSubmit}
                      className="w-full"
                      disabled={isUpdatingPhotos || updateSuccess}
                    >
                      {updateSuccess ? (
                        <>
                          <Check className="h-4 w-4 mr-2 text-green-600" />
                          Updated Successfully!
                        </>
                      ) : isUpdatingPhotos ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Update Photos & Documents
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Mobile view - Drawer
  if (isMobile) {
    return (
      <Drawer open={isEditMode} onOpenChange={handleClose}>
        <DrawerContent className="!max-h-[95vh]">
          {/* Mobile Header */}
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
                Edit Vehicle
              </DrawerTitle>
              <p className="text-sm text-muted-foreground">
                {selectedVehicle.brand} {selectedVehicle.model}
              </p>
            </div>
          </DrawerHeader>

          <EditContent />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop view - Dialog
  return (
    <Dialog open={isEditMode} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-4rem)] max-h-[90vh] flex flex-col p-4"
        style={{ maxWidth: "1024px" }}
      >
        {/* Desktop Header */}
        <DialogHeader className="p-4 pb-4 flex-shrink-0">
          <div className="text-center space-y-2">
            <DialogTitle className="text-xl font-bold">
              Edit Vehicle
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedVehicle.brand} {selectedVehicle.model}
            </p>
          </div>
        </DialogHeader>

        <EditContent />
      </DialogContent>
    </Dialog>
  );
}
