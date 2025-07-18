// app/api/projects/[uid]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params;    // ← await params here
    const project = await prisma.project.findUnique({
      where: { id: uid },
      include: { client: true, equipments: true, vehicles: true },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(project);
  } catch (err) {
    console.error("GET /projects/[uid] error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const body = await request.json();
  const { name, clientId } = body;

  if (!name && !clientId) {
    return NextResponse.json(
      { error: "Nothing to update — provide name or clientId" },
      { status: 400 }
    );
  }

  try {
    const data: any = {};
    if (name)     data.name     = name.trim();
    if (clientId) data.client_id = clientId;

    const project = await prisma.project.update({
      where: { id: uid },
      data,
      include: { client: true, equipments: true, vehicles: true },
    });
    return NextResponse.json(project);
  } catch (err) {
    console.error("PATCH /projects/[uid] error:", err);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params;    // ← await params here
    await prisma.project.delete({ where: { id: uid } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE /projects/[uid] error:", err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
