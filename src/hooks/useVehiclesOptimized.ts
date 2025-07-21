"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

// Vehicle interface matching your existing structure
export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  owner: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  inspection_date: string;
  expiry_date: string;
  before: number;
  remarks?: string;
  created_at: string;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
      location: {
        id: string;
        address: string;
      };
    };
  };
  user: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

// API functions matching your existing VehiclesContainer
async function fetchVehiclesData() {
  const [vehiclesResult, projectsData, clientsData, locationsData, usersData, maintenanceReportsData, totalVehicleCount] = await Promise.all([
    fetch('/api/vehicles/getall').then(res => res.json()),
    fetch('/api/projects/getall').then(res => res.json()),
    fetch('/api/clients/getall').then(res => res.json()),
    fetch('/api/locations/getall').then(res => res.json()),
    fetch('/api/users/getall').then(res => res.json()),
    fetch('/api/maintenance-reports').then(res => res.json()),
    fetch('/api/vehicles/count').then(res => res.json())
  ]);

  return {
    vehicles: vehiclesResult || [],
    projects: projectsData || [],
    clients: clientsData || [],
    locations: locationsData || [],
    users: usersData || [],
    maintenanceReports: maintenanceReportsData || [],
    totalCount: totalVehicleCount?.count || 0
  };
}

// Main hook for vehicles data with React Query
export function useVehiclesOptimized() {
  return useQuery({
    queryKey: ['vehicles-optimized'],
    queryFn: fetchVehiclesData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Hook for pagination logic (simplified to avoid re-renders)
export function useVehiclesPagination(vehicles: Vehicle[], itemsPerPage: number = 12) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const effectiveItemsPerPage = isMobile ? 6 : itemsPerPage;
  const totalPages = Math.ceil(vehicles.length / effectiveItemsPerPage);

  // Calculate current page data
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const endIndex = startIndex + effectiveItemsPerPage;
  const currentPageData = vehicles.slice(startIndex, endIndex);

  // Reset to page 1 when switching between mobile/desktop
  useEffect(() => {
    setCurrentPage(1);
  }, [isMobile]);

  const loadPage = (page: number) => {
    setCurrentPage(page);
  };

  return {
    currentPage,
    setCurrentPage,
    currentPageData,
    totalPages,
    effectiveItemsPerPage,
    isMobile,
    loadPage
  };
}

// Hook for realtime updates (preserves your Supabase logic)
export function useVehiclesRealtime(
  vehicles: Vehicle[],
  setVehicles: (vehicles: Vehicle[]) => void,
  projects: any[],
  clients: any[],
  currentPage: number,
  effectiveItemsPerPage: number
) {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { createClient } = require("@/lib/supabase");
    const supabase = createClient();

    const channel = supabase
      .channel('vehicles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle'
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            // Invalidate React Query cache - let React Query handle the update
            queryClient.invalidateQueries({ queryKey: ['vehicles-optimized'] });

          } else if (payload.eventType === 'UPDATE') {
            setVehicles(prev => 
              prev.map(vehicle => 
                vehicle.id === payload.new.id 
                  ? { ...vehicle, ...payload.new }
                  : vehicle
              )
            );
            
          } else if (payload.eventType === 'DELETE') {
            setVehicles(prev => prev.filter(vehicle => vehicle.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, []); // Empty dependency array to prevent re-renders

  return { isRealtimeConnected };
}