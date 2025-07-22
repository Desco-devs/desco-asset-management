'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User } from '@/types/users'

interface UserStatsProps {
  users: User[]
  total: number
}

export function UserStats({ users, total }: UserStatsProps) {
  const onlineCount = users.filter(u => u.is_online).length
  const activeCount = users.filter(u => u.user_status === 'ACTIVE').length
  const adminCount = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Online Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Admins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{adminCount}</div>
        </CardContent>
      </Card>
    </div>
  )
}