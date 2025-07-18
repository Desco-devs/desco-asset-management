import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AssetsClientViewer from "./AssetsClientViewer";
import AssetsHeader from "./components/AssetsHeader";
import type { Equipment, Vehicle, Client, Location, Project } from "@/types/assets";

export const metadata: Metadata = {
  title: "Assets Viewer | Desco",
  description: "View and manage equipment and vehicles",
};

const AssetsPage = async () => {
  try {
    // Fetch initial data using Prisma singleton with proper connection handling
    const [equipmentData, vehicleData, clientsData, locationsData, projectsData] = await Promise.all([
      prisma.equipment.findMany({
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true
                }
              }
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.vehicle.findMany({
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true
                }
              }
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.client.findMany({
        include: {
          location: true
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.location.findMany({
        orderBy: {
          created_at: 'desc'
        }
      }),
      prisma.project.findMany({
        include: {
          client: true
        },
        orderBy: {
          created_at: 'desc'
        }
      })
    ]);

    // Serialize the data (convert dates to strings)
    const serializedEquipment: Equipment[] = equipmentData.map(item => ({
      uid: item.uid,
      brand: item.brand,
      model: item.model,
      type: item.type,
      insuranceExpirationDate: item.insuranceExpirationDate?.toISOString() || "",
      status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
      remarks: item.remarks || undefined,
      owner: item.owner,
      image_url: item.image_url || undefined,
      inspectionDate: item.inspectionDate?.toISOString() || undefined,
      plateNumber: item.plateNumber || undefined,
      originalReceiptUrl: item.originalReceiptUrl || undefined,
      equipmentRegistrationUrl: item.equipmentRegistrationUrl || undefined,
      thirdpartyInspectionImage: item.thirdpartyInspectionImage || undefined,
      pgpcInspectionImage: item.pgpcInspectionImage || undefined,
      project: {
        uid: item.project.uid,
        name: item.project.name,
        client: {
          uid: item.project.client.uid,
          name: item.project.client.name,
          location: {
            uid: item.project.client.location.uid,
            address: item.project.client.location.address
          }
        }
      }
    }));

    const serializedVehicles: Vehicle[] = vehicleData.map(item => ({
      uid: item.uid,
      brand: item.brand,
      model: item.model,
      type: item.type,
      plateNumber: item.plateNumber,
      inspectionDate: item.inspectionDate?.toISOString() || "",
      before: item.before,
      expiryDate: item.expiryDate?.toISOString() || "",
      status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
      remarks: item.remarks || undefined,
      owner: item.owner,
      frontImgUrl: item.frontImgUrl || undefined,
      backImgUrl: item.backImgUrl || undefined,
      side1ImgUrl: item.side1ImgUrl || undefined,
      side2ImgUrl: item.side2ImgUrl || undefined,
      originalReceiptUrl: item.originalReceiptUrl || undefined,
      carRegistrationUrl: item.carRegistrationUrl || undefined,
      project: {
        uid: item.project.uid,
        name: item.project.name,
        client: {
          uid: item.project.client.uid,
          name: item.project.client.name,
          location: {
            uid: item.project.client.location.uid,
            address: item.project.client.location.address
          }
        }
      }
    }));

    const serializedClients: Client[] = clientsData.map(item => ({
      uid: item.uid,
      name: item.name,
      location: {
        uid: item.location.uid,
        address: item.location.address
      }
    }));

    const serializedLocations: Location[] = locationsData.map(item => ({
      uid: item.uid,
      address: item.address
    }));

    const serializedProjects: Project[] = projectsData.map(item => ({
      uid: item.uid,
      name: item.name,
      client: {
        uid: item.client.uid,
        name: item.client.name
      }
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
          />
        </div>
      </>
    );
  } catch (error) {
    console.error('Error fetching assets data:', error);
    return (
      <>
        <AssetsHeader />
        
        <div className="container mx-auto py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Assets Viewer</h1>
            <p className="text-muted-foreground">Error loading assets data. Please try again later.</p>
          </div>
        </div>
      </>
    );
  }
};

export default AssetsPage;