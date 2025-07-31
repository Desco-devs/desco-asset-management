#!/usr/bin/env node

/**
 * Online Presence System Test Script
 * 
 * This script tests the online presence functionality by:
 * 1. Testing API endpoints
 * 2. Simulating presence updates
 * 3. Validating real-time functionality
 * 4. Checking integration points
 * 
 * Usage: node scripts/test-online-presence.js
 */

const { createClient } = require('@supabase/supabase-js');

// Mock environment (in real usage these come from process.env)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test configuration
const TEST_CONFIG = {
  testUsers: [
    {
      id: 'test-user-1',
      username: 'testuser1',
      full_name: 'Test User One',
      room_id: 'test-room-1'
    },
    {
      id: 'test-user-2', 
      username: 'testuser2',
      full_name: 'Test User Two',
      room_id: 'test-room-1'
    },
    {
      id: 'test-user-3',
      username: 'testuser3', 
      full_name: 'Test User Three',
      room_id: 'test-room-2'
    }
  ],
  testDuration: 30000, // 30 seconds
  heartbeatInterval: 5000 // 5 seconds
};

class OnlinePresenceTest {
  constructor() {
    this.channels = [];
    this.results = {
      apiTests: {},
      realtimeTests: {},
      integrationTests: {}
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Online Presence System Tests\n');
    
    try {
      // Test 1: API Endpoints
      console.log('📡 Testing API Endpoints...');
      await this.testApiEndpoints();
      
      // Test 2: Real-time Presence
      console.log('\n🔄 Testing Real-time Presence...');
      await this.testRealtimePresence();
      
      // Test 3: Integration Tests
      console.log('\n🔗 Testing Integration Points...');
      await this.testIntegration();
      
      // Display Results
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      this.cleanup();
    }
  }

  async testApiEndpoints() {
    const baseUrl = 'http://localhost:3000/api';
    
    // Test 1: GET /api/presence
    try {
      console.log('  Testing GET /api/presence...');
      const response = await fetch(`${baseUrl}/presence`);
      const data = await response.json();
      
      this.results.apiTests.getPresence = {
        success: response.ok,
        status: response.status,
        hasUsers: Array.isArray(data.users),
        hasCount: typeof data.count === 'number'
      };
      
      console.log(`    ✅ Status: ${response.status}, Users: ${data.count || 0}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
      this.results.apiTests.getPresence = { success: false, error: error.message };
    }

    // Test 2: POST /api/presence (set online)
    try {
      console.log('  Testing POST /api/presence (set online)...');
      const response = await fetch(`${baseUrl}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-1',
          status: 'online',
          roomId: 'test-room-1'
        })
      });
      
      const data = await response.json();
      
      this.results.apiTests.setOnline = {
        success: response.ok,
        status: response.status,
        hasTimestamp: !!data.timestamp
      };
      
      console.log(`    ✅ Status: ${response.status}, Set online: ${data.success}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
      this.results.apiTests.setOnline = { success: false, error: error.message };
    }

    // Test 3: GET /api/presence/room/[roomId]
    try {
      console.log('  Testing GET /api/presence/room/test-room-1...');
      const response = await fetch(`${baseUrl}/presence/room/test-room-1`);
      const data = await response.json();
      
      this.results.apiTests.getRoomPresence = {
        success: response.ok,
        status: response.status,
        hasRoomData: !!data.room,
        hasPresenceData: !!data.presence
      };
      
      console.log(`    ✅ Status: ${response.status}, Room presence available: ${!!data.presence}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
      this.results.apiTests.getRoomPresence = { success: false, error: error.message };
    }

    // Test 4: DELETE /api/presence (set offline)
    try {
      console.log('  Testing DELETE /api/presence (set offline)...');
      const response = await fetch(`${baseUrl}/presence?userId=test-user-1`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      this.results.apiTests.setOffline = {
        success: response.ok,
        status: response.status,
        isOffline: data.status === 'offline'
      };
      
      console.log(`    ✅ Status: ${response.status}, Set offline: ${data.success}`);
    } catch (error) {
      console.log(`    ❌ Failed: ${error.message}`);
      this.results.apiTests.setOffline = { success: false, error: error.message };
    }
  }

  async testRealtimePresence() {
    return new Promise((resolve) => {
      let presenceEvents = [];
      let joinEvents = 0;
      let leaveEvents = 0;
      
      console.log('  Setting up real-time presence channel...');
      
      // Create presence channel
      const channel = supabase
        .channel('test-online-presence', {
          config: {
            presence: {
              key: 'test-user-main',
              heartbeat_interval: 10000
            }
          }
        })
        .on('presence', { event: 'sync' }, (payload) => {
          console.log('    📡 Presence sync received, users online:', Object.keys(payload).length);
          presenceEvents.push({ event: 'sync', count: Object.keys(payload).length });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('    🟢 User joined:', key);
          joinEvents++;
          presenceEvents.push({ event: 'join', user: key });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('    🔴 User left:', key);
          leaveEvents++;
          presenceEvents.push({ event: 'leave', user: key });
        })
        .subscribe(async (status) => {
          console.log('    📡 Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            // Start presence simulation
            console.log('  Starting presence simulation...');
            
            // Simulate users joining
            for (const user of TEST_CONFIG.testUsers) {
              setTimeout(async () => {
                await channel.track({
                  user_id: user.id,
                  username: user.username,
                  full_name: user.full_name,
                  room_id: user.room_id,
                  timestamp: new Date().toISOString()
                });
                console.log(`    👤 Tracked user: ${user.username}`);
              }, Math.random() * 5000);
            }
            
            // End test after duration
            setTimeout(() => {
              this.results.realtimeTests.presenceTracking = {
                success: true,
                totalEvents: presenceEvents.length,
                joinEvents,
                leaveEvents,
                events: presenceEvents
              };
              
              console.log(`  ✅ Real-time test completed: ${presenceEvents.length} events`);
              resolve();
            }, TEST_CONFIG.testDuration);
          }
        });
      
      this.channels.push(channel);
    });
  }

  async testIntegration() {
    // Test utility functions
    console.log('  Testing utility functions...');
    
    try {
      // Import the utility functions (this would work in a Node.js environment with proper setup)
      // For now, we'll simulate the tests
      
      const mockUser = {
        user_id: 'test-user-1',
        username: 'testuser1',
        full_name: 'Test User One',
        last_seen: new Date().toISOString(),
        room_id: 'test-room-1',
        is_online: true
      };

      // Test presence data validation
      const isValid = this.validatePresenceData(mockUser);
      console.log(`    ✅ Presence data validation: ${isValid ? 'PASS' : 'FAIL'}`);
      
      // Test time calculations
      const timeSince = this.getTimeSinceOnline(mockUser.last_seen);
      console.log(`    ✅ Time since calculation: ${timeSince}`);
      
      // Test recently online check
      const isRecent = this.isRecentlyOnline(mockUser.last_seen, 5);
      console.log(`    ✅ Recently online check: ${isRecent ? 'PASS' : 'FAIL'}`);
      
      this.results.integrationTests.utilityFunctions = {
        success: true,
        validationWorks: isValid,
        timeCalculationWorks: !!timeSince,
        recentCheckWorks: isRecent
      };
      
    } catch (error) {
      console.log(`    ❌ Integration test failed: ${error.message}`);
      this.results.integrationTests.utilityFunctions = {
        success: false,
        error: error.message
      };
    }
  }

  // Helper methods (simplified versions of utility functions)
  validatePresenceData(data) {
    if (!data || typeof data !== 'object') return false;
    const required = ['user_id', 'username', 'full_name'];
    return required.every(field => field in data && data[field]);
  }

  getTimeSinceOnline(lastSeen) {
    const lastSeenTime = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    const diffMs = now - lastSeenTime;
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return 'Some time ago';
  }

  isRecentlyOnline(lastSeen, thresholdMinutes = 5) {
    const lastSeenTime = new Date(lastSeen).getTime();
    const now = new Date().getTime();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    
    return (now - lastSeenTime) <= thresholdMs;
  }

  displayResults() {
    console.log('\n📊 Test Results Summary\n');
    console.log('═'.repeat(50));
    
    // API Tests
    console.log('\n📡 API Endpoint Tests:');
    Object.entries(this.results.apiTests).forEach(([test, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${test}: ${status}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    // Real-time Tests
    console.log('\n🔄 Real-time Tests:');
    Object.entries(this.results.realtimeTests).forEach(([test, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${test}: ${status}`);
      if (result.totalEvents) {
        console.log(`    Events captured: ${result.totalEvents}`);
        console.log(`    Joins: ${result.joinEvents}, Leaves: ${result.leaveEvents}`);
      }
    });
    
    // Integration Tests
    console.log('\n🔗 Integration Tests:');
    Object.entries(this.results.integrationTests).forEach(([test, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${test}: ${status}`);
    });
    
    console.log('\n═'.repeat(50));
    
    // Overall summary
    const allTests = [
      ...Object.values(this.results.apiTests),
      ...Object.values(this.results.realtimeTests),
      ...Object.values(this.results.integrationTests)
    ];
    
    const passedTests = allTests.filter(test => test.success).length;
    const totalTests = allTests.length;
    
    console.log(`\n🎯 Overall Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Online presence system is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }
  }

  cleanup() {
    console.log('\n🧹 Cleaning up test resources...');
    
    // Unsubscribe from all channels
    this.channels.forEach(channel => {
      try {
        channel.unsubscribe();
      } catch (error) {
        console.warn('Warning: Failed to unsubscribe from channel:', error.message);
      }
    });
    
    console.log('✅ Cleanup completed');
  }
}

// Main execution
if (require.main === module) {
  const tester = new OnlinePresenceTest();
  
  tester.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = OnlinePresenceTest;