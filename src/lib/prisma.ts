import { PrismaClient } from "@prisma/client"
import { createClient } from "@supabase/supabase-js"

export const prisma = new PrismaClient()

// Server-side supabase client for file storage operations
export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
)
