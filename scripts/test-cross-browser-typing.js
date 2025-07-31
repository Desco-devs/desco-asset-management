#!/usr/bin/env node

/**
 * Script to simulate typing from a different user to test cross-browser typing indicators
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually from .env file
const fs = require('fs');
const path = require('path');

let SUPABASE_URL, SUPABASE_ANON_KEY;

try {
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  for (const line of envLines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      SUPABASE_ANON_KEY = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  }
} catch (error) {
  console.error('Error reading .env file:', error.message);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simulate a different user (admin2)
const mockUser = {
  user_id: 'cb99c98a-ac15-4cae-b7b0-e249e9d37fff', // admin2's ID from the database
  username: 'admin2',
  full_name: 'admin2',
  user_profile: null
};

const TEST_ROOM_ID = 'f2bf434a-e94c-4181-96a6-f0832bc087c2'; // The "hello" room ID

async function simulateTyping() {
  console.log('🤖 Starting typing simulation for user:', mockUser.full_name);
  console.log('📍 Room ID:', TEST_ROOM_ID);
  
  // Create the same global channel that the app uses
  const channel = supabase
    .channel('chat-typing-global', {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: mockUser.user_id },
        heartbeat_interval: 15000,
        timeout: 30000
      }
    })
    .on('broadcast', { event: 'typing' }, (payload) => {
      console.log('📨 Received typing broadcast:', payload.payload);
    })
    .subscribe((status) => {
      console.log('📡 Channel status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Connected! Starting typing simulation...');
        startTypingSequence();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Channel error:', status);
        process.exit(1);
      }
    });

  function startTypingSequence() {
    console.log('\n🔤 Step 1: Sending typing_start event...');
    
    // Send typing start
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        type: 'typing_start',
        room_id: TEST_ROOM_ID,
        user: mockUser
      }
    }).then(() => {
      console.log('✅ typing_start sent successfully');
    }).catch(error => {
      console.error('❌ Failed to send typing_start:', error);
    });

    // Keep typing for 5 seconds, then stop
    setTimeout(() => {
      console.log('\n🛑 Step 2: Sending typing_stop event...');
      
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          type: 'typing_stop',
          room_id: TEST_ROOM_ID,
          user: mockUser
        }
      }).then(() => {
        console.log('✅ typing_stop sent successfully');
        
        // Wait a bit then exit
        setTimeout(() => {
          console.log('\n🏁 Simulation complete! Cleaning up...');
          channel.unsubscribe();
          process.exit(0);
        }, 2000);
      }).catch(error => {
        console.error('❌ Failed to send typing_stop:', error);
        process.exit(1);
      });
    }, 5000);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🔚 Received SIGINT, cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔚 Received SIGTERM, cleaning up...');
  process.exit(0);
});

// Start the simulation
simulateTyping().catch(error => {
  console.error('❌ Simulation failed:', error);
  process.exit(1);
});