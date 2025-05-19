import { PrismaClient } from "@prisma/client"
import { NextResponse, NextRequest } from "next/server"

const prisma = new PrismaClient()

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await context.params

        const projects = await prisma.project.findMany({
            where: { clientId },
            orderBy: { createdAt: "desc" }
        })
        return NextResponse.json(projects)
    } catch (err) {
        console.error("GET /clients/[clientId]/projects error:", err)
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0