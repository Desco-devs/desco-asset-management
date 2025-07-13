import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { Permission, userStatus } from '@prisma/client'
const JWT_SECRET = process.env.JWT_SECRET!
const TOKEN_NAME = 'desco_token'

interface JwtPayload {
    uid: string;
    username: string;
    password: string;
    fullname: string;
    phone: string | null;
    permissions: Permission[];
    userStatus: userStatus;
    createdAt: Date;
    updatedAt: Date;
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_NAME)?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let payload: JwtPayload
    try {
      payload = jwt.verify(token, JWT_SECRET) as JwtPayload
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // payload now contains your safeUser + iat/exp
    return NextResponse.json({ user: payload }, { status: 200 })
  } catch (err) {
    console.error('[/api/session] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
