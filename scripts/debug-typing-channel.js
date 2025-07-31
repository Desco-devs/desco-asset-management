#!/usr/bin/env node

/**
 * Debug script to test if typing channel works in isolation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 Debug: Testing typing channel connectivity...');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testTypingChannel() {
  console.log('📡 Creating typing channel...');
  
  const channel = supabase
    .channel('chat-typing', {
      config: {
        broadcast: { self: false, ack: false }
      }
    })
    .on('broadcast', { event: 'typing' }, (payload) => {
      console.log('✅ Received typing broadcast:', payload);
    })
    .subscribe((status) => {
      console.log('📡 Channel status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Channel subscribed successfully!');
        
        // Test sending a typing event
        setTimeout(() => {
          console.log('📤 Sending test typing event...');
          channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
              type: 'typing_start',
              room_id: 'test-room',
              user: {
                user_id: 'test-user',
                username: 'testuser',
                full_name: 'Test User',
                user_profile: null
              }
            }
          });
        }, 1000);
        
        // Stop after 5 seconds
        setTimeout(() => {
          console.log('🔚 Unsubscribing and exiting...');
          channel.unsubscribe();
          process.exit(0);
        }, 5000);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Channel error:', status);
        process.exit(1);
      }
    });
}

testTypingChannel().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});