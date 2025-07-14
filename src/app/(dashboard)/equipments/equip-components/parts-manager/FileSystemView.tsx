"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import type { EquipmentFolder, EquipmentPart } from "@/types/equipment-parts";

import BreadcrumbNavigation from "./BreadcrumbNavigation";
import FolderGrid from "./FolderGrid";
import PartsGrid from "./PartsGrid";

interface FileSystemViewProps {
  folderPath: string[];
  equipmentFolders: EquipmentFolder[];
  currentFolders: EquipmentFolder[];
  currentParts: EquipmentPart[];
  selectedFolderId: string | null;
  editingFolderId: string | null;
  newFolderName: string;
  bulkDeleteMode: boolean;
  selectedFoldersForDeletion: string[];
  onNavigateToRoot: () => void;
  onNavigateToPath: (path: string[], folderId: string) => void;
  onNavigateBack: () => void;
  onNavigateToFolder: (folderId: string) => void;
  onEditFolder: (folderId: string, name: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string, name: string) => void;
  onToggleFolderSelection: (folderId: string) => void;
  onCancelEdit: () => void;
  setNewFolderName: (name: string) => void;
  onRemoveEquipmentPart: (index: number, folderId?: string) => void;
  onUpdateEquipmentPart: (index: number, file: File, folderId?: string) => void;
  onMovePartToFolder: (partIndex: number, folderId: string | null) => void;
  onMovePartFromFolder: (folderId: string, partIndex: number) => void;
  setEquipmentParts: (parts: EquipmentPart[] | ((prev: EquipmentPart[]) => EquipmentPart[])) => void;
}

const FileSystemView = ({
  folderPath,
  equipmentFolders,
  currentFolders,
  currentParts,
  selectedFolderId,
  editingFolderId,
  newFolderName,
  bulkDeleteMode,
  selectedFoldersForDeletion,
  onNavigateToRoot,
  onNavigateToPath,
  onNavigateBack,
  onNavigateToFolder,
  onEditFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderSelection,
  onCancelEdit,
  setNewFolderName,
  onRemoveEquipmentPart,
  onUpdateEquipmentPart,
  onMovePartToFolder,
  onMovePartFromFolder,
  setEquipmentParts,
}: FileSystemViewProps) => {
  const handleMovePartFromFolder = (folderId: string, partIndex: number) => {
    const part = currentParts[partIndex];
    onMovePartFromFolder(folderId, partIndex);
    setEquipmentParts((prev) => [...prev, { ...part, folderId: undefined }]);
  };

  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-gray-50 dark:bg-gray-900">
      <div className="space-y-3">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNavigation
          folderPath={folderPath}
          equipmentFolders={equipmentFolders}
          onNavigateToRoot={onNavigateToRoot}
          onNavigateToPath={onNavigateToPath}
        />

        {/* Back Button (when inside folder) */}
        {folderPath.length > 0 && (
          <div className="mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNavigateBack}
              className="text-xs w-full sm:w-auto"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
          </div>
        )}

        {/* Content Area */}
        <div className="space-y-4">
          {/* Folders Row */}
          <FolderGrid
            folders={currentFolders}
            editingFolderId={editingFolderId}
            newFolderName={newFolderName}
            bulkDeleteMode={bulkDeleteMode}
            selectedFoldersForDeletion={selectedFoldersForDeletion}
            onNavigateToFolder={onNavigateToFolder}
            onEditFolder={onEditFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onToggleFolderSelection={onToggleFolderSelection}
            onCancelEdit={onCancelEdit}
            setNewFolderName={setNewFolderName}
          />

          {/* Parts Section */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              Parts
            </Label>
            <PartsGrid
              parts={currentParts}
              selectedFolderId={selectedFolderId}
              equipmentFolders={equipmentFolders}
              onRemovePart={onRemoveEquipmentPart}
              onUpdatePart={onUpdateEquipmentPart}
              onMovePartToFolder={onMovePartToFolder}
              onMovePartFromFolder={handleMovePartFromFolder}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSystemView;