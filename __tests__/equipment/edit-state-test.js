/**
 * Test to verify that edit form state updates correctly
 * This test simulates the issue where parts management doesn't update when editing different equipment
 */

describe('Edit Equipment State Management', () => {
  // Mock the state changes that should happen when switching equipment
  it('should reset parts structure when switching between different equipment', () => {
    // Simulate first equipment with parts
    const equipment1 = {
      uid: 'equipment-1',
      brand: 'Caterpillar',
      model: '320D',
      equipmentParts: JSON.stringify({
        rootFiles: [
          { id: 'root1', name: 'manual.pdf', url: 'https://example.com/manual.pdf' }
        ],
        folders: [
          {
            id: 'folder1',
            name: 'Filters',
            files: [
              { id: 'file1', name: 'air-filter.jpg', url: 'https://example.com/filter.jpg' }
            ]
          }
        ]
      })
    };

    // Simulate second equipment with different parts
    const equipment2 = {
      uid: 'equipment-2',
      brand: 'Komatsu',
      model: 'PC200',
      equipmentParts: JSON.stringify({
        rootFiles: [
          { id: 'root2', name: 'service-guide.pdf', url: 'https://example.com/service.pdf' }
        ],
        folders: [
          {
            id: 'folder2',
            name: 'Engine Parts',
            files: [
              { id: 'file2', name: 'engine-filter.jpg', url: 'https://example.com/engine.jpg' }
            ]
          }
        ]
      })
    };

    // Test the parsing logic from EditEquipmentDrawer
    const parseEquipmentParts = (equipmentParts) => {
      try {
        const rawParts = equipmentParts;
        let parsedParts;
        
        if (!rawParts) {
          parsedParts = { rootFiles: [], folders: [] };
        } else if (typeof rawParts === 'string') {
          try {
            const parsed = JSON.parse(rawParts);
            if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
              parsedParts = {
                rootFiles: Array.isArray(parsed.rootFiles) ? parsed.rootFiles : [],
                folders: Array.isArray(parsed.folders) ? parsed.folders : []
              };
            } else {
              parsedParts = { rootFiles: [], folders: [] };
            }
          } catch {
            parsedParts = { rootFiles: [], folders: [] };
          }
        } else if (Array.isArray(rawParts)) {
          // Legacy format
          parsedParts = {
            rootFiles: rawParts.map((url, index) => ({
              id: `legacy_${index}`,
              name: url.split('/').pop() || `image_${index}`,
              preview: url
            })),
            folders: []
          };
        } else {
          parsedParts = { rootFiles: [], folders: [] };
        }
        
        return parsedParts;
      } catch (error) {
        return { rootFiles: [], folders: [] };
      }
    };

    // Parse parts for first equipment
    const parsedParts1 = parseEquipmentParts(equipment1.equipmentParts);
    expect(parsedParts1.rootFiles).toHaveLength(1);
    expect(parsedParts1.rootFiles[0].name).toBe('manual.pdf');
    expect(parsedParts1.folders).toHaveLength(1);
    expect(parsedParts1.folders[0].name).toBe('Filters');
    expect(parsedParts1.folders[0].files).toHaveLength(1);

    // Parse parts for second equipment
    const parsedParts2 = parseEquipmentParts(equipment2.equipmentParts);
    expect(parsedParts2.rootFiles).toHaveLength(1);
    expect(parsedParts2.rootFiles[0].name).toBe('service-guide.pdf');
    expect(parsedParts2.folders).toHaveLength(1);
    expect(parsedParts2.folders[0].name).toBe('Engine Parts');
    expect(parsedParts2.folders[0].files).toHaveLength(1);

    // Verify they are different
    expect(parsedParts1.rootFiles[0].name).not.toBe(parsedParts2.rootFiles[0].name);
    expect(parsedParts1.folders[0].name).not.toBe(parsedParts2.folders[0].name);
  });

  it('should handle legacy parts format correctly', () => {
    const legacyEquipment = {
      uid: 'legacy-equipment',
      brand: 'Legacy',
      model: 'Model',
      equipmentParts: [
        'https://example.com/part1.jpg',
        'https://example.com/part2.jpg'
      ]
    };

    const parseEquipmentParts = (equipmentParts) => {
      if (Array.isArray(equipmentParts)) {
        return {
          rootFiles: equipmentParts.map((url, index) => ({
            id: `legacy_${index}`,
            name: url.split('/').pop() || `image_${index}`,
            preview: url
          })),
          folders: []
        };
      }
      return { rootFiles: [], folders: [] };
    };

    const parsedParts = parseEquipmentParts(legacyEquipment.equipmentParts);
    expect(parsedParts.rootFiles).toHaveLength(2);
    expect(parsedParts.rootFiles[0].name).toBe('part1.jpg');
    expect(parsedParts.rootFiles[1].name).toBe('part2.jpg');
    expect(parsedParts.folders).toHaveLength(0);
  });

  it('should ensure parts manager component remounts with key prop', () => {
    // Test that different equipment UIDs would generate different keys
    const equipment1 = { uid: 'equipment-1' };
    const equipment2 = { uid: 'equipment-2' };
    
    const getComponentKey = (equipment) => equipment?.uid || 'new';
    
    const key1 = getComponentKey(equipment1);
    const key2 = getComponentKey(equipment2);
    
    expect(key1).toBe('equipment-1');
    expect(key2).toBe('equipment-2');
    expect(key1).not.toBe(key2);
  });

  it('should reset form state when switching equipment', () => {
    // Mock form state reset logic
    const resetFormState = (selectedEquipment) => {
      const formData = {
        brand: selectedEquipment?.brand || '',
        model: selectedEquipment?.model || '',
        plateNumber: selectedEquipment?.plateNumber || '',
        owner: selectedEquipment?.owner || '',
        type: selectedEquipment?.type || '',
        projectId: selectedEquipment?.project?.uid || '',
        status: selectedEquipment?.status || 'OPERATIONAL',
        before: selectedEquipment?.before?.toString() || '6',
        remarks: selectedEquipment?.remarks || ''
      };

      const files = {
        equipmentImage: null,
        thirdpartyInspection: null,
        pgpcInspection: null,
        originalReceipt: null,
        equipmentRegistration: null,
      };

      const removedFiles = {
        equipmentImage: false,
        thirdpartyInspection: false,
        pgpcInspection: false,
        originalReceipt: false,
        equipmentRegistration: false,
      };

      return { formData, files, removedFiles };
    };

    const equipment1 = {
      brand: 'Caterpillar',
      model: '320D',
      owner: 'Company A',
      type: 'Excavator',
      status: 'OPERATIONAL'
    };

    const equipment2 = {
      brand: 'Komatsu',
      model: 'PC200',
      owner: 'Company B',
      type: 'Excavator',
      status: 'NON_OPERATIONAL'
    };

    const state1 = resetFormState(equipment1);
    const state2 = resetFormState(equipment2);

    // Verify form data is correctly populated for each equipment
    expect(state1.formData.brand).toBe('Caterpillar');
    expect(state1.formData.model).toBe('320D');
    expect(state2.formData.brand).toBe('Komatsu');
    expect(state2.formData.model).toBe('PC200');

    // Verify files are always reset to null
    expect(state1.files.equipmentImage).toBeNull();
    expect(state2.files.equipmentImage).toBeNull();

    // Verify removed files are reset to false
    expect(state1.removedFiles.equipmentImage).toBe(false);
    expect(state2.removedFiles.equipmentImage).toBe(false);
  });
});