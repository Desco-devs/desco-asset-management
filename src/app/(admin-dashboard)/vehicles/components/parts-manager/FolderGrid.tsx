"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Folder, 
  Edit, 
  X, 
  Check 
} from "lucide-react";
import type { FolderGridProps } from "@/types/vehicle-parts";

const FolderGrid = ({
  folders,
  editingFolderId,
  newFolderName,
  bulkDeleteMode,
  selectedFoldersForDeletion,
  onNavigateToFolder,
  onEditFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderSelection,
  onCancelEdit,
  setNewFolderName,
}: FolderGridProps) => {
  if (folders.length === 0) return null;

  return (
    <div>
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
        Folders
      </Label>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 mb-4">
        {folders.map((folder) => {
          const totalParts = folder.parts.length + folder.subfolders.reduce((sum, sub) => sum + sub.parts.length, 0);
          
          return (
            <div key={folder.id} className="relative">
              {editingFolderId === folder.id ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                    <Folder className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onRenameFolder(folder.id, newFolderName);
                      } else if (e.key === "Escape") {
                        onCancelEdit();
                      }
                    }}
                    onBlur={() => onRenameFolder(folder.id, newFolderName)}
                    className="w-16 sm:w-20 h-5 sm:h-6 text-xs text-center"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center group cursor-pointer">
                  {/* Bulk delete mode selection overlay */}
                  {bulkDeleteMode && (
                    <div 
                      className="absolute -top-1 -left-1 z-10 w-5 h-5 bg-white border-2 border-blue-500 rounded-full flex items-center justify-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFolderSelection(folder.id);
                      }}
                    >
                      {selectedFoldersForDeletion.includes(folder.id) && (
                        <Check className="h-3 w-3 text-blue-600" />
                      )}
                    </div>
                  )}
                  
                  <div 
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center mb-1 relative transition-colors ${
                      bulkDeleteMode
                        ? selectedFoldersForDeletion.includes(folder.id)
                          ? 'bg-red-100 border-2 border-red-300'
                          : 'bg-gray-100 hover:bg-gray-200'
                        : 'bg-blue-100 hover:bg-blue-200'
                    }`}
                    onClick={() => bulkDeleteMode ? onToggleFolderSelection(folder.id) : onNavigateToFolder(folder.id)}
                  >
                    <Folder className={`h-6 w-6 sm:h-8 sm:w-8 ${
                      bulkDeleteMode && selectedFoldersForDeletion.includes(folder.id)
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`} />
                    
                    {totalParts > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs">
                        {totalParts > 99 ? '99+' : totalParts}
                      </span>
                    )}
                    
                    {folder.subfolders.length > 0 && (
                      <span className="absolute -bottom-1 -left-1 bg-green-500 text-white rounded-full w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center text-xs">
                        {folder.subfolders.length > 9 ? '9+' : folder.subfolders.length}
                      </span>
                    )}
                    
                    {/* Desktop hover actions */}
                    {!bulkDeleteMode && (
                      <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 opacity-0 group-hover:opacity-100 hidden sm:flex gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFolder(folder.id, folder.name);
                          }}
                          className="h-4 w-4 p-0 bg-white/80 hover:bg-white"
                        >
                          <Edit className="h-2 w-2" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id, folder.name);
                          }}
                          className="h-4 w-4 p-0 bg-white/80 hover:bg-white text-red-500"
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-center w-full">
                    <span className="text-xs text-center max-w-16 sm:max-w-20 truncate px-1">
                      {folder.name}
                    </span>
                    
                    {/* Mobile actions */}
                    {!bulkDeleteMode && (
                      <div className="flex gap-1 mt-1 sm:hidden">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditFolder(folder.id, folder.name);
                          }}
                          className="h-5 w-5 p-0 bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          <Edit className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id, folder.name);
                          }}
                          className="h-5 w-5 p-0 bg-gray-100 hover:bg-gray-200 rounded text-red-500"
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FolderGrid;