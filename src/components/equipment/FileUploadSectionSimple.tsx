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

  // Update preview when currentFileUrl changes - DISABLED FOR DEBUGGING
  /*
  useEffect(() => {
    if (currentFileUrl && !selectedFile) {
      setPreview(currentFileUrl);
      if (propKeepExisting === undefined) setLocalKeepExisting(true);
    }
  }, [currentFileUrl, selectedFile, propKeepExisting]);
  */

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
  const showPreview = Boolean(preview);
  
  
  

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
        {showPreview ? (
          <div className="space-y-2">
            {isImage ? (
              <div className="relative w-full max-w-[200px] mx-auto group">
                <div 
                  className="relative cursor-pointer"
                  onClick={() => setShowImageViewer(true)}
                >
                  <Image
                    src={preview || ""}
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
                // Existing file - show Change and Remove buttons
                <>
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

      {/* Image Viewer Modal */}
      {showImageViewer && preview && isImage && (
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0">
            <DialogHeader className="p-4 bg-black/80 text-white relative z-10">
              <DialogTitle className="flex items-center justify-between">
                <span className="text-white truncate pr-4">{label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageViewer(false)}
                  className="text-white hover:bg-white/20 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex items-center justify-center bg-black min-h-[70vh]">
              <img
                src={preview}
                alt={label}
                className="max-w-full max-h-[80vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="absolute inset-0 bg-black" onClick={() => setShowImageViewer(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}