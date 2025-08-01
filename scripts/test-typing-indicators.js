#!/usr/bin/env node
/**
 * Test Script for Typing Indicators
 * 
 * This script tests the real-time typing indicators functionality
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

loadEnvFile();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('⌨️ Testing Typing Indicators...\n');

// Test: Listen to typing events
console.log('📡 Setting up typing indicators listener...');
const typingChannel = supabase
  .channel('chat-typing-global', {
    config: {
      broadcast: { self: false, ack: false }, // Don't receive our own broadcasts
      presence: { key: 'test-user-id' }
    }
  })
  .on('broadcast', { event: 'typing' }, (payload) => {
    const data = payload.payload;
    console.log('⌨️ Received typing event:', {
      type: data.type,
      room_id: data.room_id,
      user: data.user.full_name,
      timestamp: new Date().toISOString()
    });
  })
  .subscribe((status) => {
    console.log('📡 Typing channel status:', status);
  });

console.log('\n🎯 Listening for typing events...');
console.log('💡 To test:');
console.log('   1. Open the chat app in a browser');
console.log('   2. Start typing in a room');
console.log('   3. Watch for typing events in this console');
console.log('   4. Stop typing and watch for stop events');
console.log('\n⏳ Press Ctrl+C to stop...\n');

// Send test typing event after 5 seconds
setTimeout(() => {
  console.log('🧪 Sending test typing event...');
  
  const testPayload = {
    type: 'typing_start',
    room_id: 'test-room-id',
    user: {
      user_id: 'test-user-id',
      username: 'testuser',
      full_name: 'Test User',
      user_profile: null
    }
  };

  typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: testPayload
  }).then(() => {
    console.log('✅ Test typing event sent');
  }).catch(error => {
    console.error('❌ Failed to send test typing event:', error);
  });

  // Send stop event after 3 more seconds
  setTimeout(() => {
    const stopPayload = {
      ...testPayload,
      type: 'typing_stop'
    };

    typingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: stopPayload
    }).then(() => {
      console.log('✅ Test typing stop event sent');
    }).catch(error => {
      console.error('❌ Failed to send test typing stop event:', error);
    });
  }, 3000);
}, 5000);

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n🧹 Cleaning up typing channel...');
  typingChannel.unsubscribe();
  console.log('✅ Typing indicators test completed');
  process.exit(0);
});

// Keep alive
setInterval(() => {
  // Just keep the process alive
}, 1000);