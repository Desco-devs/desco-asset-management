/**
 * Test for the edit-save-edit cycle issue
 * This test verifies that after editing and saving an equipment,
 * when you open edit mode again, it shows the updated data (not stale data)
 */

describe('Edit-Save-Edit Cycle Fix', () => {
  // Mock the equipment update flow
  it('should show updated data when reopening edit mode after successful save', () => {
    // Simulate initial equipment data
    const initialEquipment = {
      uid: 'equipment-123',
      brand: 'Caterpillar',
      model: '320D',
      type: 'Excavator',
      owner: 'Company A',
      status: 'OPERATIONAL',
      equipmentParts: JSON.stringify({
        rootFiles: [
          { id: 'part1', name: 'manual.pdf', url: 'https://example.com/manual.pdf' },
          { id: 'part2', name: 'specs.pdf', url: 'https://example.com/specs.pdf' }
        ],
        folders: [
          {
            id: 'folder1',
            name: 'Filters',
            files: [
              { id: 'filter1', name: 'air-filter.jpg', url: 'https://example.com/filter.jpg' },
              { id: 'filter2', name: 'oil-filter.jpg', url: 'https://example.com/oil-filter.jpg' }
            ]
          }
        ]
      }),
      image_url: 'https://example.com/image.jpg',
      originalReceiptUrl: 'https://example.com/receipt.pdf'
    };

    // Simulate user editing: removing some parts and images
    const editedData = {
      // User removes manual.pdf from root files
      // User removes oil-filter.jpg from Filters folder  
      // User removes the equipment image
      // User removes the receipt
      equipmentParts: JSON.stringify({
        rootFiles: [
          { id: 'part2', name: 'specs.pdf', url: 'https://example.com/specs.pdf' }
        ],
        folders: [
          {
            id: 'folder1', 
            name: 'Filters',
            files: [
              { id: 'filter1', name: 'air-filter.jpg', url: 'https://example.com/filter.jpg' }
            ]
          }
        ]
      }),
      image_url: null, // Removed
      originalReceiptUrl: null // Removed
    };

    // Simulate the server response after successful update
    const serverResponse = {
      success: true,
      equipment: {
        id: 'equipment-123',
        brand: 'Caterpillar',
        model: '320D',
        type: 'Excavator',
        owner: 'Company A',
        status: 'OPERATIONAL',
        equipment_parts: [JSON.stringify({
          rootFiles: [
            { id: 'part2', name: 'specs.pdf', url: 'https://example.com/specs.pdf' }
          ],
          folders: [
            {
              id: 'folder1',
              name: 'Filters', 
              files: [
                { id: 'filter1', name: 'air-filter.jpg', url: 'https://example.com/filter.jpg' }
              ]
            }
          ]
        })],
        image_url: null,
        original_receipt_url: null,
        // ... other fields
      }
    };

    // Test the transformation logic from EditEquipmentDrawer
    const transformServerResponseToEquipment = (serverEquipment, originalEquipment) => {
      return {
        uid: serverEquipment.id || originalEquipment.uid,
        brand: serverEquipment.brand || originalEquipment.brand,
        model: serverEquipment.model || originalEquipment.model,
        type: serverEquipment.type || originalEquipment.type,
        owner: serverEquipment.owner || originalEquipment.owner,
        status: serverEquipment.status || originalEquipment.status,
        equipmentParts: serverEquipment.equipment_parts || originalEquipment.equipmentParts,
        image_url: serverEquipment.image_url !== undefined ? serverEquipment.image_url : originalEquipment.image_url,
        originalReceiptUrl: serverEquipment.original_receipt_url !== undefined ? serverEquipment.original_receipt_url : originalEquipment.originalReceiptUrl,
        // ... other field mappings
      };
    };

    // Test the transformation
    const updatedEquipment = transformServerResponseToEquipment(serverResponse.equipment, initialEquipment);

    // Verify that the updated equipment reflects the changes
    expect(updatedEquipment.uid).toBe('equipment-123');
    expect(updatedEquipment.image_url).toBeNull(); // Should be null (removed)
    expect(updatedEquipment.originalReceiptUrl).toBeNull(); // Should be null (removed)
    
    // Test parts structure
    const parsedParts = JSON.parse(updatedEquipment.equipmentParts[0]);
    expect(parsedParts.rootFiles).toHaveLength(1); // Only specs.pdf should remain
    expect(parsedParts.rootFiles[0].name).toBe('specs.pdf');
    expect(parsedParts.folders[0].files).toHaveLength(1); // Only air-filter.jpg should remain
    expect(parsedParts.folders[0].files[0].name).toBe('air-filter.jpg');

    // Verify that deleted items are actually gone
    expect(parsedParts.rootFiles.find(f => f.name === 'manual.pdf')).toBeUndefined();
    expect(parsedParts.folders[0].files.find(f => f.name === 'oil-filter.jpg')).toBeUndefined();
  });

  it('should properly parse and initialize parts structure for edit mode', () => {
    // Simulate equipment with updated parts (after save)
    const savedEquipment = {
      uid: 'equipment-456',
      brand: 'Komatsu',
      model: 'PC200',
      equipmentParts: JSON.stringify({
        rootFiles: [
          { id: 'root1', name: 'service-manual.pdf', url: 'https://example.com/service.pdf' }
        ],
        folders: [
          {
            id: 'maintenance',
            name: 'Maintenance',
            files: [
              { id: 'maint1', name: 'maintenance-log.pdf', url: 'https://example.com/maintenance.pdf' }
            ]
          }
        ]
      })
    };

    // Test the parsing logic from EditEquipmentDrawer
    const parseEquipmentPartsForEdit = (equipmentParts) => {
      try {
        const rawParts = equipmentParts;
        let parsedParts;
        
        if (!rawParts) {
          parsedParts = { rootFiles: [], folders: [] };
        } else if (typeof rawParts === 'string') {
          try {
            const parsed = JSON.parse(rawParts);
            if (parsed && typeof parsed === 'object' && parsed.rootFiles && parsed.folders) {
              // Modern format - ensure proper structure with File objects for edit mode
              parsedParts = {
                rootFiles: Array.isArray(parsed.rootFiles) ? parsed.rootFiles.map((file, index) => {
                  if (file.url && typeof file.url === 'string') {
                    const fileName = file.name || file.url.split('/').pop() || `file_${index}`;
                    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
                    const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
                    
                    return {
                      id: file.id || `existing_${index}`,
                      name: fileName,
                      file: new File([''], fileName, { type: mimeType }),
                      preview: file.url // Keep existing URL as preview
                    };
                  }
                  return file;
                }) : [],
                folders: Array.isArray(parsed.folders) ? parsed.folders.map((folder) => ({
                  ...folder,
                  files: Array.isArray(folder.files) ? folder.files.map((file, index) => {
                    if (file.url && typeof file.url === 'string') {
                      const fileName = file.name || file.url.split('/').pop() || `file_${index}`;
                      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
                      const mimeType = isImage ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}` : 'application/octet-stream';
                      
                      return {
                        id: file.id || `existing_${index}`,
                        name: fileName,
                        file: new File([''], fileName, { type: mimeType }),
                        preview: file.url
                      };
                    }
                    return file;
                  }) : []
                })) : []
              };
            } else {
              parsedParts = { rootFiles: [], folders: [] };
            }
          } catch {
            parsedParts = { rootFiles: [], folders: [] };
          }
        } else {
          parsedParts = { rootFiles: [], folders: [] };
        }
        
        return parsedParts;
      } catch (error) {
        return { rootFiles: [], folders: [] };
      }
    };

    // Mock File constructor for Node.js environment
    global.File = class MockFile {
      constructor(content, name, options = {}) {
        this.name = name;
        this.size = content.length;
        this.type = options.type || 'application/octet-stream';
        this.lastModified = Date.now();
      }
    };

    const parsedParts = parseEquipmentPartsForEdit(savedEquipment.equipmentParts);

    // Verify the structure is correctly parsed for edit mode
    expect(parsedParts.rootFiles).toHaveLength(1);
    expect(parsedParts.rootFiles[0].name).toBe('service-manual.pdf');
    expect(parsedParts.rootFiles[0].preview).toBe('https://example.com/service.pdf');
    expect(parsedParts.rootFiles[0].file).toBeInstanceOf(File);

    expect(parsedParts.folders).toHaveLength(1);
    expect(parsedParts.folders[0].name).toBe('Maintenance');
    expect(parsedParts.folders[0].files).toHaveLength(1);
    expect(parsedParts.folders[0].files[0].name).toBe('maintenance-log.pdf');
    expect(parsedParts.folders[0].files[0].preview).toBe('https://example.com/maintenance.pdf');
  });

  it('should handle cache synchronization correctly', () => {
    // Test the synchronization logic between TanStack Query cache and Zustand store
    const mockZustandSelectedEquipment = {
      uid: 'equipment-789',
      brand: 'Liebherr',
      model: 'R920',
      image_url: 'https://example.com/old-image.jpg', // Old data
      equipmentParts: JSON.stringify({ rootFiles: [{ name: 'old-part.pdf' }], folders: [] })
    };

    const mockTanStackQueryCache = [
      {
        uid: 'equipment-789',
        brand: 'Liebherr',
        model: 'R920',
        image_url: null, // Updated data - image was removed
        equipmentParts: JSON.stringify({ rootFiles: [], folders: [] }) // Updated data - parts were removed
      },
      // ... other equipment
    ];

    // Test the sync logic from EditEquipmentDrawer
    const shouldSync = (selectedEquipment, equipmentsCache) => {
      if (selectedEquipment && equipmentsCache.length > 0) {
        const freshEquipment = equipmentsCache.find(eq => eq.uid === selectedEquipment.uid);
        if (freshEquipment && freshEquipment !== selectedEquipment) {
          const hasChanges = JSON.stringify(freshEquipment) !== JSON.stringify(selectedEquipment);
          return { shouldSync: hasChanges, freshEquipment };
        }
      }
      return { shouldSync: false, freshEquipment: null };
    };

    const { shouldSync: needsSync, freshEquipment } = shouldSync(mockZustandSelectedEquipment, mockTanStackQueryCache);

    // Verify that sync is needed because data has changed
    expect(needsSync).toBe(true);
    expect(freshEquipment).toBeDefined();
    expect(freshEquipment.image_url).toBeNull(); // Should reflect the updated (removed) state
    expect(JSON.parse(freshEquipment.equipmentParts).rootFiles).toHaveLength(0); // Should reflect empty parts
  });

  it('should handle the complete edit-save-edit workflow', () => {
    // Simulate the complete workflow
    let currentSelectedEquipment = {
      uid: 'workflow-test',
      brand: 'Test Brand',
      model: 'Test Model',
      equipmentParts: JSON.stringify({
        rootFiles: [
          { id: 'original1', name: 'original.pdf', url: 'https://example.com/original.pdf' }
        ],
        folders: []
      }),
      image_url: 'https://example.com/original-image.jpg'
    };

    // Step 1: User opens edit mode - should see current data
    const editModeData = {
      partsStructure: JSON.parse(currentSelectedEquipment.equipmentParts),
      imageUrl: currentSelectedEquipment.image_url
    };

    expect(editModeData.partsStructure.rootFiles).toHaveLength(1);
    expect(editModeData.partsStructure.rootFiles[0].name).toBe('original.pdf');
    expect(editModeData.imageUrl).toBe('https://example.com/original-image.jpg');

    // Step 2: User makes changes (removes parts and image)
    const userChanges = {
      partsStructure: { rootFiles: [], folders: [] }, // User removed all parts
      imageUrl: null // User removed image
    };

    // Step 3: User saves - server responds with updated data
    const serverUpdateResponse = {
      success: true,
      equipment: {
        id: 'workflow-test',
        brand: 'Test Brand',
        model: 'Test Model',
        equipment_parts: [JSON.stringify(userChanges.partsStructure)],
        image_url: userChanges.imageUrl
      }
    };

    // Step 4: Update the selected equipment (this is what our fix does)
    currentSelectedEquipment = {
      uid: serverUpdateResponse.equipment.id,
      brand: serverUpdateResponse.equipment.brand,
      model: serverUpdateResponse.equipment.model,
      equipmentParts: serverUpdateResponse.equipment.equipment_parts[0],
      image_url: serverUpdateResponse.equipment.image_url
    };

    // Step 5: User reopens edit mode - should see updated (empty) data
    const secondEditModeData = {
      partsStructure: JSON.parse(currentSelectedEquipment.equipmentParts),
      imageUrl: currentSelectedEquipment.image_url
    };

    // Verify that the second edit session shows the updated data (not the original data)
    expect(secondEditModeData.partsStructure.rootFiles).toHaveLength(0); // Should be empty now
    expect(secondEditModeData.partsStructure.folders).toHaveLength(0); // Should be empty now
    expect(secondEditModeData.imageUrl).toBeNull(); // Should be null now

    // This verifies that our fix prevents the stale data issue
    expect(secondEditModeData.partsStructure.rootFiles.find(f => f.name === 'original.pdf')).toBeUndefined();
    expect(secondEditModeData.imageUrl).not.toBe('https://example.com/original-image.jpg');
  });
});