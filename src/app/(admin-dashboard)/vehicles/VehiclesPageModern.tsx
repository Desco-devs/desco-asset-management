"use client";

import { useVehiclesStore, selectIsModalOpen, selectIsCreateModalOpen, selectIsMaintenanceModalOpen, selectIsEditMode, selectViewerImage, selectIsMobile } from "@/stores/vehiclesStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import VehiclesListModern from "./VehiclesListModern";
import VehicleModalModern from "./VehicleModalModern";
import CreateVehicleModalModern from "./CreateVehicleModalModern";
import EditVehicleModalModern from "./EditVehicleModalModern";

export default function VehiclesPageModern() {
  // Client state from Zustand (using optimized selectors)
  const isModalOpen = useVehiclesStore(selectIsModalOpen);
  const isCreateModalOpen = useVehiclesStore(selectIsCreateModalOpen);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  const isMaintenanceModalOpen = useVehiclesStore(selectIsMaintenanceModalOpen);
  const viewerImage = useVehiclesStore(selectViewerImage);
  const isMobile = useVehiclesStore(selectIsMobile);
  
  // Actions
  const { setViewerImage, setIsModalOpen } = useVehiclesStore();
  
  // Image viewer functions
  const closeImageViewer = () => {
    console.log('Closing image viewer in parent component');
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
  
  // Image Viewer Modal Component
  const ImageViewerModal = () => {
    if (!viewerImage) return null;
    
    console.log('Rendering global image viewer in parent component:', viewerImage);
    
    return (
      <Dialog open={true} onOpenChange={closeImageViewer}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] max-h-[95vh] sm:max-h-[90vh] p-0 bg-black/95">
          <DialogHeader className="p-4 bg-black/80">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg">
                {viewerImage.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadImage(viewerImage.url, `${viewerImage.title}.jpg`)}
                  className="text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeImageViewer}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div 
            className="flex-1 flex items-center justify-center p-4 min-h-[60vh] sm:min-h-[70vh] md:min-h-[75vh] lg:min-h-[80vh] cursor-zoom-out"
            onClick={closeImageViewer}
          >
            <img
              src={viewerImage.url}
              alt={viewerImage.title}
              className="max-w-full max-h-full object-contain"
              onClick={closeImageViewer}
            />
          </div>
          
          <div className="p-4 bg-black/80 text-center">
            <p className="text-white/70 text-sm">{isMobile ? 'Tap' : 'Click'} anywhere to close</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Main List Component */}
      <VehiclesListModern />

      {/* Modals - Only render when needed */}
      
      {/* Vehicle Details Modal */}
      {isModalOpen && <VehicleModalModern />}

      {/* Create Vehicle Modal */}
      {isCreateModalOpen && <CreateVehicleModalModern />}

      {/* Edit Vehicle Modal */}
      {isEditMode && <EditVehicleModalModern />}

      {/* Maintenance Modal will be added in Feature 6 */}
      
      {/* Global Image Viewer Modal - Always available */}
      <ImageViewerModal />
    </div>
  );
}