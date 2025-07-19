import { prisma } from "@/lib/prisma";
import { 
  OverviewStats, 
  VehiclesCount, 
  EquipmentsCount, 
  VehiclesAndEquipments, 
  RecentActivity, 
  MaintenanceAlerts, 
  QuickActions 
} from "./dashboard-components";

export default async function Dashboard() {
  let equipmentData = { OPERATIONAL: 0, NON_OPERATIONAL: 0 };
  let vehicleData = { OPERATIONAL: 0, NON_OPERATIONAL: 0 };

  try {
    // Fetch initial counts using Prisma with proper connection handling
    const [equipmentCounts, vehicleCounts] = await Promise.all([
      prisma.equipment.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
      prisma.vehicle.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
    ]);

    // Transform to expected format
    equipmentData = {
      OPERATIONAL: equipmentCounts.find(item => item.status === 'OPERATIONAL')?._count.status || 0,
      NON_OPERATIONAL: equipmentCounts.find(item => item.status === 'NON_OPERATIONAL')?._count.status || 0,
    };

    vehicleData = {
      OPERATIONAL: vehicleCounts.find(item => item.status === 'OPERATIONAL')?._count.status || 0,
      NON_OPERATIONAL: vehicleCounts.find(item => item.status === 'NON_OPERATIONAL')?._count.status || 0,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }

  return (
    <div className="min-h-screen py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your admin dashboard. Monitor and manage your fleet operations.
          </p>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Overview</h2>
        <OverviewStats />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EquipmentsCount initialData={equipmentData} />
            <VehiclesCount initialData={vehicleData} />
          </div>
          
          {/* Combined Assets Overview */}
          <VehiclesAndEquipments />
          
          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Right Column - Activity & Alerts */}
        <div className="space-y-6">
          <MaintenanceAlerts />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
