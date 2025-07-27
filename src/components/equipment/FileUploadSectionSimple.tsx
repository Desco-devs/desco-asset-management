"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Upload, X, Eye } from "lucide-react";
import Image from "next/image";
import { useState, useCallback, useEffect } from "react";

interface FileUploadSectionSimpleProps {
  label: string;
  accept?: string;
  currentFileUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onKeepExistingChange: (keep: boolean) => void;
  required?: boolean;
  icon?: React.ReactNode;
  // Add props to make it controlled
  selectedFile?: File | null;
  keepExisting?: boolean;
  // Add prop to hide change button
  hideChangeButton?: boolean;
}

export function FileUploadSectionSimple({
  label,
  accept = "image/*",
  currentFileUrl,
  onFileChange,
  onKeepExistingChange,
  required = false,
  icon = <Upload className="h-4 w-4" />,
  selectedFile: propSelectedFile,
  keepExisting: propKeepExisting,
  hideChangeButton = false,
}: FileUploadSectionSimpleProps) {
  // Use props if provided, otherwise fallback to local state
  const [localSelectedFile, setLocalSelectedFile] = useState<File | null>(null);
  const [localKeepExisting, setLocalKeepExisting] = useState(!!currentFileUrl);
  const [showImageViewer, setShowImageViewer] = useState(false);
  
  const selectedFile = propSelectedFile !== undefined ? propSelectedFile : localSelectedFile;
  const keepExisting = propKeepExisting !== undefined ? propKeepExisting : localKeepExisting;
  
  const [preview, setPreview] = useState<string | null>(currentFileUrl || null);
  
  // Generate preview when selectedFile or keepExisting changes
  useEffect(() => {
    if (selectedFile) {
      const newPreview = URL.createObjectURL(selectedFile);
      setPreview(newPreview);
      
      return () => {
        URL.revokeObjectURL(newPreview);
      };
    } else if (currentFileUrl && keepExisting) {
      setPreview(currentFileUrl);
    } else {
      setPreview(null);
    }
  }, [selectedFile, currentFileUrl, keepExisting]);

  // Update preview when currentFileUrl changes
  useEffect(() => {
    if (currentFileUrl && !selectedFile) {
      setPreview(currentFileUrl);
      if (propKeepExisting === undefined) setLocalKeepExisting(true);
    } else if (!currentFileUrl && !selectedFile) {
      setPreview(null);
      if (propKeepExisting === undefined) setLocalKeepExisting(false);
    }
  }, [currentFileUrl, selectedFile, propKeepExisting]);

  // Clean up preview URL on component unmount - DISABLED FOR DEBUGGING
  /*
  useEffect(() => {
    return () => {
      if (preview && !currentFileUrl && selectedFile) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview, currentFileUrl, selectedFile]);
  */

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    // Stop all event propagation immediately
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    
    const file = event.target.files?.[0] || null;
    
    if (file) {
      // Clean up previous preview if it was generated
      if (preview && !currentFileUrl && selectedFile) {
        URL.revokeObjectURL(preview);
      }
      
      const newPreview = URL.createObjectURL(file);
      
      // Update all states together
      if (propSelectedFile === undefined) setLocalSelectedFile(file);
      setPreview(newPreview);
      if (propKeepExisting === undefined) setLocalKeepExisting(false);
      
      
      // Call callbacks
      onFileChange(file);
      onKeepExistingChange(false);
      
      // Reset the input value to allow re-selecting the same file
      event.target.value = '';
    }
  }, [preview, currentFileUrl, selectedFile, onFileChange, onKeepExistingChange, propSelectedFile, propKeepExisting]);

  const handleRemoveFile = useCallback(() => {
    // Clean up preview if it was generated from a selected file
    if (preview && selectedFile && !currentFileUrl) {
      URL.revokeObjectURL(preview);
    }
    
    if (selectedFile) {
      // User clicked "Cancel Change" or "Remove" on newly selected file
      if (propSelectedFile === undefined) setLocalSelectedFile(null);
      setPreview(currentFileUrl || null);
      if (propKeepExisting === undefined) setLocalKeepExisting(!!currentFileUrl);
      
      onFileChange(null);
      onKeepExistingChange(!!currentFileUrl);
    } else {
      // User clicked "Remove" on existing file
      if (propSelectedFile === undefined) setLocalSelectedFile(null);
      setPreview(null);
      if (propKeepExisting === undefined) setLocalKeepExisting(false);
      
      onFileChange(null);
      onKeepExistingChange(false);
    }
  }, [preview, selectedFile, currentFileUrl, onFileChange, onKeepExistingChange, propSelectedFile, propKeepExisting]);

  const handleKeepExisting = useCallback(() => {
    if (propSelectedFile === undefined) setLocalSelectedFile(null);
    setPreview(currentFileUrl || null);
    if (propKeepExisting === undefined) setLocalKeepExisting(true);
    
    onFileChange(null);
    onKeepExistingChange(true);
  }, [currentFileUrl, onFileChange, onKeepExistingChange, propSelectedFile, propKeepExisting]);

  const isImage = accept.includes("image");
  const hasFile = selectedFile || (keepExisting && currentFileUrl);
  const showPreview = Boolean(preview && preview.trim() !== "");
  
  
  

  return (
    <div 
      className="space-y-2"
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <Label className="flex items-center gap-2">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      {/* Always render the hidden file input */}
      <Input
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
      />
      
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-4"
        onClick={(e) => {
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
      >
        {showPreview && preview ? (
          <div className="space-y-2">
            {isImage ? (
              <div className="relative w-full max-w-[200px] mx-auto group">
                <div 
                  className="relative cursor-pointer"
                  onClick={() => {
                    console.log('Opening image viewer for:', label, preview);
                    setShowImageViewer(true);
                  }}
                >
                  <Image
                    src={preview}
                    alt={label}
                    width={200}
                    height={200}
                    className="w-full h-[200px] object-cover rounded hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      console.error('Image failed to load:', preview);
                      setPreview(null);
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-0 transition-opacity bg-black/40 rounded">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">File selected</span>
              </div>
            )}
            
            <div className="flex gap-2 justify-center">
              {selectedFile ? (
                // New file selected - show Remove and Change buttons
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Cancel change - revert to existing or clear
                      if (currentFileUrl) {
                        setPreview(currentFileUrl);
                        onFileChange(null);
                        onKeepExistingChange(true);
                      } else {
                        setPreview(null);
                        onFileChange(null);
                        onKeepExistingChange(false);
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {currentFileUrl ? 'Cancel Change' : 'Remove'}
                  </Button>
                </>
              ) : (
                // Existing file - show Change and Remove buttons (conditionally)
                <>
                  {!hideChangeButton && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Simple direct approach - just trigger the file input
                        const fileInput = document.querySelector(`input[type="file"]#file-${label.replace(/\s+/g, '-').toLowerCase()}`) as HTMLInputElement;
                        fileInput?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Change
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Update parent
                      onFileChange(null);
                      onKeepExistingChange(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Label
              htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
              className="cursor-pointer flex flex-col items-center gap-2 p-4"
              onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
            >
              {icon}
              <span>Click to upload {label.toLowerCase()}</span>
              <span className="text-sm text-gray-500">
                {accept === "image/*" ? "Images only" : "Files accepted"}
              </span>
            </Label>
          </div>
        )}
      </div>

      {/* Image Viewer Modal - Responsive sizing for mobile and desktop */}
      {showImageViewer && preview && isImage && (
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent 
            className="!max-w-none p-4 
              w-[95vw] max-h-[90vh] sm:w-[80vw] sm:max-h-[75vh] lg:w-[60vw] lg:max-h-[65vh] xl:w-[40vw] xl:max-h-[60vh]" 
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
                src={preview}
                alt={label}
                className="max-w-full max-h-[80vh] sm:max-h-[65vh] lg:max-h-[55vh] xl:max-h-[45vh] object-contain"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  console.error('Image failed to load:', preview);
                  console.error('Error details:', e);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', preview);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}