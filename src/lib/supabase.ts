import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

// Client-side supabase client for browser usage
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}