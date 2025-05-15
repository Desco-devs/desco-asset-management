// src/app/ClientProviders.tsx  (client component)

'use client'

import { ReactNode } from 'react'
import { AuthProvider } from './context/AuthContext'  // adjust path

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
