import { prisma } from "@/lib/prisma";
import type {
  Client,
  Equipment,
  Location,
  Project,
  Vehicle,
} from "@/types/assets";
import { Metadata } from "next";
import AssetsClientViewer from "./AssetsClientViewer";
import AssetsHeader from "./asset-components/AssetsHeader";

export const metadata: Metadata = {
  title: "Assets Viewer | Desco",
  description: "View and manage equipment and vehicles",
};

const AssetsPage = async () => {
  try {
    // Fetch initial data using Prisma singleton with proper connection handling
    const [
      equipmentData,
      vehicleData,
      clientsData,
      locationsData,
      projectsData,
      totalEquipmentCount,
      totalVehicleCount,
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
      prisma.vehicle.findMany({
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
      prisma.vehicle.count(),
    ]);

    // Data fetched successfully from database

    // Serialize the data (convert dates to strings)
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

    const serializedVehicles: Vehicle[] = vehicleData.map((item) => ({
      uid: item.id,
      brand: item.brand,
      model: item.model,
      type: item.type,
      plateNumber: item.plate_number,
      inspectionDate: item.inspection_date?.toISOString() || "",
      before: item.before,
      expiryDate: item.expiry_date?.toISOString() || "",
      status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
      remarks: item.remarks || undefined,
      owner: item.owner,
      frontImgUrl: item.front_img_url || undefined,
      backImgUrl: item.back_img_url || undefined,
      side1ImgUrl: item.side1_img_url || undefined,
      side2ImgUrl: item.side2_img_url || undefined,
      originalReceiptUrl: item.original_receipt_url || undefined,
      carRegistrationUrl: item.car_registration_url || undefined,
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
      <>
        <AssetsHeader />

        {/* Main Content */}
        <div className="container mx-auto py-6">
          <AssetsClientViewer
            initialEquipment={serializedEquipment}
            initialVehicles={serializedVehicles}
            initialClients={serializedClients}
            initialLocations={serializedLocations}
            initialProjects={serializedProjects}
            totalEquipmentCount={totalEquipmentCount}
            totalVehicleCount={totalVehicleCount}
          />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error fetching assets data:", error);
    return (
      <>
        <AssetsHeader />

        <div className="container mx-auto py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Assets Viewer</h1>
            <p className="text-muted-foreground">
              Error loading assets data. Please try again later.
            </p>
          </div>
        </div>
      </>
    );
  }
};

export default AssetsPage;
