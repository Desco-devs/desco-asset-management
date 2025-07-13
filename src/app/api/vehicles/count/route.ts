import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
    const vehicleCounts = await prisma.vehicle.groupBy({
        by: ["status"],
        _count: { status: true },
    })

    const vehicles = {
        OPERATIONAL: 0,
        NON_OPERATIONAL: 0,
    }

    vehicleCounts.forEach((item) => {
        vehicles[item.status] = item._count.status
    })

    return NextResponse.json(vehicles)
}
