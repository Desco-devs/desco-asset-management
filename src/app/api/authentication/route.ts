//app/api/authentication/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!
const TOKEN_NAME = 'desco_token'

export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Use POST to /api/authentication.' },
    { status: 405 }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

      if (user.userStatus !== 'ACTIVE') {
      return NextResponse.json({ error: 'User status is no longer Active' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 })
    }

    // strip out the password field by discarding it as `_`
    const { password: _, ...safeUser } = user

    // sign a JWT with the user data
    const token = jwt.sign(
      { ...safeUser },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    // respond and set the JWT as an HttpOnly cookie
    const response = NextResponse.json({ user: safeUser }, { status: 200 })
    response.cookies.set(TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (err) {
    console.error('[/api/authentication] error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
