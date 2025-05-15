import { User } from '@/app/context/AuthContext'
import { NextResponse } from 'next/server';

export async function login({ username, password }: { username: string; password: string }) {
  const res = await fetch('/api/authentication', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login failed')
  return data.user as User
}

export async function checkSession(
  setUser: (user: User | null) => void,
  clearUser: () => void
) {
  const res = await fetch('/api/session', { cache: 'no-store' })
  if (res.ok) {
    const { user } = (await res.json()) as { user: User }
    setUser(user)
    return user
  } else {
    clearUser()
    return null
  }
}


    export function logout() {
    const response = NextResponse.json({ success: true })
    response.cookies.set('desco_token', '', {
        path: '/',
        maxAge: 0, // deletes the cookie immediately
    })
    return response
    }