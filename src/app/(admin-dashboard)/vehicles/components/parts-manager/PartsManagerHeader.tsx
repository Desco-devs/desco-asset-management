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
import type { VehicleFolder } from "@/types/vehicle-parts";
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
  currentFolders: VehicleFolder[];
  onVehiclePartsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddPartDirectly: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCreateFolderDialog: () => void;
  onToggleBulkDeleteMode: () => void;
  onHandleBulkDelete: () => void;
}

const PartsManagerHeader = ({
  bulkDeleteMode,
  selectedFoldersForDeletion,
  currentFolders,
  onVehiclePartsChange,
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
          Vehicle Parts
        </div>
      </Label>

      <div className="flex flex-wrap gap-2">
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={onVehiclePartsChange}
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

            <Input
              type="file"
              accept="image/*"
              onChange={onAddPartDirectly}
              className="hidden"
              id="single-part-upload"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1 sm:flex-none"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  <span className="sm:hidden">Add</span>
                  <span className="hidden sm:inline">Add Part</span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Label htmlFor="single-part-upload" className="cursor-pointer w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </Label>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenCreateFolderDialog}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Create Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {currentFolders.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onToggleBulkDeleteMode}
                className="text-xs flex-1 sm:flex-none text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span className="sm:hidden">Delete</span>
                <span className="hidden sm:inline">Bulk Delete</span>
              </Button>
            )}
          </>
        ) : (
          <div className="flex gap-2 w-full sm:w-auto">
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
              disabled={selectedFoldersForDeletion.length === 0}
              className="text-xs flex-1 sm:flex-none"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete ({selectedFoldersForDeletion.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartsManagerHeader;