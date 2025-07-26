"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Folder,
  FolderPlus,
  Image,
  Upload,
  Edit3,
  Trash2,
  File,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export interface PartFile {
  id: string;
  name: string;
  file?: File; // Optional for existing files from database
  preview?: string;
  url?: string; // For existing files that are already stored
  type?: 'image' | 'document'; // For existing files type detection
}

export interface PartFolder {
  id: string;
  name: string;
  files: PartFile[];
  created_at: Date;
}

export interface PartsStructure {
  rootFiles: PartFile[];
  folders: PartFolder[];
}

interface PartsFolderManagerProps {
  onChange: (partsStructure: PartsStructure) => void;
  initialData?: PartsStructure;
}

export default function PartsFolderManager({ 
  onChange, 
  initialData 
}: PartsFolderManagerProps) {
  // State management - ensure safe defaults
  const [partsStructure, setPartsStructure] = useState<PartsStructure>(() => {
    const safeInitialData = initialData || { rootFiles: [], folders: [] };
    return {
      rootFiles: Array.isArray(safeInitialData.rootFiles) ? safeInitialData.rootFiles : [],
      folders: Array.isArray(safeInitialData.folders) ? safeInitialData.folders : []
    };
  });
  
  // Modal states
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isRenameFolderModalOpen, setIsRenameFolderModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<PartFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<PartFolder | null>(null);
  
  // Collapsible states
  const [isRootCollapsed, setIsRootCollapsed] = useState(false);
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  
  // File input refs
  const rootFileInputRef = useRef<HTMLInputElement>(null);
  const folderFileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Update parts structure when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      const safeData = {
        rootFiles: Array.isArray(initialData.rootFiles) ? initialData.rootFiles : [],
        folders: Array.isArray(initialData.folders) ? initialData.folders : []
      };
      setPartsStructure(safeData);
    } else {
      // Clear structure if no initial data
      setPartsStructure({ rootFiles: [], folders: [] });
    }
  }, [initialData, JSON.stringify(initialData)]);

  // Helper function to generate unique IDs
  const generateId = () => Math.random().toString(36).substring(2, 15);


  // Helper function to create file preview
  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve('');
      }
    });
  };

  // Helper functions to trigger file uploads
  const handleAddRootFiles = () => {
    rootFileInputRef.current?.click();
  };

  const handleAddFilesToFolder = (folderId: string) => {
    const folderInput = folderFileInputRefs.current[folderId];
    if (folderInput) {
      folderInput.click();
    }
  };

  // Update parent component when structure changes
  const updatePartsStructure = (newStructure: PartsStructure) => {
    setPartsStructure(newStructure);
    onChange(newStructure);
  };

  // Folder operations
  const createFolder = () => {
    if (!newFolderName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }

    const existingFolder = partsStructure.folders.find(
      (folder) => folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
    );

    if (existingFolder) {
      toast.error("Folder with this name already exists");
      return;
    }

    const newFolder: PartFolder = {
      id: generateId(),
      name: newFolderName.trim(),
      files: [],
      created_at: new Date(),
    };

    const newStructure = {
      ...partsStructure,
      folders: [...partsStructure.folders, newFolder],
    };

    updatePartsStructure(newStructure);
    setNewFolderName("");
    setIsCreateFolderModalOpen(false);
  };

  const renameFolder = () => {
    if (!selectedFolder || !newFolderName.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }

    const existingFolder = partsStructure.folders.find(
      (folder) => 
        folder.id !== selectedFolder.id && 
        folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
    );

    if (existingFolder) {
      toast.error("Folder with this name already exists");
      return;
    }

    const newStructure = {
      ...partsStructure,
      folders: partsStructure.folders.map((folder) =>
        folder.id === selectedFolder.id
          ? { ...folder, name: newFolderName.trim() }
          : folder
      ),
    };

    updatePartsStructure(newStructure);
    setNewFolderName("");
    setSelectedFolder(null);
    setIsRenameFolderModalOpen(false);
  };

  const deleteFolder = (folderId: string) => {
    const folder = partsStructure.folders.find((f) => f.id === folderId);
    if (!folder) return;

    if (folder.files.length > 0) {
      // Show confirmation dialog for non-empty folders
      setFolderToDelete(folder);
      setIsDeleteConfirmOpen(true);
    } else {
      // Show confirmation dialog for empty folders too (organizational structure)
      setFolderToDelete(folder);
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteFolder = (folder: PartFolder) => {
    const newStructure = {
      ...partsStructure,
      folders: partsStructure.folders.filter((f) => f.id !== folder.id),
    };

    updatePartsStructure(newStructure);
    setIsDeleteConfirmOpen(false);
    setFolderToDelete(null);
  };

  // File operations
  const handleRootFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: PartFile[] = [];

    for (const file of files) {
      const preview = await createFilePreview(file);
      newFiles.push({
        id: generateId(),
        name: file.name,
        file,
        preview: preview || undefined,
      });
    }

    const newStructure = {
      ...partsStructure,
      rootFiles: [...partsStructure.rootFiles, ...newFiles],
    };

    updatePartsStructure(newStructure);

    // Reset input
    if (rootFileInputRef.current) {
      rootFileInputRef.current.value = "";
    }
  };

  const handleFolderFileUpload = async (
    folderId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const newFiles: PartFile[] = [];

    for (const file of files) {
      const preview = await createFilePreview(file);
      newFiles.push({
        id: generateId(),
        name: file.name,
        file,
        preview: preview || undefined,
      });
    }

    const newStructure = {
      ...partsStructure,
      folders: partsStructure.folders.map((folder) =>
        folder.id === folderId
          ? { ...folder, files: [...folder.files, ...newFiles] }
          : folder
      ),
    };

    updatePartsStructure(newStructure);

    // Reset input
    const inputRef = folderFileInputRefs.current[folderId];
    if (inputRef) {
      inputRef.value = "";
    }
  };

  const removeFile = (fileId: string, folderId?: string) => {
    if (folderId) {
      // Remove from folder
      const newStructure = {
        ...partsStructure,
        folders: partsStructure.folders.map((folder) =>
          folder.id === folderId
            ? { ...folder, files: folder.files.filter((f) => f.id !== fileId) }
            : folder
        ),
      };
      updatePartsStructure(newStructure);
    } else {
      // Remove from root
      const newStructure = {
        ...partsStructure,
        rootFiles: partsStructure.rootFiles.filter((f) => f.id !== fileId),
      };
      updatePartsStructure(newStructure);
    }
  };

  // File preview component with enhanced remove functionality
  const FilePreview = ({ file, onRemove }: { file: PartFile; onRemove: () => void }) => {
    const [showImageViewer, setShowImageViewer] = useState(false);

    const handleImageClick = () => {
      if (file.preview || (file.url && file.type === 'image')) {
        setShowImageViewer(true);
      }
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove();
    };

    return (
      <>
        <div 
          className="relative group border rounded-lg p-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={(file.preview || (file.url && file.type === 'image')) ? handleImageClick : undefined}
        >
          <div className="flex items-center gap-2">
            {(file.preview || (file.url && file.type === 'image')) ? (
              <div className="relative group/image">
                <img
                  src={file.preview || file.url}
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded hover:opacity-80 transition-opacity"
                  onError={(e) => {
                    // If image fails to load, show file icon instead
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parentDiv = target.parentElement;
                    if (parentDiv) {
                      parentDiv.innerHTML = `<div class="w-10 h-10 flex items-center justify-center border rounded bg-muted text-muted-foreground"><svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;
                    }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover/image:opacity-100 opacity-0 transition-opacity bg-black/40 rounded">
                  <Eye className="h-3 w-3 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center border rounded bg-muted">
                <File className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {file.file?.size ? (file.file.size / 1024).toFixed(1) + ' KB' : 
                 file.preview || file.url ? 'Stored file' : 
                 file.type === 'image' ? 'Image file' : 
                 file.type === 'document' ? 'Document' : 'File'}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation(); // Prevent container click
              handleRemove(e);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Image Viewer Modal */}
        {showImageViewer && (file.preview || (file.url && file.type === 'image')) && (
          <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-4">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-center">
                  {file.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center">
                <img
                  src={file.preview || file.url}
                  alt={file.name}
                  className="max-w-full max-h-[70vh] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  };

  // Helper function to toggle individual folder collapse
  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Folder component
  const FolderComponent = ({ folder }: { folder: PartFolder }) => {
    const isCollapsed = collapsedFolders.has(folder.id);
    
    return (
    <ContextMenu>
      <ContextMenuTrigger>
        <Card className="hover:shadow-md transition-shadow relative group">
          <CardHeader className="pb-3">
            <CardTitle 
              className="text-base flex items-center gap-2 cursor-pointer hover:bg-muted/50 -m-4 p-4 rounded-lg transition-colors"
              onClick={() => toggleFolderCollapse(folder.id)}
            >
              <Folder className="h-5 w-5 text-blue-600" />
              {folder.name}
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                ({folder.files.length} files)
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </span>
            </CardTitle>
            {/* Mobile-visible action buttons */}
            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedFolder(folder);
                  setNewFolderName(folder.name);
                  setIsRenameFolderModalOpen(true);
                }}
                className="h-6 px-2 text-xs gap-1"
              >
                <Edit3 className="h-3 w-3" />
                Rename
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => deleteFolder(folder.id)}
                className="h-6 px-2 text-xs gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </CardHeader>
          {!isCollapsed && (
          <CardContent>
            <div className="space-y-2">
              {folder.files.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-muted/20">
                  <Folder className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">"{folder.name}" is empty</p>
                  <p className="text-xs text-muted-foreground mt-1">This folder exists but contains no files yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {folder.files.map((file) => (
                    <FilePreview
                      key={file.id}
                      file={file}
                      onRemove={() => removeFile(file.id, folder.id)}
                    />
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => folderFileInputRefs.current[folder.id]?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Add Files
                </Button>
              </div>
              
              <input
                ref={(el) => {
                  folderFileInputRefs.current[folder.id] = el;
                }}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleFolderFileUpload(folder.id, e)}
              />
            </div>
          </CardContent>
          )}
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            setSelectedFolder(folder);
            setNewFolderName(folder.name);
            setIsRenameFolderModalOpen(true);
          }}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Rename Folder
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => deleteFolder(folder.id)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          type="button"
          onClick={() => setIsCreateFolderModalOpen(true)}
          className="w-full gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          New Folder
        </Button>
      </div>

      {/* Root Files Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle 
            className="text-base flex items-center justify-between cursor-pointer"
            onClick={() => setIsRootCollapsed(!isRootCollapsed)}
          >
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Root Files ({partsStructure.rootFiles.length})
            </div>
            {isRootCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </CardTitle>
        </CardHeader>
        {!isRootCollapsed && (
          <CardContent>
          <div className="space-y-4">
            {partsStructure.rootFiles.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-muted/20">
                <Image className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Root folder is empty</p>
                <p className="text-xs text-muted-foreground mt-1">Upload files directly here or organize them in folders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {partsStructure.rootFiles.map((file) => (
                  <FilePreview
                    key={file.id}
                    file={file}
                    onRemove={() => removeFile(file.id)}
                  />
                ))}
              </div>
            )}
            
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => rootFileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Add Files to Root
            </Button>
            
            <input
              ref={rootFileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={handleRootFileUpload}
            />
          </div>
          </CardContent>
        )}
      </Card>

      {/* Folders Section - Always show if folders exist, even if empty */}
      {partsStructure.folders.length > 0 && (
        <div className="space-y-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
          >
            <h4 className="font-medium">Folders ({partsStructure.folders.length})</h4>
            {isFoldersCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </div>
          {!isFoldersCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partsStructure.folders.map((folder) => (
                <FolderComponent key={folder.id} folder={folder} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      <Dialog open={isCreateFolderModalOpen} onOpenChange={setIsCreateFolderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder}>Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Modal */}
      <Dialog open={isRenameFolderModalOpen} onOpenChange={setIsRenameFolderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="renameFolderName">Folder Name</Label>
              <Input
                id="renameFolderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter new folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    renameFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={renameFolder}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete the folder <strong>"{folderToDelete?.name}"</strong> and all <strong>{folderToDelete?.files.length}</strong> files inside?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => folderToDelete && confirmDeleteFolder(folderToDelete)}
            >
              Delete Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}