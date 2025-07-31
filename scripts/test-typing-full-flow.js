#!/usr/bin/env node

/**
 * Test script for debugging typing indicators full flow
 * This simulates two users typing in a room to verify the system works
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (replace with your actual values)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mock users for testing
const mockUsers = [
  {
    user_id: 'user1',
    username: 'testuser1',
    full_name: 'Test User 1',
    user_profile: null
  },
  {
    user_id: 'user2', 
    username: 'testuser2',
    full_name: 'Test User 2',
    user_profile: null
  }
];

const TEST_ROOM_ID = 'test-room-123';

async function testTypingSystem() {
  console.log('🧪 Testing typing indicators system...');
  
  // Create channels for both users
  const user1Channel = supabase.channel('user1-typing', {
    config: {
      broadcast: { self: false, ack: false }
    }
  });

  const user2Channel = supabase.channel('user2-typing', {
    config: {
      broadcast: { self: false, ack: false }
    }
  });

  // Setup listeners
  user1Channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      console.log('👤 User 1 received typing event:', payload.payload);
    })
    .subscribe((status) => {
      console.log('👤 User 1 channel status:', status);
    });

  user2Channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      console.log('👤 User 2 received typing event:', payload.payload);
    })
    .subscribe((status) => {
      console.log('👤 User 2 channel status:', status);
    });

  // Wait for connections
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n📝 Testing User 2 starts typing...');
  
  // User 2 starts typing
  await user2Channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      type: 'typing_start',
      room_id: TEST_ROOM_ID,
      user: mockUsers[1]
    }
  });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n⏹️  Testing User 2 stops typing...');
  
  // User 2 stops typing
  await user2Channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      type: 'typing_stop',
      room_id: TEST_ROOM_ID,
      user: mockUsers[1]
    }
  });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n📝 Testing User 1 starts typing...');
  
  // User 1 starts typing
  await user1Channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      type: 'typing_start',
      room_id: TEST_ROOM_ID,
      user: mockUsers[0]
    }
  });

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n⏹️  Testing User 1 stops typing...');
  
  // User 1 stops typing
  await user1Channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: {
      type: 'typing_stop',
      room_id: TEST_ROOM_ID,
      user: mockUsers[0]
    }
  });

  // Wait and cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n🧹 Cleaning up channels...');
  user1Channel.unsubscribe();
  user2Channel.unsubscribe();
  
  console.log('✅ Test completed!');
}

// Run the test
testTypingSystem().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});