"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, Home, Folder } from "lucide-react";
import type { BreadcrumbNavigationProps } from "@/types/equipment-parts";

const BreadcrumbNavigation = ({
  folderPath,
  equipmentFolders,
  onNavigateToRoot,
  onNavigateToPath,
}: BreadcrumbNavigationProps) => {
  const getFolderName = (index: number): string => {
    let folders = equipmentFolders;
    for (let i = 0; i <= index; i++) {
      const folder = folders.find(f => f.id === folderPath[i]);
      if (!folder) return "Unknown";
      if (i === index) return folder.name;
      folders = folder.subfolders;
    }
    return "Unknown";
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3 flex-wrap overflow-x-auto">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onNavigateToRoot}
        className={`h-6 px-2 text-xs whitespace-nowrap ${
          folderPath.length === 0 ? 'text-blue-600 font-medium' : 'hover:text-blue-600'
        }`}
      >
        <Home className="h-3 w-3 mr-1" />
        <span className="hidden sm:inline">Equipment </span>Parts
      </Button>
      
      {folderPath.map((folderId, index) => {
        const folderName = getFolderName(index);
        const isLast = index === folderPath.length - 1;
        
        return (
          <div key={folderId} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="text-blue-600 font-medium text-xs flex items-center gap-1 truncate max-w-24 sm:max-w-none">
                <Folder className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{folderName}</span>
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newPath = folderPath.slice(0, index + 1);
                  onNavigateToPath(newPath, folderId);
                }}
                className="h-6 px-2 text-xs hover:text-blue-600 truncate max-w-24 sm:max-w-none"
              >
                <Folder className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{folderName}</span>
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BreadcrumbNavigation;