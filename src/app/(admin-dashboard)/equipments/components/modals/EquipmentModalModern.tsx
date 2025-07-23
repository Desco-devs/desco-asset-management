"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  Eye,
  FileText,
  Hash,
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
import EquipmentPartsViewer from "../EquipmentPartsViewer";

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

  // Custom tab state - EXACTLY like CreateEquipmentForm with Images and Documents tabs
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'documents' | 'parts' | 'maintenance'>('details');

  // Actions
  const {
    setIsModalOpen,
    setIsEditMode,
    setSelectedEquipment,
    setIsPhotosCollapsed,
    setIsDocumentsCollapsed,
    setDeleteConfirmation,
    setIsEquipmentMaintenanceModalOpen,
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
    // Close any open maintenance modals
    setIsEquipmentMaintenanceModalOpen(false);
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

  // Image/Document Viewer Component - EXACTLY like FileUploadSectionSimple
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
                  <Eye className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">{description}</p>

        {/* Image Viewer Modal - Responsive sizing for mobile and desktop like FileUploadSectionSimple */}
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
                <img
                  src={url}
                  alt={label}
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

  // Tab content components - EXACTLY like CreateEquipmentForm
  const renderTabButton = (tab: 'details' | 'images' | 'documents' | 'parts' | 'maintenance', label: string, icon: React.ReactNode) => (
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

  const ModalContent = () => (
    <div className="space-y-4">

      {/* Tab Navigation - EXACTLY like CreateEquipmentForm */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-5 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
            {renderTabButton('images', 'Images', <Camera className="h-4 w-4" />)}
            {renderTabButton('documents', 'Docs', <FileText className="h-4 w-4" />)}
            {renderTabButton('parts', 'Parts', <Receipt className="h-4 w-4" />)}
            {renderTabButton('maintenance', 'Maintenance', <Wrench className="h-4 w-4" />)}
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
              onClick={() => setActiveTab('images')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'images'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Camera className="h-4 w-4" />
              Equipment Images
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
              <Receipt className="h-4 w-4" />
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
              <Wrench className="h-4 w-4" />
              Maintenance Reports
            </button>
          </>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className={`${isMobile ? 'space-y-6' : 'space-y-8'}`}>
          {/* Equipment Details */}
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Equipment Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View detailed information about this equipment
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Equipment Identity Section */}
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Brand
                    </Label>
                    <div className="font-medium text-foreground">{selectedEquipment.brand}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Model
                    </Label>
                    <div className="font-medium text-foreground">{selectedEquipment.model}</div>
                  </div>

                  <div className="space-y-2">
                    <Label>Equipment Type</Label>
                    <div className="font-medium text-foreground">{selectedEquipment.type}</div>
                  </div>

                  {selectedEquipment.plateNumber && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Plate/Serial Number
                      </Label>
                      <div className="font-medium text-foreground font-mono">{selectedEquipment.plateNumber}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ownership & Project Section */}
              <div className="space-y-4">
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Owner
                    </Label>
                    <div className="font-medium text-foreground">{selectedEquipment.owner}</div>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned Project</Label>
                    <div className="font-medium text-foreground">{selectedEquipment.project?.name || "Unassigned"}</div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Operational Status
                  </Label>
                  <div className="flex items-center gap-2 flex-wrap">
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
              </div>
            </CardContent>
          </Card>

          {/* Inspection & Compliance Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Inspection & Compliance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Inspection schedules and compliance information
              </p>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {selectedEquipment.inspectionDate && (
                  <div className="space-y-2">
                    <Label>Last Inspection Date</Label>
                    <div className="font-medium text-foreground">
                      {new Date(selectedEquipment.inspectionDate).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {selectedEquipment.insuranceExpirationDate && (
                  <div className="space-y-2">
                    <Label>Insurance Expiration Date</Label>
                    <div className={`font-medium ${
                      daysUntilExpiry !== null && daysUntilExpiry <= 7
                        ? "text-red-600"
                        : daysUntilExpiry !== null && daysUntilExpiry <= 30
                        ? "text-orange-600"
                        : "text-foreground"
                    }`}>
                      {new Date(selectedEquipment.insuranceExpirationDate).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Client</Label>
                  <div className="font-medium text-foreground">{selectedEquipment.project?.client?.name || "No client"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {selectedEquipment.remarks && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Additional Notes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Special notes and remarks about this equipment
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground">
                    {selectedEquipment.remarks}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Images Tab - EXACTLY like CreateEquipmentForm */}
      {activeTab === 'images' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Equipment Images {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Photos and inspection images for this equipment. These images help with identification, insurance claims, and maintenance records.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Equipment Image */}
                  {selectedEquipment.image_url && (
                    <ImageViewerSection 
                      url={selectedEquipment.image_url}
                      label="Equipment Image" 
                      description="Equipment Image"
                    />
                  )}
                  
                  {/* Third-party Inspection */}
                  {selectedEquipment.thirdpartyInspectionImage && (
                    <ImageViewerSection 
                      url={selectedEquipment.thirdpartyInspectionImage}
                      label="Third-party Inspection" 
                      description="Third-party Inspection"
                    />
                  )}
                  
                  {/* PGPC Inspection */}
                  {selectedEquipment.pgpcInspectionImage && (
                    <ImageViewerSection 
                      url={selectedEquipment.pgpcInspectionImage}
                      label="PGPC Inspection" 
                      description="PGPC Inspection"
                    />
                  )}
                </div>
                {!selectedEquipment.image_url && !selectedEquipment.thirdpartyInspectionImage && !selectedEquipment.pgpcInspectionImage && (
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No images available for this equipment</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents Tab - EXACTLY like CreateEquipmentForm */}
      {activeTab === 'documents' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents {isMobile ? '' : ''}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Important equipment documents for compliance and record-keeping. Accepted formats: PDF and image files.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {/* Original Receipt (OR) */}
                  {selectedEquipment.originalReceiptUrl && (
                    <ImageViewerSection 
                      url={selectedEquipment.originalReceiptUrl}
                      label="Original Receipt (OR)" 
                      description="Proof of purchase document"
                    />
                  )}
                  
                  {/* Equipment Registration */}
                  {selectedEquipment.equipmentRegistrationUrl && (
                    <ImageViewerSection 
                      url={selectedEquipment.equipmentRegistrationUrl}
                      label="Equipment Registration" 
                      description="Official equipment registration certificate"
                    />
                  )}
                </div>
                {!selectedEquipment.originalReceiptUrl && !selectedEquipment.equipmentRegistrationUrl && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No documents available for this equipment</p>
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
            <h3 className="text-lg font-semibold">Equipment Parts</h3>
            <p className="text-sm text-muted-foreground">
              View and browse parts documentation organized in folders.
            </p>
          </div>
          <EquipmentPartsViewer equipmentParts={selectedEquipment.equipmentParts} />
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <EquipmentMaintenanceReportsEnhanced equipmentId={selectedEquipment.uid} />
        </div>
      )}

    </div>
  );

  // Show edit modal instead if in edit mode
  if (isEditMode) {
    return <EditEquipmentModalModern />;
  }

  // Mobile drawer implementation
  if (isMobile) {
    return (
      <>
        <Drawer open={isModalOpen} onOpenChange={handleClose}>
          <DrawerContent className="!max-h-[95vh]">
            {/* Mobile Header - Exact copy from CreateEquipmentModalModern */}
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
                  {selectedEquipment.brand} {selectedEquipment.model}
                </DrawerTitle>
                <p className="text-sm text-muted-foreground">
                  View equipment details and maintenance records
                </p>
              </div>
            </DrawerHeader>
            
            {/* Mobile Content - Exact copy from CreateEquipmentModalModern */}
            <div className="flex-1 overflow-y-auto p-4">
              <ModalContent />
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
                  Edit Equipment
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteEquipmentMutation.isPending}
                  className="flex-1"
                  size="lg"
                >
                  {deleteEquipmentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Equipment
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop dialog implementation - Exact copy from CreateEquipmentModalModern
  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="!max-w-none !w-[55vw] max-h-[95vh] overflow-hidden flex flex-col p-6"
          style={{ maxWidth: '55vw', width: '55vw' }}
        >
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl">{selectedEquipment.brand} {selectedEquipment.model}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              View equipment details, maintenance records, and documentation
            </p>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <ModalContent />
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
                Edit Equipment
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteEquipmentMutation.isPending}
                className="flex-1"
                size="lg"
              >
                {deleteEquipmentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Equipment
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}