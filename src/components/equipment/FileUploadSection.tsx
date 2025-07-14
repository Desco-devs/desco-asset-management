"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFileUpload } from "@/hooks/use-file-upload";
import { CheckCircle, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";

interface FileUploadSectionProps {
  label: string;
  accept?: string;
  currentFileUrl?: string | null;
  onFileChange: (file: File | null) => void;
  onKeepExistingChange: (keep: boolean) => void;
  required?: boolean;
  icon?: React.ReactNode;
}

export function FileUploadSection({
  label,
  accept = "image/*",
  currentFileUrl,
  onFileChange,
  onKeepExistingChange,
  required = false,
  icon = <Upload className="h-4 w-4" />,
}: FileUploadSectionProps) {
  const { fileState, handleFileChange, removeFile, resetToExisting, cleanup } = useFileUpload(currentFileUrl);

  useEffect(() => {
    onFileChange(fileState.file);
    onKeepExistingChange(fileState.keepExisting);
    
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileState.file, fileState.keepExisting]); // Only depend on file state, not callbacks

  const isImage = accept.includes("image");

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {fileState.preview ? (
          <div className="space-y-2">
            {isImage ? (
              <div className="relative">
                <Image
                  src={fileState.preview}
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
                onClick={removeFile}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
              
              {currentFileUrl && !fileState.file && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetToExisting}
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
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
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