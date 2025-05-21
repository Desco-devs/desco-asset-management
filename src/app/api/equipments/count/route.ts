import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
    const equipmentCounts = await prisma.equipment.groupBy({
        by: ["status"],
        _count: { status: true },
    })

    const equipments = {
        OPERATIONAL: 0,
        NON_OPERATIONAL: 0,
    }

    equipmentCounts.forEach((item) => {
        equipments[item.status] = item._count.status
    })

    return NextResponse.json(equipments)
}
