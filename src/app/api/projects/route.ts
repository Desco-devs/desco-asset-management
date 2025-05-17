// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");

  // list by clientId if provided
  if (clientId) {
    const projects = await prisma.project.findMany({
      where: { clientId },
      include: { client: true, equipments: true, vehicles: true },
    });
    return NextResponse.json(projects);
  }

  // otherwise list all
  const all = await prisma.project.findMany({
    include: { client: true, equipments: true, vehicles: true },
  });
  return NextResponse.json(all);
}

export async function POST(request: Request) {
  const { name, clientId } = await request.json();
  if (!name?.trim() || !clientId) {
    return NextResponse.json(
      { error: "Missing name or clientId" },
      { status: 400 }
    );
  }

  try {
    const project = await prisma.project.create({
      data: { name: name.trim(), clientId },
      include: { client: true, equipments: true, vehicles: true },
    });
    return NextResponse.json(project);
  } catch (err) {
    console.error("POST /api/projects error:", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
