"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderPlus } from "lucide-react";
import type { CreateFolderDialogProps } from "@/types/vehicle-parts";

const CreateFolderDialog = ({
  isOpen,
  onOpenChange,
  onCreateFolder,
}: CreateFolderDialogProps) => {
  const [newFolderNameInput, setNewFolderNameInput] = useState("");

  const handleCreateFolder = () => {
    const folderName = newFolderNameInput.trim();
    if (!folderName) return;
    
    onCreateFolder(folderName);
    setNewFolderNameInput("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setNewFolderNameInput("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-blue-500" />
            Create New Folder
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name" className="text-sm font-medium">
              Folder Name
            </Label>
            <Input
              id="folder-name"
              placeholder="Enter folder name..."
              value={newFolderNameInput}
              onChange={(e) => setNewFolderNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderNameInput.trim()) {
                  handleCreateFolder();
                } else if (e.key === "Escape") {
                  handleClose();
                }
              }}
              className="w-full"
              autoFocus
            />
            {!newFolderNameInput.trim() && (
              <p className="text-xs text-gray-500">
                Please enter a name for the folder
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreateFolder}
            disabled={!newFolderNameInput.trim()}
            className="w-full sm:w-auto"
          >
            <FolderPlus className="h-4 w-4 mr-2" />
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;