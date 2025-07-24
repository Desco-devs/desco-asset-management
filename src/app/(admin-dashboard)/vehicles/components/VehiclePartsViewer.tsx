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

interface VehiclePartsViewerProps {
  vehicleParts?: string[] | { rootFiles: any[]; folders: any[] } | string;
}

interface ParsedFile {
  id: string;
  name: string;
  url: string;
  preview?: string;
  type: 'image' | 'document';
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

export default function VehiclePartsViewer({ vehicleParts = [] }: VehiclePartsViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>("");
  
  // Collapsible states - same as EquipmentPartsViewer
  const [isRootCollapsed, setIsRootCollapsed] = useState(false);
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // Parse vehicle parts data into folder structure - EXACTLY like EquipmentPartsViewer
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
      if (parts.rootFiles && parts.folders) {
        // Ensure files have proper structure with type detection
        const processedData = {
          rootFiles: parts.rootFiles.map((file: any, index: number) => {
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
              type: isImage ? 'image' : 'document'
            } as ParsedFile;
          }),
          folders: parts.folders.map((folder: any) => ({
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
                type: isImage ? 'image' : 'document'
              } as ParsedFile;
            }) || []
          }))
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

  const parsedData = parsePartsData(vehicleParts);
  
  // Debug logging to see what we're receiving
  console.log('🔍 VehiclePartsViewer received vehicleParts:', vehicleParts);
  console.log('🔍 Parsed data:', parsedData);

  const handleImageClick = (url: string, name: string) => {
    setSelectedImage(url);
    setSelectedImageName(name);
  };

  // Helper function to toggle individual folder collapse - same as EquipmentPartsViewer
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

  // File preview component - same as EquipmentPartsViewer but read-only
  const FilePreview = ({ file }: { file: ParsedFile }) => {
    const isImage = file.type === 'image';
    const fileUrl = file.preview || file.url;
    
    return (
      <div 
        className="relative group border rounded-lg p-2 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => handleImageClick(fileUrl, file.name)}
      >
        <div className="flex items-center gap-2">
          {isImage ? (
            <div className="relative group/image">
              <img
                src={fileUrl}
                alt={file.name}
                className="w-10 h-10 object-cover rounded hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover/image:opacity-100 opacity-0 transition-opacity bg-black/40 rounded">
                <Eye className="h-3 w-3 text-white" />
              </div>
            </div>
          ) : (
            <File className="h-10 w-10 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {isImage ? 'Image' : 'Document'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Folder component - same as EquipmentPartsViewer but read-only
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
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No files in this folder
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
            Vehicle Parts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Parts documentation and images for this vehicle
          </p>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center">
            <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No parts data available for this vehicle</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Root Files Section - same as EquipmentPartsViewer */}
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

        {/* Folders Section - same as EquipmentPartsViewer */}
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

      {/* Image Viewer Modal - Same responsive sizing as EquipmentPartsViewer */}
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