import { PrismaClient, Permission } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

// Manually define user status enum as in your Prisma schema
enum UserStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

// Define the expected shape of the POST request body
interface CreateUserBody {
  username: string
  password: string
  fullname: string
  phone?: string
  permissions?: Permission[]
  userStatus?: keyof typeof UserStatusEnum | string
}

const prisma = new PrismaClient()

// GET: View all users
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        uid: true,
        username: true,
        fullname: true,
        phone: true,
        permissions: true,
        userStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(users)
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateUserBody
    const { username, password, fullname, phone, permissions, userStatus } = body

    // Input validation
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required and must be a string' }, { status: 400 })
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required and must be a string' }, { status: 400 })
    }
    if (!fullname || typeof fullname !== 'string') {
      return NextResponse.json({ error: 'Fullname is required and must be a string' }, { status: 400 })
    }
    if (phone && typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone must be a string' }, { status: 400 })
    }
    if (permissions && !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 })
    }
    if (userStatus && !Object.values(UserStatusEnum).includes(userStatus as UserStatusEnum)) {
      return NextResponse.json({ error: 'Invalid user status' }, { status: 400 })
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullname,
        phone: phone || null,
        permissions: permissions || [],
        userStatus: (userStatus as UserStatusEnum) || UserStatusEnum.ACTIVE,
      },
      select: {
        uid: true,
        username: true,
        fullname: true,
        phone: true,
        permissions: true,
        userStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
