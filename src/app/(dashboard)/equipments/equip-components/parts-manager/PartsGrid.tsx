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
import { getAllFolders } from "@/lib/equipment-parts-utils";
import type { PartsGridProps } from "@/types/equipment-parts";
import { Eye, Folder, Image as ImageIcon, Settings, X } from "lucide-react";
import Image from "next/image"; // Import Next.js Image component
import { useState } from "react";

const PartsGrid = ({
  parts,
  selectedFolderId,
  equipmentFolders,
  onRemovePart,
  onUpdatePart,
  onMovePartToFolder,
  onMovePartFromFolder,
}: PartsGridProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
            <Settings className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 mb-2">
              No equipment parts added yet
            </p>
            <p className="text-xs text-gray-400 px-2">
              Use &quot;Create Folder&quot; to organize parts, or &quot;Add
              Part&quot; to add them directly
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {parts.map((part, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Part {index + 1}</Label>
            <div className="flex flex-wrap gap-1">
              {!selectedFolderId &&
                (() => {
                  const allFolders = getAllFolders(equipmentFolders);

                  return allFolders.length > 0 ? (
                    <select
                      className="text-xs border rounded px-1 py-0.5 max-w-20 sm:max-w-none"
                      onChange={(e) => {
                        const folderId = e.target.value || null;
                        if (folderId) {
                          onMovePartToFolder(index, folderId);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Move to...</option>
                      {allFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                  ) : null;
                })()}

              {selectedFolderId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMovePartFromFolder(selectedFolderId, index)}
                  className="h-6 px-2 text-xs whitespace-nowrap"
                >
                  Move Out
                </Button>
              )}

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  onRemovePart(index, selectedFolderId || undefined)
                }
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUpdatePart(index, file, selectedFolderId || undefined);
              }
            }}
            className="hidden"
            id={`part-file-${index}-${selectedFolderId || "main"}`}
          />
          <Label
            htmlFor={`part-file-${index}-${selectedFolderId || "main"}`}
            className="cursor-pointer"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs"
              asChild
            >
              <span>
                <ImageIcon className="h-3 w-3 mr-1" />
                {part.preview ? "Change Image" : "Choose Image"}
              </span>
            </Button>
          </Label>

          {part.preview && (
            <div className="relative group h-20 sm:h-24">
              <Image
                src={part.preview}
                alt={`Equipment part ${index + 1}`}
                fill
                className="object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() =>
                  openImagePreview(part.preview!, `Part ${index + 1}`)
                }
              />
              {/* Hover overlay with click handler */}
              <div
                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded border flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                onClick={() =>
                  openImagePreview(part.preview!, `Part ${index + 1}`)
                }
              >
                <Eye className="h-6 w-6 text-white" />
              </div>
              {part.isExisting && (
                <div className="absolute bottom-1 left-1">
                  <span className="bg-blue-600 text-white text-xs px-1 py-0.5 rounded">
                    Current
                  </span>
                </div>
              )}
              {!part.isExisting && part.file && (
                <div className="absolute bottom-1 left-1">
                  <span className="bg-green-600 text-white text-xs px-1 py-0.5 rounded">
                    New
                  </span>
                </div>
              )}
            </div>
          )}

          {!part.preview && (
            <div className="border-2 border-dashed border-gray-300 rounded p-3 sm:p-4 text-center">
              <ImageIcon className="mx-auto h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mb-1" />
              <p className="text-xs text-gray-500">Upload part image</p>
            </div>
          )}
        </div>
      ))}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={closeImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4 pt-2">
            {previewImage && (
              <div className="relative w-full h-[70vh]">
                <Image
                  src={previewImage}
                  alt={previewTitle}
                  fill
                  className="object-contain rounded"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartsGrid;
