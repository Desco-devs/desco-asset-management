"use client";

import {
  OverviewStats,
  VehiclesCount,
  EquipmentsCount,
  VehiclesAndEquipments,
  RecentActivity,
  MaintenanceAlerts,
  QuickActions,
} from "./dashboard-components";

export default function Dashboard() {
  // const { user, loading, clearUser } = useAuth();
  // const [loggingOut, setLoggingOut] = useState(false);

  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <p>Loading user data...</p>
  //     </div>
  //   );
  // }

  // if (!user) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <p>User is not authenticated.</p>
  //     </div>
  //   );
  // }
  // async function handleLogout() {
  //   setLoggingOut(true);
  //   try {
  //     const res = await fetch("/api/authentication/logout", { method: "POST" });
  //     if (res.ok) {
  //       clearUser();
  //       toast.success("Logout successful!");
  //     } else {
  //       toast.error("Logout failed");
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error("Logout error");
  //   } finally {
  //     setLoggingOut(false);
  //   }
  // }

  return (
    <div className="min-h-screen py-6 space-y-6 p-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your admin dashboard. Monitor and manage your fleet
            operations.
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
            <EquipmentsCount />
            <VehiclesCount />
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
