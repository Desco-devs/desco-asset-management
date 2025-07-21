"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import type { Vehicle, MaintenanceReport, Project, Client, Location, User } from "@/stores/vehiclesStore";

// Query keys for consistent cache management
export const vehicleKeys = {
  all: ['vehicles'] as const,
  vehicles: () => [...vehicleKeys.all, 'list'] as const,
  vehicle: (id: string) => [...vehicleKeys.all, 'item', id] as const,
  projects: () => ['projects'] as const,
  clients: () => ['clients'] as const,
  locations: () => ['locations'] as const,
  users: () => ['users'] as const,
  maintenanceReports: () => ['maintenance-reports'] as const,
  vehicleMaintenanceReports: (vehicleId: string) => [...vehicleKeys.all, 'maintenance', vehicleId] as const,
};

// API functions
async function fetchVehicles(): Promise<Vehicle[]> {
  const response = await fetch('/api/vehicles/getall');
  if (!response.ok) throw new Error('Failed to fetch vehicles');
  return response.json();
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects/getall');
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clients/getall');
  if (!response.ok) throw new Error('Failed to fetch clients');
  return response.json();
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations/getall');
  if (!response.ok) throw new Error('Failed to fetch locations');
  return response.json();
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users/getall');
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

async function fetchMaintenanceReports(): Promise<MaintenanceReport[]> {
  const response = await fetch('/api/maintenance-reports');
  if (!response.ok) throw new Error('Failed to fetch maintenance reports');
  return response.json();
}

async function createVehicle(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
  const response = await fetch('/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData),
  });
  if (!response.ok) throw new Error('Failed to create vehicle');
  return response.json();
}

async function updateVehicle({ id, ...vehicleData }: Partial<Vehicle> & { id: string }): Promise<Vehicle> {
  const response = await fetch(`/api/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData),
  });
  if (!response.ok) throw new Error('Failed to update vehicle');
  return response.json();
}

async function deleteVehicle(id: string): Promise<void> {
  const response = await fetch(`/api/vehicles/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete vehicle (${response.status})`);
  }
}

async function createMaintenanceReport(reportData: Partial<MaintenanceReport>): Promise<MaintenanceReport> {
  const response = await fetch('/api/maintenance-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) throw new Error('Failed to create maintenance report');
  return response.json();
}

async function updateMaintenanceReport({ id, ...reportData }: Partial<MaintenanceReport> & { id: string }): Promise<MaintenanceReport> {
  const response = await fetch(`/api/maintenance-reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) throw new Error('Failed to update maintenance report');
  return response.json();
}

async function deleteMaintenanceReport(id: string): Promise<void> {
  const response = await fetch(`/api/maintenance-reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete maintenance report');
}

// Helper function to deduplicate vehicles array
function deduplicateVehicles(vehicles: Vehicle[]): Vehicle[] {
  const seen = new Set();
  return vehicles.filter(vehicle => {
    if (seen.has(vehicle.id)) {
      console.warn('🚨 Duplicate vehicle found and removed:', vehicle.id);
      return false;
    }
    seen.add(vehicle.id);
    return true;
  });
}

// TanStack Query Hooks

// Vehicles
export function useVehicles() {
  return useQuery({
    queryKey: vehicleKeys.vehicles(),
    queryFn: fetchVehicles,
    select: (data) => deduplicateVehicles(data), // Always deduplicate
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Reference Data
export function useProjects() {
  return useQuery({
    queryKey: vehicleKeys.projects(),
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes - projects change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useClients() {
  return useQuery({
    queryKey: vehicleKeys.clients(),
    queryFn: fetchClients,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: vehicleKeys.locations(),
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes - locations rarely change
    gcTime: 15 * 60 * 1000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: vehicleKeys.users(),
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

export function useMaintenanceReports() {
  return useQuery({
    queryKey: vehicleKeys.maintenanceReports(),
    queryFn: fetchMaintenanceReports,
    staleTime: 1 * 60 * 1000, // 1 minute - maintenance reports change frequently
    gcTime: 3 * 60 * 1000,
  });
}

// Combined hook for all data (optimized with parallel fetching)
export function useVehiclesWithReferenceData() {
  const vehiclesQuery = useVehicles();
  const projectsQuery = useProjects();
  const clientsQuery = useClients();
  const locationsQuery = useLocations();
  const usersQuery = useUsers();
  const maintenanceReportsQuery = useMaintenanceReports();

  return {
    vehicles: vehiclesQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    clients: clientsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    users: usersQuery.data ?? [],
    maintenanceReports: maintenanceReportsQuery.data ?? [],
    isLoading: vehiclesQuery.isLoading || projectsQuery.isLoading,
    isError: vehiclesQuery.isError || projectsQuery.isError || clientsQuery.isError || locationsQuery.isError || usersQuery.isError || maintenanceReportsQuery.isError,
    error: vehiclesQuery.error || projectsQuery.error || clientsQuery.error || locationsQuery.error || usersQuery.error || maintenanceReportsQuery.error,
  };
}

// Vehicle Mutations
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: (newVehicle) => {
      // Optimistically add to cache immediately with deduplication
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
        if (!oldData) return [newVehicle];
        
        // Check if vehicle already exists to prevent duplicates
        const existingVehicle = oldData.find(vehicle => vehicle.id === newVehicle.id);
        if (existingVehicle) {
          console.log('🔄 Vehicle already exists in cache during create, skipping duplicate');
          return oldData;
        }
        
        console.log('✅ Adding new vehicle to cache:', newVehicle.id);
        return deduplicateVehicles([newVehicle, ...oldData]);
      });
      toast.success('Vehicle created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create vehicle: ' + error.message);
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateVehicle,
    onSuccess: (updatedVehicle) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
        if (!oldData) return [updatedVehicle];
        const updated = oldData.map(vehicle => 
          vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
        );
        return deduplicateVehicles(updated);
      });
      toast.success('Vehicle updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update vehicle: ' + error.message);
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteVehicle,
    onSuccess: (_, vehicleId) => {
      // Optimistic update - remove vehicle from cache immediately
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
        const filtered = oldData ? oldData.filter(vehicle => vehicle.id !== vehicleId) : [];
        return deduplicateVehicles(filtered);
      });
      // Show success toast immediately 
      toast.success('Vehicle deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete vehicle: ' + error.message);
    },
  });
}

// Maintenance Report Mutations
export function useCreateMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMaintenanceReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
      toast.success('Maintenance report created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create maintenance report: ' + error.message);
    },
  });
}

export function useUpdateMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateMaintenanceReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
      toast.success('Maintenance report updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update maintenance report: ' + error.message);
    },
  });
}

export function useDeleteMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteMaintenanceReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
      toast.success('Maintenance report deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete maintenance report: ' + error.message);
    },
  });
}

// Supabase Realtime Integration
export function useSupabaseRealtime() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    console.log('🔌 Setting up Supabase realtime subscriptions...');

    // Generate unique channel name to avoid conflicts
    const channelId = `vehicles-realtime-${Math.random().toString(36).substring(2, 11)}`;
    
    // Vehicles realtime subscription
    const vehiclesChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          try {
            console.log('🚗 Vehicle realtime event:', payload.eventType, payload);
            
            if (payload.eventType === 'INSERT' && payload.new) {
              console.log('✅ New vehicle inserted:', payload.new);
              const vehicleData = payload.new as any;
              // Only add if vehicle doesn't already exist in cache (prevent duplicates)
              queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
                if (!oldData) return [vehicleData];
                
                // Check if vehicle already exists in cache
                const existingVehicle = oldData.find(vehicle => vehicle.id === vehicleData.id);
                if (existingVehicle) {
                  console.log('🔄 Vehicle already exists in cache, skipping insert');
                  return oldData; // Don't add duplicate
                }
                
                return deduplicateVehicles([vehicleData, ...oldData]);
              });
              // No toast here - mutation handles user-initiated creates
              // This is for realtime updates from other users
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              console.log('🔄 Vehicle updated:', payload.new);
              const vehicleData = payload.new as any;
              // Update in cache only if vehicle exists
              queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
                if (!oldData) return [];
                
                const existingIndex = oldData.findIndex(vehicle => vehicle.id === vehicleData.id);
                if (existingIndex === -1) {
                  console.log('🔄 Vehicle not found in cache for update, skipping');
                  return oldData;
                }
                
                const updated = oldData.map(vehicle => 
                  vehicle.id === vehicleData.id ? vehicleData : vehicle
                );
                return deduplicateVehicles(updated);
              });
              // No toast for updates - user initiated the action
            } else if (payload.eventType === 'DELETE') {
              console.log('🗑️ Vehicle deleted:', payload.old || 'Unknown vehicle');
              const deletedVehicle = payload.old as any;
              if (deletedVehicle?.id) {
                // Remove from cache only if vehicle exists
                queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
                  if (!oldData) return [];
                  
                  const existingVehicle = oldData.find(vehicle => vehicle.id === deletedVehicle.id);
                  if (!existingVehicle) {
                    console.log('🗑️ Vehicle not found in cache for deletion, skipping');
                    return oldData;
                  }
                  
                  const filtered = oldData.filter(vehicle => vehicle.id !== deletedVehicle.id);
                  return deduplicateVehicles(filtered);
                });
              }
              // No toast here - mutation handles user-initiated deletes
              // This is for realtime updates from other users
            }
          } catch (error) {
            console.error('Error handling realtime vehicle event:', error);
            // Still invalidate cache even if toast fails
            queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() });
          }
        }
      )
      .subscribe((status) => {
        console.log('🚗 Vehicles subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Maintenance reports realtime subscription
    const maintenanceChannel = supabase
      .channel('maintenance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_vehicle_reports'
        },
        (payload) => {
          try {
            // Invalidate maintenance reports cache on any change
            queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
            
            if (payload.eventType === 'INSERT') {
              toast.success('New maintenance report added');
            } else if (payload.eventType === 'UPDATE') {
              toast.success('Maintenance report updated');
            } else if (payload.eventType === 'DELETE') {
              // Don't show toast for maintenance report deletion - it might be part of vehicle deletion
              console.log('🔧 Maintenance report deleted');
            }
          } catch (error) {
            console.error('Error handling realtime maintenance report event:', error);
            // Still invalidate cache even if toast fails
            queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
          }
        }
      )
      .subscribe();

    // Projects realtime subscription (less frequent updates)
    const projectsChannel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: vehicleKeys.projects() });
          queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() }); // Vehicle data includes project info
        }
      )
      .subscribe();

    return () => {
      vehiclesChannel.unsubscribe();
      maintenanceChannel.unsubscribe();
      projectsChannel.unsubscribe();
    };
  }, [queryClient]);

  return {
    isConnected,
  };
}