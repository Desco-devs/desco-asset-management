/**
 * Data Validation Utilities
 * Prevents nonsensical data from being entered into the database
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate vehicle plate number
 */
export function validatePlateNumber(plateNumber: string): ValidationResult {
  const errors: string[] = [];
  
  if (!plateNumber || plateNumber.trim().length === 0) {
    errors.push('Plate number is required');
  } else {
    const plate = plateNumber.trim();
    
    // Check for nonsensical patterns
    if (/^[a-z]+$/i.test(plate) && plate.length > 6) {
      errors.push('Plate number appears to be invalid - please enter a proper license plate format');
    }
    
    // Check for repeated characters (like asdasd, werwerwe)
    if (/(.)\1{3,}/.test(plate.toLowerCase()) || 
        /^(asd|qwe|zxc|sad|wer|ert|tyu|dfg|fgh|ghj|hjk|jkl|vbn|bnm)+$/i.test(plate)) {
      errors.push('Plate number appears to be test data - please enter a valid license plate');
    }
    
    // Basic format validation (should contain letters and numbers)
    if (plate.length < 3 || plate.length > 10) {
      errors.push('Plate number should be between 3-10 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate equipment/vehicle brand
 */
export function validateBrand(brand: string): ValidationResult {
  const errors: string[] = [];
  
  if (!brand || brand.trim().length === 0) {
    errors.push('Brand is required');
  } else {
    const brandName = brand.trim();
    
    // Check for nonsensical patterns
    if (/^(asd|qwe|zxc|sad|wer|ert|tyu|dfg|fgh|ghj|hjk|jkl|vbn|bnm|test|xxx)+$/i.test(brandName)) {
      errors.push('Brand appears to be test data - please enter a valid brand name');
    }
    
    if (brandName.length < 2) {
      errors.push('Brand name should be at least 2 characters');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate equipment/vehicle model
 */
export function validateModel(model: string): ValidationResult {
  const errors: string[] = [];
  
  if (!model || model.trim().length === 0) {
    errors.push('Model is required');
  } else {
    const modelName = model.trim();
    
    // Check for nonsensical patterns
    if (/^(asd|qwe|zxc|sad|wer|ert|tyu|dfg|fgh|ghj|hjk|jkl|vbn|bnm|test|xxx)+$/i.test(modelName)) {
      errors.push('Model appears to be test data - please enter a valid model name');
    }
    
    if (modelName.length < 1) {
      errors.push('Model name is required');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate maintenance issue description
 */
export function validateIssueDescription(description: string): ValidationResult {
  const errors: string[] = [];
  
  if (!description || description.trim().length === 0) {
    errors.push('Issue description is required');
  } else {
    const desc = description.trim();
    
    // Check for nonsensical patterns
    if (/^(asd|qwe|zxc|sad|wer|ert|tyu|dfg|fgh|ghj|hjk|jkl|vbn|bnm|test|xxx)+$/i.test(desc)) {
      errors.push('Issue description appears to be test data - please provide a meaningful description');
    }
    
    // Check for repeated characters
    if (/(.)\1{4,}/.test(desc)) {
      errors.push('Issue description contains too many repeated characters - please provide a proper description');
    }
    
    if (desc.length < 10) {
      errors.push('Issue description should be at least 10 characters for clarity');
    }
    
    if (desc.length > 1000) {
      errors.push('Issue description is too long (max 1000 characters)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate project/client name
 */
export function validateName(name: string, fieldName: string = 'Name'): ValidationResult {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push(`${fieldName} is required`);
  } else {
    const trimmedName = name.trim();
    
    // Check for nonsensical patterns
    if (/^(asd|qwe|zxc|sad|wer|ert|tyu|dfg|fgh|ghj|hjk|jkl|vbn|bnm|test|xxx)+$/i.test(trimmedName)) {
      errors.push(`${fieldName} appears to be test data - please enter a valid name`);
    }
    
    // Check for repeated characters
    if (/(.)\1{3,}/.test(trimmedName)) {
      errors.push(`${fieldName} contains too many repeated characters`);
    }
    
    if (trimmedName.length < 2) {
      errors.push(`${fieldName} should be at least 2 characters`);
    }
    
    if (trimmedName.length > 100) {
      errors.push(`${fieldName} is too long (max 100 characters)`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive validation for vehicle data
 */
export function validateVehicleData(data: {
  brand: string;
  model: string;
  plate_number: string;
  type?: string;
}): ValidationResult {
  const allErrors: string[] = [];
  
  const brandValidation = validateBrand(data.brand);
  const modelValidation = validateModel(data.model);
  const plateValidation = validatePlateNumber(data.plate_number);
  
  allErrors.push(...brandValidation.errors);
  allErrors.push(...modelValidation.errors);
  allErrors.push(...plateValidation.errors);
  
  if (data.type) {
    const typeValidation = validateName(data.type, 'Vehicle type');
    allErrors.push(...typeValidation.errors);
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Comprehensive validation for equipment data
 */
export function validateEquipmentData(data: {
  brand: string;
  model: string;
  type: string;
}): ValidationResult {
  const allErrors: string[] = [];
  
  const brandValidation = validateBrand(data.brand);
  const modelValidation = validateModel(data.model);
  const typeValidation = validateName(data.type, 'Equipment type');
  
  allErrors.push(...brandValidation.errors);
  allErrors.push(...modelValidation.errors);
  allErrors.push(...typeValidation.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Comprehensive validation for maintenance report data
 */
export function validateMaintenanceReportData(data: {
  issue_description: string;
  action_taken?: string;
  remarks?: string;
}): ValidationResult {
  const allErrors: string[] = [];
  
  const issueValidation = validateIssueDescription(data.issue_description);
  allErrors.push(...issueValidation.errors);
  
  if (data.action_taken) {
    const actionValidation = validateIssueDescription(data.action_taken);
    // Rename the field in error messages
    allErrors.push(...actionValidation.errors.map(error => 
      error.replace('Issue description', 'Action taken')
    ));
  }
  
  if (data.remarks) {
    const remarksValidation = validateName(data.remarks, 'Remarks');
    allErrors.push(...remarksValidation.errors);
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}

/**
 * Sanitize user input to prevent nonsensical data
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/(.)\1{4,}/g, '$1$1$1') // Limit repeated characters to max 3
    .replace(/^(asd|qwe|zxc|sad|wer|ert|tyu|dfg|fgh|hjk|jkl|vbn|bnm|test|xxx)+$/gi, '') // Remove obvious test patterns
    .substring(0, 500); // Limit length
}