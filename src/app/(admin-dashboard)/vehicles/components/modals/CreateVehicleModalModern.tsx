"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useVehiclesStore, selectIsCreateModalOpen, selectIsMobile } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData } from "@/hooks/useVehiclesQuery";
import CreateVehicleForm from "../forms/CreateVehicleForm";

export default function CreateVehicleModalModern() {
  const isCreateModalOpen = useVehiclesStore(selectIsCreateModalOpen);
  const isMobile = useVehiclesStore(selectIsMobile);
  const { setIsCreateModalOpen, setIsMobile } = useVehiclesStore();
  
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

  // Get reference data
  const { projects } = useVehiclesWithReferenceData();
  
  // Debug: Log projects data
  console.log('🔍 Projects in modal:', projects);

  const handleSuccess = () => {
    setIsCreateModalOpen(false);
    // React Query cache will be invalidated by the mutation
  };

  const handleClose = () => {
    setIsCreateModalOpen(false);
  };

  // Mobile drawer implementation
  if (isMobile) {
    return (
      <Drawer open={isCreateModalOpen} onOpenChange={handleClose}>
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
                Create New Vehicle
              </DrawerTitle>
              <p className="text-sm text-muted-foreground">
                Add a new vehicle to your fleet
              </p>
            </div>
          </DrawerHeader>
          
          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <CreateVehicleForm 
              projects={projects
                .filter(p => p && p.id && p.name)
                .map(p => ({
                  id: p.id,
                  name: p.name
                }))} 
              onSuccess={handleSuccess}
              onCancel={handleClose}
              isMobile={true}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop dialog implementation  
  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent 
        className="!max-w-none !w-[55vw] max-h-[95vh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '55vw', width: '55vw' }}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl">Create New Vehicle</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add a new vehicle to your fleet with comprehensive details
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <CreateVehicleForm 
            projects={projects
              .filter(p => p && p.id && p.name)
              .map(p => ({
                id: p.id,
                name: p.name
              }))} 
            onSuccess={handleSuccess}
            onCancel={() => setIsCreateModalOpen(false)}
            isMobile={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}