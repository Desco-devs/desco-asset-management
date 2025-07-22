import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Fetch all reference data in parallel
    const [projects, clients, locations, users, maintenanceReports] = await Promise.all([
      prisma.project.findMany({
        include: {
          client: true,
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.client.findMany({
        include: {
          location: true,
        },
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.location.findMany({
        orderBy: {
          address: 'asc'
        }
      }),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          full_name: true,
          role: true
        },
        orderBy: {
          full_name: 'asc'
        }
      }),
      prisma.maintenance_vehicle_report.findMany({
        select: {
          id: true,
          vehicle_id: true,
          status: true,
          created_at: true
        },
        orderBy: {
          created_at: 'desc'
        }
      })
    ]);

    return NextResponse.json({
      projects,
      clients,
      locations,
      users,
      maintenanceReports,
    });
  } catch (error) {
    console.error("Error fetching vehicles reference data:", error);
    
    return NextResponse.json({
      projects: [],
      clients: [],
      locations: [],
      users: [],
      maintenanceReports: [],
    });
  }
}