import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET(
    _: Request,
    context: { params: Promise<{ locationId: string }> }
) {
    try {
        const { locationId } = await context.params

        const clients = await prisma.client.findMany({
            where: { locationId },
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(clients)
    } catch (error) {
        console.error("GET /locations/[locationId]/clients error:", error)
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
    }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0