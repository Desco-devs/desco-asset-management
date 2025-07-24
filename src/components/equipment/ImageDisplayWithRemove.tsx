"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ImageDisplayWithRemoveProps {
  url: string;
  label: string;
  description: string;
  onRemove: () => void;
}

export function ImageDisplayWithRemove({ 
  url, 
  label, 
  description, 
  onRemove 
}: ImageDisplayWithRemoveProps) {
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
          
          {/* Remove button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
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
}