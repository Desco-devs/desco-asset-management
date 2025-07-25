/**
 * Test utilities for equipment form automation
 */

import { PartsStructure } from '../app/(admin-dashboard)/equipments/components/forms/PartsFolderManager';

/**
 * Create a test file for form uploads
 */
export function createTestFile(filename: string, mimeType: string, size: number = 1024): File {
  // Create a simple buffer with test content
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  
  // Fill with some test data
  for (let i = 0; i < size; i++) {
    view[i] = i % 256;
  }
  
  return new File([buffer], filename, { type: mimeType });
}

/**
 * Create test image file
 */
export function createTestImage(filename: string = 'test.jpg'): File {
  return createTestFile(filename, 'image/jpeg', 2048);
}

/**
 * Create test PDF file
 */
export function createTestPDF(filename: string = 'test.pdf'): File {
  return createTestFile(filename, 'application/pdf', 4096);
}

/**
 * Create FormData from test equipment data
 */
export function createTestFormData(testData: any): FormData {
  const formData = new FormData();
  
  // Add basic equipment fields
  formData.append('brand', testData.brand);
  formData.append('model', testData.model);
  formData.append('type', testData.type);
  formData.append('owner', testData.owner);
  formData.append('projectId', testData.projectId);
  formData.append('status', testData.status);
  
  if (testData.plateNumber) formData.append('plateNumber', testData.plateNumber);
  if (testData.before) formData.append('before', testData.before);
  if (testData.remarks) formData.append('remarks', testData.remarks);
  if (testData.inspectionDate) formData.append('inspectionDate', testData.inspectionDate);
  if (testData.insuranceExpirationDate) formData.append('insuranceExpirationDate', testData.insuranceExpirationDate);
  
  // Add files
  Object.entries(testData.files).forEach(([key, file]) => {
    if (file) {
      formData.append(key, file as File);
    }
  });
  
  // Add parts structure
  if (testData.partsStructure) {
    formData.append('partsStructure', JSON.stringify(testData.partsStructure));
    
    // Add root files
    testData.partsStructure.rootFiles.forEach((partFile: any, index: number) => {
      formData.append(`partsFile_root_${index}`, partFile.file);
      formData.append(`partsFile_root_${index}_name`, partFile.name);
    });
    
    // Add folder files
    testData.partsStructure.folders.forEach((folder: any, folderIndex: number) => {
      folder.files.forEach((partFile: any, fileIndex: number) => {
        formData.append(`partsFile_folder_${folderIndex}_${fileIndex}`, partFile.file);
        formData.append(`partsFile_folder_${folderIndex}_${fileIndex}_name`, partFile.name);
        formData.append(`partsFile_folder_${folderIndex}_${fileIndex}_folder`, folder.name);
      });
    });
  }
  
  return formData;
}

/**
 * Validate parts structure format
 */
export function validatePartsStructure(partsData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!partsData) {
    errors.push('Parts structure is null or undefined');
    return { isValid: false, errors };
  }
  
  // Check if it's a string (JSON) or object
  let parsedData;
  if (typeof partsData === 'string') {
    try {
      parsedData = JSON.parse(partsData);
    } catch (e) {
      errors.push('Parts structure is not valid JSON');
      return { isValid: false, errors };
    }
  } else {
    parsedData = partsData;
  }
  
  // Validate structure
  if (!parsedData.rootFiles) {
    errors.push('Missing rootFiles array');
  } else if (!Array.isArray(parsedData.rootFiles)) {
    errors.push('rootFiles is not an array');
  }
  
  if (!parsedData.folders) {
    errors.push('Missing folders array');
  } else if (!Array.isArray(parsedData.folders)) {
    errors.push('folders is not an array');
  }
  
  // Validate root files
  if (parsedData.rootFiles) {
    parsedData.rootFiles.forEach((file: any, index: number) => {
      if (!file.id) errors.push(`Root file ${index} missing id`);
      if (!file.name) errors.push(`Root file ${index} missing name`);
      if (!file.url && !file.preview) errors.push(`Root file ${index} missing url/preview`);
    });
  }
  
  // Validate folders
  if (parsedData.folders) {
    parsedData.folders.forEach((folder: any, folderIndex: number) => {
      if (!folder.id) errors.push(`Folder ${folderIndex} missing id`);
      if (!folder.name) errors.push(`Folder ${folderIndex} missing name`);
      if (!folder.files || !Array.isArray(folder.files)) {
        errors.push(`Folder ${folderIndex} missing or invalid files array`);
      } else {
        folder.files.forEach((file: any, fileIndex: number) => {
          if (!file.id) errors.push(`Folder ${folderIndex} file ${fileIndex} missing id`);
          if (!file.name) errors.push(`Folder ${folderIndex} file ${fileIndex} missing name`);
          if (!file.url && !file.preview) errors.push(`Folder ${folderIndex} file ${fileIndex} missing url/preview`);
        });
      }
    });
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Create sample equipment test data
 */
export function createSampleEquipmentData() {
  return {
    brand: 'Caterpillar',
    model: '320D',
    type: 'Excavator',
    owner: 'Test Construction Co.',
    status: 'OPERATIONAL',
    plateNumber: 'TEST-001',
    before: '6',
    remarks: 'Created by automated test',
    inspectionDate: '2024-01-15',
    insuranceExpirationDate: '2024-12-31',
    files: {
      equipmentImage: createTestImage('equipment.jpg'),
      thirdpartyInspection: createTestImage('inspection.jpg'),
      pgpcInspection: createTestImage('pgpc.jpg'),
      originalReceipt: createTestPDF('receipt.pdf'),
      equipmentRegistration: createTestPDF('registration.pdf'),
    },
    partsStructure: {
      rootFiles: [
        {
          id: 'root_0',
          name: 'main-diagram.jpg',
          file: createTestImage('diagram.jpg'),
          type: 'image'
        }
      ],
      folders: [
        {
          id: 'folder_0',
          name: 'Engine Parts',
          files: [
            {
              id: 'folder_0_file_0',
              name: 'engine-manual.pdf',
              file: createTestPDF('manual.pdf'),
              type: 'document'
            },
            {
              id: 'folder_0_file_1',
              name: 'engine-photo.jpg',
              file: createTestImage('engine.jpg'),
              type: 'image'
            }
          ]
        },
        {
          id: 'folder_1',
          name: 'Hydraulics',
          files: [
            {
              id: 'folder_1_file_0',
              name: 'hydraulic-diagram.jpg',
              file: createTestImage('hydraulic.jpg'),
              type: 'image'
            }
          ]
        }
      ]
    }
  };
}

/**
 * Mock API response for testing
 */
export function mockApiResponse(data: any, status: number = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

/**
 * Compare two parts structures for equality
 */
export function comparePartsStructures(expected: any, actual: any): { isEqual: boolean; differences: string[] } {
  const differences: string[] = [];
  
  // Compare root files count
  if (expected.rootFiles.length !== actual.rootFiles.length) {
    differences.push(`Root files count: expected ${expected.rootFiles.length}, got ${actual.rootFiles.length}`);
  }
  
  // Compare folders count
  if (expected.folders.length !== actual.folders.length) {
    differences.push(`Folders count: expected ${expected.folders.length}, got ${actual.folders.length}`);
  }
  
  // Compare folder names
  const expectedFolderNames = expected.folders.map((f: any) => f.name).sort();
  const actualFolderNames = actual.folders.map((f: any) => f.name).sort();
  
  expectedFolderNames.forEach((name: string, index: number) => {
    if (actualFolderNames[index] !== name) {
      differences.push(`Folder name mismatch at index ${index}: expected '${name}', got '${actualFolderNames[index]}'`);
    }
  });
  
  // Compare files in each folder
  expected.folders.forEach((expectedFolder: any) => {
    const actualFolder = actual.folders.find((f: any) => f.name === expectedFolder.name);
    if (!actualFolder) {
      differences.push(`Missing folder: ${expectedFolder.name}`);
    } else if (expectedFolder.files.length !== actualFolder.files.length) {
      differences.push(`Files count in folder '${expectedFolder.name}': expected ${expectedFolder.files.length}, got ${actualFolder.files.length}`);
    }
  });
  
  return { isEqual: differences.length === 0, differences };
}

/**
 * Wait for async operation with timeout
 */
export function waitFor(conditionFn: () => boolean, timeoutMs: number = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkCondition = () => {
      if (conditionFn()) {
        resolve(true);
      } else if (Date.now() - startTime >= timeoutMs) {
        resolve(false);
      } else {
        setTimeout(checkCondition, 100);
      }
    };
    
    checkCondition();
  });
}

/**
 * Generate random test data
 */
export function generateRandomTestData() {
  const brands = ['Caterpillar', 'Komatsu', 'JCB', 'Volvo', 'Hitachi'];
  const models = ['320D', 'PC200', 'JS130', 'EC160', 'ZX200'];
  const types = ['Excavator', 'Bulldozer', 'Loader', 'Crane', 'Compactor'];
  
  const randomBrand = brands[Math.floor(Math.random() * brands.length)];
  const randomModel = models[Math.floor(Math.random() * models.length)];
  const randomType = types[Math.floor(Math.random() * types.length)];
  
  return {
    ...createSampleEquipmentData(),
    brand: randomBrand,
    model: randomModel,
    type: randomType,
    plateNumber: `TEST-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    remarks: `Automated test equipment - ${randomBrand} ${randomModel} created at ${new Date().toISOString()}`,
  };
}

export default {
  createTestFile,
  createTestImage,
  createTestPDF,
  createTestFormData,
  validatePartsStructure,
  createSampleEquipmentData,
  mockApiResponse,
  comparePartsStructures,
  waitFor,
  generateRandomTestData,
};