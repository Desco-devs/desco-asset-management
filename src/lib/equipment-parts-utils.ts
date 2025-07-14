// Equipment Parts Utility Functions

import type { EquipmentFolder, EquipmentPart } from "@/types/equipment-parts";

/**
 * Find a folder by traversing the folder path
 */
export const findFolderByPath = (
  folders: EquipmentFolder[], 
  path: string[]
): EquipmentFolder | null => {
  if (path.length === 0) return null;
  
  let currentFolders = folders;
  let currentFolder = null;
  
  for (const folderId of path) {
    currentFolder = currentFolders.find(f => f.id === folderId);
    if (!currentFolder) return null;
    currentFolders = currentFolder.subfolders;
  }
  
  return currentFolder;
};

/**
 * Update folders recursively by applying an update function to the target folder
 */
export const updateFoldersRecursively = (
  folders: EquipmentFolder[], 
  targetId: string, 
  updateFn: (folder: EquipmentFolder) => EquipmentFolder
): EquipmentFolder[] => {
  return folders.map(folder => {
    if (folder.id === targetId) {
      return updateFn(folder);
    }
    return {
      ...folder,
      subfolders: updateFoldersRecursively(folder.subfolders, targetId, updateFn)
    };
  });
};

/**
 * Delete a folder recursively from the folder structure
 */
export const deleteFolderRecursively = (
  folders: EquipmentFolder[], 
  targetId: string
): EquipmentFolder[] => {
  return folders
    .filter(folder => folder.id !== targetId)
    .map(folder => ({
      ...folder,
      subfolders: deleteFolderRecursively(folder.subfolders, targetId)
    }));
};

/**
 * Collect all parts from a folder and its subfolders recursively
 */
export const collectPartsFromFolder = (folder: EquipmentFolder): EquipmentPart[] => {
  let allParts = [...folder.parts];
  folder.subfolders.forEach(subfolder => {
    allParts = [...allParts, ...collectPartsFromFolder(subfolder)];
  });
  return allParts;
};

/**
 * Find and collect parts from a specific folder ID
 */
export const findAndCollectParts = (
  folders: EquipmentFolder[], 
  targetId: string
): EquipmentPart[] => {
  for (const folder of folders) {
    if (folder.id === targetId) {
      return collectPartsFromFolder(folder);
    }
    const found = findAndCollectParts(folder.subfolders, targetId);
    if (found.length > 0) return found;
  }
  return [];
};

/**
 * Count total parts in a folder and all its subfolders
 */
export const countPartsInFolder = (
  folders: EquipmentFolder[], 
  targetId: string
): number => {
  for (const folder of folders) {
    if (folder.id === targetId) {
      let count = folder.parts.length;
      const countSubfolderParts = (subfolders: EquipmentFolder[]): number => {
        return subfolders.reduce((total, subfolder) => {
          return total + subfolder.parts.length + countSubfolderParts(subfolder.subfolders);
        }, 0);
      };
      count += countSubfolderParts(folder.subfolders);
      return count;
    }
    const found = countPartsInFolder(folder.subfolders, targetId);
    if (found > 0) return found;
  }
  return 0;
};

/**
 * Get all folders in a flat array with hierarchy information
 */
export const getAllFolders = (
  folders: EquipmentFolder[], 
  prefix = ""
): Array<{id: string, name: string}> => {
  let result: Array<{id: string, name: string}> = [];
  folders.forEach(folder => {
    result.push({ id: folder.id, name: prefix + folder.name });
    result = [...result, ...getAllFolders(folder.subfolders, prefix + folder.name + " / ")];
  });
  return result;
};

/**
 * Get folder name by ID from the folder structure
 */
export const findFolderName = (
  folders: EquipmentFolder[], 
  targetId: string
): string => {
  for (const folder of folders) {
    if (folder.id === targetId) return folder.name;
    const found = findFolderName(folder.subfolders, targetId);
    if (found) return found;
  }
  return 'Unknown';
};

/**
 * Calculate total parts across multiple folders
 */
export const getTotalPartsInFolders = (
  folderIds: string[], 
  equipmentFolders: EquipmentFolder[]
): number => {
  let totalParts = 0;
  folderIds.forEach(id => {
    totalParts += countPartsInFolder(equipmentFolders, id);
  });
  return totalParts;
};

/**
 * Get current content (folders and parts) based on selection
 */
export const getCurrentContent = (
  selectedFolderId: string | null,
  equipmentFolders: EquipmentFolder[],
  equipmentParts: EquipmentPart[],
  folderPath: string[]
) => {
  if (!selectedFolderId) {
    return { folders: equipmentFolders, parts: equipmentParts };
  }
  const currentFolder = findFolderByPath(equipmentFolders, folderPath);
  return { 
    folders: currentFolder?.subfolders || [], 
    parts: currentFolder?.parts || [] 
  };
};