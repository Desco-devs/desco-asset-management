// app/api/locations/[locationId]/clients/route.ts
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET(_: Request, { params }: { params: { locationId: string } }) {
    try {
        const clients = await prisma.client.findMany({
            where: { locationId: params.locationId },
            orderBy: { createdAt: "desc" },
        })
        return NextResponse.json(clients)
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
    }
}
