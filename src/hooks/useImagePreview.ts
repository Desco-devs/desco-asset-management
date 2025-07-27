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
    Object.values(newFilePreviewUrls).forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }, [newFilePreviewUrls]);

  // Handle file selection
  const handleFileSelect = useCallback((fieldName: string, file: File) => {
    // Clean up any existing preview URL for this field
    const existingPreviewUrl = newFilePreviewUrls[fieldName];
    if (existingPreviewUrl && existingPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(existingPreviewUrl);
    }
    
    // Update states
    setRemovedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
    
    setNewFileUploads(prev => ({
      ...prev,
      [fieldName]: file
    }));
    
    setNewFilePreviewUrls(prev => ({
      ...prev,
      [fieldName]: URL.createObjectURL(file)
    }));
  }, [newFilePreviewUrls]);

  // Handle file removal
  const handleFileRemove = useCallback((fieldName: string) => {
    // Clean up preview URL if exists
    const existingPreviewUrl = newFilePreviewUrls[fieldName];
    if (existingPreviewUrl && existingPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(existingPreviewUrl);
    }
    
    // Update states
    setRemovedItems(prev => new Set([...prev, fieldName]));
    
    setNewFileUploads(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
    
    setNewFilePreviewUrls(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, [newFilePreviewUrls]);

  // Reset all state
  const resetPreviewState = useCallback(() => {
    cleanupPreviewUrls();
    setNewFileUploads({});
    setNewFilePreviewUrls({});
    setRemovedItems(new Set());
  }, [cleanupPreviewUrls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupPreviewUrls();
    };
  }, [cleanupPreviewUrls]);

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