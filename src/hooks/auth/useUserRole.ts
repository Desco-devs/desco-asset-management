import { useEffect, useState } from 'react'
import { UserRole } from '@/types/auth'
import { createClient } from '@/lib/supabase'

export function useUserRole() {
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()
          
          if (userData) {
            setUserRole(userData.role)
            setUserId(session.user.id)
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRole()
  }, [])

  return { userRole, userId, isLoading }
}