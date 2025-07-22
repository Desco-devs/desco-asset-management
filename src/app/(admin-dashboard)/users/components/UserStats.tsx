'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, UsersApiResponse } from '@/types/users'

interface UserStatsProps {
  usersData: UsersApiResponse & { data: User[], originalTotal: number, originalData: User[] }
  currentUserId?: string
}

export function UserStats({ usersData, currentUserId }: UserStatsProps) {
  // Use original unfiltered data for stats (not affected by filters)
  const originalData = usersData.originalData || []
  const allUsersExceptCurrent = originalData.filter((u: User) => u.id !== currentUserId)
  
  const total = usersData.originalTotal || usersData.total
  const onlineCount = allUsersExceptCurrent.filter((u: User) => u.is_online).length
  const activeCount = allUsersExceptCurrent.filter((u: User) => u.user_status === 'ACTIVE').length
  const adminCount = allUsersExceptCurrent.filter((u: User) => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length

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