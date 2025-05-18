import { NextResponse } from 'next/server'
import { PrismaClient, Status as EquipmentStatus } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
)

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const type = formData.get('type') as string
    const expirationDate = formData.get('expirationDate') as string
    const status = formData.get('status') as keyof typeof EquipmentStatus
    const remarks = formData.get('remarks') as string | null
    const owner = formData.get('owner') as string
    const projectId = formData.get('projectId') as string
    const inspectionDateStr = formData.get('inspectionDate') as string | null
    const imageFile = formData.get('image') as File

    if (!imageFile || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1) create equipment record without image_url
    const createData: any = {
      brand,
      model,
      type,
      expirationDate: new Date(expirationDate),
      status,
      remarks,
      owner,
      project: { connect: { uid: projectId } }
    }
    if (inspectionDateStr) {
      createData.inspectionDate = new Date(inspectionDateStr)
    }

    const equipment = await prisma.equipment.create({
      data: createData
    })

    // 2) upload image under `{projectId}/{equipment.uid}/{filename}`
    const timestamp = Date.now()
    const fileName = `${timestamp}_${imageFile.name}`
    const filePath = `${projectId}/${equipment.uid}/${fileName}`
    const buffer = Buffer.from(await imageFile.arrayBuffer())

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('equipments')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError || !uploadData) {
      console.error('Supabase upload error:', uploadError)
      // rollback record if you wish
      await prisma.equipment.delete({ where: { uid: equipment.uid } })
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
    }

    // 3) get public URL and update the record
    const { data: urlData } = supabase
      .storage
      .from('equipments')
      .getPublicUrl(uploadData.path)

    const updated = await prisma.equipment.update({
      where: { uid: equipment.uid },
      data: { image_url: urlData.publicUrl }
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('POST /api/equipments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
