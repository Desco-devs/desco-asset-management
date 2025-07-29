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
import { useEquipmentStore, selectIsCreateModalOpen, selectIsMobile } from "@/stores/equipmentStore";
import { useProjects } from "@/hooks/api/use-projects";
import CreateEquipmentForm from "../forms/CreateEquipmentForm";

export default function CreateEquipmentModalModern() {
  const isCreateModalOpen = useEquipmentStore(selectIsCreateModalOpen);
  const isMobile = useEquipmentStore(selectIsMobile);
  const { setIsCreateModalOpen, setIsMobile } = useEquipmentStore();
  
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

  // Get reference data with loading and error states
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useProjects();
  const projects = projectsData?.data || [];

  // Add console logging for debugging
  console.log('🚀 CreateEquipmentModalModern - Projects data:', {
    projectsData,
    projects,
    projectsCount: projects.length,
    isLoading: projectsLoading,
    error: projectsError
  });

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
        <DrawerContent className="!max-h-[95dvh]">
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
                Create New Equipment
              </DrawerTitle>
              <p className="text-sm text-muted-foreground">
                Add new equipment to your inventory
              </p>
            </div>
          </DrawerHeader>
          
          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <CreateEquipmentForm 
              projects={projects.map(p => ({
                id: p.id,
                name: p.name
              }))} 
              onSuccess={handleSuccess}
              onCancel={handleClose}
              isMobile={true}
              projectsLoading={projectsLoading}
              projectsError={projectsError}
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
        className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '55vw', width: '55vw' }}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl">Create New Equipment</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add new equipment to your inventory with comprehensive details
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <CreateEquipmentForm 
            projects={projects.map(p => ({
              id: p.id,
              name: p.name
            }))} 
            onSuccess={handleSuccess}
            onCancel={() => setIsCreateModalOpen(false)}
            isMobile={false}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}