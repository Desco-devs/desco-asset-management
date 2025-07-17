// This route is deprecated - authentication is now handled by Supabase Auth
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Authentication is now handled by Supabase Auth. Use the client-side signIn method.' },
    { status: 410 }
  )
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Authentication is now handled by Supabase Auth. Use the client-side signIn method.' },
    { status: 410 }
  )
}
