// app/api/projects/[uid]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    if (name) data.name = name.trim();
    if (clientId) data.client_id = clientId;

    const project = await prisma.project.update({
      where: { id: uid },
      data,
      include: { client: true, equipments: true, vehicles: true },
    });
    return NextResponse.json(project);
  } catch (err: unknown) {
    // Check if it's a validation error that shouldn't be logged
    const isValidationError = err instanceof Error && 'code' in err && 
                             (err.code === 'P2002' || err.code === 'P2025')
    
    if (!isValidationError) {
      // Only log actual server errors, not validation errors
      console.error("PATCH /projects/[uid] error:", err);
    }
    
    if (err instanceof Error && 'code' in err) {
      if (err.code === 'P2002') {
        return NextResponse.json(
          { error: "Project with this name already exists for this client" },
          { status: 400 }
        );
      }
      if (err.code === 'P2025') {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }
    
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
  } catch (err: unknown) {
    // Check if it's a validation error that shouldn't be logged
    const isValidationError = err instanceof Error && 'code' in err && err.code === 'P2025'
    
    if (!isValidationError) {
      // Only log actual server errors, not validation errors
      console.error("DELETE /projects/[uid] error:", err);
    }
    
    if (err instanceof Error && 'code' in err && err.code === 'P2025') {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
