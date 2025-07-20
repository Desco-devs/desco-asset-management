import { prisma } from "@/lib/prisma";
import type {
  Client,
  Equipment,
  Location,
  Project,
} from "@/types/assets";
import { Metadata } from "next";
import EquipmentClientViewer from "./equipment-components/EquipmentClientViewer";

export const metadata: Metadata = {
  title: "Equipment Management | Desco",
  description: "View and manage equipment across projects",
};

const EquipmentPage = async () => {
  try {
    // Fetch initial data using Prisma singleton with proper connection handling
    const [
      equipmentData,
      clientsData,
      locationsData,
      projectsData,
      totalEquipmentCount,
    ] = await Promise.all([
      prisma.equipment.findMany({
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
        take: 12,
      }),
      prisma.client.findMany({
        include: {
          location: true,
        },
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.location.findMany({
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.project.findMany({
        include: {
          client: true,
        },
        orderBy: {
          created_at: "desc",
        },
      }),
      prisma.equipment.count(),
    ]);

    // Data fetched successfully from database

    // Serialize the equipment data (convert dates to strings)
    const serializedEquipment: Equipment[] = equipmentData.map((item) => ({
      uid: item.id,
      brand: item.brand,
      model: item.model,
      type: item.type,
      insuranceExpirationDate:
        item.insurance_expiration_date?.toISOString() || "",
      status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
      remarks: item.remarks || undefined,
      owner: item.owner,
      image_url: item.image_url || undefined,
      inspectionDate: item.inspection_date?.toISOString() || undefined,
      plateNumber: item.plate_number || undefined,
      originalReceiptUrl: item.original_receipt_url || undefined,
      equipmentRegistrationUrl: item.equipment_registration_url || undefined,
      thirdpartyInspectionImage: item.thirdparty_inspection_image || undefined,
      pgpcInspectionImage: item.pgpc_inspection_image || undefined,
      project: {
        uid: item.project.id,
        name: item.project.name,
        client: {
          uid: item.project.client.id,
          name: item.project.client.name,
          location: {
            uid: item.project.client.location.id,
            address: item.project.client.location.address,
          },
        },
      },
    }));

    const serializedClients: Client[] = clientsData.map((item) => ({
      uid: item.id,
      name: item.name,
      location: {
        uid: item.location.id,
        address: item.location.address,
      },
    }));

    const serializedLocations: Location[] = locationsData.map((item) => ({
      uid: item.id,
      address: item.address,
    }));

    const serializedProjects: Project[] = projectsData.map((item) => ({
      uid: item.id,
      name: item.name,
      client: {
        uid: item.client.id,
        name: item.client.name,
      },
    }));

    return (
      <div className="container mx-auto py-[5dvh] p-4">
        <EquipmentClientViewer
          initialEquipment={serializedEquipment}
          initialClients={serializedClients}
          initialLocations={serializedLocations}
          initialProjects={serializedProjects}
          totalEquipmentCount={totalEquipmentCount}
        />
      </div>
    );
  } catch (error) {
    console.error("Error fetching equipment data:", error);
    return (
      <div className="container mx-auto py-[5dvh] p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Equipment Management</h1>
          <p className="text-muted-foreground">
            Error loading equipment data. Please try again later.
          </p>
        </div>
      </div>
    );
  }
};

export default EquipmentPage;