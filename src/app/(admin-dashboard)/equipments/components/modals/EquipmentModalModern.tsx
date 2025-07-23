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
  useDeleteEquipment,
  useEquipmentsWithReferenceData,
} from "@/hooks/useEquipmentsQuery";
import {
  selectIsDocumentsCollapsed,
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectIsPhotosCollapsed,
  selectSelectedEquipment,
  useEquipmentsStore,
} from "@/stores/equipmentsStore";
import {
  Building2,
  CalendarDays,
  Camera,
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
} from "lucide-react";
import { useEffect, useState } from "react";
import EditEquipmentModalModern from "./EditEquipmentModalModern";
import EquipmentMaintenanceReportsEnhanced from "../EquipmentMaintenanceReportsEnhanced";

export default function EquipmentModalModern() {
  // Server state from TanStack Query
  const { equipments } = useEquipmentsWithReferenceData();

  // Client state from Zustand
  const selectedEquipmentFromStore = useEquipmentsStore(selectSelectedEquipment);
  const isModalOpen = useEquipmentsStore(selectIsModalOpen);
  const isEditMode = useEquipmentsStore(selectIsEditMode);
  const isMobile = useEquipmentsStore(selectIsMobile);
  const isPhotosCollapsed = useEquipmentsStore(selectIsPhotosCollapsed);
  const isDocumentsCollapsed = useEquipmentsStore(selectIsDocumentsCollapsed);

  // Custom tab state
  const [activeTab, setActiveTab] = useState<"details" | "maintenance" | "parts">("details");

  // Actions
  const {
    setIsModalOpen,
    setIsEditMode,
    setSelectedEquipment,
    setIsPhotosCollapsed,
    setIsDocumentsCollapsed,
    setViewerImage,
    setDeleteConfirmation,
  } = useEquipmentsStore();

  // Mutations
  const deleteEquipmentMutation = useDeleteEquipment();

  // Get the latest equipment data from the server
  const selectedEquipment = selectedEquipmentFromStore
    ? equipments.find((e) => e.uid === selectedEquipmentFromStore.uid) ||
      selectedEquipmentFromStore
    : null;

  useEffect(() => {
    if (!isModalOpen) {
      setActiveTab("details");
    }
  }, [isModalOpen]);

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
    setIsEditMode(false);
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleDelete = () => {
    if (selectedEquipment) {
      setDeleteConfirmation({ isOpen: true, equipment: selectedEquipment });
      setIsModalOpen(false); // Close main modal to show delete confirmation
    }
  };

  const handleImageClick = (url: string, title: string) => {
    setViewerImage({ url, title });
    if (isMobile) {
      setIsModalOpen(false); // Close drawer on mobile when viewing image
    }
  };

  // Helper function to calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!selectedEquipment) return null;

  const daysUntilExpiry = getDaysUntilExpiry(selectedEquipment.insuranceExpirationDate);

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
      url: selectedEquipment.thirdpartyInspectionImage,
      title: "Third-party Inspection",
      icon: Shield,
    },
    {
      url: selectedEquipment.pgpcInspectionImage,
      title: "PGPC Inspection",
      icon: Shield,
    },
  ].filter(img => img.url);

  // Equipment documents (PDFs and downloadable files)
  const documents = [
    {
      url: selectedEquipment.originalReceiptUrl,
      title: "Original Receipt",
      icon: Receipt,
    },
    {
      url: selectedEquipment.equipmentRegistrationUrl,
      title: "Equipment Registration",
      icon: FileText,
    },
  ].filter(doc => doc.url);

  const ModalContent = () => (
    <div className="space-y-6">
      {/* Header with Equipment Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              {selectedEquipment.brand} {selectedEquipment.model}
            </h2>
            <p className="text-muted-foreground mt-1">{selectedEquipment.type}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteEquipmentMutation.isPending}
              className="gap-2"
            >
              {deleteEquipmentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        </div>

        {/* Status and Key Info */}
        <div className="flex flex-wrap gap-2">
          <Badge
            className={
              selectedEquipment.status === "OPERATIONAL"
                ? "bg-green-100 text-green-800 hover:bg-green-200"
                : "bg-red-100 text-red-800 hover:bg-red-200"
            }
          >
            {selectedEquipment.status}
          </Badge>

          {selectedEquipment.plateNumber && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {selectedEquipment.plateNumber}
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

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-6">
          {["details", "maintenance", "parts"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "details" && "Details"}
              {tab === "maintenance" && "Maintenance"}
              {tab === "parts" && "Parts"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* Equipment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Equipment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Owner:</span>
                    <span className="font-medium">{selectedEquipment.owner}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Project:</span>
                    <span className="font-medium">
                      {selectedEquipment.project?.name || "Unassigned"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Client:</span>
                    <span className="font-medium">
                      {selectedEquipment.project?.client?.name || "No client"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <span className="font-medium">
                      {selectedEquipment.project?.client?.location?.address || "No location"}
                    </span>
                  </div>

                  {selectedEquipment.insuranceExpirationDate && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Insurance Expires:</span>
                      <span
                        className={`font-medium ${
                          daysUntilExpiry !== null && daysUntilExpiry <= 7
                            ? "text-red-600"
                            : daysUntilExpiry !== null && daysUntilExpiry <= 30
                            ? "text-orange-600"
                            : ""
                        }`}
                      >
                        {new Date(selectedEquipment.insuranceExpirationDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {selectedEquipment.inspectionDate && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Last Inspection:</span>
                      <span className="font-medium">
                        {new Date(selectedEquipment.inspectionDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedEquipment.remarks && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Remarks:</h4>
                  <p className="text-sm text-muted-foreground">{selectedEquipment.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos Section */}
          {images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsPhotosCollapsed(!isPhotosCollapsed)}
                >
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Photos ({images.length})
                  </div>
                  {isPhotosCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
              {!isPhotosCollapsed && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div
                        key={`${selectedEquipment.uid}-image-${index}-${image.title}`}
                        className="relative group cursor-pointer"
                        onClick={() => handleImageClick(image.url!, image.title)}
                      >
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={image.url!}
                            alt={image.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <image.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{image.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Inspection Images Section */}
          {inspectionImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Inspection Images ({inspectionImages.length})
                  </div>
                  {isDocumentsCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
              {!isDocumentsCollapsed && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inspectionImages.map((image, index) => (
                      <div
                        key={`${selectedEquipment.uid}-inspection-${index}-${image.title}`}
                        className="relative group cursor-pointer"
                        onClick={() => handleImageClick(image.url!, image.title)}
                      >
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={image.url!}
                            alt={image.title}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <image.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{image.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Documents Section */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents ({documents.length})
                  </div>
                  {isDocumentsCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
              {!isDocumentsCollapsed && (
                <CardContent>
                  <div className="space-y-3">
                    {documents.map((document, index) => (
                      <div
                        key={`${selectedEquipment.uid}-document-${index}-${document.title}`}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <document.icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{document.title}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-2"
                        >
                          <a href={document.url!} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}

      {activeTab === "maintenance" && (
        <div>
          <EquipmentMaintenanceReportsEnhanced equipmentId={selectedEquipment.uid} />
        </div>
      )}

      {activeTab === "parts" && (
        <div>
          <p className="text-muted-foreground text-center py-8">
            Equipment parts management functionality will be implemented soon.
          </p>
        </div>
      )}
    </div>
  );

  // Show edit modal instead if in edit mode
  if (isEditMode) {
    return <EditEquipmentModalModern />;
  }

  return (
    <>
      {isMobile ? (
        <Drawer open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="sr-only">Equipment Details</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <ModalContent />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="sr-only">Equipment Details</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <ModalContent />
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Inline Image Viewer Modal - Same pattern as PartsFolderManager */}
      {showImageViewer && viewerImageData && (
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0">
            <DialogHeader className="p-4 bg-black/80 text-white relative z-10">
              <DialogTitle className="flex items-center justify-between">
                <span className="text-white truncate pr-4">{viewerImageData.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageViewer(false)}
                  className="text-white hover:bg-white/20 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex items-center justify-center bg-black min-h-[70vh]">
              <img
                src={viewerImageData.url}
                alt={viewerImageData.title}
                className="max-w-full max-h-[80vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="absolute inset-0 bg-black" onClick={() => setShowImageViewer(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}