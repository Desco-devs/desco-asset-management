// File: app/api/equipments/[uid]/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
)

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    // 0) await your params promise
    const { uid } = await context.params

    // 1) find the equipment record
    const equipment = await prisma.equipment.findUnique({
      where: { uid }
    })
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // 2) remove the image from Supabase storage
    if (equipment.image_url) {
      const match = equipment.image_url.match(/\/public\/equipments\/(.+)$/)
      if (match) {
        const fullPath = match[1]  // e.g. "projectId/uid/filename.ext"
        console.log('[DELETE] removing from bucket:', fullPath)

        const { error: removeError } = await supabase
          .storage
          .from('equipments')
          .remove([fullPath])

        if (removeError) {
          console.error('Supabase remove error:', removeError)
          // optionally bail out here if you want:
          // return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
        }
      } else {
        console.warn('[DELETE] couldn’t parse image_url:', equipment.image_url)
      }
    }

    // 3) delete the equipment record in your database
    await prisma.equipment.delete({ where: { uid } })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (err) {
    console.error(`DELETE /api/equipments/${(await context.params).uid} error:`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
