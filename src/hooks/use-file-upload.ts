import { useState } from 'react';
import type { FileUploadState } from '@/types/equipment';

export const useFileUpload = (initialFile?: string | null) => {
  const [fileState, setFileState] = useState<FileUploadState>({
    file: null,
    preview: initialFile || null,
    keepExisting: !!initialFile,
  });

  const handleFileChange = (file: File | null) => {
    if (file) {
      const preview = URL.createObjectURL(file);
      setFileState({
        file,
        preview,
        keepExisting: false,
      });
    } else {
      // Clean up previous preview URL
      if (fileState.preview && !initialFile) {
        URL.revokeObjectURL(fileState.preview);
      }
      setFileState({
        file: null,
        preview: initialFile || null,
        keepExisting: !!initialFile,
      });
    }
  };

  const removeFile = () => {
    if (fileState.preview && !initialFile) {
      URL.revokeObjectURL(fileState.preview);
    }
    setFileState({
      file: null,
      preview: null,
      keepExisting: false,
    });
  };

  const resetToExisting = () => {
    if (initialFile) {
      setFileState({
        file: null,
        preview: initialFile,
        keepExisting: true,
      });
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (fileState.preview && !initialFile) {
      URL.revokeObjectURL(fileState.preview);
    }
  };

  return {
    fileState,
    handleFileChange,
    removeFile,
    resetToExisting,
    cleanup,
  };
};

export const useMultipleFileUpload = () => {
  const [files, setFiles] = useState<FileUploadState[]>([]);

  const addFile = (file: File, folder: string = 'main') => {
    const preview = URL.createObjectURL(file);
    setFiles(prev => [...prev, {
      file,
      preview,
      keepExisting: false,
    }]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const fileToRemove = newFiles[index];
      
      // Clean up preview URL
      if (fileToRemove.preview && fileToRemove.file) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFile = (index: number, file: File) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const oldFile = newFiles[index];
      
      // Clean up old preview URL
      if (oldFile.preview && oldFile.file) {
        URL.revokeObjectURL(oldFile.preview);
      }
      
      newFiles[index] = {
        file,
        preview: URL.createObjectURL(file),
        keepExisting: false,
      };
      
      return newFiles;
    });
  };

  const clearAllFiles = () => {
    files.forEach(fileState => {
      if (fileState.preview && fileState.file) {
        URL.revokeObjectURL(fileState.preview);
      }
    });
    setFiles([]);
  };

  return {
    files,
    addFile,
    removeFile,
    updateFile,
    clearAllFiles,
  };
};