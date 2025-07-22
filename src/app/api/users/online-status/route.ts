import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

// POST: Update user online status
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { is_online } = await request.json()

    if (typeof is_online !== 'boolean') {
      return NextResponse.json(
        { error: "is_online must be a boolean" },
        { status: 400 }
      )
    }

    // Update user's online status and last_seen timestamp
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        is_online,
        last_seen: new Date(),
      },
      select: {
        id: true,
        is_online: true,
        last_seen: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating online status:', error)
    return NextResponse.json(
      { error: 'Failed to update online status' },
      { status: 500 }
    )
  }
}