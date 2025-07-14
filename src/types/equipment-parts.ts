// Equipment Parts Types and Interfaces

export interface EquipmentPart {
  file: File | null;
  preview: string | null;
  isExisting: boolean;
  existingUrl?: string;
  folderId?: string;
}

export interface EquipmentFolder {
  id: string;
  name: string;
  parts: EquipmentPart[];
  subfolders: EquipmentFolder[];
  parentId?: string;
}

export interface EquipmentPartsManagerProps {
  equipmentParts: EquipmentPart[];
  setEquipmentParts: (parts: EquipmentPart[] | ((prev: EquipmentPart[]) => EquipmentPart[])) => void;
  equipmentFolders: EquipmentFolder[];
  setEquipmentFolders: (folders: EquipmentFolder[] | ((prev: EquipmentFolder[]) => EquipmentFolder[])) => void;
}

export interface FolderToDelete {
  id: string;
  name: string;
}

export interface CreateFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFolder: (name: string) => void;
}

export interface DeleteFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  folderToDelete: FolderToDelete | null;
  onConfirmDelete: () => void;
  onConfirmBulkDelete?: () => void;
  equipmentFolders: EquipmentFolder[];
}

export interface FolderGridProps {
  folders: EquipmentFolder[];
  editingFolderId: string | null;
  newFolderName: string;
  bulkDeleteMode: boolean;
  selectedFoldersForDeletion: string[];
  onNavigateToFolder: (folderId: string) => void;
  onEditFolder: (folderId: string, name: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string, name: string) => void;
  onToggleFolderSelection: (folderId: string) => void;
  onCancelEdit: () => void;
  setNewFolderName: (name: string) => void;
}

export interface PartsGridProps {
  parts: EquipmentPart[];
  selectedFolderId: string | null;
  equipmentFolders: EquipmentFolder[];
  onRemovePart: (index: number, folderId?: string) => void;
  onUpdatePart: (index: number, file: File, folderId?: string) => void;
  onMovePartToFolder: (partIndex: number, folderId: string | null) => void;
  onMovePartFromFolder: (folderId: string, partIndex: number) => void;
}

export interface BreadcrumbNavigationProps {
  folderPath: string[];
  equipmentFolders: EquipmentFolder[];
  onNavigateToRoot: () => void;
  onNavigateToPath: (path: string[], folderId: string) => void;
}