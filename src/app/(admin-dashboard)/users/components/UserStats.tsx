'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Users, UserCheck, Shield, Globe } from 'lucide-react'
import { User, UsersApiResponse } from '@/types/users'

interface UserStatsProps {
  usersData: UsersApiResponse & { data: User[], originalTotal: number, originalData: User[] }
  currentUserId?: string
}

export function UserStats({ usersData, currentUserId }: UserStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Use original unfiltered data for stats (not affected by filters)
  const originalData = usersData.originalData || []
  const allUsersExceptCurrent = originalData.filter((u: User) => u.id !== currentUserId)
  
  const total = usersData.originalTotal || usersData.total
  const onlineCount = allUsersExceptCurrent.filter((u: User) => u.is_online).length
  const activeCount = allUsersExceptCurrent.filter((u: User) => u.user_status === 'ACTIVE').length
  const adminCount = allUsersExceptCurrent.filter((u: User) => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length

  const stats = [
    { label: 'Total Users', value: total, icon: Users, color: 'text-gray-600' },
    { label: 'Online Users', value: onlineCount, icon: Globe, color: 'text-green-600' },
    { label: 'Active Users', value: activeCount, icon: UserCheck, color: 'text-blue-600' },
    { label: 'Admins', value: adminCount, icon: Shield, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-3">
      {/* Mobile: Collapsible Stats */}
      <div className="md:hidden">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">User Overview</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
            {/* Quick summary when collapsed */}
            {!isExpanded && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {total} Total
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-green-600" />
                  {onlineCount} Online
                </span>
              </div>
            )}
          </CardHeader>
          
          {isExpanded && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center space-x-2">
                    <stat.icon className={`h-3 w-3 ${stat.color}`} />
                    <div>
                      <div className={`text-sm font-bold ${stat.color}`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Desktop: Original Grid Layout */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <stat.icon className="h-4 w-4" />
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}