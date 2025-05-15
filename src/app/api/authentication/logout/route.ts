// /api/logout.ts (or .js depending on your setup)
import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set('desco_token', '', {
    path: '/',
    maxAge: 0, // deletes the cookie immediately
  })
  return response
}
