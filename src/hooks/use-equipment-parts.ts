// Custom Hook for Equipment Parts Management

import { useState } from "react";
import type { 
  EquipmentFolder, 
  EquipmentPart, 
  FolderToDelete 
} from "@/types/equipment-parts";
import {
  updateFoldersRecursively,
  deleteFolderRecursively,
  findAndCollectParts,
  findFolderByPath,
  findFolderName,
  getTotalPartsInFolders,
} from "@/lib/equipment-parts-utils";

interface UseEquipmentPartsProps {
  equipmentParts: EquipmentPart[];
  setEquipmentParts: (parts: EquipmentPart[] | ((prev: EquipmentPart[]) => EquipmentPart[])) => void;
  equipmentFolders: EquipmentFolder[];
  setEquipmentFolders: (folders: EquipmentFolder[] | ((prev: EquipmentFolder[]) => EquipmentFolder[])) => void;
}

export const useEquipmentParts = ({
  equipmentParts,
  setEquipmentParts,
  equipmentFolders,
  setEquipmentFolders,
}: UseEquipmentPartsProps) => {
  // Navigation State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<string[]>([]);

  // Folder Editing State
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  // Dialog State
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderToDelete | null>(null);

  // Bulk Delete State
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedFoldersForDeletion, setSelectedFoldersForDeletion] = useState<string[]>([]);

  // Navigation Functions
  const navigateToFolder = (folderId: string) => {
    const newPath = [...folderPath, folderId];
    setFolderPath(newPath);
    setSelectedFolderId(folderId);
  };

  const navigateBack = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      setSelectedFolderId(newPath[newPath.length - 1]);
    } else {
      setFolderPath([]);
      setSelectedFolderId(null);
    }
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setSelectedFolderId(null);
  };

  const navigateToPath = (path: string[], folderId: string) => {
    setFolderPath(path);
    setSelectedFolderId(folderId);
  };

  // Folder Management Functions
  const openCreateFolderDialog = () => {
    setNewFolderNameInput("");
    setCreateFolderDialogOpen(true);
  };

  const createFolder = (folderName?: string) => {
    const name = folderName || newFolderNameInput.trim();
    if (!name) return;

    const folderId = `folder_${Date.now()}`;
    const newFolder: EquipmentFolder = {
      id: folderId,
      name,
      parts: [],
      subfolders: [],
      parentId: selectedFolderId || undefined,
    };

    if (selectedFolderId) {
      setEquipmentFolders(prev => 
        updateFoldersRecursively(prev, selectedFolderId, folder => ({
          ...folder,
          subfolders: [...folder.subfolders, newFolder]
        }))
      );
    } else {
      setEquipmentFolders(prev => [...prev, newFolder]);
    }
    
    setCreateFolderDialogOpen(false);
    setNewFolderNameInput("");
  };

  const handleDeleteClick = (folderId: string, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
    setDeleteDialogOpen(true);
  };

  const deleteFolder = (folderId: string) => {
    const partsToMove = findAndCollectParts(equipmentFolders, folderId);
    
    setEquipmentParts(prev => [
      ...prev,
      ...partsToMove.map(part => ({ ...part, folderId: undefined }))
    ]);

    setEquipmentFolders(prev => deleteFolderRecursively(prev, folderId));
    
    if (selectedFolderId === folderId) {
      if (folderPath.length > 1) {
        const newPath = folderPath.slice(0, -1);
        setFolderPath(newPath);
        setSelectedFolderId(newPath[newPath.length - 1]);
      } else {
        setFolderPath([]);
        setSelectedFolderId(null);
      }
    }
  };

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    deleteFolder(folderToDelete.id);
    setDeleteDialogOpen(false);
    setFolderToDelete(null);
  };

  const renameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    
    setEquipmentFolders(prev => 
      updateFoldersRecursively(prev, folderId, folder => ({
        ...folder,
        name: newName.trim()
      }))
    );
    
    setEditingFolderId(null);
    setNewFolderName("");
  };

  // Bulk Delete Functions
  const toggleBulkDeleteMode = () => {
    setBulkDeleteMode(!bulkDeleteMode);
    setSelectedFoldersForDeletion([]);
  };

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFoldersForDeletion(prev => 
      prev.includes(folderId) 
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedFoldersForDeletion.length === 0) return;
    
    const folderNames = selectedFoldersForDeletion.map(id => 
      findFolderName(equipmentFolders, id)
    );

    setFolderToDelete({ 
      id: 'bulk', 
      name: `${selectedFoldersForDeletion.length} folders (${folderNames.join(', ')})` 
    });
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    selectedFoldersForDeletion.forEach(folderId => {
      deleteFolder(folderId);
    });
    setSelectedFoldersForDeletion([]);
    setBulkDeleteMode(false);
    setDeleteDialogOpen(false);
    setFolderToDelete(null);
  };

  // Parts Management Functions
  const addEquipmentPart = () => {
    const newPart: EquipmentPart = {
      file: null,
      preview: null,
      isExisting: false,
      folderId: selectedFolderId || undefined,
    };
    
    if (selectedFolderId) {
      setEquipmentFolders(prev => 
        updateFoldersRecursively(prev, selectedFolderId, folder => ({
          ...folder,
          parts: [...folder.parts, newPart]
        }))
      );
    } else {
      setEquipmentParts(prev => [...prev, newPart]);
    }
  };

  const movePartToFolder = (partIndex: number, folderId: string | null) => {
    const getCurrentParts = () => {
      if (selectedFolderId) {
        const currentFolder = findFolderByPath(equipmentFolders, folderPath);
        return currentFolder?.parts || [];
      }
      return equipmentParts;
    };

    const currentParts = getCurrentParts();
    const part = currentParts[partIndex];
    if (!part) return;

    if (folderId) {
      setEquipmentFolders(prev => 
        updateFoldersRecursively(prev, folderId, folder => ({
          ...folder,
          parts: [...folder.parts, { ...part, folderId }]
        }))
      );
    } else {
      setEquipmentParts(prev => [...prev, { ...part, folderId: undefined }]);
    }

    // Remove from current location
    if (selectedFolderId) {
      setEquipmentFolders(prev => 
        updateFoldersRecursively(prev, selectedFolderId, folder => ({
          ...folder,
          parts: folder.parts.filter((_, index) => index !== partIndex)
        }))
      );
    } else {
      setEquipmentParts(prev => prev.filter((_, index) => index !== partIndex));
    }
  };

  const movePartFromFolder = (folderId: string, partIndex: number) => {
    setEquipmentFolders(prev => 
      updateFoldersRecursively(prev, folderId, folder => ({
        ...folder,
        parts: folder.parts.filter((_, index) => index !== partIndex)
      }))
    );
  };

  return {
    // State
    selectedFolderId,
    folderPath,
    editingFolderId,
    newFolderName,
    createFolderDialogOpen,
    newFolderNameInput,
    deleteDialogOpen,
    folderToDelete,
    bulkDeleteMode,
    selectedFoldersForDeletion,

    // State Setters
    setSelectedFolderId,
    setFolderPath,
    setEditingFolderId,
    setNewFolderName,
    setCreateFolderDialogOpen,
    setNewFolderNameInput,
    setDeleteDialogOpen,
    setFolderToDelete,

    // Navigation Functions
    navigateToFolder,
    navigateBack,
    navigateToRoot,
    navigateToPath,

    // Folder Management
    openCreateFolderDialog,
    createFolder,
    handleDeleteClick,
    deleteFolder,
    confirmDeleteFolder,
    renameFolder,

    // Bulk Delete
    toggleBulkDeleteMode,
    toggleFolderSelection,
    handleBulkDelete,
    confirmBulkDelete,

    // Parts Management
    addEquipmentPart,
    movePartToFolder,
    movePartFromFolder,
  };
};