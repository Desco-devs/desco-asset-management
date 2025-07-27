'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { MaintenanceReportForm } from '@/components/forms/MaintenanceReportForm'
import { 
  MaintenanceReport
} from '@/types/equipment'

interface MaintenanceReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  equipmentId?: string
  locationId?: string
  report?: MaintenanceReport | null
  loading?: boolean
  mode: 'create' | 'edit' | 'view'
}

export function MaintenanceReportModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  equipmentId,
  locationId,
  report, 
  loading = false, 
  mode
}: MaintenanceReportModalProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSubmit = async (data: any) => {
    await onSubmit(data)
  }

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Create Maintenance Report'
      case 'edit': return 'Edit Maintenance Report'
      case 'view': return 'Maintenance Report Details'
      default: return 'Maintenance Report'
    }
  }

  const content = (
    <MaintenanceReportForm
      equipmentId={equipmentId}
      locationId={locationId}
      report={report || undefined}
      onSubmit={handleSubmit}
      onCancel={onClose}
      loading={loading}
      mode={mode}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="!max-h-[95vh] flex flex-col">
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
            <DrawerTitle className="flex items-center justify-between pr-8">
              <span>{getTitle()}</span>
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-4 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>{getTitle()}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}