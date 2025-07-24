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
  
  // Collapsible states - same as PartsFolderManager
  const [isRootCollapsed, setIsRootCollapsed] = useState(false);
  const [isFoldersCollapsed, setIsFoldersCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  // Parse vehicle parts data into folder structure
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
            id: 'file-1',
            name: parts.split('/').pop() || 'File',
            url: parts,
            type: parts.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'document'
          }], 
          folders: [] 
        };
      }
    }

    // Handle array format (legacy)
    if (Array.isArray(parts)) {
      return {
        rootFiles: parts.map((url, index) => ({
          id: `file-${index}`,
          name: url.split('/').pop() || `File ${index + 1}`,
          url,
          type: url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' as const : 'document' as const
        })),
        folders: []
      };
    }

    // Handle object format with rootFiles and folders
    if (parts && typeof parts === 'object' && 'rootFiles' in parts && 'folders' in parts) {
      return parts as ParsedPartData;
    }

    return { rootFiles: [], folders: [] };
  };

  const parsedData = parsePartsData(vehicleParts);
  const totalFiles = parsedData.rootFiles.length + parsedData.folders.reduce((acc, folder) => acc + folder.files.length, 0);

  const openImageViewer = (url: string, name: string) => {
    setSelectedImage(url);
    setSelectedImageName(name);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
    setSelectedImageName("");
  };

  const toggleFolderCollapse = (folderId: string) => {
    const newCollapsed = new Set(collapsedFolders);
    if (newCollapsed.has(folderId)) {
      newCollapsed.delete(folderId);
    } else {
      newCollapsed.add(folderId);
    }
    setCollapsedFolders(newCollapsed);
  };

  const getFileIcon = (type: 'image' | 'document') => {
    return type === 'image' ? ImageIcon : File;
  };

  if (totalFiles === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Vehicle Parts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No parts uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Vehicle Parts ({totalFiles} files)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Root Files Section */}
          {parsedData.rootFiles.length > 0 && (
            <div className="space-y-2">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors" 
                onClick={() => setIsRootCollapsed(!isRootCollapsed)}
              >
                {isRootCollapsed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <Receipt className="h-4 w-4" />
                <span className="font-medium">Root Files ({parsedData.rootFiles.length})</span>
              </div>
              
              {!isRootCollapsed && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ml-6">
                  {parsedData.rootFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    return (
                      <div key={file.id} className="group relative">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden relative border hover:border-primary/50 transition-colors">
                          {file.type === 'image' ? (
                            <Image
                              src={file.url}
                              alt={file.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => openImageViewer(file.url, file.name)}
                              className="bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-center mt-1 truncate" title={file.name}>
                          {file.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Folders Section */}
          {parsedData.folders.length > 0 && (
            <div className="space-y-2">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors" 
                onClick={() => setIsFoldersCollapsed(!isFoldersCollapsed)}
              >
                {isFoldersCollapsed ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <Folder className="h-4 w-4" />
                <span className="font-medium">Folders ({parsedData.folders.length})</span>
              </div>
              
              {!isFoldersCollapsed && (
                <div className="ml-6 space-y-4">
                  {parsedData.folders.map((folder) => {
                    const isFolderCollapsed = collapsedFolders.has(folder.id);
                    return (
                      <div key={folder.id} className="space-y-2">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors" 
                          onClick={() => toggleFolderCollapse(folder.id)}
                        >
                          {isFolderCollapsed ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <Folder className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{folder.name} ({folder.files.length})</span>
                        </div>
                        
                        {!isFolderCollapsed && folder.files.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ml-6">
                            {folder.files.map((file) => {
                              const FileIcon = getFileIcon(file.type);
                              return (
                                <div key={file.id} className="group relative">
                                  <div className="aspect-square bg-muted rounded-lg overflow-hidden relative border hover:border-primary/50 transition-colors">
                                    {file.type === 'image' ? (
                                      <Image
                                        src={file.url}
                                        alt={file.name}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <button
                                        onClick={() => openImageViewer(file.url, file.name)}
                                        className="bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-center mt-1 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <Dialog open={true} onOpenChange={closeImageViewer}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{selectedImageName}</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4">
              <div className="relative w-full max-h-[70vh] flex items-center justify-center">
                <Image
                  src={selectedImage}
                  alt={selectedImageName}
                  width={800}
                  height={600}
                  className="object-contain max-w-full max-h-full"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}