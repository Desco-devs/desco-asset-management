/**
 * Test Script for Room Membership Real-time Updates
 * 
 * This script tests the real-time room membership updates
 * to ensure invitations properly update the UI.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testRoomMembershipRealtime() {
  console.log('🚀 Testing Room Membership Real-time Updates...\n')

  // Test 1: Listen to room membership channel
  console.log('1️⃣ Setting up real-time listener for room membership...')
  
  const channel = supabase
    .channel('room-membership-updates', {
      config: {
        broadcast: { self: true } // Allow self for testing
      }
    })
    .on('broadcast', { event: 'member_added' }, (payload) => {
      console.log('✅ Received member_added event:', payload.payload)
    })
    .on('broadcast', { event: 'member_removed' }, (payload) => {
      console.log('✅ Received member_removed event:', payload.payload)
    })
    .on('broadcast', { event: 'invitation_responded' }, (payload) => {
      console.log('✅ Received invitation_responded event:', payload.payload)
    })
    .subscribe((status) => {
      console.log('📡 Channel status:', status)
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to room membership channel\n')
        
        // Test 2: Send test member_added event
        setTimeout(() => {
          console.log('2️⃣ Sending test member_added event...')
          channel.send({
            type: 'broadcast',
            event: 'member_added',
            payload: {
              room_id: 'test-room-id',
              user_id: 'test-user-id',
              member: {
                id: 'test-user-id',
                username: 'testuser',
                full_name: 'Test User',
                user_profile: null
              }
            }
          })
        }, 2000)
        
        // Test 3: Send test invitation_responded event
        setTimeout(() => {
          console.log('3️⃣ Sending test invitation_responded event...')
          channel.send({
            type: 'broadcast',
            event: 'invitation_responded',
            payload: {
              invitation: { id: 'test-invitation-id' },
              status: 'ACCEPTED',
              room_id: 'test-room-id',
              invited_user: 'test-user-id'
            }
          })
        }, 4000)
        
        // Cleanup after tests
        setTimeout(() => {
          console.log('\n🧹 Cleaning up...')
          channel.unsubscribe()
          console.log('✅ Test completed successfully!')
          process.exit(0)
        }, 6000)
      }
    })
}

async function testInvitationChannel() {
  console.log('🚀 Testing Room Invitations Real-time Updates...\n')

  // Test invitation channel
  console.log('1️⃣ Setting up real-time listener for room invitations...')
  
  const channel = supabase
    .channel('room-invitations', {
      config: {
        broadcast: { self: true }
      }
    })
    .on('broadcast', { event: 'invitation_created' }, (payload) => {
      console.log('✅ Received invitation_created event:', payload.payload)
    })
    .on('broadcast', { event: 'invitation_responded' }, (payload) => {
      console.log('✅ Received invitation_responded event:', payload.payload)
    })
    .on('broadcast', { event: 'invitation_cancelled' }, (payload) => {
      console.log('✅ Received invitation_cancelled event:', payload.payload)
    })
    .subscribe((status) => {
      console.log('📡 Invitation channel status:', status)
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to invitations channel\n')
        
        setTimeout(() => {
          console.log('2️⃣ Sending test invitation_responded event...')
          channel.send({
            type: 'broadcast',
            event: 'invitation_responded',
            payload: {
              invitation: {
                id: 'test-invitation-id',
                invited_by: 'inviter-user-id',
                invited_user: 'invitee-user-id'
              },
              status: 'ACCEPTED',
              room_id: 'test-room-id',
              invited_user: 'invitee-user-id'
            }
          })
        }, 2000)
        
        setTimeout(() => {
          console.log('\n🧹 Cleaning up...')
          channel.unsubscribe()
          console.log('✅ Invitation test completed!')
        }, 4000)
      }
    })
}

// Run tests
async function runTests() {
  console.log('🧪 Running Real-time Room Membership Tests\n')
  console.log('=' * 50)
  
  try {
    await testRoomMembershipRealtime()
    
    setTimeout(async () => {
      console.log('\n' + '=' * 50)
      await testInvitationChannel()
    }, 8000)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

runTests()