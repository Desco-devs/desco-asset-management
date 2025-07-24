// Vehicle Parts Types and Interfaces

export interface VehiclePart {
  file: File | null;
  preview: string | null;
  isExisting: boolean;
  existingUrl?: string;
  folderId?: string;
}

export interface VehicleFolder {
  id: string;
  name: string;
  parts: VehiclePart[];
  subfolders: VehicleFolder[];
  parentId?: string;
}

export interface VehiclePartsManagerProps {
  vehicleParts: VehiclePart[];
  setVehicleParts: (parts: VehiclePart[] | ((prev: VehiclePart[]) => VehiclePart[])) => void;
  vehicleFolders: VehicleFolder[];
  setVehicleFolders: (folders: VehicleFolder[] | ((prev: VehicleFolder[]) => VehicleFolder[])) => void;
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
  vehicleFolders: VehicleFolder[];
}

export interface FolderGridProps {
  folders: VehicleFolder[];
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
  parts: VehiclePart[];
  selectedFolderId: string | null;
  vehicleFolders: VehicleFolder[];
  onRemovePart: (index: number, folderId?: string) => void;
  onUpdatePart: (index: number, file: File, folderId?: string) => void;
  onMovePartToFolder: (partIndex: number, folderId: string | null) => void;
  onMovePartFromFolder: (folderId: string, partIndex: number) => void;
}

export interface BreadcrumbNavigationProps {
  folderPath: string[];
  vehicleFolders: VehicleFolder[];
  onNavigateToRoot: () => void;
  onNavigateToPath: (path: string[], folderId: string) => void;
}