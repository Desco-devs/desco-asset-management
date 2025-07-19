"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

interface AssetCounts {
  equipment: { OPERATIONAL: number; NON_OPERATIONAL: number };
  vehicles: { OPERATIONAL: number; NON_OPERATIONAL: number };
}

// Singleton state
let globalState: AssetCounts | null = null;
let subscribers: Set<(state: AssetCounts) => void> = new Set();
let supabaseInstance: any = null;
let equipmentChannel: any = null;
let vehicleChannel: any = null;

const initializeSubscriptions = (initialData: AssetCounts) => {
  if (supabaseInstance) return; // Already initialized

  supabaseInstance = createClient();
  globalState = initialData;

  // Equipment subscription
  equipmentChannel = supabaseInstance
    .channel("asset-counts-equipment-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "equipment" },
      (payload: any) => {
        console.log("Asset counts - equipment change:", payload);
        
        if (payload.eventType === "INSERT") {
          const status = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";
          globalState!.equipment[status]++;
          notifySubscribers();
          toast.success("New equipment added");
        } else if (payload.eventType === "UPDATE") {
          const oldStatus = payload.old.status as "OPERATIONAL" | "NON_OPERATIONAL";
          const newStatus = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";
          
          if (oldStatus !== newStatus) {
            globalState!.equipment[oldStatus]--;
            globalState!.equipment[newStatus]++;
            notifySubscribers();
            toast.info(`Equipment status updated to ${newStatus.toLowerCase()}`);
          }
        } else if (payload.eventType === "DELETE") {
          const status = payload.old.status as "OPERATIONAL" | "NON_OPERATIONAL";
          globalState!.equipment[status]--;
          notifySubscribers();
          toast.error("Equipment removed");
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
        console.log("Asset counts - vehicle change:", payload);
        
        if (payload.eventType === "INSERT") {
          const status = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";
          globalState!.vehicles[status]++;
          notifySubscribers();
          toast.success("New vehicle added");
        } else if (payload.eventType === "UPDATE") {
          const oldStatus = payload.old.status as "OPERATIONAL" | "NON_OPERATIONAL";
          const newStatus = payload.new.status as "OPERATIONAL" | "NON_OPERATIONAL";
          
          if (oldStatus !== newStatus) {
            globalState!.vehicles[oldStatus]--;
            globalState!.vehicles[newStatus]++;
            notifySubscribers();
            toast.info(`Vehicle status updated to ${newStatus.toLowerCase()}`);
          }
        } else if (payload.eventType === "DELETE") {
          const status = payload.old.status as "OPERATIONAL" | "NON_OPERATIONAL";
          globalState!.vehicles[status]--;
          notifySubscribers();
          toast.error("Vehicle removed");
        }
      }
    )
    .subscribe();
};

const notifySubscribers = () => {
  if (globalState) {
    subscribers.forEach(callback => callback({ ...globalState! }));
  }
};

export const useAssetCounts = (initialData: AssetCounts) => {
  const [counts, setCounts] = useState<AssetCounts>(globalState || initialData);

  useEffect(() => {
    // Initialize subscriptions if this is the first component
    if (!globalState) {
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
      }
    };
  }, [initialData]);

  return counts;
};