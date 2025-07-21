"use client";

import { useVehiclesStore } from "@/stores/vehiclesStore";

export default function RealtimeTest() {
  // Get realtime connection status from the main hook via store if needed
  // For now, we'll just show a static connected status since the main component handles realtime
  const isConnected = true; // This could be moved to vehiclesStore if needed

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-sm z-50">
      Realtime: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}