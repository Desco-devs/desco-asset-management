// File: app/components/custom-reusable/modal/ImagePreviewModal.tsx
"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ImagePreviewModalProps {
  src: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export default function ImagePreviewModal({
  src,
  isOpen,
  onOpenChange,
}: ImagePreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0"
        onMouseEnter={() => onOpenChange(true)}
        onMouseLeave={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle></DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <img src={src} alt="Preview" className="w-full h-auto rounded" />
        </div>
        <div className="p-4 text-right">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
