"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt,
  Eye,
  File,
  FileText,
  ExternalLink,
} from "lucide-react";

interface EquipmentPartsViewerSimpleProps {
  equipmentParts?: string[] | { rootFiles: any[]; folders: any[] } | string;
}

interface ParsedFile {
  id: string;
  name: string;
  url: string;
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

export default function EquipmentPartsViewerSimple({ 
  equipmentParts = [] 
}: EquipmentPartsViewerSimpleProps) {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string>('');
  const [viewerImageName, setViewerImageName] = useState<string>('');

  // Simple parsing logic - no complex retry/migration logic
  const parsePartsData = (parts: string[] | { rootFiles: any[]; folders: any[] } | string | undefined): ParsedPartData => {
    if (!parts) {
      return { rootFiles: [], folders: [] };
    }

    // Handle database format: array with JSON string
    if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === 'string') {
      try {
        const parsed = JSON.parse(parts[0]);
        if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
          return {
            rootFiles: (parsed.rootFiles || []).map((file: any, index: number) => ({
              id: file.id || `file-${index}`,
              name: file.name || 'Unknown file',
              url: file.url || file.preview || '',
              type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
            })),
            folders: (parsed.folders || []).map((folder: any, folderIndex: number) => ({
              id: folder.id || `folder-${folderIndex}`,
              name: folder.name || `Folder ${folderIndex + 1}`,
              files: (folder.files || []).map((file: any, fileIndex: number) => ({
                id: file.id || `file-${folderIndex}-${fileIndex}`,
                name: file.name || 'Unknown file',
                url: file.url || file.preview || '',
                type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
              }))
            }))
          };
        }
      } catch (error) {
        console.warn('Failed to parse parts data:', error);
      }
    }

    // Handle string (JSON) format
    if (typeof parts === 'string') {
      try {
        const parsed = JSON.parse(parts);
        if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
          return {
            rootFiles: (parsed.rootFiles || []).map((file: any, index: number) => ({
              id: file.id || `file-${index}`,
              name: file.name || 'Unknown file',
              url: file.url || file.preview || '',
              type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
            })),
            folders: (parsed.folders || []).map((folder: any, folderIndex: number) => ({
              id: folder.id || `folder-${folderIndex}`,
              name: folder.name || `Folder ${folderIndex + 1}`,
              files: (folder.files || []).map((file: any, fileIndex: number) => ({
                id: file.id || `file-${folderIndex}-${fileIndex}`,
                name: file.name || 'Unknown file',
                url: file.url || file.preview || '',
                type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
              }))
            }))
          };
        }
      } catch (error) {
        console.warn('Failed to parse string as JSON:', error);
      }
    }

    // Handle object format (already parsed)
    if (typeof parts === 'object' && !Array.isArray(parts) && parts.rootFiles && parts.folders) {
      return {
        rootFiles: (parts.rootFiles || []).map((file: any, index: number) => ({
          id: file.id || `file-${index}`,
          name: file.name || 'Unknown file',
          url: file.url || file.preview || '',
          type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
        })),
        folders: (parts.folders || []).map((folder: any, folderIndex: number) => ({
          id: folder.id || `folder-${folderIndex}`,
          name: folder.name || `Folder ${folderIndex + 1}`,
          files: (folder.files || []).map((file: any, fileIndex: number) => ({
            id: file.id || `file-${folderIndex}-${fileIndex}`,
            name: file.name || 'Unknown file',
            url: file.url || file.preview || '',
            type: file.type || (file.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
          }))
        }))
      };
    }

    return { rootFiles: [], folders: [] };
  };

  const parsedData = parsePartsData(equipmentParts);

  const handleImageClick = (url: string, name: string) => {
    setViewerImageUrl(url);
    setViewerImageName(name);
    setShowImageViewer(true);
  };

  const handleFileClick = (file: ParsedFile) => {
    if (file.type === 'image') {
      handleImageClick(file.url, file.name);
    } else {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Helper function to get file icon
  const getFileIcon = (file: ParsedFile) => {
    if (file.type === 'image') {
      return <Eye className="h-8 w-8 text-green-500" />;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  // Simple file preview component like FileUploadSectionSimple
  const FilePreview = ({ file }: { file: ParsedFile }) => {
    if (!file.url) return null;

    return (
      <div 
        className="border rounded-lg p-2 bg-card hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => handleFileClick(file)}
      >
        <div className="flex items-center gap-2">
          {file.type === 'image' ? (
            <div className="relative group">
              <img
                src={file.url}
                alt={file.name}
                className="w-10 h-10 object-cover rounded"
                onError={(e) => {
                  // Simple error handling - show file icon instead
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-10 h-10 flex items-center justify-center border rounded bg-muted"><svg class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>';
                  }
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded">
                <Eye className="h-3 w-3 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 flex items-center justify-center border rounded bg-muted">
              {getFileIcon(file)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {file.type === 'image' ? 'Image' : 'Document'}
            </p>
          </div>
          <div className="opacity-60 group-hover:opacity-100 transition-opacity">
            {file.type === 'image' ? (
              <Eye className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Check if we have any content to display
  const hasContent = parsedData.rootFiles.length > 0 || parsedData.folders.length > 0;
  
  if (!hasContent) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Equipment Parts
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No parts data available for this equipment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Root Files Section */}
        {parsedData.rootFiles.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Root Files ({parsedData.rootFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {parsedData.rootFiles.map((file) => (
                  <FilePreview key={file.id} file={file} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Folders Section */}
        {parsedData.folders.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Folders ({parsedData.folders.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedData.folders.map((folder) => (
                <Card key={folder.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      {folder.name} ({folder.files.length} files)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {folder.files.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Empty folder</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {folder.files.map((file) => (
                          <FilePreview key={file.id} file={file} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
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
                onError={(e) => {
                  console.error('Failed to load image in viewer:', viewerImageUrl);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}