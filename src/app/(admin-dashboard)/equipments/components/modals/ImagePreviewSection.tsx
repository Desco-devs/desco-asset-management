"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, X, Upload } from "lucide-react";
import { toast } from "sonner";

interface ImagePreviewSectionProps {
  fieldName: string;
  url?: string | null;
  label: string;
  description: string;
  accept?: string;
  isEditMode: boolean;
  previewUrl?: string;
  onFileSelect: (fieldName: string, file: File) => void;
  onRemove: (fieldName: string) => void;
}

export default function ImagePreviewSection({
  fieldName,
  url,
  label,
  description,
  accept = "image/*",
  isEditMode,
  previewUrl,
  onFileSelect,
  onRemove,
}: ImagePreviewSectionProps) {
  const [showViewer, setShowViewer] = useState(false);
  
  const displayUrl = previewUrl || url;
  const isNewUpload = !!previewUrl;
  const hasImage = !!displayUrl;

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onFileSelect(fieldName, file);
        toast.success(`New ${label.toLowerCase()} selected and will be uploaded when you save changes`);
      }
    };
    input.click();
  };

  const handleRemove = () => {
    onRemove(fieldName);
    toast.success(`${label} will be removed when you save changes`);
  };

  return (
    <div className="space-y-2">
      {/* Image Display */}
      {hasImage && (
        <div className={`border-2 border-dashed rounded-lg p-4 ${isNewUpload ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}>
          <div className="space-y-2">
            <div className="relative w-full max-w-[200px] mx-auto group">
              <div 
                className="relative cursor-pointer"
                onClick={() => setShowViewer(true)}
              >
                <Image
                  src={displayUrl}
                  alt={label}
                  width={200}
                  height={200}
                  className="w-full h-[200px] object-cover rounded hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-0 transition-opacity bg-black/40 rounded">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                
                {/* New upload indicator */}
                {isNewUpload && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    New
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Placeholder */}
      {!hasImage && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="w-full h-[200px] bg-gray-50 rounded border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
            <Upload className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-500 text-center px-2">{label}</p>
            <p className="text-xs text-gray-400 text-center px-2 mt-1">Click upload to add</p>
          </div>
        </div>
      )}

      {/* Description */}
      <p className={`text-xs text-center ${isNewUpload ? 'text-blue-600 font-medium' : 'text-muted-foreground'}`}>
        {isNewUpload ? `New ${description.toLowerCase()} ready to upload` : description}
      </p>

      {/* Edit Mode Buttons */}
      {isEditMode && (
        <div className="mt-3 space-y-2">
          {/* Remove button - show if there's an existing image or preview */}
          {hasImage && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-2" />
              Remove {label}
            </Button>
          )}
          
          {/* Upload/Replace button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleFileSelect}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isNewUpload ? `Replace ${label}` : `Upload ${label}`}
          </Button>
        </div>
      )}

      {/* Viewer Modal */}
      {showViewer && hasImage && (
        <Dialog open={showViewer} onOpenChange={setShowViewer}>
          <DialogContent 
            className="!max-w-none p-4 w-[95vw] max-h-[85vh] sm:w-[80vw] sm:max-h-[70vh] lg:w-[60vw] lg:max-h-[65vh] xl:w-[40vw] xl:max-h-[60vh]" 
            style={{ 
              maxWidth: 'min(95vw, 800px)', 
              width: 'min(95vw, 800px)'
            }}
          >
            <DialogHeader className="pb-4">
              <DialogTitle className="text-center">
                {label} {isNewUpload && <span className="text-blue-500">(Preview)</span>}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center">
              <Image
                src={displayUrl}
                alt={label}
                width={800}
                height={600}
                className="max-w-full max-h-[70vh] sm:max-h-[55vh] lg:max-h-[50vh] xl:max-h-[45vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}