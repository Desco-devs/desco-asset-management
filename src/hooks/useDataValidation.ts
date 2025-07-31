import { useState } from 'react';
import { 
  validateVehicleData,
  validateEquipmentData,
  validateMaintenanceReportData,
  validateName,
  sanitizeInput,
  type ValidationResult
} from '@/lib/data-validation';

/**
 * Hook for client-side data validation
 * Prevents nonsensical data from being submitted
 */
export function useDataValidation() {
  const [isValidating, setIsValidating] = useState(false);

  const validateVehicle = async (data: {
    brand: string;
    model: string;
    plate_number: string;
    type?: string;
  }): Promise<ValidationResult> => {
    setIsValidating(true);
    const result = validateVehicleData(data);
    setIsValidating(false);
    return result;
  };

  const validateEquipment = async (data: {
    brand: string;
    model: string;
    type: string;
  }): Promise<ValidationResult> => {
    setIsValidating(true);
    const result = validateEquipmentData(data);
    setIsValidating(false);
    return result;
  };

  const validateMaintenanceReport = async (data: {
    issue_description: string;
    action_taken?: string;
    remarks?: string;
  }): Promise<ValidationResult> => {
    setIsValidating(true);
    const result = validateMaintenanceReportData(data);
    setIsValidating(false);
    return result;
  };

  const validateFieldName = async (name: string, fieldName?: string): Promise<ValidationResult> => {
    setIsValidating(true);
    const result = validateName(name, fieldName);
    setIsValidating(false);
    return result;
  };

  const sanitize = (input: string): string => {
    return sanitizeInput(input);
  };

  return {
    validateVehicle,
    validateEquipment,
    validateMaintenanceReport,
    validateFieldName,
    sanitize,
    isValidating
  };
}

/**
 * Hook for real-time input validation with debouncing
 */
export function useRealTimeValidation(
  validationFn: (value: string) => ValidationResult,
  debounceMs: number = 500
) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const validate = (value: string) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout for debounced validation
    const newTimeoutId = setTimeout(() => {
      const result = validationFn(value);
      setErrors(result.errors);
      setIsValid(result.isValid);
    }, debounceMs);

    setTimeoutId(newTimeoutId);
  };

  const clearValidation = () => {
    setErrors([]);
    setIsValid(true);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  return {
    errors,
    isValid,
    validate,
    clearValidation
  };
}