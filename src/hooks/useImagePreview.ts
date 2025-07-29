"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * Hook to manage image preview state for edit forms
 * Following REALTIME_PATTERN.md principles: Simple, single responsibility
 */
export function useImagePreview() {
  // State for new file uploads
  const [newFileUploads, setNewFileUploads] = useState<Record<string, File>>({});
  
  // State for preview URLs (blob URLs)
  const [newFilePreviewUrls, setNewFilePreviewUrls] = useState<Record<string, string>>({});
  
  // State for removed items
  const [removedItems, setRemovedItems] = useState<Set<string>>(new Set());

  // Cleanup function to revoke preview URLs and prevent memory leaks
  const cleanupPreviewUrls = useCallback(() => {
    setNewFilePreviewUrls(currentUrls => {
      Object.values(currentUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      return {};
    });
  }, []); // No dependencies to prevent callback recreation

  // Handle file selection
  const handleFileSelect = useCallback((fieldName: string, file: File) => {
    // Clean up any existing preview URL for this field only
    setNewFilePreviewUrls(prev => {
      const existingUrl = prev[fieldName];
      if (existingUrl && existingUrl.startsWith('blob:')) {
        URL.revokeObjectURL(existingUrl);
      }
      return {
        ...prev,
        [fieldName]: URL.createObjectURL(file)
      };
    });
    
    // Update other states
    setRemovedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
    
    setNewFileUploads(prev => ({
      ...prev,
      [fieldName]: file
    }));
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback((fieldName: string) => {
    // Clean up preview URL if exists and remove from state
    setNewFilePreviewUrls(prev => {
      const existingUrl = prev[fieldName];
      if (existingUrl && existingUrl.startsWith('blob:')) {
        URL.revokeObjectURL(existingUrl);
      }
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
    
    // Update other states
    setRemovedItems(prev => new Set([...prev, fieldName]));
    
    setNewFileUploads(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  // Reset all state
  const resetPreviewState = useCallback(() => {
    // Clean up existing URLs before resetting
    setNewFilePreviewUrls(currentUrls => {
      Object.values(currentUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      return {};
    });
    setNewFileUploads({});
    setRemovedItems(new Set());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up all URLs on unmount
      setNewFilePreviewUrls(currentUrls => {
        Object.values(currentUrls).forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return {};
      });
    };
  }, []);

  return {
    // State
    newFileUploads,
    newFilePreviewUrls,
    removedItems,
    
    // Actions
    handleFileSelect,
    handleFileRemove,
    resetPreviewState,
    cleanupPreviewUrls,
  };
}