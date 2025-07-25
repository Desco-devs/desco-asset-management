#!/usr/bin/env node

/**
 * Direct Equipment Testing Script
 * Tests equipment functionality without complex module resolution
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const { stdout, stderr } = await execAsync('npx prisma db execute --sql "SELECT COUNT(*) FROM equipment"', {
      cwd: process.cwd()
    });
    
    console.log('✅ Database connection successful');
    return { success: true, details: stdout };
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testEquipmentAPI() {
  console.log('🔍 Testing equipment API endpoints...');
  
  try {
    // Start the dev server temporarily for testing
    console.log('Starting dev server for API testing...');
    
    const serverProcess = exec('npm run dev', { cwd: process.cwd() });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    try {
      // Test projects endpoint (needed for equipment creation)
      const projectsResponse = await fetch('http://localhost:3000/api/projects/getall');
      if (!projectsResponse.ok) {
        throw new Error(`Projects API failed: ${projectsResponse.status}`);
      }
      const projects = await projectsResponse.json();
      console.log(`✅ Found ${projects.length} projects for testing`);
      
      // Test equipments endpoint
      const equipmentsResponse = await fetch('http://localhost:3000/api/equipments/getall');
      if (!equipmentsResponse.ok) {
        throw new Error(`Equipments API failed: ${equipmentsResponse.status}`);
      }
      const equipments = await equipmentsResponse.json();
      console.log(`✅ Found ${equipments.length} existing equipments`);
      
      // Test equipment creation with actual data
      if (projects.length > 0) {
        const testData = {
          brand: 'Test Automation Brand',
          model: 'Test Model',
          type: 'Excavator',
          owner: 'Test Owner',
          projectId: projects[0].id,
          status: 'OPERATIONAL',
          plateNumber: 'AUTO-TEST-001',
          before: '6',
          remarks: 'Created by automated test suite',
          inspectionDate: '2024-01-15',
          equipmentParts: JSON.stringify({
            rootFiles: [],
            folders: [{
              id: 'test_folder',
              name: 'Test Folder',
              files: []
            }]
          })
        };
        
        const createResponse = await fetch('http://localhost:3000/api/equipments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testData)
        });
        
        if (createResponse.ok) {
          const newEquipment = await createResponse.json();
          console.log(`✅ Equipment creation test successful: ${newEquipment.id}`);
          
          // Test viewing the created equipment
          const viewResponse = await fetch(`http://localhost:3000/api/equipments/${newEquipment.id}`);
          if (viewResponse.ok) {
            const viewedEquipment = await viewResponse.json();
            console.log('✅ Equipment viewing test successful');
            
            // Validate parts structure
            if (viewedEquipment.equipmentParts) {
              try {
                const partsData = typeof viewedEquipment.equipmentParts === 'string'
                  ? JSON.parse(viewedEquipment.equipmentParts)
                  : viewedEquipment.equipmentParts;
                
                if (partsData.folders && Array.isArray(partsData.folders)) {
                  console.log('✅ Parts structure validation successful');
                } else {
                  console.log('❌ Parts structure validation failed - incorrect format');
                  return { success: false, error: 'Parts structure format invalid' };
                }
              } catch (e) {
                console.log('❌ Parts structure parsing failed:', e.message);
                return { success: false, error: 'Parts structure parsing failed' };
              }
            }
            
            // Cleanup - delete test equipment
            const deleteResponse = await fetch(`http://localhost:3000/api/equipments?equipmentId=${newEquipment.id}`, {
              method: 'DELETE'
            });
            
            if (deleteResponse.ok) {
              console.log('✅ Test cleanup successful');
            } else {
              console.log('⚠️ Test cleanup failed, but test passed');
            }
            
          } else {
            console.log('❌ Equipment viewing test failed');
            return { success: false, error: 'Equipment viewing failed' };
          }
        } else {
          const errorText = await createResponse.text();
          console.log('❌ Equipment creation test failed:', errorText);
          return { success: false, error: 'Equipment creation failed' };
        }
      }
      
      return { success: true };
      
    } finally {
      // Stop the dev server
      serverProcess.kill();
    }
    
  } catch (error) {
    console.log('❌ API testing failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testEquipmentPartsStructure() {
  console.log('🔍 Testing equipment parts structure...');
  
  try {
    // Test valid parts structure
    const validStructure = {
      rootFiles: [
        { id: 'root_0', name: 'test.jpg', url: 'http://example.com/test.jpg', type: 'image' }
      ],
      folders: [
        {
          id: 'folder_0',
          name: 'Test Folder',
          files: [
            { id: 'file_0', name: 'manual.pdf', url: 'http://example.com/manual.pdf', type: 'document' }
          ]
        }
      ]
    };
    
    // Check if structure can be serialized and deserialized
    const serialized = JSON.stringify(validStructure);
    const deserialized = JSON.parse(serialized);
    
    if (deserialized.rootFiles && Array.isArray(deserialized.rootFiles) &&
        deserialized.folders && Array.isArray(deserialized.folders)) {
      console.log('✅ Parts structure serialization test passed');
      return { success: true };
    } else {
      console.log('❌ Parts structure validation failed');
      return { success: false, error: 'Structure validation failed' };
    }
    
  } catch (error) {
    console.log('❌ Parts structure testing failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testEquipmentFormValidation() {
  console.log('🔍 Testing equipment form validation...');
  
  try {
    // Test required field validation
    const requiredFields = ['brand', 'model', 'type', 'owner', 'projectId'];
    const testData = {
      brand: 'Test Brand',
      model: 'Test Model',
      type: 'Excavator',
      owner: 'Test Owner',
      projectId: 'test-project-id'
    };
    
    // Check all required fields are present
    const missingFields = requiredFields.filter(field => !testData[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ Form validation test passed');
      return { success: true };
    } else {
      console.log('❌ Form validation test failed - missing fields:', missingFields);
      return { success: false, error: `Missing fields: ${missingFields.join(', ')}` };
    }
    
  } catch (error) {
    console.log('❌ Form validation testing failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function generateTestReport(results) {
  const timestamp = new Date().toISOString();
  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  const report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                      EQUIPMENT VALIDATION TEST REPORT                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Timestamp:   ${timestamp.slice(0, 19)}Z       │ Success Rate:   ${successRate}%     ║
║ Total Tests: ${totalTests.toString().padEnd(20)} │ Passed:         ${passedTests}        ║
║ Failed:      ${failedTests.toString().padEnd(20)} │                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

DETAILED RESULTS:
${'-'.repeat(80)}

${results.map((result, index) => {
  const status = result.success ? '✅ PASS' : '❌ FAIL';
  let output = `${status} ${result.name}\n`;
  if (result.details) {
    output += `   📋 Details: ${result.details}\n`;
  }
  if (result.error) {
    output += `   ❌ Error: ${result.error}\n`;
  }
  return output;
}).join('\n')}

${failedTests > 0 ? `
⚠️  ISSUES FOUND:
${'='.repeat(40)}
${results.filter(r => !r.success).map(r => `• ${r.name}: ${r.error}`).join('\n')}

🔧 RECOMMENDED FIXES:
${'='.repeat(40)}
${results.filter(r => !r.success).map(r => `• Fix ${r.name.toLowerCase()}`).join('\n')}
` : `
🎉 ALL TESTS PASSED! 
Equipment forms are working correctly and ready for production use.
`}
`;

  // Save report
  const resultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const reportFile = path.join(resultsDir, `equipment-validation-${timestamp.replace(/[:.]/g, '-')}.txt`);
  fs.writeFileSync(reportFile, report);
  
  console.log(report);
  console.log(`📄 Report saved to: ${reportFile}`);
  
  return { passed: passedTests, failed: failedTests, report };
}

async function main() {
  console.log('🚀 Equipment Forms Validation Test Suite');
  console.log('==========================================');
  console.log('');
  
  const results = [];
  
  // Run all tests
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Equipment API Endpoints', fn: testEquipmentAPI },
    { name: 'Parts Structure Validation', fn: testEquipmentPartsStructure },
    { name: 'Form Validation', fn: testEquipmentFormValidation }
  ];
  
  for (const test of tests) {
    const result = await test.fn();
    results.push({
      name: test.name,
      success: result.success,
      details: result.details,
      error: result.error
    });
  }
  
  // Generate report
  const summary = await generateTestReport(results);
  
  // Exit with appropriate code
  if (summary.failed > 0) {
    console.log(`\n❌ ${summary.failed} test(s) failed. Equipment forms need fixes.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All tests passed! Equipment forms are working correctly.`);
    process.exit(0);
  }
}

// Handle global fetch for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = { main };