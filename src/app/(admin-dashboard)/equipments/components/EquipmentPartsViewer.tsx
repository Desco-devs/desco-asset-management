"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Folder,
  Receipt,
  Eye,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  File,
} from "lucide-react";
import Image from "next/image";

interface EquipmentPartsViewerProps {
  equipmentParts?: string[] | { rootFiles: any[]; folders: any[] } | string;
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

export default function EquipmentPartsViewer({ equipmentParts = [] }: EquipmentPartsViewerProps) {
  // Collapsible states - same as PartsFolderManager
  const [isRootCollapsed, setIsRootCollapsed] = useState(false);
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

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
        return { 
          rootFiles: [{
            id: 'file-0',
            name: parts.split('/').pop() || 'File',
            url: parts,
            type: parts.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document'
          }], 
          folders: [] 
        };
      } catch {
        // If JSON parse fails, treat as single URL
        return { 
          rootFiles: [{
            id: 'file-0',
            name: parts.split('/').pop() || 'File',
            url: parts,
            type: parts.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document'
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
            
            // Better image detection - check file extension and MIME type
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
            const isImageByExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
            const isImageByUrl = fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
            const isImageByMimeType = file.file?.type?.startsWith('image/');
            const isImage = isImageByExtension || isImageByUrl || isImageByMimeType || file.type === 'image';
            
            return {
              id: file.id || `file-${index}`,
              name: fileName,
              url: fileUrl,
              preview: file.preview || fileUrl,
              type: isImage ? 'image' : 'document',
              file: file.file // Preserve original File object if it exists
            } as ParsedFile;
          }) : [],
          folders: Array.isArray(parts.folders) ? parts.folders.map((folder: any) => ({
            ...folder,
            files: folder.files?.map((file: any, index: number) => {
              const fileUrl = file.preview || file.url || '';
              const fileName = file.name || fileUrl.split('/').pop() || `File ${index + 1}`;
              
              // Better image detection - check file extension and MIME type
              const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
              const isImageByExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
              const isImageByUrl = fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
              const isImageByMimeType = file.file?.type?.startsWith('image/');
              const isImage = isImageByExtension || isImageByUrl || isImageByMimeType || file.type === 'image';
              
              return {
                id: file.id || `file-${index}`,
                name: fileName,
                url: fileUrl,
                preview: file.preview || fileUrl,
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
        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
        
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
  const FilePreview = ({ file }: { file: ParsedFile }) => {
    const fileUrl = file.preview || file.url;
    
    // Better image detection - check file extension and MIME type
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const isImageByExtension = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
    const isImageByUrl = fileUrl?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
    const isImageByType = file.type === 'image';
    const isImage = isImageByExtension || isImageByUrl || isImageByType;
    
    // For stored files, try to get file size from name or estimate
    const getFileDisplayInfo = (file: ParsedFile) => {
      // If it's a new file with File object
      if (file.file?.size) {
        return `${(file.file.size / 1024).toFixed(1)} KB`;
      }
      
      // If it's an existing stored file, show appropriate label
      return fileUrl ? 'Stored file' : isImage ? 'Image file' : 'Document';
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
              <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover/image:opacity-100 opacity-100 transition-opacity bg-black/40 rounded">
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
        </div>
      </div>
    );
  };

  // Folder component - EXACT COPY from PartsFolderManager structure
  const FolderComponent = ({ folder }: { folder: ParsedFolder }) => {
    const isCollapsed = collapsedFolders.has(folder.id);
    
    return (
      <Card className="hover:shadow-md transition-shadow">
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
        </CardHeader>
        {!isCollapsed && (
        <CardContent>
          <div className="space-y-2">
            {folder.files.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-muted/20">
                <Folder className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">"{folder.name}" is empty</p>
                <p className="text-xs text-muted-foreground mt-1">This folder exists but contains no files yet</p>
                <p className="text-xs text-muted-foreground/80 mt-2">
                  Files can be added to this folder using the edit mode
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {folder.files.map((file) => (
                  <FilePreview key={file.id} file={file} />
                ))}
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
  const hasAnyStructure = parsedData.folders.length > 0 || parsedData.rootFiles.length > 0;
  
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
                Root Files ({parsedData.rootFiles.length})
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
                {parsedData.rootFiles.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg bg-muted/20">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Root folder is empty</p>
                    <p className="text-xs text-muted-foreground mt-1">Files can be added to the root folder using edit mode</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parsedData.rootFiles.map((file) => (
                      <FilePreview key={file.id} file={file} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Folders Section - Always show if folders exist, even if empty */}
        {parsedData.folders.length > 0 && (
          <div className="space-y-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
            >
              <h4 className="font-medium">Folders ({parsedData.folders.length})</h4>
              {isFoldersCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </div>
            {!isFoldersCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {parsedData.folders.map((folder) => (
                  <FolderComponent key={folder.id} folder={folder} />
                ))}
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
    </>
  );
}