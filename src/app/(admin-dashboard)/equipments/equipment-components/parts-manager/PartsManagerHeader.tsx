"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EquipmentFolder } from "@/types/equipment-parts";
import {
  ChevronDown,
  FolderOpen,
  Plus,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface PartsManagerHeaderProps {
  bulkDeleteMode: boolean;
  selectedFoldersForDeletion: string[];
  currentFolders: EquipmentFolder[];
  onEquipmentPartsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddPartDirectly: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCreateFolderDialog: () => void;
  onToggleBulkDeleteMode: () => void;
  onHandleBulkDelete: () => void;
}

const PartsManagerHeader = ({
  bulkDeleteMode,
  selectedFoldersForDeletion,
  currentFolders,
  onEquipmentPartsChange,
  onAddPartDirectly,
  onOpenCreateFolderDialog,
  onToggleBulkDeleteMode,
  onHandleBulkDelete,
}: PartsManagerHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <Label className="text-base font-medium">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-500" />
          Equipment Parts
        </div>
      </Label>

      <div className="flex flex-wrap gap-2">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={onEquipmentPartsChange}
          className="hidden"
          id="batch-parts-upload"
        />

        {!bulkDeleteMode ? (
          <>
            <Label htmlFor="batch-parts-upload" className="cursor-pointer">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs flex-1 sm:flex-none"
                asChild
              >
                <span>
                  <Upload className="h-3 w-3 mr-1" />
                  <span className="sm:hidden">Upload</span>
                  <span className="hidden sm:inline">Batch Upload</span>
                </span>
              </Button>
            </Label>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1 sm:flex-none"
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  <span className="sm:hidden">Folder</span>
                  <span className="hidden sm:inline">Folder Actions</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem
                  onClick={onOpenCreateFolderDialog}
                  className="cursor-pointer"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Create New Folder
                </DropdownMenuItem>
                {currentFolders.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onToggleBulkDeleteMode}
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Folders
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              type="file"
              accept="image/*"
              onChange={onAddPartDirectly}
              className="hidden"
              id="add-part-upload"
            />
            <Label
              htmlFor="add-part-upload"
              className="cursor-pointer flex-1 sm:flex-none"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs w-full"
                asChild
              >
                <span>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Part
                </span>
              </Button>
            </Label>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleBulkDeleteMode}
              className="text-xs flex-1 sm:flex-none"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onHandleBulkDelete}
              disabled={!selectedFoldersForDeletion.length}
              className="text-xs flex-1 sm:flex-none"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete Selected ({selectedFoldersForDeletion.length})
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PartsManagerHeader;
