'use client'

import React from 'react'
import { SessionGuard } from '../context/sessionGuardWrapper'



export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <SessionGuard>{children}</SessionGuard>
}
