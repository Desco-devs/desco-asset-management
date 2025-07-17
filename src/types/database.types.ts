export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          full_name: string
          phone: string | null
          user_profile: string | null
          role: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
          user_status: 'ACTIVE' | 'INACTIVE'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name: string
          phone?: string | null
          user_profile?: string | null
          role?: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
          user_status?: 'ACTIVE' | 'INACTIVE'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          phone?: string | null
          user_profile?: string | null
          role?: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
          user_status?: 'ACTIVE' | 'INACTIVE'
          created_at?: string
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          address: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          address: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          address?: string
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          location_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          client_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          client_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          client_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      Role: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
      user_status: 'ACTIVE' | 'INACTIVE'
      status: 'OPERATIONAL' | 'NON_OPERATIONAL'
      report_priority: 'LOW' | 'MEDIUM' | 'HIGH'
      report_status: 'REPORTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}