"use client";

import React, { useState, useRef } from "react";
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
// Removed Next.js Image import - using regular img tags for blob URL compatibility

interface EquipmentPartsViewerProps {
  equipmentParts?: string[] | { rootFiles: any[]; folders: any[] } | string;
  isEditable?: boolean;
  onPartsChange?: (newParts: { rootFiles: any[]; folders: any[] }) => void;
  onPartFileDelete?: (fileId: string, fileName: string, folderPath?: string, fileUrl?: string) => void;
  onPartFolderDelete?: (folderPath: string, folderName: string) => void;
  debug?: boolean; // Add debug mode for troubleshooting
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
  onPartFolderDelete,
  debug = false
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

  // Helper function to process and validate image URLs
  const processImageUrl = (url: string): string => {
    if (!url) return '';
    
    // Handle Supabase storage URLs - ensure they're properly formatted
    if (url.includes('/storage/v1/object/public/')) {
      // URL is already in public format, but ensure it includes a cache-busting parameter
      return url.includes('?') ? url : `${url}?t=${Date.now()}`;
    }
    
    // If URL is missing the public path, try to construct it
    if (url.includes('supabase') && !url.includes('/storage/v1/object/public/')) {
      // Try to extract the file path and construct proper public URL
      const matches = url.match(/\/([^\/]+)\/(.+)$/);
      if (matches) {
        const bucket = matches[1];
        const path = matches[2];
        return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}?t=${Date.now()}`;
      }
    }
    
    // For blob URLs (newly uploaded files), return as is
    if (url.startsWith('blob:')) {
      return url;
    }
    
    // Add cache-busting parameter for other URLs
    return url.includes('?') ? url : `${url}?t=${Date.now()}`;
  };

  // Parse equipment parts data into folder structure - enhanced with better error handling
  const parsePartsData = (parts: string[] | { rootFiles: any[]; folders: any[] } | string | undefined): ParsedPartData => {
    if (!parts) {
      console.log('🔍 [EquipmentPartsViewer] No parts data provided');
      return { rootFiles: [], folders: [] };
    }

    console.log('🔍 [EquipmentPartsViewer] Parsing parts data:', { type: typeof parts, isArray: Array.isArray(parts), data: parts });

    // Handle database format: array with JSON string (most common)
    if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === 'string') {
      try {
        const parsed = JSON.parse(parts[0]);
        console.log('✅ [EquipmentPartsViewer] Successfully parsed array[0] as JSON:', parsed);
        if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
          // MIGRATION FIX: Check for legacy "Root" folder and merge with rootFiles
          let rootFiles = Array.isArray(parsed.rootFiles) ? parsed.rootFiles : [];
          let folders = Array.isArray(parsed.folders) ? parsed.folders : [];
          
          // Find and migrate any "Root" folder to rootFiles (case-insensitive)
          const rootFolderIndex = folders.findIndex((folder: any) => 
            folder.name && (folder.name.toLowerCase() === 'root' || folder.name === 'Root')
          );
          
          if (rootFolderIndex !== -1) {
            const rootFolder = folders[rootFolderIndex];
            if (rootFolder.files && Array.isArray(rootFolder.files) && rootFolder.files.length > 0) {
              // Merge Root folder files into rootFiles
              console.log(`🔄 [EquipmentPartsViewer] MIGRATION: Found legacy "${rootFolder.name}" folder with ${rootFolder.files.length} files, moving to Root Files section`);
              rootFiles = [...rootFiles, ...rootFolder.files];
              // Remove the Root folder from folders array
              folders = folders.filter((_: any, index: number) => index !== rootFolderIndex);
              console.log('✅ [EquipmentPartsViewer] Successfully migrated legacy Root folder to rootFiles');
            } else {
              // Empty root folder, just remove it
              folders = folders.filter((_: any, index: number) => index !== rootFolderIndex);
              console.log('🗑️ [EquipmentPartsViewer] Removed empty legacy Root folder');
            }
          }
          
          return {
            rootFiles: rootFiles.map((file: any, index: number) => {
              const processedUrl = processImageUrl(file.url || file.preview || '');
              return {
                id: file.id || `file-${index}-${Date.now()}`,
                name: file.name || 'Unknown file',
                url: processedUrl,
                preview: processedUrl,
                type: file.type || (processedUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
              };
            }),
            folders: folders.map((folder: any, folderIndex: number) => ({
              id: folder.id || `folder-${folderIndex}-${Date.now()}`,
              name: folder.name || `Folder ${folderIndex + 1}`,
              files: Array.isArray(folder.files) ? folder.files.map((file: any, fileIndex: number) => {
                const processedUrl = processImageUrl(file.url || file.preview || '');
                return {
                  id: file.id || `file-${folderIndex}-${fileIndex}-${Date.now()}`,
                  name: file.name || 'Unknown file',
                  url: processedUrl,
                  preview: processedUrl,
                  type: file.type || (processedUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
                };
              }) : []
            }))
          };
        }
      } catch (error) {
        console.warn('⚠️ [EquipmentPartsViewer] Failed to parse array[0] as JSON:', error);
        // If JSON parse fails, fall through to legacy handling
      }
    }

    // Handle string (JSON) format
    if (typeof parts === 'string') {
      try {
        const parsed = JSON.parse(parts);
        console.log('✅ [EquipmentPartsViewer] Successfully parsed string as JSON:', parsed);
        if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
          // MIGRATION FIX: Check for legacy "Root" folder and merge with rootFiles
          let rootFiles = Array.isArray(parsed.rootFiles) ? parsed.rootFiles : [];
          let folders = Array.isArray(parsed.folders) ? parsed.folders : [];
          
          // Find and migrate any "Root" folder to rootFiles (case-insensitive)
          const rootFolderIndex = folders.findIndex((folder: any) => 
            folder.name && (folder.name.toLowerCase() === 'root' || folder.name === 'Root')
          );
          
          if (rootFolderIndex !== -1) {
            const rootFolder = folders[rootFolderIndex];
            if (rootFolder.files && Array.isArray(rootFolder.files) && rootFolder.files.length > 0) {
              // Merge Root folder files into rootFiles
              console.log(`🔄 [EquipmentPartsViewer] MIGRATION: Found legacy "${rootFolder.name}" folder with ${rootFolder.files.length} files, moving to Root Files section`);
              rootFiles = [...rootFiles, ...rootFolder.files];
              // Remove the Root folder from folders array
              folders = folders.filter((_: any, index: number) => index !== rootFolderIndex);
              console.log('✅ [EquipmentPartsViewer] Successfully migrated legacy Root folder to rootFiles');
            } else {
              // Empty root folder, just remove it
              folders = folders.filter((_: any, index: number) => index !== rootFolderIndex);
              console.log('🗑️ [EquipmentPartsViewer] Removed empty legacy Root folder');
            }
          }
          
          return {
            rootFiles: rootFiles.map((file: any, index: number) => {
              const processedUrl = processImageUrl(file.url || file.preview || '');
              return {
                id: file.id || `file-${index}-${Date.now()}`,
                name: file.name || 'Unknown file',
                url: processedUrl,
                preview: processedUrl,
                type: file.type || (processedUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
              };
            }),
            folders: folders.map((folder: any, folderIndex: number) => ({
              id: folder.id || `folder-${folderIndex}-${Date.now()}`,
              name: folder.name || `Folder ${folderIndex + 1}`,
              files: Array.isArray(folder.files) ? folder.files.map((file: any, fileIndex: number) => {
                const processedUrl = processImageUrl(file.url || file.preview || '');
                return {
                  id: file.id || `file-${folderIndex}-${fileIndex}-${Date.now()}`,
                  name: file.name || 'Unknown file',
                  url: processedUrl,
                  preview: processedUrl,
                  type: file.type || (processedUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
                };
              }) : []
            }))
          };
        }
      } catch (error) {
        console.warn('⚠️ [EquipmentPartsViewer] Failed to parse string as JSON, treating as URL:', error);
        // Not JSON, treat as single URL
        const fileName = parts.split('/').pop() || 'File';
        const processedUrl = processImageUrl(parts);
        const isImage = processedUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
        
        return { 
          rootFiles: [{
            id: 'file-0',
            name: fileName,
            url: processedUrl,
            preview: processedUrl,
            type: isImage ? 'image' : 'document'
          }], 
          folders: [] 
        };
      }
    }

    // Handle object format (already parsed)
    if (typeof parts === 'object' && !Array.isArray(parts)) {
      console.log('✅ [EquipmentPartsViewer] Parts data is already an object');
      if (parts.rootFiles && parts.folders) {
        // MIGRATION FIX: Check for legacy "Root" folder and merge with rootFiles
        let rootFiles = Array.isArray(parts.rootFiles) ? parts.rootFiles : [];
        let folders = Array.isArray(parts.folders) ? parts.folders : [];
        
        // Find and migrate any "Root" folder to rootFiles
        const rootFolderIndex = folders.findIndex((folder: any) => 
          folder.name === 'Root' || folder.name === 'root'
        );
        
        if (rootFolderIndex !== -1) {
          const rootFolder = folders[rootFolderIndex];
          if (rootFolder.files && Array.isArray(rootFolder.files)) {
            // Merge Root folder files into rootFiles
            rootFiles = [...rootFiles, ...rootFolder.files];
            // Remove the Root folder from folders array
            folders = folders.filter((_: any, index: number) => index !== rootFolderIndex);
            console.log('🔄 [EquipmentPartsViewer] Migrated legacy "Root" folder to rootFiles');
          }
        }
        
        return {
          rootFiles: rootFiles.map((file: any, index: number) => {
            const processedUrl = processImageUrl(file.url || file.preview || '');
            return {
              id: file.id || `file-${index}-${Date.now()}`,
              name: file.name || 'Unknown file',
              url: processedUrl,
              preview: processedUrl,
              type: file.type || (processedUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
            };
          }),
          folders: folders.map((folder: any, folderIndex: number) => ({
            id: folder.id || `folder-${folderIndex}-${Date.now()}`,
            name: folder.name || `Folder ${folderIndex + 1}`,
            files: Array.isArray(folder.files) ? folder.files.map((file: any, fileIndex: number) => {
              const processedUrl = processImageUrl(file.url || file.preview || '');
              return {
                id: file.id || `file-${folderIndex}-${fileIndex}-${Date.now()}`,
                name: file.name || 'Unknown file',
                url: processedUrl,
                preview: processedUrl,
                type: file.type || (processedUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
              };
            }) : []
          }))
        };
      }
    }

    // Handle array format (legacy - URLs only)
    if (Array.isArray(parts)) {
      if (parts.length === 0) {
        console.log('ℹ️ [EquipmentPartsViewer] Empty parts array');
        return { rootFiles: [], folders: [] };
      }

      console.log('🔄 [EquipmentPartsViewer] Converting legacy URL array to new format');
      // Convert legacy URL array to new format
      const rootFiles: ParsedFile[] = parts.map((url, index) => {
        const fileName = url.split('/').pop() || `Part ${index + 1}`;
        const processedUrl = processImageUrl(url);
        const isImage = processedUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
        
        return {
          id: `file-${index}`,
          name: fileName,
          url: processedUrl,
          preview: processedUrl,
          type: isImage ? 'image' : 'document',
        };
      });

      return { rootFiles, folders: [] };
    }

    // Fallback
    console.warn('⚠️ [EquipmentPartsViewer] Unable to parse parts data, returning empty structure');
    return { rootFiles: [], folders: [] };
  };

  const parsedData = parsePartsData(equipmentParts);
  
  // Simple display data - no deduplication needed with simplified API
  const displayData = parsedData;

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
          onPartFileDelete(fileToRemove.id, fileToRemove.name, folderPath, fileToRemove.url || fileToRemove.preview);
        }
        
        folder.files = folder.files.filter(f => f.id !== fileId);
      }
    } else {
      // Remove from root
      const fileToRemove = newData.rootFiles.find(f => f.id === fileId);
      
      if (fileToRemove && (fileToRemove.url || fileToRemove.preview) && !fileToRemove.file && onPartFileDelete) {
        onPartFileDelete(fileToRemove.id, fileToRemove.name, 'root', fileToRemove.url || fileToRemove.preview);
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
    const [imageLoadError, setImageLoadError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    
    // Get the best available URL for the file
    const fileUrl = file.preview || file.url;
    
    // Helper function to check if a URL/file is actually an image by extension - FIXED LOGIC
    const isActualImage = (url: string | null, fileName: string) => {
      if (!url && !fileName) return false;
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
      
      // Check file name extension first
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
    
    const isImage = isActualImage(fileUrl, file.name) && !imageLoadError && fileUrl;
    
    // Reset error state when URL changes
    React.useEffect(() => {
      if (fileUrl) {
        setImageLoadError(false);
        setImageLoaded(false);
        setImageLoading(true);
        setRetryCount(0); // Reset retry count on URL change
      }
    }, [fileUrl]);
    
    // For stored files, try to get file size from name or estimate
    const getFileDisplayInfo = (file: ParsedFile) => {
      // If it's a new file with File object
      if (file.file?.size) {
        return `${(file.file.size / 1024).toFixed(1)} KB`;
      }
      
      // FIXED: Improve display text for existing files - consistent with data layer fixes
      if (fileUrl) {
        return isImage ? 'Image' : 'Document';
      }
      
      // Fallback for files without URLs
      return 'File';
    };

    const handleClick = () => {
      if (fileUrl && isImage && !imageLoadError && imageLoaded) {
        handleImageClick(fileUrl, file.name);
      } else if (fileUrl && !isImage) {
        // For non-images, try to open in new tab
        window.open(fileUrl, '_blank');
      }
    };
    
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      console.error('Image failed to load:', fileUrl, 'Retry count:', retryCount, e);
      
      // Try to retry loading the image up to 2 times
      if (retryCount < 2 && fileUrl) {
        setRetryCount(prev => prev + 1);
        setImageLoading(true);
        
        // Add a small delay before retry
        setTimeout(() => {
          const img = e.currentTarget;
          if (img) {
            // Force reload with new cache-buster
            const newUrl = fileUrl.includes('?') ? 
              fileUrl.replace(/\?.*/, `?retry=${retryCount + 1}&t=${Date.now()}`) : 
              `${fileUrl}?retry=${retryCount + 1}&t=${Date.now()}`;
            img.src = newUrl;
          }
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        setImageLoadError(true);
        setImageLoading(false);
        setImageLoaded(false);
      }
    };
    
    const handleImageLoad = () => {
      console.log('Image loaded successfully:', fileUrl);
      setImageLoadError(false);
      setImageLoading(false);
      setImageLoaded(true);
    };
    
    return (
      <div 
        className={`relative group border rounded-lg p-2 bg-card transition-colors ${
          ((isImage && imageLoaded && !imageLoadError) || (!isImage && fileUrl)) 
            ? 'hover:bg-muted/50 cursor-pointer' 
            : 'cursor-default'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          {isImage && fileUrl ? (
            <div className="relative group/image">
              {imageLoading && (
                <div className="w-10 h-10 flex items-center justify-center border rounded bg-muted animate-pulse">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <img
                src={fileUrl}
                alt={file.name}
                className={`w-10 h-10 object-cover rounded hover:opacity-80 transition-opacity ${
                  imageLoading ? 'opacity-0 absolute' : 'opacity-100'
                }`}
                onError={handleImageError}
                onLoad={handleImageLoad}
                style={{
                  display: imageLoadError ? 'none' : 'block'
                }}
              />
              {imageLoadError && (
                <div className="w-10 h-10 flex items-center justify-center border rounded bg-red-50 border-red-200" title={`Failed to load image after ${retryCount} retries`}>
                  <X className="h-4 w-4 text-red-500" />
                </div>
              )}
              {imageLoaded && !imageLoadError && (
                <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover/image:opacity-100 opacity-0 transition-opacity bg-black/40 rounded">
                  <Eye className="h-3 w-3 text-white" />
                </div>
              )}
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
            {debug && (
              <p className="text-xs text-blue-600 font-mono truncate" title={fileUrl}>
                URL: {fileUrl?.substring(0, 30)}...
              </p>
            )}
          </div>
          {/* Click to view indicator - only show for loaded images */}
          {((isImage && imageLoaded && !imageLoadError) || (!isImage && fileUrl)) && (
            <div className="opacity-60 group-hover:opacity-100 transition-opacity">
              <Eye className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
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
      {debug && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-700 space-y-1">
            <p><strong>Data Type:</strong> {typeof equipmentParts} {Array.isArray(equipmentParts) ? '(Array)' : ''}</p>
            <p><strong>Root Files:</strong> {displayData.rootFiles.length}</p>
            <p><strong>Folders:</strong> {displayData.folders.length}</p>
            <p><strong>Total Files:</strong> {displayData.rootFiles.length + displayData.folders.reduce((sum, f) => sum + f.files.length, 0)}</p>
            {displayData.rootFiles.length > 0 && (
              <div className="pt-2">
                <p><strong>Sample Root File URLs:</strong></p>
                {displayData.rootFiles.slice(0, 2).map((file, i) => (
                  <p key={i} className="font-mono text-xs truncate" title={file.url}>
                    {i + 1}. {file.url.substring(0, 60)}...
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
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

      {/* Image Viewer Modal - Enhanced with better error handling */}
      {showImageViewer && (
        <Dialog open={showImageViewer} onOpenChange={setShowImageViewer}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-4">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-center">
                {viewerImageName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-[300px]">
              <img
                src={viewerImageUrl}
                alt={viewerImageName}
                className="max-w-full max-h-[70vh] object-contain"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  // Replace with error message instead of closing modal
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'flex flex-col items-center justify-center text-center p-8';
                  errorDiv.innerHTML = `
                    <div class="text-red-500 mb-4">
                      <svg class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Failed to load image</h3>
                    <p class="text-sm text-gray-500 mb-4">The image could not be loaded. It may have been deleted or there may be a connection issue.</p>
                    <button onclick="window.open('${viewerImageUrl}', '_blank')" class="text-blue-600 hover:text-blue-500 text-sm">
                      Try opening in new tab
                    </button>
                  `;
                  e.currentTarget.parentNode?.replaceChild(errorDiv, e.currentTarget);
                }}
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