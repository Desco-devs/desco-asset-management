#!/usr/bin/env node
/**
 * Test Script for Room Real-time Functionality
 * 
 * This script tests the real-time room membership updates
 * to ensure invitations work properly.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 Testing Room Real-time Functionality...\n');

// Test 1: Listen to chat-rooms channel
console.log('📡 Setting up chat-rooms channel listener...');
const chatRoomsChannel = supabase
  .channel('chat-rooms')
  .on('broadcast', { event: 'member_added' }, (payload) => {
    console.log('✅ Received member_added event:', {
      room_id: payload.payload.room_id,
      user_id: payload.payload.user_id,
      member_name: payload.payload.member?.full_name
    });
  })
  .on('broadcast', { event: 'invitation_responded' }, (payload) => {
    console.log('✅ Received invitation_responded event:', {
      status: payload.payload.status,
      room_id: payload.payload.room_id,
      invited_user: payload.payload.invited_user
    });
  })
  .subscribe((status) => {
    console.log('📡 Chat-rooms channel status:', status);
  });

// Test 2: Listen to room-invitations channel
console.log('📡 Setting up room-invitations channel listener...');
const invitationsChannel = supabase
  .channel('room-invitations')
  .on('broadcast', { event: 'invitation_responded' }, (payload) => {
    console.log('✅ Received invitation response on invitations channel:', {
      status: payload.payload.status,
      room_id: payload.payload.room_id,
      invited_user: payload.payload.invited_user
    });
  })
  .subscribe((status) => {
    console.log('📡 Room-invitations channel status:', status);
  });

// Test 3: Listen to room-membership-updates channel
console.log('📡 Setting up room-membership-updates channel listener...');
const membershipChannel = supabase
  .channel('room-membership-updates')
  .on('broadcast', { event: 'member_added' }, (payload) => {
    console.log('✅ Received member_added on membership channel:', {
      room_id: payload.payload.room_id,
      user_id: payload.payload.user_id,
    });
  })
  .subscribe((status) => {
    console.log('📡 Room-membership channel status:', status);
  });

console.log('\n🎯 Listening for real-time events...');
console.log('💡 To test:');
console.log('   1. Open the app in a browser');
console.log('   2. Send a room invitation');
console.log('   3. Accept the invitation');
console.log('   4. Watch for events in this console');
console.log('\n⏳ Press Ctrl+C to stop...\n');

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n🧹 Cleaning up channels...');
  chatRoomsChannel.unsubscribe();
  invitationsChannel.unsubscribe();
  membershipChannel.unsubscribe();
  console.log('✅ Test completed');
  process.exit(0);
});

// Keep alive
setInterval(() => {
  // Just keep the process alive
}, 1000);