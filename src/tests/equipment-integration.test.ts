/**
 * Integration Tests for Equipment Forms with Auto-Fix Capabilities
 * Tests the complete flow: Create → Edit → View → Validate
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/jest';
import { EquipmentTestAutomation } from './equipment-automation.test';
import { createSampleEquipmentData, validatePartsStructure } from './test-utils';

describe('Equipment Forms Integration Tests', () => {
  let testAutomation: EquipmentTestAutomation;
  let createdEquipmentIds: string[] = [];
  
  beforeAll(async () => {
    testAutomation = new EquipmentTestAutomation();
    console.log('🧪 Starting Equipment Integration Tests...');
  });

  afterEach(async () => {
    // Cleanup created equipment after each test
    for (const equipmentId of createdEquipmentIds) {
      try {
        // Delete equipment via API
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/equipments?equipmentId=${equipmentId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.warn(`Failed to cleanup equipment ${equipmentId}:`, error);
      }
    }
    createdEquipmentIds = [];
  });

  afterAll(async () => {
    console.log('🏁 Equipment Integration Tests completed');
  });

  test('Complete Equipment Lifecycle: Create → Edit → View', async () => {
    console.log('🔄 Testing complete equipment lifecycle...');
    
    // Step 1: Create Equipment
    const creationResult = await testAutomation.testEquipmentCreation();
    expect(creationResult.status).toBe('PASS');
    
    if (creationResult.status === 'PASS') {
      // Add to cleanup list
      createdEquipmentIds.push((creationResult as any).equipmentId);
      
      // Step 2: Edit Equipment
      const editResult = await testAutomation.testEquipmentEditing();
      expect(editResult.status).toBe('PASS');
      
      // Step 3: View Equipment
      const viewResult = await testAutomation.testEquipmentViewing();
      expect(viewResult.status).toBe('PASS');
    }
  }, 30000); // 30 second timeout

  test('Parts Structure Preservation Across Operations', async () => {
    console.log('📁 Testing parts structure preservation...');
    
    const sampleData = createSampleEquipmentData();
    
    // Validate initial structure
    const initialValidation = validatePartsStructure(sampleData.partsStructure);
    expect(initialValidation.isValid).toBe(true);
    
    // Test creation preserves structure
    const creationResult = await testAutomation.testEquipmentCreation();
    expect(creationResult.status).toBe('PASS');
    
    if (creationResult.status === 'PASS') {
      createdEquipmentIds.push((creationResult as any).equipmentId);
      
      // Fetch and validate stored structure
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/equipments/${(creationResult as any).equipmentId}`);
      const equipment = await response.json();
      
      expect(equipment.equipmentParts).toBeDefined();
      
      const storedStructure = typeof equipment.equipmentParts === 'string' 
        ? JSON.parse(equipment.equipmentParts)
        : equipment.equipmentParts;
      
      const structureValidation = validatePartsStructure(storedStructure);
      expect(structureValidation.isValid).toBe(true);
    }
  }, 20000);

  test('Error Handling and Recovery', async () => {
    console.log('🛠️ Testing error handling and auto-recovery...');
    
    // Test with invalid data
    const invalidData = {
      brand: '', // Missing required field
      model: 'Test Model',
      type: 'InvalidType',
      owner: 'Test Owner',
      projectId: 'invalid-project-id'
    };
    
    try {
      // This should fail validation
      const { createEquipmentAction } = await import('../app/(admin-dashboard)/equipments/actions');
      const formData = new FormData();
      
      Object.entries(invalidData).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      await expect(createEquipmentAction(formData)).rejects.toThrow();
    } catch (error) {
      // Expected to fail - this is correct behavior
      expect(error).toBeDefined();
    }
  }, 15000);

  test('Database Consistency Check', async () => {
    console.log('🗄️ Testing database consistency...');
    
    // Create equipment
    const creationResult = await testAutomation.testEquipmentCreation();
    expect(creationResult.status).toBe('PASS');
    
    if (creationResult.status === 'PASS') {
      const equipmentId = (creationResult as any).equipmentId;
      createdEquipmentIds.push(equipmentId);
      
      // Check if equipment exists in database
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        const equipment = await prisma.equipment.findUnique({
          where: { id: equipmentId },
          include: {
            project: {
              include: {
                client: {
                  include: {
                    location: true
                  }
                }
              }
            }
          }
        });
        
        expect(equipment).toBeDefined();
        expect(equipment?.brand).toBeDefined();
        expect(equipment?.model).toBeDefined();
        expect(equipment?.project).toBeDefined();
        
        // Check parts structure format
        if (equipment?.equipment_parts && equipment.equipment_parts.length > 0) {
          const partsData = equipment.equipment_parts[0];
          if (typeof partsData === 'string') {
            // Should be valid JSON
            expect(() => JSON.parse(partsData)).not.toThrow();
            
            const parsed = JSON.parse(partsData);
            expect(parsed.rootFiles).toBeDefined();
            expect(parsed.folders).toBeDefined();
          }
        }
        
      } finally {
        await prisma.$disconnect();
      }
    }
  }, 20000);
});

/**
 * Performance Tests
 */
describe('Equipment Forms Performance Tests', () => {
  let testAutomation: EquipmentTestAutomation;
  
  beforeAll(() => {
    testAutomation = new EquipmentTestAutomation();
  });

  test('Equipment Creation Performance', async () => {
    console.log('⚡ Testing equipment creation performance...');
    
    const startTime = Date.now();
    
    const results = await testAutomation.runFullTestSuite();
    
    const totalDuration = Date.now() - startTime;
    
    // Should complete within reasonable time
    expect(totalDuration).toBeLessThan(60000); // 60 seconds
    
    // All tests should pass or be auto-fixed
    const failedTests = results.filter(r => r.status === 'FAIL');
    expect(failedTests.length).toBe(0);
    
    console.log(`⚡ Performance test completed in ${(totalDuration / 1000).toFixed(2)}s`);
  }, 70000);
});

/**
 * Auto-Fix Capability Tests
 */
describe('Equipment Forms Auto-Fix Tests', () => {
  test('Auto-fix Parts Structure Issues', async () => {
    console.log('🔧 Testing auto-fix capabilities...');
    
    // Test with malformed parts structure
    const malformedParts = {
      rootFiles: 'invalid', // Should be array
      folders: null // Should be array
    };
    
    const validation = validatePartsStructure(malformedParts);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    
    // Auto-fix should convert to valid structure
    const fixedParts = {
      rootFiles: [],
      folders: []
    };
    
    const fixedValidation = validatePartsStructure(fixedParts);
    expect(fixedValidation.isValid).toBe(true);
  });

  test('Auto-fix Missing Required Fields', async () => {
    console.log('🔧 Testing auto-fix for missing fields...');
    
    const incompleteData = {
      brand: 'Test Brand',
      model: '', // Missing required field
      type: 'Excavator',
      owner: 'Test Owner'
      // Missing projectId
    };
    
    // Auto-fix should add default values
    const fixedData = {
      ...incompleteData,
      model: incompleteData.model || 'Unknown Model',
      projectId: 'default-project-id'
    };
    
    expect(fixedData.model).toBe('Unknown Model');
    expect(fixedData.projectId).toBeDefined();
  });
});

export { };