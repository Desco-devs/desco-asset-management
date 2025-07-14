"use client";

import { useEquipmentParts } from "@/hooks/use-equipment-parts";
import { getCurrentContent } from "@/lib/equipment-parts-utils";
import type {
  EquipmentPart,
  EquipmentPartsManagerProps,
} from "@/types/equipment-parts";
import { useRef } from "react";

import CreateFolderDialog from "./parts-manager/CreateFolderDialog";
import DeleteFolderDialog from "./parts-manager/DeleteFolderDialog";
import FileSystemView from "./parts-manager/FileSystemView";
import PartsManagerHeader from "./parts-manager/PartsManagerHeader";

const EquipmentPartsManager = ({
  equipmentParts,
  setEquipmentParts,
  equipmentFolders,
  setEquipmentFolders,
}: EquipmentPartsManagerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    selectedFolderId,
    folderPath,
    editingFolderId,
    newFolderName,
    createFolderDialogOpen,
    deleteDialogOpen,
    folderToDelete,
    bulkDeleteMode,
    selectedFoldersForDeletion,
    setCreateFolderDialogOpen,
    setEditingFolderId,
    setNewFolderName,
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    navigateToPath,
    openCreateFolderDialog,
    createFolder,
    handleDeleteClick,
    confirmDeleteFolder,
    renameFolder,
    toggleBulkDeleteMode,
    toggleFolderSelection,
    handleBulkDelete,
    confirmBulkDelete,
    movePartToFolder,
    movePartFromFolder,
  } = useEquipmentParts({
    equipmentParts,
    setEquipmentParts,
    equipmentFolders,
    setEquipmentFolders,
  });

  // Handle file uploads from the hidden input
  const handleAddPartDirectly = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newParts: EquipmentPart[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isExisting: false,
    }));

    if (selectedFolderId) {
      setEquipmentFolders((prev) =>
        prev.map((f) =>
          f.id === selectedFolderId
            ? { ...f, parts: [...f.parts, ...newParts] }
            : f
        )
      );
    } else {
      setEquipmentParts((prev) => [...prev, ...newParts]);
    }

    e.target.value = "";
  };

  const handleEquipmentPartsChange = handleAddPartDirectly;

  const removeEquipmentPart = (index: number, folderId?: string) => {
    if (folderId) {
      setEquipmentFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? {
                ...f,
                parts: f.parts.filter((part, i) => {
                  if (i === index) {
                    if (part.preview && !part.isExisting) {
                      URL.revokeObjectURL(part.preview);
                    }
                    return false;
                  }
                  return true;
                }),
              }
            : f
        )
      );
    } else {
      setEquipmentParts((prev) => {
        const newArr = [...prev];
        if (newArr[index].preview && !newArr[index].isExisting) {
          URL.revokeObjectURL(newArr[index].preview!);
        }
        newArr.splice(index, 1);
        return newArr;
      });
    }
  };

  const updateEquipmentPart = (
    index: number,
    file: File,
    folderId?: string
  ) => {
    if (folderId) {
      setEquipmentFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? {
                ...f,
                parts: f.parts.map((part, i) => {
                  if (i === index) {
                    if (part.preview && !part.isExisting) {
                      URL.revokeObjectURL(part.preview);
                    }
                    return {
                      file,
                      preview: URL.createObjectURL(file),
                      isExisting: false,
                      folderId,
                    };
                  }
                  return part;
                }),
              }
            : f
        )
      );
    } else {
      setEquipmentParts((prev) => {
        const newArr = [...prev];
        if (newArr[index].preview && !newArr[index].isExisting) {
          URL.revokeObjectURL(newArr[index].preview!);
        }
        newArr[index] = {
          file,
          preview: URL.createObjectURL(file),
          isExisting: false,
        };
        return newArr;
      });
    }
  };

  const { folders: currentFolders, parts: currentParts } = getCurrentContent(
    selectedFolderId,
    equipmentFolders,
    equipmentParts,
    folderPath
  );

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddPartDirectly}
        style={{ display: "none" }}
      />

      <PartsManagerHeader
        bulkDeleteMode={bulkDeleteMode}
        selectedFoldersForDeletion={selectedFoldersForDeletion}
        currentFolders={currentFolders}
        onEquipmentPartsChange={handleEquipmentPartsChange}
        onAddPartDirectly={handleAddPartDirectly}
        onOpenCreateFolderDialog={openCreateFolderDialog}
        onToggleBulkDeleteMode={toggleBulkDeleteMode}
        onHandleBulkDelete={handleBulkDelete}
      />

      <FileSystemView
        folderPath={folderPath}
        equipmentFolders={equipmentFolders}
        currentFolders={currentFolders}
        currentParts={currentParts}
        selectedFolderId={selectedFolderId}
        editingFolderId={editingFolderId}
        newFolderName={newFolderName}
        bulkDeleteMode={bulkDeleteMode}
        selectedFoldersForDeletion={selectedFoldersForDeletion}
        onNavigateToRoot={navigateToRoot}
        onNavigateBack={navigateBack}
        onNavigateToPath={navigateToPath}
        onNavigateToFolder={navigateToFolder}
        onEditFolder={(id, name) => {
          setEditingFolderId(id);
          setNewFolderName(name);
        }}
        onRenameFolder={renameFolder}
        onDeleteFolder={handleDeleteClick}
        onToggleFolderSelection={toggleFolderSelection}
        onCancelEdit={() => {
          setEditingFolderId(null);
          setNewFolderName("");
        }}
        setNewFolderName={setNewFolderName}
        onRemoveEquipmentPart={removeEquipmentPart}
        onUpdateEquipmentPart={updateEquipmentPart}
        onMovePartToFolder={movePartToFolder}
        onMovePartFromFolder={movePartFromFolder}
        setEquipmentParts={setEquipmentParts}
      />

      <CreateFolderDialog
        isOpen={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        onCreateFolder={createFolder}
      />

      <DeleteFolderDialog
        isOpen={deleteDialogOpen}
        onOpenChange={() => setCreateFolderDialogOpen(false)}
        folderToDelete={folderToDelete}
        onConfirmDelete={confirmDeleteFolder}
        onConfirmBulkDelete={confirmBulkDelete}
        equipmentFolders={equipmentFolders}
      />
    </div>
  );
};

export default EquipmentPartsManager;
