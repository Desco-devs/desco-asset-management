"use client";

import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Folder,
  Receipt,
  Eye,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  File,
  X,
  Trash2,
  Edit3,
  Check,
  Upload,
  FolderPlus,
  Plus,
} from "lucide-react";
import Image from "next/image";

interface EquipmentPartsViewerProps {
  equipmentParts?: string[] | { rootFiles: any[]; folders: any[] } | string;
  isEditable?: boolean;
  onPartsChange?: (newParts: { rootFiles: any[]; folders: any[] }) => void;
  onPartFileDelete?: (fileId: string, fileName: string, folderPath?: string) => void;
  onPartFolderDelete?: (folderPath: string, folderName: string) => void;
}

interface ParsedFile {
  id: string;
  name: string;
  url: string;
  preview?: string;
  type: 'image' | 'document';
  file?: File; // For new uploaded files that have size info
}

interface ParsedFolder {
  id: string;
  name: string;
  files: ParsedFile[];
}

interface ParsedPartData {
  rootFiles: ParsedFile[];
  folders: ParsedFolder[];
}

export default function EquipmentPartsViewer({ 
  equipmentParts = [], 
  isEditable = false, 
  onPartsChange,
  onPartFileDelete,
  onPartFolderDelete
}: EquipmentPartsViewerProps) {
  // Collapsible states - same as PartsFolderManager
  const [isRootCollapsed, setIsRootCollapsed] = useState(false);
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  
  // Edit states
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ 
    isOpen: boolean; 
    type: 'file' | 'folder'; 
    itemId: string;
    folderName?: string;
    fileName?: string;
    hasFiles?: boolean;
  }>({ isOpen: false, type: 'file', itemId: '' });
  
  // File upload states
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse equipment parts data into folder structure
  const parsePartsData = (parts: string[] | { rootFiles: any[]; folders: any[] } | string | undefined): ParsedPartData => {
    if (!parts) {
      return { rootFiles: [], folders: [] };
    }

    // Handle database format: array with JSON string
    if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === 'string') {
      try {
        const parsed = JSON.parse(parts[0]);
        if (parsed && typeof parsed === 'object') {
          return {
            rootFiles: Array.isArray(parsed.rootFiles) ? parsed.rootFiles : [],
            folders: Array.isArray(parsed.folders) ? parsed.folders : []
          };
        }
      } catch {
        // If JSON parse fails, fall through to legacy handling
      }
    }

    // Handle string (JSON) format
    if (typeof parts === 'string') {
      try {
        const parsed = JSON.parse(parts);
        if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
          return parsed;
        }
        // If it's just a string URL, treat it as single file
        const fileName = parts.split('/').pop() || 'File';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const isImage = imageExtensions.includes(fileExtension);
        
        return { 
          rootFiles: [{
            id: 'file-0',
            name: fileName,
            url: parts,
            type: isImage ? 'image' : 'document'
          }], 
          folders: [] 
        };
      } catch {
        // If JSON parse fails, treat as single URL
        const fileName = parts.split('/').pop() || 'File';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const isImage = imageExtensions.includes(fileExtension);
        
        return { 
          rootFiles: [{
            id: 'file-0',
            name: fileName,
            url: parts,
            type: isImage ? 'image' : 'document'
          }], 
          folders: [] 
        };
      }
    }

    // Handle object format (already parsed)
    if (typeof parts === 'object' && !Array.isArray(parts)) {
      if (parts.rootFiles !== undefined && parts.folders !== undefined) {
        // Ensure files have proper structure with type detection
        const processedData = {
          rootFiles: Array.isArray(parts.rootFiles) ? parts.rootFiles.map((file: any, index: number) => {
            const fileUrl = file.preview || file.url || '';
            const fileName = file.name || fileUrl.split('/').pop() || `File ${index + 1}`;
            
            // FIXED: Better image detection - consistent with working FileUploadSectionSimple
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
            const isImageByExtension = imageExtensions.includes(fileExtension);
            const urlExtension = fileUrl.split('.').pop()?.toLowerCase().split('?')[0] || ''; // Remove query params
            const isImageByUrl = imageExtensions.includes(urlExtension);
            const isImageByMimeType = file.file?.type?.startsWith('image/');
            const isImage = isImageByExtension || isImageByUrl || isImageByMimeType || file.type === 'image';
            
            return {
              id: file.id || `file-${index}`,
              name: fileName,
              url: fileUrl,
              preview: file.preview || fileUrl || file.url, // CRITICAL FIX: Ensure preview is always set
              type: isImage ? 'image' : 'document',
              file: file.file // Preserve original File object if it exists
            } as ParsedFile;
          }) : [],
          folders: Array.isArray(parts.folders) ? parts.folders.map((folder: any) => ({
            ...folder,
            files: folder.files?.map((file: any, index: number) => {
              const fileUrl = file.preview || file.url || '';
              const fileName = file.name || fileUrl.split('/').pop() || `File ${index + 1}`;
              
              // FIXED: Better image detection - consistent with working FileUploadSectionSimple
              const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
              const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
              const isImageByExtension = imageExtensions.includes(fileExtension);
              const urlExtension = fileUrl.split('.').pop()?.toLowerCase().split('?')[0] || ''; // Remove query params
              const isImageByUrl = imageExtensions.includes(urlExtension);
              const isImageByMimeType = file.file?.type?.startsWith('image/');
              const isImage = isImageByExtension || isImageByUrl || isImageByMimeType || file.type === 'image';
              
              return {
                id: file.id || `file-${index}`,
                name: fileName,
                url: fileUrl,
                preview: file.preview || fileUrl || file.url, // CRITICAL FIX: Ensure preview is always set
                type: isImage ? 'image' : 'document',
                file: file.file // Preserve original File object if it exists
              } as ParsedFile;
            }) || []
          })) : []
        };
        
        return processedData;
      }
    }

    // Handle array format (legacy)
    if (Array.isArray(parts)) {
      if (parts.length === 0) {
        return { rootFiles: [], folders: [] };
      }

      const rootFiles: ParsedFile[] = [];
      const folders: ParsedFolder[] = [];

      parts.forEach((url, index) => {
        const fileName = url.split('/').pop() || `Part ${index + 1}`;
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const isImage = imageExtensions.includes(fileExtension);
        
        const file: ParsedFile = {
          id: `file-${index}`,
          name: fileName,
          url,
          type: isImage ? 'image' : 'document',
        };

        rootFiles.push(file);
      });

      return { rootFiles, folders };
    }

    // Fallback
    return { rootFiles: [], folders: [] };
  };

  const parsedData = parsePartsData(equipmentParts);

  // FIXED DEDUPLICATION: Simple deduplication based on file name only
  // This prevents the creation of "stored file" duplicates
  const deduplicatePartsData = (data: ParsedPartData): ParsedPartData => {
    const deduplicateFiles = (files: ParsedFile[]): ParsedFile[] => {
      const seen = new Map<string, ParsedFile>();
      
      for (const file of files) {
        const key = file.name.toLowerCase();
        const existing = seen.get(key);
        
        if (!existing) {
          // First occurrence - keep it
          seen.set(key, file);
        } else {
          // Duplicate found - prefer files with actual File objects (new uploads)
          // or files with proper preview URLs over those without
          const currentHasFile = !!file.file;
          const existingHasFile = !!existing.file;
          const currentHasValidPreview = !!(file.preview || file.url);
          const existingHasValidPreview = !!(existing.preview || existing.url);
          
          // Priority: File object > Valid preview > First occurrence
          if (currentHasFile && !existingHasFile) {
            seen.set(key, file);
          } else if (!currentHasFile && existingHasFile) {
            // Keep existing
          } else if (currentHasValidPreview && !existingHasValidPreview) {
            seen.set(key, file);
          }
          // Otherwise keep the first occurrence (existing)
        }
      }
      
      return Array.from(seen.values());
    };

    return {
      rootFiles: deduplicateFiles(data.rootFiles),
      folders: data.folders.map(folder => ({
        ...folder,
        files: deduplicateFiles(folder.files)
      }))
    };
  };

  // Apply deduplication to display clean data
  const displayData = useMemo(() => {
    return deduplicatePartsData(parsedData);
  }, [parsedData]);

  // Edit helper functions
  const removeFile = (fileId: string, folderId?: string) => {
    const newData = { ...displayData };
    
    if (folderId) {
      // Remove from folder
      const folder = newData.folders.find(f => f.id === folderId);
      if (folder) {
        // Find the file to check if it's an existing file that needs deletion tracking
        const fileToRemove = folder.files.find(f => f.id === fileId);
        if (fileToRemove && (fileToRemove.url || fileToRemove.preview) && !fileToRemove.file && onPartFileDelete) {
          // Get folder name from folder object
          const folderPath = folder.name;
          onPartFileDelete(fileToRemove.id, fileToRemove.name, folderPath);
        }
        
        folder.files = folder.files.filter(f => f.id !== fileId);
      }
    } else {
      // Remove from root
      const fileToRemove = newData.rootFiles.find(f => f.id === fileId);
      if (fileToRemove && (fileToRemove.url || fileToRemove.preview) && !fileToRemove.file && onPartFileDelete) {
        onPartFileDelete(fileToRemove.id, fileToRemove.name, 'root');
      }
      
      newData.rootFiles = newData.rootFiles.filter(f => f.id !== fileId);
    }
    
    if (onPartsChange) {
      onPartsChange(newData);
    }
  };
  
  const deleteFolder = (folderId: string) => {
    const newData = { ...displayData };
    
    // Find the folder to be deleted for deletion tracking
    const folderToDelete = newData.folders.find(f => f.id === folderId);
    if (folderToDelete) {
      // Check if folder contains existing files (not new uploads) and notify parent for deletion tracking
      const hasExistingFiles = folderToDelete.files.some(file => (file.url || file.preview) && !file.file);
      if (hasExistingFiles && onPartFolderDelete) {
        // Notify parent that the entire folder should be deleted from storage
        onPartFolderDelete(folderToDelete.name, folderToDelete.name);
      } else if (onPartFileDelete) {
        // If no cascade deletion, handle individual file deletions for existing files
        folderToDelete.files.forEach(file => {
          if ((file.url || file.preview) && !file.file) {
            onPartFileDelete(file.id, file.name, folderToDelete.name);
          }
        });
      }
    }
    
    newData.folders = newData.folders.filter(f => f.id !== folderId);
    
    if (onPartsChange) {
      onPartsChange(newData);
    }
  };
  
  const renameFolder = (folderId: string, newName: string) => {
    const newData = { ...displayData };
    const folder = newData.folders.find(f => f.id === folderId);
    if (folder) {
      folder.name = newName.trim();
    }
    
    if (onPartsChange) {
      onPartsChange(newData);
    }
  };
  
  // Add file helper function
  const addFile = (files: FileList | null, folderId?: string) => {
    if (!files || files.length === 0) return;
    
    const newData = { ...displayData };
    const newFiles: ParsedFile[] = Array.from(files).map((file, index) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension) || file.type.startsWith('image/');
      
      return {
        id: `file-${Date.now()}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
        preview: URL.createObjectURL(file),
        type: isImage ? 'image' : 'document',
        file: file
      } as ParsedFile;
    });
    
    if (folderId) {
      // Add to specific folder
      const folder = newData.folders.find(f => f.id === folderId);
      if (folder) {
        folder.files = [...folder.files, ...newFiles];
      }
    } else {
      // Add to root
      newData.rootFiles = [...newData.rootFiles, ...newFiles];
    }
    
    if (onPartsChange) {
      onPartsChange(newData);
    }
  };
  
  // Create folder helper function
  const createFolder = (name: string) => {
    const newData = { ...displayData };
    const newFolder: ParsedFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim(),
      files: []
    };
    
    newData.folders = [...newData.folders, newFolder];
    
    if (onPartsChange) {
      onPartsChange(newData);
    }
  };

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string>('');
  const [viewerImageName, setViewerImageName] = useState<string>('');

  const handleImageClick = (url: string, name: string) => {
    setViewerImageUrl(url);
    setViewerImageName(name);
    setShowImageViewer(true);
  };

  // Helper function to toggle individual folder collapse - EXACT COPY from PartsFolderManager
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

  // File preview component - enhanced for better preview functionality
  const FilePreview = ({ file, folderId, onRemove }: { 
    file: ParsedFile; 
    folderId?: string; 
    onRemove?: (fileId: string, folderId?: string) => void; 
  }) => {
    const fileUrl = file.preview || file.url;
    
    // Helper function to check if a URL/file is actually an image by extension - FIXED LOGIC
    const isActualImage = (url: string | null, fileName: string) => {
      if (!url && !fileName) return false;
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
      
      // Check file name extension
      const fileExt = fileName.split('.').pop()?.toLowerCase();
      if (fileExt && imageExtensions.includes(fileExt)) return true;
      
      // Check URL extension
      if (url) {
        const urlExt = url.split('.').pop()?.toLowerCase().split('?')[0]; // Remove query params
        if (urlExt && imageExtensions.includes(urlExt)) return true;
      }
      
      // Check file type property
      if (file.type === 'image') return true;
      
      return false;
    };
    
    const isImage = isActualImage(fileUrl, file.name);
    
    // For stored files, try to get file size from name or estimate
    const getFileDisplayInfo = (file: ParsedFile) => {
      // If it's a new file with File object
      if (file.file?.size) {
        return `${(file.file.size / 1024).toFixed(1)} KB`;
      }
      
      // FIXED: Improve display text for existing files
      if (fileUrl) {
        return isImage ? 'Image' : 'Document';
      }
      
      // Fallback for files without URLs
      return 'File';
    };

    const handleClick = () => {
      if (fileUrl && (isImage || fileUrl)) {
        handleImageClick(fileUrl, file.name);
      }
    };
    
    return (
      <div 
        className="relative group border rounded-lg p-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          {isImage && fileUrl ? (
            <div className="relative group/image">
              <img
                src={fileUrl}
                alt={file.name}
                className="w-10 h-10 object-cover rounded hover:opacity-80 transition-opacity"
                onError={(e) => {
                  // If image fails to load, show file icon instead
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parentDiv = target.parentElement;
                  if (parentDiv) {
                    parentDiv.innerHTML = `<div class="w-10 h-10 flex items-center justify-center border rounded bg-muted"><svg class="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>`;
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
              {getFileDisplayInfo(file)}
            </p>
          </div>
          {/* Click to view indicator - always visible for better UX */}
          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Remove button - only show in edit mode */}
          {isEditable && onRemove && (
            <Button
              variant="destructive"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the file preview
                setDeleteDialog({
                  isOpen: true,
                  type: 'file',
                  itemId: file.id,
                  fileName: file.name,
                  folderName: folderId
                });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Folder component - Enhanced with edit functionality
  const FolderComponent = ({ folder }: { folder: ParsedFolder }) => {
    const isCollapsed = collapsedFolders.has(folder.id);
    
    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 -m-4 p-4 rounded-lg transition-colors flex-1"
              onClick={() => toggleFolderCollapse(folder.id)}
            >
              <Folder className="h-5 w-5 text-blue-600" />
              {editingFolder === folder.id ? (
                <Input
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  className="h-6 text-base font-semibold"
                  onBlur={() => {
                    if (editingFolderName.trim() && editingFolderName.trim() !== folder.name) {
                      renameFolder(folder.id, editingFolderName.trim());
                    }
                    setEditingFolder(null);
                    setEditingFolderName("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      setEditingFolder(null);
                      setEditingFolderName("");
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span>{folder.name}</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
                ({folder.files.length} files)
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </span>
            </div>
            
            {/* Edit buttons - only show in edit mode */}
            {isEditable && editingFolder !== folder.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolder(folder.id);
                    setEditingFolderName(folder.name);
                  }}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialog({
                      isOpen: true,
                      type: 'folder',
                      itemId: folder.id,
                      folderName: folder.name,
                      hasFiles: folder.files.length > 0
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Save/Cancel buttons when editing */}
            {isEditable && editingFolder === folder.id && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editingFolderName.trim() && editingFolderName.trim() !== folder.name) {
                      renameFolder(folder.id, editingFolderName.trim());
                    }
                    setEditingFolder(null);
                    setEditingFolderName("");
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFolder(null);
                    setEditingFolderName("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        {!isCollapsed && (
        <CardContent>
          <div className="space-y-2">
            {folder.files.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-muted/20">
                <Folder className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">"{folder.name}" is empty</p>
                <p className="text-xs text-muted-foreground mt-1">This folder exists but contains no files yet</p>
                {isEditable ? (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*,application/pdf,.doc,.docx,.txt';
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          addFile(target.files, folder.id);
                        };
                        input.click();
                      }}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Add Files
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/80 mt-2">
                    Files can be added to this folder using the edit mode
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {folder.files.map((file) => (
                    <FilePreview 
                      key={file.id} 
                      file={file} 
                      folderId={folder.id}
                      onRemove={isEditable ? removeFile : undefined}
                    />
                  ))}
                </div>
                {/* Add files button when folder has files and in edit mode */}
                {isEditable && (
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*,application/pdf,.doc,.docx,.txt';
                        input.onchange = (e) => {
                          const target = e.target as HTMLInputElement;
                          addFile(target.files, folder.id);
                        };
                        input.click();
                      }}
                      className="gap-2 w-full"
                    >
                      <Plus className="h-4 w-4" />
                      Add More Files
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
        )}
      </Card>
    );
  };

  // Check if we have any structure to display (including empty folders)
  // Show the component if there are any folders (even empty) or any root files
  const hasAnyStructure = displayData.folders.length > 0 || displayData.rootFiles.length > 0;
  
  if (!hasAnyStructure) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Equipment Parts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Parts documentation and images for this equipment
          </p>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center">
            <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No parts data available for this equipment</p>
            <p className="text-xs text-muted-foreground mt-2">Parts can be added using the edit mode</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Root Files Section - Always show when any structure exists */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle 
              className="text-base flex items-center justify-between cursor-pointer"
              onClick={() => setIsRootCollapsed(!isRootCollapsed)}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Root Files ({displayData.rootFiles.length})
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
                {displayData.rootFiles.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-muted/20">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Root folder is empty</p>
                    {isEditable ? (
                      <div className="mt-4 space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.multiple = true;
                            input.accept = 'image/*,application/pdf,.doc,.docx,.txt';
                            input.onchange = (e) => {
                              const target = e.target as HTMLInputElement;
                              addFile(target.files);
                            };
                            input.click();
                          }}
                          className="gap-2 mr-2"
                        >
                          <Upload className="h-4 w-4" />
                          Add Files
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Files can be added to the root folder using edit mode</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {displayData.rootFiles.map((file) => (
                        <FilePreview 
                          key={file.id} 
                          file={file} 
                          onRemove={isEditable ? removeFile : undefined}
                        />
                      ))}
                    </div>
                    {/* Add files button when root has files and in edit mode */}
                    {isEditable && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.multiple = true;
                            input.accept = 'image/*,application/pdf,.doc,.docx,.txt';
                            input.onchange = (e) => {
                              const target = e.target as HTMLInputElement;
                              addFile(target.files);
                            };
                            input.click();
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add More Files
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Folders Section - Always show if folders exist, even if empty, or if in edit mode */}
        {(displayData.folders.length > 0 || isEditable) && (
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
            >
              <h4 className="font-medium">Folders ({displayData.folders.length})</h4>
              <div className="flex items-center gap-2">
                {isEditable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingFolder(true);
                      setNewFolderName("");
                    }}
                    className="gap-2"
                  >
                    <FolderPlus className="h-4 w-4" />
                    Create Folder
                  </Button>
                )}
                {isFoldersCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </div>
            </div>
            {!isFoldersCollapsed && (
              <div className="space-y-4">
                {/* Inline folder creation */}
                {isEditable && isCreatingFolder && (
                  <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5 text-primary" />
                        <Input
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Enter folder name..."
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newFolderName.trim()) {
                              createFolder(newFolderName);
                              setIsCreatingFolder(false);
                              setNewFolderName("");
                            }
                            if (e.key === 'Escape') {
                              setIsCreatingFolder(false);
                              setNewFolderName("");
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (newFolderName.trim()) {
                              createFolder(newFolderName);
                              setIsCreatingFolder(false);
                              setNewFolderName("");
                            }
                          }}
                          disabled={!newFolderName.trim()}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsCreatingFolder(false);
                            setNewFolderName("");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Existing folders */}
                {displayData.folders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {displayData.folders.map((folder) => (
                      <FolderComponent key={folder.id} folder={folder} />
                    ))}
                  </div>
                ) : !isCreatingFolder && isEditable ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-muted/20">
                    <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground/60 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No folders yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create your first folder to organize files</p>
                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCreatingFolder(true);
                          setNewFolderName("");
                        }}
                        className="gap-2"
                      >
                        <FolderPlus className="h-4 w-4" />
                        Create First Folder
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Viewer Modal - EXACT COPY from PartsFolderManager */}
      {showImageViewer && (
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-4">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-center">
                {viewerImageName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center">
              <img
                src={viewerImageUrl}
                alt={viewerImageName}
                className="max-w-full max-h-[70vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog for Deletions */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog.type === 'folder' ? 'Delete Folder' : 'Delete File'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'folder' ? (
                <>
                  Are you sure you want to delete the folder "{deleteDialog.folderName}"?
                  {deleteDialog.hasFiles && (
                    <span className="block mt-2 text-destructive font-medium">
                      This folder contains {deleteDialog.hasFiles ? 'files' : 'no files'}. All files in this folder will also be deleted.
                    </span>
                  )}
                  <span className="block mt-2">This action cannot be undone.</span>
                </>
              ) : (
                <>
                  Are you sure you want to delete "{deleteDialog.fileName}"?
                  <span className="block mt-2">This action cannot be undone.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteDialog.type === 'folder') {
                  deleteFolder(deleteDialog.itemId);
                } else {
                  removeFile(deleteDialog.itemId, deleteDialog.folderName);
                }
                setDeleteDialog({ isOpen: false, type: 'file', itemId: '' });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}