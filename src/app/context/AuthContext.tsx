'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { userStatus, Permission } from '@prisma/client'
export interface User {
  uid: string
  username: string
  fullname: string
  phone: string | null
  userProfile: string | null
  permissions: Permission[]
  userStatus: userStatus
  createdAt: string
  updatedAt: string
  iat: number
  exp: number
}

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  clearUser: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/session', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setUserState(data.user)
        } else {
          setUserState(null)
        }
      } catch {
        setUserState(null)
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [])

  const setUser = (u: User | null) => setUserState(u)
  const clearUser = () => setUserState(null)

  return (
    <AuthContext.Provider value={{ user, setUser, clearUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
