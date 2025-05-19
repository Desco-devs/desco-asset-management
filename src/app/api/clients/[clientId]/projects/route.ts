import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET(_: Request, { params }: { params: { clientId: string } }) {
    try {
        const projects = await prisma.project.findMany({
            where: { clientId: params.clientId },
            orderBy: { createdAt: "desc" }
        })
        return NextResponse.json(projects)
    } catch (err) {
        console.error("GET /clients/[clientId]/projects error:", err)
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
    }
}
