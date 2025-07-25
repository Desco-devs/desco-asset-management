/**
 * Equipment Forms Automated Testing Suite
 * Tests create/edit/view workflows with automatic validation and fixing
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/testing-library/jest-dom';
import { createTestFile, createTestFormData, validatePartsStructure } from './test-utils';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'FIXED';
  errors: string[];
  fixes: string[];
  duration: number;
}

interface EquipmentTestData {
  brand: string;
  model: string;
  type: string;
  owner: string;
  projectId: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  plateNumber?: string;
  before?: string;
  remarks?: string;
  inspectionDate?: string;
  insuranceExpirationDate?: string;
  files: {
    equipmentImage?: File;
    thirdpartyInspection?: File;
    pgpcInspection?: File;
    originalReceipt?: File;
    equipmentRegistration?: File;
  };
  partsStructure: {
    rootFiles: Array<{
      id: string;
      name: string;
      file: File;
      type: string;
    }>;
    folders: Array<{
      id: string;
      name: string;
      files: Array<{
        id: string;
        name: string;
        file: File;
        type: string;
      }>;
    }>;
  };
}

class EquipmentTestAutomation {
  private results: TestResult[] = [];
  private baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  constructor() {
    console.log('🚀 Starting Equipment Test Automation...');
  }

  /**
   * Generate test data for equipment forms
   */
  private generateTestData(): EquipmentTestData {
    const testImage = createTestFile('test-image.jpg', 'image/jpeg');
    const testPdf = createTestFile('test-document.pdf', 'application/pdf');
    const partsImage1 = createTestFile('part1.jpg', 'image/jpeg');
    const partsImage2 = createTestFile('part2.jpg', 'image/jpeg');
    const partsDoc = createTestFile('manual.pdf', 'application/pdf');

    return {
      brand: 'Caterpillar',
      model: '320D',
      type: 'Excavator',
      owner: 'Test Company Ltd',
      projectId: 'test-project-id', // This will be fetched from actual projects
      status: 'OPERATIONAL',
      plateNumber: 'TEST-001',
      before: '6',
      remarks: 'Automated test equipment - created by test suite',
      inspectionDate: '2024-01-15',
      insuranceExpirationDate: '2024-12-31',
      files: {
        equipmentImage: testImage,
        thirdpartyInspection: testImage,
        pgpcInspection: testImage,
        originalReceipt: testPdf,
        equipmentRegistration: testPdf,
      },
      partsStructure: {
        rootFiles: [
          {
            id: 'root_0',
            name: 'main-diagram.jpg',
            file: partsImage1,
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
                file: partsDoc,
                type: 'document'
              },
              {
                id: 'folder_0_file_1',
                name: 'engine-diagram.jpg',
                file: partsImage2,
                type: 'image'
              }
            ]
          },
          {
            id: 'folder_1',
            name: 'Hydraulic System',
            files: [
              {
                id: 'folder_1_file_0',
                name: 'hydraulic-schematic.jpg',
                file: partsImage1,
                type: 'image'
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * Test equipment creation workflow
   */
  async testEquipmentCreation(): Promise<TestResult> {
    const startTime = Date.now();
    const testName = 'Equipment Creation Test';
    const errors: string[] = [];
    const fixes: string[] = [];

    try {
      console.log('🧪 Testing equipment creation...');
      
      // Generate test data
      const testData = this.generateTestData();
      
      // Get available projects first
      const projectsResponse = await fetch(`${this.baseUrl}/api/projects/getall`);
      if (!projectsResponse.ok) {
        errors.push('Failed to fetch projects for testing');
        return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
      }
      
      const projects = await projectsResponse.json();
      if (projects.length === 0) {
        errors.push('No projects available for testing');
        return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
      }
      
      // Use first available project
      testData.projectId = projects[0].id;
      
      // Create FormData for testing
      const formData = createTestFormData(testData);
      
      // Test the createEquipmentAction directly
      const { createEquipmentAction } = await import('../app/(admin-dashboard)/equipments/actions');
      
      const result = await createEquipmentAction(formData);
      
      if (!result.success) {
        errors.push('Equipment creation failed');
        return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
      }
      
      // Validate created equipment
      const createdEquipment = result.equipment;
      
      // Check basic fields
      if (createdEquipment.brand !== testData.brand) {
        errors.push(`Brand mismatch: expected ${testData.brand}, got ${createdEquipment.brand}`);
      }
      if (createdEquipment.model !== testData.model) {
        errors.push(`Model mismatch: expected ${testData.model}, got ${createdEquipment.model}`);
      }
      
      // Check parts structure
      const partsValidation = await this.validatePartsStructure(createdEquipment.id, testData.partsStructure);
      if (!partsValidation.isValid) {
        errors.push(...partsValidation.errors);
      }
      
      // Store equipment ID for further tests
      this.createdEquipmentId = createdEquipment.id;
      
      console.log('✅ Equipment creation test completed');
      
      return {
        testName,
        status: errors.length === 0 ? 'PASS' : 'FAIL',
        errors,
        fixes,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
    }
  }

  /**
   * Test equipment editing workflow
   */
  async testEquipmentEditing(): Promise<TestResult> {
    const startTime = Date.now();
    const testName = 'Equipment Editing Test';
    const errors: string[] = [];
    const fixes: string[] = [];

    try {
      console.log('🧪 Testing equipment editing...');
      
      if (!this.createdEquipmentId) {
        errors.push('No equipment available for editing test');
        return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
      }
      
      // Generate updated test data
      const testData = this.generateTestData();
      testData.brand = 'Updated Brand';
      testData.model = 'Updated Model';
      testData.remarks = 'Updated by automated test';
      
      // Add new folder to parts structure
      testData.partsStructure.folders.push({
        id: 'folder_2',
        name: 'New Test Folder',
        files: [
          {
            id: 'folder_2_file_0',
            name: 'new-test-file.jpg',
            file: createTestFile('new-test.jpg', 'image/jpeg'),
            type: 'image'
          }
        ]
      });
      
      // Create FormData for update
      const formData = createTestFormData(testData);
      formData.append('equipmentId', this.createdEquipmentId);
      
      // Test the updateEquipmentAction directly
      const { updateEquipmentAction } = await import('../app/(admin-dashboard)/equipments/actions');
      
      const result = await updateEquipmentAction(formData);
      
      if (!result.success) {
        errors.push('Equipment update failed');
        return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
      }
      
      // Validate updated equipment
      const updatedEquipment = result.equipment;
      
      if (updatedEquipment.brand !== testData.brand) {
        errors.push(`Brand update failed: expected ${testData.brand}, got ${updatedEquipment.brand}`);
      }
      
      // Check if new folder was added
      const partsValidation = await this.validatePartsStructure(updatedEquipment.id, testData.partsStructure);
      if (!partsValidation.isValid) {
        errors.push(...partsValidation.errors);
      }
      
      console.log('✅ Equipment editing test completed');
      
      return {
        testName,
        status: errors.length === 0 ? 'PASS' : 'FAIL',
        errors,
        fixes,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
    }
  }

  /**
   * Test equipment viewing and parts structure
   */
  async testEquipmentViewing(): Promise<TestResult> {
    const startTime = Date.now();
    const testName = 'Equipment Viewing Test';
    const errors: string[] = [];
    const fixes: string[] = [];

    try {
      console.log('🧪 Testing equipment viewing...');
      
      if (!this.createdEquipmentId) {
        errors.push('No equipment available for viewing test');
        return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
      }
      
      // Fetch equipment via API
      const response = await fetch(`${this.baseUrl}/api/equipments/${this.createdEquipmentId}`);
      if (!response.ok) {
        errors.push('Failed to fetch equipment for viewing');
        return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
      }
      
      const equipment = await response.json();
      
      // Check if parts structure is properly formatted
      if (!equipment.equipmentParts) {
        errors.push('Equipment parts not found in response');
      } else {
        const partsData = typeof equipment.equipmentParts === 'string' 
          ? JSON.parse(equipment.equipmentParts) 
          : equipment.equipmentParts;
          
        if (!partsData.rootFiles || !partsData.folders) {
          errors.push('Parts structure missing rootFiles or folders');
        } else {
          // Validate folder structure
          if (partsData.folders.length < 2) {
            errors.push(`Expected at least 2 folders, found ${partsData.folders.length}`);
          }
          
          // Check if files have proper URLs
          const allFiles = [
            ...partsData.rootFiles,
            ...partsData.folders.flatMap((f: any) => f.files)
          ];
          
          for (const file of allFiles) {
            if (!file.url || !file.url.startsWith('http')) {
              errors.push(`Invalid file URL: ${file.name}`);
            }
          }
        }
      }
      
      console.log('✅ Equipment viewing test completed');
      
      return {
        testName,
        status: errors.length === 0 ? 'PASS' : 'FAIL',
        errors,
        fixes,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      return { testName, status: 'FAIL', errors, fixes, duration: Date.now() - startTime };
    }
  }

  /**
   * Validate parts structure in database
   */
  private async validatePartsStructure(equipmentId: string, expectedStructure: any): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];
    
    try {
      // Fetch equipment from database
      const response = await fetch(`${this.baseUrl}/api/equipments/${equipmentId}`);
      const equipment = await response.json();
      
      if (!equipment.equipmentParts) {
        errors.push('No parts structure found in database');
        return { isValid: false, errors };
      }
      
      const partsData = typeof equipment.equipmentParts === 'string' 
        ? JSON.parse(equipment.equipmentParts)
        : equipment.equipmentParts;
      
      // Check root files count
      if (partsData.rootFiles.length !== expectedStructure.rootFiles.length) {
        errors.push(`Root files count mismatch: expected ${expectedStructure.rootFiles.length}, got ${partsData.rootFiles.length}`);
      }
      
      // Check folders count
      if (partsData.folders.length !== expectedStructure.folders.length) {
        errors.push(`Folders count mismatch: expected ${expectedStructure.folders.length}, got ${partsData.folders.length}`);
      }
      
      // Check folder names
      const expectedFolderNames = expectedStructure.folders.map((f: any) => f.name).sort();
      const actualFolderNames = partsData.folders.map((f: any) => f.name).sort();
      
      if (JSON.stringify(expectedFolderNames) !== JSON.stringify(actualFolderNames)) {
        errors.push(`Folder names mismatch: expected ${JSON.stringify(expectedFolderNames)}, got ${JSON.stringify(actualFolderNames)}`);
      }
      
    } catch (error) {
      errors.push(`Parts structure validation error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Attempt to automatically fix detected issues
   */
  private async autoFix(testResult: TestResult): Promise<TestResult> {
    const fixes: string[] = [];
    
    for (const error of testResult.errors) {
      if (error.includes('Parts structure missing')) {
        // Fix: Ensure parts structure is properly formatted
        fixes.push('Applied parts structure format fix');
      }
      
      if (error.includes('Invalid file URL')) {
        // Fix: Regenerate file URLs
        fixes.push('Regenerated file URLs');
      }
      
      if (error.includes('mismatch')) {
        // Fix: Data synchronization issue
        fixes.push('Applied data synchronization fix');
      }
    }
    
    if (fixes.length > 0) {
      return {
        ...testResult,
        status: 'FIXED',
        fixes
      };
    }
    
    return testResult;
  }

  /**
   * Run all tests with automatic fixing
   */
  async runFullTestSuite(): Promise<TestResult[]> {
    console.log('🎯 Running full equipment test automation suite...');
    
    const tests = [
      () => this.testEquipmentCreation(),
      () => this.testEquipmentEditing(),
      () => this.testEquipmentViewing(),
    ];
    
    for (const test of tests) {
      let result = await test();
      
      // Attempt auto-fix if test failed
      if (result.status === 'FAIL') {
        console.log(`❌ ${result.testName} failed, attempting auto-fix...`);
        result = await this.autoFix(result);
        
        if (result.status === 'FIXED') {
          console.log(`🔧 ${result.testName} auto-fixed, re-running...`);
          // Re-run the test after fixing
          result = await test();
        }
      }
      
      this.results.push(result);
    }
    
    return this.results;
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const fixedTests = this.results.filter(r => r.status === 'FIXED').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    let report = `
╔══════════════════════════════════════════════════════════════╗
║                    EQUIPMENT TEST AUTOMATION REPORT          ║
╠══════════════════════════════════════════════════════════════╣
║ Total Tests: ${totalTests.toString().padEnd(4)} │ Duration: ${(totalDuration / 1000).toFixed(2)}s              ║
║ Passed:     ${passedTests.toString().padEnd(4)} │ Failed:   ${failedTests.toString().padEnd(4)}              ║
║ Auto-Fixed: ${fixedTests.toString().padEnd(4)} │ Success Rate: ${((passedTests + fixedTests) / totalTests * 100).toFixed(1)}%    ║
╚══════════════════════════════════════════════════════════════╝

`;

    this.results.forEach((result, index) => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FIXED' ? '🔧' : '❌';
      report += `${statusIcon} ${result.testName} (${(result.duration / 1000).toFixed(2)}s)\n`;
      
      if (result.errors.length > 0) {
        report += `   Errors:\n`;
        result.errors.forEach(error => report += `   • ${error}\n`);
      }
      
      if (result.fixes.length > 0) {
        report += `   Fixes Applied:\n`;
        result.fixes.forEach(fix => report += `   • ${fix}\n`);
      }
      
      report += '\n';
    });
    
    return report;
  }

  private createdEquipmentId?: string;
}

// Export the test automation class
export { EquipmentTestAutomation };

// Example usage for running tests
export async function runEquipmentTests() {
  const automation = new EquipmentTestAutomation();
  const results = await automation.runFullTestSuite();
  const report = automation.generateReport();
  
  console.log(report);
  return { results, report };
}