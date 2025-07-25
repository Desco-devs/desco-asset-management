const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testEquipmentForms() {
  console.log('🚀 Testing Equipment Forms...');
  
  try {
    // Test 1: Get all equipments
    console.log('\n🔍 Test 1: Fetching all equipments...');
    const equipmentsResponse = await fetch('http://localhost:3000/api/equipments/getall');
    
    if (!equipmentsResponse.ok) {
      throw new Error(`Equipments API failed: ${equipmentsResponse.status}`);
    }
    
    const equipments = await equipmentsResponse.json();
    console.log(`✅ Found ${equipments.length} equipments`);
    
    // Find equipment with parts
    const equipmentWithParts = equipments.find(eq => eq.equipment_parts && 
      typeof eq.equipment_parts === 'object' && 
      eq.equipment_parts.rootFiles);
      
    if (equipmentWithParts) {
      console.log(`✅ Found equipment with parts: ${equipmentWithParts.brand} ${equipmentWithParts.model}`);
      console.log(`📁 Parts structure - Root files: ${equipmentWithParts.equipment_parts.rootFiles?.length || 0}, Folders: ${equipmentWithParts.equipment_parts.folders?.length || 0}`);
      
      // Test 2: Get individual equipment
      console.log('\n🔍 Test 2: Fetching individual equipment...');
      const individualResponse = await fetch(`http://localhost:3000/api/equipments/${equipmentWithParts.id}`);
      
      if (individualResponse.ok) {
        const individual = await individualResponse.json();
        console.log(`✅ Individual equipment fetch successful`);
        
        if (individual.equipmentParts) {
          const parts = typeof individual.equipmentParts === 'string' 
            ? JSON.parse(individual.equipmentParts) 
            : individual.equipmentParts;
            
          console.log(`📁 Individual parts - Root files: ${parts.rootFiles?.length || 0}, Folders: ${parts.folders?.length || 0}`);
        }
      } else {
        console.log('❌ Individual equipment fetch failed');
      }
    } else {
      console.log('⚠️ No equipment with modern parts structure found');
    }
    
    // Test 3: Get projects (needed for equipment creation)
    console.log('\n🔍 Test 3: Fetching projects...');
    const projectsResponse = await fetch('http://localhost:3000/api/projects/getall');
    
    if (projectsResponse.ok) {
      const projects = await projectsResponse.json();
      console.log(`✅ Found ${projects.length} projects`);
      
      if (projects.length > 0) {
        console.log(`📋 First project: ${projects[0].name}`);
        
        // Test 4: Create test equipment (JSON API)
        console.log('\n🔍 Test 4: Testing equipment creation via JSON API...');
        const createData = {
          brand: 'Auto Test Brand',
          model: 'Auto Test Model',
          type: 'Excavator',
          owner: 'Automated Test',
          projectId: projects[0].id,
          status: 'OPERATIONAL',
          plateNumber: 'AUTO-001',
          before: '6',
          remarks: 'Created by automation test',
          inspectionDate: '2024-01-15',
          equipmentParts: {
            rootFiles: [],
            folders: [{
              id: 'test_folder',
              name: 'Automation Test Folder',
              files: []
            }]
          }
        };
        
        const createResponse = await fetch('http://localhost:3000/api/equipments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        });
        
        if (createResponse.ok) {
          const newEquipment = await createResponse.json();
          console.log(`✅ Equipment creation successful: ${newEquipment.id}`);
          
          // Verify parts structure was saved correctly
          const verifyResponse = await fetch(`http://localhost:3000/api/equipments/${newEquipment.id}`);
          if (verifyResponse.ok) {
            const verified = await verifyResponse.json();
            
            if (verified.equipmentParts) {
              const verifiedParts = typeof verified.equipmentParts === 'string'
                ? JSON.parse(verified.equipmentParts)
                : verified.equipmentParts;
                
              if (verifiedParts.folders && verifiedParts.folders.length > 0) {
                console.log(`✅ Parts structure verification successful - Found folder: ${verifiedParts.folders[0].name}`);
              } else {
                console.log('❌ Parts structure verification failed - No folders found');
              }
            }
          }
          
          // Cleanup
          const deleteResponse = await fetch(`http://localhost:3000/api/equipments?equipmentId=${newEquipment.id}`, {
            method: 'DELETE'
          });
          
          if (deleteResponse.ok) {
            console.log('✅ Test equipment cleanup successful');
          }
        } else {
          const error = await createResponse.text();
          console.log('❌ Equipment creation failed:', error);
        }
      }
    } else {
      console.log('❌ Projects fetch failed');
    }
    
    console.log('\n🎉 Equipment Forms Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testEquipmentForms();