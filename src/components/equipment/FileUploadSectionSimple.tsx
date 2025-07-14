"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Upload, X } from "lucide-react";
import Image from "next/image";
import { useState, useCallback } from "react";

interface FileUploadSectionSimpleProps {
  label: string;
  accept?: string;
  currentFileUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onKeepExistingChange: (keep: boolean) => void;
  required?: boolean;
  icon?: React.ReactNode;
}

export function FileUploadSectionSimple({
  label,
  accept = "image/*",
  currentFileUrl,
  onFileChange,
  onKeepExistingChange,
  required = false,
  icon = <Upload className="h-4 w-4" />,
}: FileUploadSectionSimpleProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentFileUrl || null);
  const [keepExisting, setKeepExisting] = useState(!!currentFileUrl);

  const handleFileSelect = useCallback((file: File | null) => {
    if (file) {
      // Clean up previous preview if it was generated
      if (preview && !currentFileUrl) {
        URL.revokeObjectURL(preview);
      }
      
      const newPreview = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreview(newPreview);
      setKeepExisting(false);
      
      onFileChange(file);
      onKeepExistingChange(false);
    }
  }, [preview, currentFileUrl, onFileChange, onKeepExistingChange]);

  const handleRemoveFile = useCallback(() => {
    // Clean up preview if it was generated
    if (preview && !currentFileUrl) {
      URL.revokeObjectURL(preview);
    }
    
    setSelectedFile(null);
    setPreview(null);
    setKeepExisting(false);
    
    onFileChange(null);
    onKeepExistingChange(false);
  }, [preview, currentFileUrl, onFileChange, onKeepExistingChange]);

  const handleKeepExisting = useCallback(() => {
    setSelectedFile(null);
    setPreview(currentFileUrl);
    setKeepExisting(true);
    
    onFileChange(null);
    onKeepExistingChange(true);
  }, [currentFileUrl, onFileChange, onKeepExistingChange]);

  const isImage = accept.includes("image");
  const hasFile = selectedFile || (keepExisting && currentFileUrl);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {hasFile && preview ? (
          <div className="space-y-2">
            {isImage ? (
              <div className="relative">
                <Image
                  src={preview}
                  alt={label}
                  width={200}
                  height={200}
                  className="object-cover rounded"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">File selected</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveFile}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
              
              {currentFileUrl && !selectedFile && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleKeepExisting}
                >
                  Keep Existing
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Input
              type="file"
              accept={accept}
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              className="hidden"
              id={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
            />
            <Label
              htmlFor={`file-${label.replace(/\s+/g, '-').toLowerCase()}`}
              className="cursor-pointer flex flex-col items-center gap-2 p-4"
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
    </div>
  );
}