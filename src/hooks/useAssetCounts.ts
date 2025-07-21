"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
// import { toast } from "sonner";

interface AssetCounts {
  equipment: { OPERATIONAL: number; NON_OPERATIONAL: number };
  vehicles: { OPERATIONAL: number; NON_OPERATIONAL: number };
}

// Singleton state
let globalState: AssetCounts | null = null;
const subscribers: Set<(state: AssetCounts) => void> = new Set();
let supabaseInstance: any = null;
let equipmentChannel: any = null;
let vehicleChannel: any = null;
let isInitialized = false;

const initializeSubscriptions = (initialData: AssetCounts) => {
  if (isInitialized) {
    // console.log("Subscriptions already initialized, skipping...");
    return; // Already initialized
  }

  // console.log("Initializing asset count subscriptions with data:", initialData);
  isInitialized = true;
  supabaseInstance = createClient();
  globalState = initialData;

  // Equipment subscription
  equipmentChannel = supabaseInstance
    .channel("asset-counts-equipment-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "equipment",
        filter: undefined // Listen to all changes
      },
      (payload: any) => {
        // console.log("Asset counts - equipment change:", payload);

        if (payload.eventType === "INSERT") {
          const status = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";
          globalState = {
            ...globalState!,
            equipment: {
              ...globalState!.equipment,
              [status]: globalState!.equipment[status] + 1
            }
          };
          notifySubscribers();
          // toast.success("New equipment added");
        } else if (payload.eventType === "UPDATE") {
          const oldStatus = payload.old.status as "OPERATIONAL" | "NON_OPERATIONAL";
          const newStatus = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";

          if (oldStatus !== newStatus) {
            globalState = {
              ...globalState!,
              equipment: {
                ...globalState!.equipment,
                [oldStatus]: Math.max(0, globalState!.equipment[oldStatus] - 1),
                [newStatus]: globalState!.equipment[newStatus] + 1
              }
            };
            notifySubscribers();
            // toast.info(`Equipment status updated to ${newStatus.toLowerCase()}`);
          }
        } else if (payload.eventType === "DELETE") {
          // Supabase DELETE only sends the ID, not the full record
          // Use Supabase client to get fresh counts (still realtime, just a query)
          console.log("DELETE event detected for equipment, refreshing counts via Supabase");

          // Use Supabase client for counting (faster than API)
          supabaseInstance
            .from('vehicles')
            .select('status')
            .then(({ data, error }: { data: { status: 'OPERATIONAL' | 'NON_OPERATIONAL' }[] | null, error: any }) => {
              if (error) {
                console.error("Failed to refresh vehicle counts:", error)
                return
              }

              const counts: Record<'OPERATIONAL' | 'NON_OPERATIONAL', number> = {
                OPERATIONAL: 0,
                NON_OPERATIONAL: 0
              }

              data?.forEach((item: { status: 'OPERATIONAL' | 'NON_OPERATIONAL' }) => {
                if (item.status === 'OPERATIONAL' || item.status === 'NON_OPERATIONAL') {
                  counts[item.status]++
                }
              })

              globalState = {
                ...globalState!,
                vehicles: counts
              }
              notifySubscribers()
              console.log("Vehicle counts refreshed after delete:", globalState.vehicles)
            })

        }
      }
    )
    .subscribe();

  // Vehicle subscription
  vehicleChannel = supabaseInstance
    .channel("asset-counts-vehicle-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "vehicles" },
      (payload: any) => {
        // console.log("Asset counts - vehicle change:", payload);

        if (payload.eventType === "INSERT") {
          const status = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";
          globalState = {
            ...globalState!,
            vehicles: {
              ...globalState!.vehicles,
              [status]: globalState!.vehicles[status] + 1
            }
          };
          notifySubscribers();
          // toast.success("New vehicle added");
        } else if (payload.eventType === "UPDATE") {
          const oldStatus = payload.old.status as "OPERATIONAL" | "NON_OPERATIONAL";
          const newStatus = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";

          if (oldStatus !== newStatus) {
            globalState = {
              ...globalState!,
              vehicles: {
                ...globalState!.vehicles,
                [oldStatus]: Math.max(0, globalState!.vehicles[oldStatus] - 1),
                [newStatus]: globalState!.vehicles[newStatus] + 1
              }
            };
            notifySubscribers();
            // toast.info(`Vehicle status updated to ${newStatus.toLowerCase()}`);
          }
        } else if (payload.eventType === "DELETE") {
          // Supabase DELETE only sends the ID, not the full record
          // Use Supabase client to get fresh counts (still realtime, just a query)
          console.log("DELETE event detected for vehicle, refreshing counts via Supabase");

          // Use Supabase client for counting (faster than API)
          supabaseInstance
            .from('vehicles')
            .select('status')
            .then(({ data, error }: { data: { status: 'OPERATIONAL' | 'NON_OPERATIONAL' }[] | null, error: any }) => {
              if (error) {
                console.error("Failed to refresh vehicle counts:", error)
                return
              }

              const counts: Record<'OPERATIONAL' | 'NON_OPERATIONAL', number> = {
                OPERATIONAL: 0,
                NON_OPERATIONAL: 0
              }

              data?.forEach((item: { status: 'OPERATIONAL' | 'NON_OPERATIONAL' }) => {
                if (item.status === 'OPERATIONAL' || item.status === 'NON_OPERATIONAL') {
                  counts[item.status]++
                }
              })

              globalState = {
                ...globalState!,
                vehicles: counts
              }
              notifySubscribers()
              console.log("Vehicle counts refreshed after delete:", globalState.vehicles)
            })

        }
      }
    )
    .subscribe();
};

const cleanupState = () => {
  if (globalState) {
    // Clean up any invalid properties
    const cleanEquipment = {
      OPERATIONAL: globalState.equipment.OPERATIONAL || 0,
      NON_OPERATIONAL: globalState.equipment.NON_OPERATIONAL || 0
    };
    const cleanVehicles = {
      OPERATIONAL: globalState.vehicles.OPERATIONAL || 0,
      NON_OPERATIONAL: globalState.vehicles.NON_OPERATIONAL || 0
    };

    globalState = {
      equipment: cleanEquipment,
      vehicles: cleanVehicles
    };
  }
};

const notifySubscribers = () => {
  if (globalState) {
    cleanupState(); // Clean state before notifying
    // console.log("Notifying subscribers with state:", globalState);
    // console.log("Equipment counts:", globalState.equipment);
    // console.log("Vehicle counts:", globalState.vehicles);
    // console.log("Number of subscribers:", subscribers.size);
    subscribers.forEach(callback => callback({ ...globalState! }));
  }
};

export const useAssetCounts = (initialData: AssetCounts) => {
  const [counts, setCounts] = useState<AssetCounts>(() => {
    // Use globalState if it exists, otherwise use initialData
    return globalState || initialData;
  });

  useEffect(() => {
    // Initialize subscriptions if this is the first component
    if (!isInitialized) {
      initializeSubscriptions(initialData);
    }

    // Subscribe to updates
    subscribers.add(setCounts);

    // Cleanup
    return () => {
      subscribers.delete(setCounts);

      // If this was the last subscriber, cleanup subscriptions
      if (subscribers.size === 0) {
        if (equipmentChannel) {
          supabaseInstance?.removeChannel(equipmentChannel);
          equipmentChannel = null;
        }
        if (vehicleChannel) {
          supabaseInstance?.removeChannel(vehicleChannel);
          vehicleChannel = null;
        }
        supabaseInstance = null;
        globalState = null;
        isInitialized = false;
      }
    };
  }, [initialData]);

  return counts;
};