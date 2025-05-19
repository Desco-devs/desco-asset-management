import { NextResponse } from "next/server"
import { PrismaClient, Status } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(
    request: Request,
    { params }: { params: { projectId: string } }
) {
    try {
        const { projectId } = params
        const body = await request.json()

        const {
            brand,
            model,
            type,
            plateNumber,
            inspectionDate,
            before,
            expiryDate,
            status,
            remarks,
            owner,
            frontImgUrl,
            backImgUrl,
            side1ImgUrl,
            side2ImgUrl,
        } = body

        if (!brand || !model || !plateNumber || !status) {
            return NextResponse.json(
                { error: "Brand, model, plateNumber, and status are required" },
                { status: 400 }
            )
        }

        if (!["OPERATIONAL", "NON_OPERATIONAL"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status value" },
                { status: 400 }
            )
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                projectId,
                brand,
                model,
                type: type || "",
                plateNumber,
                inspectionDate: inspectionDate ? new Date(inspectionDate) : new Date(),
                before: before ?? 0,
                expiryDate: expiryDate ? new Date(expiryDate) : new Date(),
                status: status as Status,
                remarks,
                owner,
                frontImgUrl,
                backImgUrl,
                side1ImgUrl,
                side2ImgUrl,
            },
        })

        return NextResponse.json(vehicle)
    } catch (error) {
        console.error("Error creating vehicle:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
