// File: app/components/custom-reusable/modal/ImagePreviewModal.tsx
"use client"

import React from "react"
import Image from "next/image"
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
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <div className="relative w-full max-h-[70vh]">
            <Image 
              src={src} 
              alt="Preview" 
              width={800}
              height={600}
              className="w-full h-auto rounded object-contain"
              style={{ maxHeight: '70vh' }}
            />
          </div>
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
