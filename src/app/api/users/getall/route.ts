// app/api/users/getall/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        user_profile: true,
        role: true,
        user_status: true,
        is_online: true,
        last_seen: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Fetch email data from Supabase Auth for each user
    const { createServiceRoleClient } = await import('@/lib/supabase-server')
    const supabaseAdmin = createServiceRoleClient()
    
    // Add email to each user from Supabase Auth
    const usersWithEmail = await Promise.all(
      users.map(async (user: any) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
          return {
            ...user,
            email: authUser.user?.email || null
          }
        } catch (error) {
          console.warn(`Failed to fetch email for user ${user.id}:`, error)
          return {
            ...user,
            email: null
          }
        }
      })
    )

    return NextResponse.json({ users: usersWithEmail });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}