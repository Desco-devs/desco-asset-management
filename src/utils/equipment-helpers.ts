import type { EquipmentFormData } from "@/types/equipment";

// Form validation helpers
export const validateEquipmentForm = (formData: EquipmentFormData): boolean => {
  return !!(
    formData.brand &&
    formData.model &&
    formData.type &&
    formData.owner &&
    formData.projectId
  );
};

export const validateRequiredFields = (formData: EquipmentFormData): string[] => {
  const missingFields: string[] = [];
  
  if (!formData.brand) missingFields.push('Brand');
  if (!formData.model) missingFields.push('Model');
  if (!formData.type) missingFields.push('Type');
  if (!formData.owner) missingFields.push('Owner');
  if (!formData.projectId) missingFields.push('Project');
  
  return missingFields;
};

// Form data transformation helpers
export const prepareFormDataForSubmission = (formData: EquipmentFormData) => {
  const submitData = new FormData();
  
  // Basic fields
  submitData.append('brand', formData.brand);
  submitData.append('model', formData.model);
  submitData.append('type', formData.type);
  submitData.append('owner', formData.owner);
  submitData.append('status', formData.status);
  submitData.append('projectId', formData.projectId);
  
  // Optional fields
  if (formData.remarks) {
    submitData.append('remarks', formData.remarks);
  }
  
  if (formData.plateNumber) {
    submitData.append('plateNumber', formData.plateNumber);
  }
  
  if (formData.before) {
    submitData.append('before', formData.before);
  }
  
  // Date fields
  if (formData.insuranceExpirationDate) {
    submitData.append('insuranceExpirationDate', formData.insuranceExpirationDate.toISOString());
  }
  
  if (formData.inspectionDate) {
    submitData.append('inspectionDate', formData.inspectionDate.toISOString());
  }
  
  return submitData;
};

// Date helper functions
export const safeParseDate = (dateString: string | null | undefined): Date | undefined => {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};

export const formatDateForInput = (date: Date | undefined): string => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

// File validation helpers
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => file.type.match(type));
};

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Equipment status helpers
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'OPERATIONAL':
      return 'text-green-600 bg-green-100';
    case 'NON_OPERATIONAL':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getStatusText = (status: string): string => {
  switch (status) {
    case 'OPERATIONAL':
      return 'Operational';
    case 'NON_OPERATIONAL':
      return 'Non-Operational';
    default:
      return 'Unknown';
  }
};

// Constants
export const EQUIPMENT_STATUSES = {
  OPERATIONAL: 'OPERATIONAL' as const,
  NON_OPERATIONAL: 'NON_OPERATIONAL' as const,
};

export const FILE_TYPES = {
  IMAGE: 'image/*',
  PDF: 'application/pdf',
  DOCUMENT: '.pdf,.doc,.docx',
  ALL: '*',
} as const;

export const MAX_FILE_SIZES = {
  IMAGE: 5, // 5MB
  DOCUMENT: 10, // 10MB
} as const;

// Error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds limit',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;