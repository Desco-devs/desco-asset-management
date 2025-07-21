"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarDays,
  User,
  Building2,
  MapPin,
  Car,
  FileText,
  Image,
  Receipt,
  ExternalLink,
  Shield,
  Edit,
  Wrench,
  X,
  Settings,
  Camera,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  Download,
} from "lucide-react";
import { useVehiclesStore, selectSelectedVehicle, selectIsModalOpen, selectIsEditMode, selectIsMaintenanceModalOpen, selectSelectedMaintenanceReport, selectIsMobile, selectIsPhotosCollapsed, selectIsDocumentsCollapsed, selectViewerImage } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData, useUpdateVehicle, useDeleteVehicle } from "@/hooks/useVehiclesQuery";
import VehicleMaintenanceReportsEnhanced from "./VehicleMaintenanceReportsEnhanced";
import CreateVehicleModalModern from "./CreateVehicleModalModern";
import EditVehicleModalModern from "./EditVehicleModalModern";

export default function VehicleModalModern() {
  // Server state from TanStack Query
  const { vehicles, projects, locations, users, maintenanceReports } = useVehiclesWithReferenceData();
  
  // Client state from Zustand
  const selectedVehicleFromStore = useVehiclesStore(selectSelectedVehicle);
  const isModalOpen = useVehiclesStore(selectIsModalOpen);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  const isMobile = useVehiclesStore(selectIsMobile);
  const isPhotosCollapsed = useVehiclesStore(selectIsPhotosCollapsed);
  const isDocumentsCollapsed = useVehiclesStore(selectIsDocumentsCollapsed);
  const viewerImage = useVehiclesStore(selectViewerImage);

  // Custom tab state
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'maintenance'>('details');
  
  // Debug the viewerImage state
  console.log('Current viewerImage state:', viewerImage, 'isMobile:', isMobile);
  
  // Get the most up-to-date vehicle data from TanStack Query cache
  const selectedVehicle = selectedVehicleFromStore 
    ? vehicles.find(v => v.id === selectedVehicleFromStore.id) || selectedVehicleFromStore
    : null;
  
  // Actions
  const { 
    setIsModalOpen, 
    setIsEditMode, 
    setSelectedVehicle,
    setIsMobile,
    setIsPhotosCollapsed,
    setIsDocumentsCollapsed,
    setViewerImage,
    closeAllModals
  } = useVehiclesStore();

  // Mutations
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();

  // Mobile detection using Zustand
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [setIsMobile]);


  // Helper functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
      : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300";
  };

  const isExpiringSoon = (expiryDate: string, beforeMonths: number) => {
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

  const isExpired = (expiryDate: string) => {
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;
      
      const today = new Date();
      return expiry < today;
    } catch {
      return false;
    }
  };

  const getNextInspectionDate = (lastInspection: string, beforeMonths: number) => {
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
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
    return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  const openFile = (url: string, title: string = "Vehicle Image") => {
    console.log('openFile called:', { url, title, isMobile, isImageFile: isImageFile(url) });
    if (isImageFile(url)) {
      // Set image viewer first, then handle mobile drawer
      setViewerImage({ url, title });
      console.log('Image viewer set to:', { url, title });
      
      if (isMobile) {
        // On mobile, close the drawer after setting the image viewer
        console.log('Mobile: closing drawer');
        setIsModalOpen(false);
      }
    } else {
      // For PDFs and other documents, open in new tab
      console.log('Opening document in new tab');
      window.open(url, "_blank");
    }
  };
  
  const closeImageViewer = () => {
    console.log('Closing image viewer');
    setViewerImage(null);
    if (isMobile) {
      // On mobile, reopen the drawer when closing image viewer
      console.log('Mobile: reopening drawer');
      setTimeout(() => {
        setIsModalOpen(true);
      }, 100);
    }
  };
  
  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const vehicleImages = (vehicle: any) => {
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
  const allVehicleImageSlots = (vehicle: any) => {
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

  const handleDelete = async () => {
    if (!selectedVehicle || !confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteVehicleMutation.mutateAsync(selectedVehicle.id);
      closeAllModals();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  if (!selectedVehicle) return null;

  // Shared content component
  const VehicleContent = () => (
    <>
      {/* Custom Tabbed Content Area */}
      <div className="flex-1 overflow-y-auto scroll-none p-4">
        <div className="w-full">
          {/* Custom Tab Buttons */}
          <div className="grid w-full grid-cols-3 mb-4 bg-muted rounded-md p-1">
            <Button
              type="button"
              variant={activeTab === 'details' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('details')}
              className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Details</span>
              <span className="sm:hidden">Info</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === 'photos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('photos')}
              className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Camera className="h-4 w-4" />
              Photos
            </Button>
            <Button
              type="button"
              variant={activeTab === 'maintenance' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('maintenance')}
              className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Maintenance</span>
              <span className="sm:hidden">Reports</span>
            </Button>
          </div>
            
            
          {/* Details Tab Content */}
          {activeTab === 'details' && (
            <div className="space-y-4 mt-4">
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

                    <div className="text-sm">
                      <span className="font-medium">Project:</span>
                      <span className="ml-2">{selectedVehicle.project?.name || 'No project'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Client:</span>
                      <span>{selectedVehicle.project?.client?.name || 'No client'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Location:</span>
                      <span>{selectedVehicle.project?.client?.location?.address || 'No location'}</span>
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
                          : isExpiringSoon(selectedVehicle.expiry_date, selectedVehicle.before)
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(selectedVehicle.expiry_date)}
                      {isExpired(selectedVehicle.expiry_date) && " (Expired)"}
                      {isExpiringSoon(selectedVehicle.expiry_date, selectedVehicle.before) &&
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

          {/* Photos Tab Content */}
          {activeTab === 'photos' && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Vehicle Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Vehicle Images Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">Vehicle Images</h4>
                        {(() => {
                          const imagesCount = vehicleImages(selectedVehicle).length;
                          
                          return imagesCount > 0 && isPhotosCollapsed ? (
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              {imagesCount}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsPhotosCollapsed(!isPhotosCollapsed)}
                        className="h-8 w-8 p-0"
                      >
                        {isPhotosCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {!isPhotosCollapsed && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {allVehicleImageSlots(selectedVehicle).map((image, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-2">
                              <div className="flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2">
                                  <Camera className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium text-sm">{image.label}</span>
                                </div>
                                {!image.url && (
                                  <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">Not Provided</span>
                                )}
                              </div>

                              {image.url ? (
                                <>
                                  <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                                    <img
                                      src={image.url}
                                      alt={`${selectedVehicle.brand} ${selectedVehicle.model} - ${image.label}`}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => openFile(image.url!, `${selectedVehicle.brand} ${selectedVehicle.model} - ${image.label}`)}
                                    />
                                  </div>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => openFile(image.url!, `${selectedVehicle.brand} ${selectedVehicle.model} - ${image.label}`)}
                                  >
                                    <ZoomIn className="h-3 w-3 mr-1" />
                                    View Full Size
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <div className="aspect-video bg-muted/10 rounded-md border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                                    <div className="text-center">
                                      <Camera className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                      <p className="text-xs text-muted-foreground">No image uploaded</p>
                                    </div>
                                  </div>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs"
                                    disabled
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1 opacity-50" />
                                    Not Available
                                  </Button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                      </>
                    )}
                  </div>

                  {/* Documents Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">Documents</h4>
                        {(() => {
                          const documentsCount = [
                            selectedVehicle.original_receipt_url,
                            selectedVehicle.car_registration_url,
                            selectedVehicle.pgpc_inspection_image
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
                        onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Original Receipt */}
                {selectedVehicle.original_receipt_url && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Original Receipt (OR)</span>
                    </div>

                    {isImageFile(selectedVehicle.original_receipt_url) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={selectedVehicle.original_receipt_url}
                          alt="Original Receipt"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(selectedVehicle.original_receipt_url!, "Original Receipt")}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(selectedVehicle.original_receipt_url)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(selectedVehicle.original_receipt_url!, "Original Receipt")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* Car Registration */}
                {selectedVehicle.car_registration_url && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Car Registration (CR)</span>
                    </div>

                    {isImageFile(selectedVehicle.car_registration_url) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={selectedVehicle.car_registration_url}
                          alt="Car Registration"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(selectedVehicle.car_registration_url!, "Car Registration")}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(selectedVehicle.car_registration_url)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(selectedVehicle.car_registration_url!, "Car Registration")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* PGPC Inspection Image */}
                {selectedVehicle.pgpc_inspection_image && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">PGPC Inspection</span>
                    </div>

                    {isImageFile(selectedVehicle.pgpc_inspection_image) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={selectedVehicle.pgpc_inspection_image}
                          alt="PGPC Inspection"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(selectedVehicle.pgpc_inspection_image!, "PGPC Inspection")}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(selectedVehicle.pgpc_inspection_image)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(selectedVehicle.pgpc_inspection_image!, "PGPC Inspection")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}
                      </div>
                    )}

                    {!isDocumentsCollapsed && (
                      <>
                        {[
                          selectedVehicle.original_receipt_url,
                          selectedVehicle.car_registration_url,
                          selectedVehicle.pgpc_inspection_image
                        ].filter(Boolean).length === 0 && (
                          <div className="text-center py-8 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25">
                            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                              No documents uploaded
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Maintenance Tab Content */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Maintenance Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VehicleMaintenanceReportsEnhanced vehicleId={selectedVehicle.id} />
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
      <>
        <Drawer open={isModalOpen} onOpenChange={handleClose}>
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
              <div className="text-center space-y-3">
                <DrawerTitle className="text-xl font-bold">
                  {selectedVehicle.brand} {selectedVehicle.model}
                </DrawerTitle>
                <div className="flex justify-center">
                  <Badge className={getStatusColor(selectedVehicle.status)}>
                    {selectedVehicle.status === 'OPERATIONAL' ? 'Operational' : 'Non-Operational'}
                  </Badge>
                </div>
              </div>
            </DrawerHeader>
            
            <VehicleContent />
            
            {/* Mobile Footer */}
            <DrawerFooter className="border-t bg-muted/30">
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  onClick={handleDelete} 
                  className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                  Delete Vehicle
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleEdit} 
                  className="flex-1 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit Vehicle
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
          className="max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-4rem)] max-h-[90vh] flex flex-col p-4"
          style={{ maxWidth: "1024px" }}
        >
          {/* Desktop Header */}
          <DialogHeader className="p-4 pb-4 flex-shrink-0">
            <div className="text-center space-y-3">
              <DialogTitle className="text-xl font-bold">
                {selectedVehicle.brand} {selectedVehicle.model}
              </DialogTitle>
              <div className="flex justify-center">
                <Badge className={getStatusColor(selectedVehicle.status)}>
                  {selectedVehicle.status === 'OPERATIONAL' ? 'Operational' : 'Non-Operational'}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <VehicleContent />
          
          {/* Desktop Footer */}
          <DialogFooter className="p-4 border-t bg-muted/30">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={handleDelete} 
                className="flex-1 gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                Delete Vehicle
              </Button>
              <Button 
                variant="outline" 
                onClick={handleEdit} 
                className="flex-1 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
              >
                <Edit className="h-4 w-4" />
                Edit Vehicle
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