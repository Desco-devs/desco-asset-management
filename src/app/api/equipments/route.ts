// File: app/api/equipments/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient, Status as EquipmentStatus } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Helper to extract storage path from a Supabase URL
const extractFilePathFromUrl = (fileUrl: string): string | null => {
  try {
    const url = new URL(fileUrl)
    const parts = url.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex(p => p === 'equipments')
    if (idx !== -1 && idx < parts.length - 1) {
      return parts.slice(idx + 1).join('/')
    }
    return null
  } catch (err) {
    console.error('extractFilePath error:', err)
    return null
  }
}

// Delete a file from Supabase storage
const deleteFileFromSupabase = async (fileUrl: string, tag: string): Promise<void> => {
  const path = extractFilePathFromUrl(fileUrl)
  if (!path) throw new Error(`Cannot parse path for ${tag}`)
  const { error } = await supabase.storage.from('equipments').remove([path])
  if (error) throw error
}

// Upload a file to Supabase storage
const uploadFileToSupabase = async (
  file: File,
  projectId: string,
  equipmentId: string,
  prefix: string
): Promise<{ field: string; url: string }> => {
  const timestamp = Date.now()
  const ext = file.name.split('.').pop()
  const filename = `${prefix}_${timestamp}.${ext}`
  const filepath = `${projectId}/${equipmentId}/${filename}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('equipments')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false })

  if (uploadErr || !uploadData) {
    throw new Error(`Upload ${prefix} failed: ${uploadErr?.message}`)
  }

  const { data: urlData } = supabase
    .storage
    .from('equipments')
    .getPublicUrl(uploadData.path)

  return { field: getFieldName(prefix), url: urlData.publicUrl }
}

// Map file-prefix to Prisma field name
const getFieldName = (prefix: string): string => {
  switch (prefix) {
    case 'image':               return 'image_url'
    case 'receipt':             return 'originalReceiptUrl'
    case 'registration':        return 'equipmentRegistrationUrl'
    case 'thirdparty_inspection': return 'thirdpartyInspectionImage'
    case 'pgpc_inspection':     return 'pgpcInspectionImage'
    default: throw new Error(`Unknown prefix: ${prefix}`)
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const brand   = formData.get('brand')   as string
    const model   = formData.get('model')   as string
    const type    = formData.get('type')    as string
    const insExp  = formData.get('insuranceExpirationDate') as string
    const status  = formData.get('status')  as keyof typeof EquipmentStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner   = formData.get('owner')   as string
    const projectId = formData.get('projectId') as string

    // Dates & plate:
    const inspDateStr = formData.get('inspectionDate') as string | null
    const plateNum    = (formData.get('plateNumber') as string) || null

    // BEFORE field as string
    const rawBefore = formData.get('before')
    const beforeStr = typeof rawBefore === 'string' ? rawBefore : ''

    if (!brand || !model || !type || !insExp || !owner || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1) create record without files
    const createData: any = {
      brand,
      model,
      type,
      insuranceExpirationDate: new Date(insExp),
      status,
      remarks,
      owner,
      plateNumber: plateNum,
      project: { connect: { uid: projectId } },
      // only include `before` if provided
      ...(beforeStr !== '' ? { before: parseInt(beforeStr, 10) } : {})
    }

    if (inspDateStr) {
      createData.inspectionDate = new Date(inspDateStr)
    }

    const equipment = await prisma.equipment.create({ data: createData })

    // 2) handle file uploads
    const fileJobs = [
      { file: formData.get('image') as File | null, prefix: 'image' },
      { file: formData.get('originalReceipt') as File | null, prefix: 'receipt' },
      { file: formData.get('equipmentRegistration') as File | null, prefix: 'registration' },
      { file: formData.get('thirdpartyInspection') as File | null, prefix: 'thirdparty_inspection' },
      { file: formData.get('pgpcInspection') as File | null, prefix: 'pgpc_inspection' },
    ]
      .filter(f => f.file && f.file.size > 0)
      .map(f => uploadFileToSupabase(f.file!, projectId, equipment.uid, f.prefix))

    if (fileJobs.length) {
      try {
        const uploads = await Promise.all(fileJobs)
        const updateFiles: any = {}
        uploads.forEach(u => { updateFiles[u.field] = u.url })
        await prisma.equipment.update({ where: { uid: equipment.uid }, data: updateFiles })
      } catch (e) {
        console.error('Upload error:', e)
        await prisma.equipment.delete({ where: { uid: equipment.uid } })
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
      }
    }

    const result = await prisma.equipment.findUnique({ where: { uid: equipment.uid } })
    return NextResponse.json(result)
  } catch (err) {
    console.error('POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()

    const equipmentId = formData.get('equipmentId') as string
    const brand   = formData.get('brand')   as string
    const model   = formData.get('model')   as string
    const type    = formData.get('type')    as string
    const insExp  = formData.get('insuranceExpirationDate') as string
    const status  = formData.get('status')  as keyof typeof EquipmentStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner   = formData.get('owner')   as string
    const projectId = formData.get('projectId') as string

    const inspDateStr = formData.get('inspectionDate') as string | null
    const plateNum    = (formData.get('plateNumber') as string) || null

    // BEFORE field
    const rawBefore = formData.get('before')
    const beforeStr = typeof rawBefore === 'string' ? rawBefore : ''

    if (!equipmentId || !brand || !model || !type || !insExp || !owner || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.equipment.findUnique({ where: { uid: equipmentId } })
    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // build update data
    const updateData: any = {
      brand,
      model,
      type,
      insuranceExpirationDate: new Date(insExp),
      status,
      remarks,
      owner,
      plateNumber: plateNum,
      before: beforeStr !== '' ? parseInt(beforeStr, 10) : null,
      project: { connect: { uid: projectId } },
    }

    if (inspDateStr) {
      updateData.inspectionDate = new Date(inspDateStr)
    } else {
      updateData.inspectionDate = null
    }

    // files config
    const configs = [
      {
        newFile: formData.get('image') as File | null,
        keep: formData.get('keepExistingImage') as string,
        existingUrl: existing.image_url,
        prefix: 'image', field: 'image_url', tag: 'image'
      },
      {
        newFile: formData.get('originalReceipt') as File | null,
        keep: formData.get('keepExistingReceipt') as string,
        existingUrl: existing.originalReceiptUrl,
        prefix: 'receipt', field: 'originalReceiptUrl', tag: 'receipt'
      },
      {
        newFile: formData.get('equipmentRegistration') as File | null,
        keep: formData.get('keepExistingRegistration') as string,
        existingUrl: existing.equipmentRegistrationUrl,
        prefix: 'registration', field: 'equipmentRegistrationUrl', tag: 'registration'
      },
      {
        newFile: formData.get('thirdpartyInspection') as File | null,
        keep: formData.get('keepExistingThirdpartyInspection') as string,
        existingUrl: existing.thirdpartyInspectionImage,
        prefix: 'thirdparty_inspection', field: 'thirdpartyInspectionImage', tag: '3rd-party inspection'
      },
      {
        newFile: formData.get('pgpcInspection') as File | null,
        keep: formData.get('keepExistingPgpcInspection') as string,
        existingUrl: existing.pgpcInspectionImage,
        prefix: 'pgpc_inspection', field: 'pgpcInspectionImage', tag: 'PGPC inspection'
      },
    ]

    const fileJobs: Promise<{ field: string; url: string }>[] = []

    for (const cfg of configs) {
      if (cfg.newFile && cfg.newFile.size > 0) {
        // delete old if exists
        if (cfg.existingUrl) {
          await deleteFileFromSupabase(cfg.existingUrl, cfg.tag)
        }
        fileJobs.push(uploadFileToSupabase(cfg.newFile, projectId, equipmentId, cfg.prefix))
      } else if (cfg.keep !== 'true') {
        // user removed it
        if (cfg.existingUrl) {
          await deleteFileFromSupabase(cfg.existingUrl, cfg.tag)
        }
        updateData[cfg.field] = null
      }
    }

    if (fileJobs.length) {
      try {
        const ups = await Promise.all(fileJobs)
        ups.forEach(u => { updateData[u.field] = u.url })
      } catch (e) {
        console.error('PUT upload error:', e)
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
      }
    }

    const updated = await prisma.equipment.update({
      where: { uid: equipmentId },
      data: updateData,
    })

    const result = await prisma.equipment.findUnique({
      where: { uid: updated.uid },
      include: {
        project: {
          include: { client: { include: { location: true } } }
        }
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('PUT error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const equipmentId = url.searchParams.get('equipmentId')
    if (!equipmentId) {
      return NextResponse.json({ error: 'equipmentId required' }, { status: 400 })
    }

    const existing = await prisma.equipment.findUnique({
      where: { uid: equipmentId },
      include: { project: true }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const projectId = existing.projectId
    await prisma.equipment.delete({ where: { uid: equipmentId } })

    // delete all files in folder
    const folder = `${projectId}/${equipmentId}`
    const { data: files } = await supabase.storage.from('equipments').list(folder)
    if (files?.length) {
      const paths = files
        .filter(f => f.name !== '.emptyFolderPlaceholder')
        .map(f => `${folder}/${f.name}`)
      await supabase.storage.from('equipments').remove(paths)
    }

    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    console.error('DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
