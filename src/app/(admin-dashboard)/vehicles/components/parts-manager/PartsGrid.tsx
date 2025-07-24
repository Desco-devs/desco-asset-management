"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAllFolders } from "@/lib/vehicle-parts-utils";
import type { PartsGridProps } from "@/types/vehicle-parts";
import { Eye, Folder, Image as ImageIcon, Settings, X } from "lucide-react";
import Image from "next/image"; // Import Next.js Image component
import { useState } from "react";

const PartsGrid = ({
  parts,
  selectedFolderId,
  vehicleFolders,
  onRemovePart,
  onUpdatePart,
  onMovePartToFolder,
  onMovePartFromFolder,
}: PartsGridProps) => {
  const [PreviewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const openImagePreview = (imageSrc: string, title: string) => {
    setPreviewImage(imageSrc);
    setPreviewTitle(title);
  };

  const closeImagePreview = () => {
    setPreviewImage(null);
    setPreviewTitle("");
  };

  if (parts.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
        {selectedFolderId ? (
          <>
            <Folder className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-2">This folder is empty</p>
            <p className="text-xs text-gray-400">
              Use &quot;Add Part&quot; to add images to this folder
            </p>
          </>
        ) : (
          <>
            <ImageIcon className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-2">No parts added yet</p>
            <p className="text-xs text-gray-400">
              Start by uploading vehicle part images
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div>
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
          {selectedFolderId ? "Parts in this folder" : "Vehicle Parts"}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
          {parts.map((part, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative border hover:border-primary/50 transition-colors cursor-pointer">
                {part.preview || part.existingUrl ? (
                  <Image
                    src={part.preview || part.existingUrl || ""}
                    alt={`Vehicle part ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    onClick={() =>
                      openImagePreview(
                        part.preview || part.existingUrl || "",
                        `Vehicle Part ${index + 1}`
                      )
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                  </div>
                )}

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1">
                    {(part.preview || part.existingUrl) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        onClick={() =>
                          openImagePreview(
                            part.preview || part.existingUrl || "",
                            `Vehicle Part ${index + 1}`
                          )
                        }
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0"
                      onClick={() => onRemovePart(index, selectedFolderId || undefined)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* File input for replacement */}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onUpdatePart(index, file, selectedFolderId || undefined);
                  }
                }}
                className="hidden"
                id={`part-update-${index}`}
              />

              {/* Part controls */}
              <div className="mt-1 flex justify-between items-center">
                <Label
                  htmlFor={`part-update-${index}`}
                  className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Replace
                </Label>

                {/* Move to folder dropdown for root parts */}
                {!selectedFolderId && vehicleFolders.length > 0 && (
                  <select
                    className="text-xs border rounded px-1 py-0.5 max-w-16 sm:max-w-20"
                    onChange={(e) => {
                      if (e.target.value) {
                        onMovePartToFolder(index, e.target.value);
                        e.target.value = ""; // Reset selection
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">Move to...</option>
                    {getAllFolders(vehicleFolders).map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Move to root button for folder parts */}
                {selectedFolderId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-auto px-1 text-xs"
                    onClick={() => onMovePartFromFolder(selectedFolderId, index)}
                  >
                    Move out
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Preview Modal */}
      {PreviewImage && (
        <Dialog open={!!PreviewImage} onOpenChange={closeImagePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{previewTitle}</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4">
              <div className="relative w-full max-h-[70vh] flex items-center justify-center">
                <Image
                  src={PreviewImage}
                  alt={previewTitle}
                  width={800}
                  height={600}
                  className="object-contain max-w-full max-h-full"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PartsGrid;