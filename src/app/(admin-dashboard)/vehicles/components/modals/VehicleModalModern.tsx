"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useDeleteVehicle,
  // useUpdateVehicle,
  useVehiclesWithReferenceData,
} from "@/hooks/useVehiclesQuery";
import {
  selectIsDocumentsCollapsed,
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectIsPhotosCollapsed,
  selectSelectedVehicle,
  selectDeleteConfirmation,
  // selectViewerImage,
  useVehiclesStore,
} from "@/stores/vehiclesStore";
import {
  Building2,
  CalendarDays,
  Camera,
  Car,
  ChevronDown,
  ChevronUp,
  Edit,
  ExternalLink,
  FileText,
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
  ClipboardList,
} from "lucide-react";
import { useEffect, useState } from "react";

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
  front_img_url?: string;
  back_img_url?: string;
  side1_img_url?: string;
  side2_img_url?: string;
  original_receipt_url?: string;
  car_registration_url?: string;
  pgpc_inspection_image?: string;
  project?: {
    id: string;
    name: string;
  };
}
import EditVehicleModalModern from "./EditVehicleModalModern";
import VehicleMaintenanceReportsEnhanced from "../VehicleMaintenanceReportsEnhanced";
import VehiclePartsViewer from "../VehiclePartsViewer";

export default function VehicleModalModern() {
  // Server state from TanStack Query
  const { vehicles } = useVehiclesWithReferenceData();

  // Client state from Zustand
  const selectedVehicleFromStore = useVehiclesStore(selectSelectedVehicle);
  const isModalOpen = useVehiclesStore(selectIsModalOpen);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  const isMobile = useVehiclesStore(selectIsMobile);
  const isPhotosCollapsed = useVehiclesStore(selectIsPhotosCollapsed);
  const isDocumentsCollapsed = useVehiclesStore(selectIsDocumentsCollapsed);
  const deleteConfirmation = useVehiclesStore(selectDeleteConfirmation);
  // const viewerImage = useVehiclesStore(selectViewerImage);

  // Custom tab state - EXACTLY like EquipmentModalModern with 5 tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts' | 'maintenance'>('details');


  // Remove debug log that causes re-renders

  // Get the most up-to-date vehicle data from TanStack Query cache
  const selectedVehicle = selectedVehicleFromStore
    ? vehicles.find((v) => v.id === selectedVehicleFromStore.id) ||
      selectedVehicleFromStore
    : null;

  // Actions
  const {
    setIsModalOpen,
    setIsEditMode,
    setIsMobile,
    setIsPhotosCollapsed,
    setIsDocumentsCollapsed,
    setDeleteConfirmation,
    setViewerImage,
    closeAllModals,
  } = useVehiclesStore();

  // Mutations
  // const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();

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

  // Helper functions
  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
      : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300";
  };

  const isExpiringSoon = (expiryDate: string | Date, beforeMonths: number) => {
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;

      const today = new Date();
      const warningDate = new Date(expiry);
      warningDate.setMonth(warningDate.getMonth() - beforeMonths);

      return today >= warningDate && today < expiry;
    } catch {
      return false;
    }
  };

  const isExpired = (expiryDate: string | Date) => {
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;

      const today = new Date();
      return expiry < today;
    } catch {
      return false;
    }
  };

  const getNextInspectionDate = (
    lastInspection: string | Date,
    beforeMonths: number
  ) => {
    try {
      const lastDate = new Date(lastInspection);
      if (isNaN(lastDate.getTime())) return new Date();

      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + beforeMonths);
      return nextDate;
    } catch {
      return new Date();
    }
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      const urlPath = new URL(url).pathname;
      return urlPath.split("/").pop() || "Document";
    } catch {
      return "Document";
    }
  };

  const isImageFile = (url: string) => {
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".bmp",
      ".svg",
    ];
    return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  const openFile = (url: string, title: string = "Vehicle Image") => {
    console.log("openFile called:", {
      url,
      title,
      isMobile,
      isImageFile: isImageFile(url),
    });
    if (isImageFile(url)) {
      // Set image viewer first, then handle mobile drawer
      setViewerImage({ url, title });
      console.log("Image viewer set to:", { url, title });

      if (isMobile) {
        // On mobile, close the drawer after setting the image viewer
        console.log("Mobile: closing drawer");
        setIsModalOpen(false);
      }
    } else {
      // For PDFs and other documents, open in new tab
      console.log("Opening document in new tab");
      window.open(url, "_blank");
    }
  };

  // const closeImageViewer = () => {
  //   console.log("Closing image viewer");
  //   setViewerImage(null);
  //   if (isMobile) {
  //     // On mobile, reopen the drawer when closing image viewer
  //     console.log("Mobile: reopening drawer");
  //     setTimeout(() => {
  //       setIsModalOpen(true);
  //     }, 100);
  //   }
  // };

  // const downloadImage = (url: string, filename: string) => {
  //   const link = document.createElement("a");
  //   link.href = url;
  //   link.download = filename;
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };

  const vehicleImages = (vehicle: Vehicle) => {
    if (!vehicle) return [];

    const images = [
      { url: vehicle.front_img_url, label: "Front View" },
      { url: vehicle.back_img_url, label: "Back View" },
      { url: vehicle.side1_img_url, label: "Left Side" },
      { url: vehicle.side2_img_url, label: "Right Side" },
    ].filter((img) => img.url);

    return images;
  };

  // All vehicle image slots (including missing ones)
  const allVehicleImageSlots = (vehicle: Vehicle) => {
    if (!vehicle) return [];

    return [
      { url: vehicle.front_img_url, label: "Front View" },
      { url: vehicle.back_img_url, label: "Back View" },
      { url: vehicle.side1_img_url, label: "Left Side" },
      { url: vehicle.side2_img_url, label: "Right Side" },
    ];
  };

  const handleEdit = () => {
    // Close current modal first, then open edit modal
    setIsModalOpen(false);
    setTimeout(() => {
      setIsEditMode(true);
    }, 100); // Small delay to ensure proper transition
  };

  const handleDelete = () => {
    if (selectedVehicle) {
      setDeleteConfirmation({ isOpen: true, vehicle: selectedVehicle });
      setIsModalOpen(false); // Close main modal to show delete confirmation
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  // Helper function to count maintenance reports for selected vehicle
  const getMaintenanceReportsCount = () => {
    // This would need to be implemented based on your maintenance reports data structure
    // For now, returning 0 as placeholder
    return 0;
  };

  // Helper function to count images for selected vehicle
  const getImagesCount = () => {
    if (!selectedVehicle) return 0;
    
    let count = 0;
    if (selectedVehicle.front_img_url) count++;
    if (selectedVehicle.back_img_url) count++;
    if (selectedVehicle.side1_img_url) count++;
    if (selectedVehicle.side2_img_url) count++;
    
    return count;
  };

  // Helper function to count documents for selected vehicle
  const getDocumentsCount = () => {
    if (!selectedVehicle) return 0;
    
    let count = 0;
    if (selectedVehicle.original_receipt_url) count++;
    if (selectedVehicle.car_registration_url) count++;
    if (selectedVehicle.pgpc_inspection_image) count++;
    
    return count;
  };

  // Helper function to count vehicle parts for selected vehicle - EXACTLY like EquipmentModalModern
  const getVehiclePartsCount = () => {
    if (!selectedVehicle || !selectedVehicle.vehicle_parts) return 0;
    
    // Parse vehicle parts data using the same logic as VehiclePartsViewer
    const parsePartsData = (parts: any) => {
      if (!parts) return { rootFiles: [], folders: [] };

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

      // Handle array format - NEW: Check if first element is structured JSON (like VehiclePartsViewer)
      if (Array.isArray(parts)) {
        if (parts.length === 0) {
          return { rootFiles: [], folders: [] };
        }

        // NEW: Check if first element contains structured data (JSON)
        if (parts.length === 1 && typeof parts[0] === 'string') {
          try {
            const parsed = JSON.parse(parts[0]);
            if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
              // This is the new structured format stored as JSON in array
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

    const parsedData = parsePartsData(selectedVehicle.vehicle_parts);
    
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
    
    return count;
  };

  // Tab content components - EXACTLY like EquipmentModalModern
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

  if (!selectedVehicle) return null;

  // Image/Document Viewer Component - EXACTLY like EquipmentModalModern
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
                  console.log('Opening image viewer for:', label, url);
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
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">{description}</p>

        {/* Image Viewer Modal - Responsive sizing for mobile and desktop */}
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
                    console.error('Image failed to load:', url);
                    console.error('Error details:', e);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', url);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  };

  // Shared content component
  const VehicleContent = () => (
    <>
      {/* Tab Navigation - EXACTLY like EquipmentModalModern */}
      <div className="space-y-4">
        <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-5 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
          {isMobile ? (
            <>
              {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
              {renderTabButton('images', 'Images', <Camera className="h-4 w-4" />, getImagesCount() > 0 ? getImagesCount() : undefined)}
              {renderTabButton('documents', 'Docs', <FileText className="h-4 w-4" />, getDocumentsCount() > 0 ? getDocumentsCount() : undefined)}
              {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />, getVehiclePartsCount() > 0 ? getVehiclePartsCount() : undefined)}
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
                Vehicle Details
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
                Vehicle Images
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
                {getVehiclePartsCount() > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                    {getVehiclePartsCount()}
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Information */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Brand:</span>
                      <span>{selectedVehicle.brand}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Model:</span>
                      <span>{selectedVehicle.model}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Type:</span>
                      <span>{selectedVehicle.type}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Owner:</span>
                      <span>{selectedVehicle.owner}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Plate Number:</span>
                      <span>{selectedVehicle.plate_number}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Status:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedVehicle.status === "OPERATIONAL"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedVehicle.status === "OPERATIONAL"
                          ? "Operational"
                          : "Non-Operational"}
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Project:</span>
                      <span className="ml-2">
                        {selectedVehicle.project?.name || "No project"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Client:</span>
                      <span>
                        {selectedVehicle.project?.client?.name || "No client"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Location:</span>
                      <span>
                        {selectedVehicle.project?.client?.location?.address ||
                          "No location"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Dates & Inspection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Registration Expires:</span>
                      <span
                        className={`${
                          isExpired(selectedVehicle.expiry_date)
                            ? "text-red-600 font-semibold"
                            : isExpiringSoon(
                                selectedVehicle.expiry_date,
                                selectedVehicle.before
                              )
                            ? "text-orange-600 font-semibold"
                            : ""
                        }`}
                      >
                        {formatDate(selectedVehicle.expiry_date)}
                        {isExpired(selectedVehicle.expiry_date) && " (Expired)"}
                        {isExpiringSoon(
                          selectedVehicle.expiry_date,
                          selectedVehicle.before
                        ) &&
                          !isExpired(selectedVehicle.expiry_date) &&
                          " (Expiring Soon)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Last Inspection:</span>
                      <span>{formatDate(selectedVehicle.inspection_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Next Inspection Due:</span>
                      <span
                        className={`${
                          getNextInspectionDate(
                            selectedVehicle.inspection_date,
                            selectedVehicle.before
                          ) < new Date()
                            ? "text-red-600 font-semibold"
                            : getNextInspectionDate(
                                selectedVehicle.inspection_date,
                                selectedVehicle.before
                              ).getTime() -
                                new Date().getTime() <
                              30 * 24 * 60 * 60 * 1000
                            ? "text-orange-600 font-semibold"
                            : ""
                        }`}
                      >
                        {formatDate(
                          getNextInspectionDate(
                            selectedVehicle.inspection_date,
                            selectedVehicle.before
                          ).toISOString()
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Inspection Frequency:</span>
                      <span>
                        Every {selectedVehicle.before} month
                        {selectedVehicle.before !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Date Added:</span>
                      <span>{formatDate(selectedVehicle.created_at)}</span>
                    </div>

                    {selectedVehicle.user && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Added by:</span>
                        <span>{selectedVehicle.user.full_name}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Remarks */}
              {selectedVehicle.remarks && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Remarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground bg-muted/50 p-3 rounded-md text-sm">
                      {selectedVehicle.remarks}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

        {/* Images Tab - EXACTLY like EquipmentModalModern */}
        {activeTab === 'images' && (
          <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Vehicle Images {isMobile ? '' : ''}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Photos of this vehicle from different angles. These images help with identification, insurance claims, and maintenance records.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {/* Front View */}
                    {selectedVehicle.front_img_url && (
                      <ImageViewerSection 
                        url={selectedVehicle.front_img_url}
                        label="Front View" 
                        description="Front view of the vehicle"
                      />
                    )}
                    
                    {/* Back View */}
                    {selectedVehicle.back_img_url && (
                      <ImageViewerSection 
                        url={selectedVehicle.back_img_url}
                        label="Back View" 
                        description="Back view of the vehicle"
                      />
                    )}
                    
                    {/* Side View 1 */}
                    {selectedVehicle.side1_img_url && (
                      <ImageViewerSection 
                        url={selectedVehicle.side1_img_url}
                        label="Left Side View" 
                        description="Left side view of the vehicle"
                      />
                    )}

                    {/* Side View 2 */}
                    {selectedVehicle.side2_img_url && (
                      <ImageViewerSection 
                        url={selectedVehicle.side2_img_url}
                        label="Right Side View" 
                        description="Right side view of the vehicle"
                      />
                    )}
                  </div>
                  {!selectedVehicle.front_img_url && !selectedVehicle.back_img_url && !selectedVehicle.side1_img_url && !selectedVehicle.side2_img_url && (
                    <div className="text-center py-8">
                      <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No images available for this vehicle</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Documents Tab - EXACTLY like EquipmentModalModern */}
        {activeTab === 'documents' && (
          <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents {isMobile ? '' : ''}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Important vehicle documents for compliance and record-keeping. Accepted formats: PDF and image files.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {/* Original Receipt (OR) */}
                    {selectedVehicle.original_receipt_url && (
                      <ImageViewerSection 
                        url={selectedVehicle.original_receipt_url}
                        label="Original Receipt (OR)" 
                        description="Proof of purchase document"
                      />
                    )}
                    
                    {/* Car Registration */}
                    {selectedVehicle.car_registration_url && (
                      <ImageViewerSection 
                        url={selectedVehicle.car_registration_url}
                        label="Car Registration (CR)" 
                        description="Official vehicle registration certificate"
                      />
                    )}

                    {/* PGPC Inspection */}
                    {selectedVehicle.pgpc_inspection_image && (
                      <ImageViewerSection 
                        url={selectedVehicle.pgpc_inspection_image}
                        label="PGPC Inspection" 
                        description="PGPC inspection certificate"
                      />
                    )}
                  </div>
                  {!selectedVehicle.original_receipt_url && !selectedVehicle.car_registration_url && !selectedVehicle.pgpc_inspection_image && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No documents available for this vehicle</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Parts Tab */}
        {activeTab === 'parts' && (
          <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Vehicle Parts</h3>
              <p className="text-sm text-muted-foreground">
                View and browse parts documentation organized in folders.
              </p>
            </div>
            <VehiclePartsViewer 
              vehicleParts={
                selectedVehicle.vehicle_parts 
                  ? typeof selectedVehicle.vehicle_parts === 'string'
                    ? JSON.parse(selectedVehicle.vehicle_parts)
                    : selectedVehicle.vehicle_parts
                  : { rootFiles: [], folders: [] }
              } 
            />
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
            <VehicleMaintenanceReportsEnhanced vehicleId={selectedVehicle.id} />
          </div>
        )}

      </div> {/* End Tab Content Container */}
    </>
  );

  // Mobile view - Drawer
  if (isMobile) {
    return (
      <>
        <Drawer open={isModalOpen} onOpenChange={handleClose}>
          <DrawerContent className="!max-h-[95vh]">
            {/* Mobile Header - Exact copy from EquipmentModalModern */}
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
                  {selectedVehicle.brand} {selectedVehicle.model}
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">
                  View vehicle details and maintenance records
                </p>
              </div>
            </DrawerHeader>
            
            {/* Mobile Content - Exact copy from EquipmentModalModern */}
            <div className="flex-1 overflow-y-auto p-4">
              <VehicleContent />
            </div>

            {/* Mobile Action Buttons in Footer */}
            <DrawerFooter className="p-4 pt-2 border-t bg-background">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEdit}
                  className="flex-1"
                  size="lg"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Vehicle
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteVehicleMutation.isPending}
                  className="flex-1"
                  size="lg"
                >
                  {deleteVehicleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Vehicle
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>

          {/* Edit Modal */}
          {isEditMode && <EditVehicleModalModern />}
        </Drawer>
      </>
    );
  }

  // Desktop view - Dialog
  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={handleClose}>
        <DialogContent 
          className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
          style={{ maxWidth: '55vw', width: '55vw' }}
        >
          {/* Desktop Header */}
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl">{selectedVehicle.brand} {selectedVehicle.model}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              View vehicle details, maintenance records, and documentation
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <VehicleContent />
          </div>

          {/* Desktop Action Buttons in Footer */}
          <DialogFooter className="pt-4 border-t bg-background">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleEdit}
                className="flex-1"
                size="lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Vehicle
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteVehicleMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {deleteVehicleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Vehicle
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>

        {/* Edit Modal */}
        {isEditMode && <EditVehicleModalModern />}
      </Dialog>
    </>
  );
}
