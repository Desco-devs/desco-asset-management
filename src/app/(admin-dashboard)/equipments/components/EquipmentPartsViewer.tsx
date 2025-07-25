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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>("");
  
  // Collapsible states - same as PartsFolderManager
  const [isRootCollapsed, setIsRootCollapsed] = useState(false);
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // Parse equipment parts data into folder structure
  const parsePartsData = (parts: string[] | { rootFiles: any[]; folders: any[] } | string | undefined): ParsedPartData => {
    if (!parts) {
      return { rootFiles: [], folders: [] };
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
  
  // Debug logging to see what we're receiving (can be removed in production)
  console.log('🔍 EquipmentPartsViewer received equipmentParts:', equipmentParts);
  console.log('🔍 Parsed data:', parsedData);

  const handleImageClick = (url: string, name: string) => {
    setSelectedImage(url);
    setSelectedImageName(name);
  };

  // Helper function to toggle individual folder collapse - same as PartsFolderManager
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

  // File preview component - same as PartsFolderManager but read-only
  const FilePreview = ({ file }: { file: ParsedFile }) => {
    const isImage = file.type === 'image';
    const fileUrl = file.preview || file.url;
    
    // For stored files, try to get file size from name or estimate
    const getFileDisplayInfo = (file: ParsedFile) => {
      // If it's a new file with File object
      if (file.file?.size) {
        return `${(file.file.size / 1024).toFixed(1)} KB`;
      }
      
      // If it's an existing stored file, show appropriate label
      return file.preview || file.url ? 'Stored file' : isImage ? 'Image file' : 'Document';
    };
    
    return (
      <div 
        className="relative group border rounded-lg p-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => handleImageClick(fileUrl, file.name)}
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
                    parentDiv.innerHTML = `<div class="w-10 h-10 flex items-center justify-center border rounded bg-muted"><svg class="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
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
          {/* Click to view indicator */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  };

  // Folder component - same as PartsFolderManager but read-only
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
                <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg">
                  <Folder className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">No files in this folder</p>
                  <p className="text-xs text-muted-foreground mt-1">This folder is empty</p>
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

  if (parsedData.rootFiles.length === 0 && parsedData.folders.length === 0) {
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Root Files Section - same as PartsFolderManager */}
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
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">No files in root folder</p>
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

        {/* Folders Section - same as PartsFolderManager */}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsedData.folders.map((folder) => (
                  <FolderComponent key={folder.id} folder={folder} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Viewer Modal - Same responsive sizing as FileUploadSectionSimple */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent 
            className="!max-w-none p-4 
              w-[95vw] max-h-[90vh] sm:w-[80vw] sm:max-h-[75vh] lg:w-[60vw] lg:max-h-[65vh] xl:w-[40vw] xl:max-h-[60vh]" 
            style={{ 
              maxWidth: 'min(95vw, 800px)', 
              width: 'min(95vw, 800px)'
            }}
          >
            <DialogHeader className="pb-4">
              <DialogTitle className="text-center">
                {selectedImageName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center">
              <img
                src={selectedImage}
                alt={selectedImageName}
                className="max-w-full max-h-[80vh] sm:max-h-[65vh] lg:max-h-[55vh] xl:max-h-[45vh] object-contain"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                }}
                onLoad={() => {
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}