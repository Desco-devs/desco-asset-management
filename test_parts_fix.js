const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPartsFix() {
  try {
    const equipmentId = 'efa92221-bdbd-4856-9d42-fb155917b555';
    
    // Create sample parts data structure to test the fix
    const samplePartsData = {
      rootFiles: [
        {
          id: 'test_file_1',
          name: 'engine_manual.pdf',
          url: 'https://example.com/test_file_1.pdf',
          type: 'document',
          uploadedAt: new Date().toISOString()
        },
        {
          id: 'test_file_2',
          name: 'maintenance_photo.jpg',
          url: 'https://example.com/test_file_2.jpg',
          type: 'image',
          uploadedAt: new Date().toISOString()
        }
      ],
      folders: [
        {
          name: 'Hydraulic System',
          files: [
            {
              id: 'test_file_3',
              name: 'hydraulic_pump_specs.pdf',
              url: 'https://example.com/test_file_3.pdf',
              type: 'document',
              uploadedAt: new Date().toISOString()
            }
          ]
        }
      ]
    };
    
    console.log('=== TESTING PARTS FIX ===');
    console.log('Equipment ID:', equipmentId);
    
    // Update the equipment with sample parts data
    console.log('Updating equipment with sample parts data...');
    const updated = await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        equipment_parts: [JSON.stringify(samplePartsData)]
      }
    });
    
    console.log('✅ Equipment updated successfully');
    
    // Verify the update
    console.log('Verifying the update...');
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        brand: true,
        model: true,
        equipment_parts: true
      }
    });
    
    if (equipment) {
      console.log('Equipment found:');
      console.log('- ID:', equipment.id);
      console.log('- Brand/Model:', equipment.brand, equipment.model);
      console.log('- Equipment Parts (raw):', equipment.equipment_parts);
      
      // Try to parse the parts data
      if (equipment.equipment_parts && equipment.equipment_parts.length > 0) {
        try {
          const parsedParts = JSON.parse(equipment.equipment_parts[0]);
          console.log('- Parsed Parts Structure:');
          console.log('  - Root Files:', parsedParts.rootFiles?.length || 0);
          console.log('  - Folders:', parsedParts.folders?.length || 0);
          
          if (parsedParts.rootFiles?.length > 0) {
            console.log('  - Sample Root File:', parsedParts.rootFiles[0]);
          }
          
          if (parsedParts.folders?.length > 0) {
            console.log('  - Sample Folder:', parsedParts.folders[0]);
          }
          
          console.log('✅ Parts data parsing successful!');
        } catch (error) {
          console.error('❌ Failed to parse parts data:', error.message);
        }
      }
    } else {
      console.log('❌ Equipment not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPartsFix();