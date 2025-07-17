// This route is deprecated - logout is now handled by Supabase Auth
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Logout is now handled by Supabase Auth. Use the client-side signOut method.' },
    { status: 410 }
  )
}
