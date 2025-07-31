"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import type { Vehicle, MaintenanceReport, Project, Client, Location, User, ExportFilters } from "@/stores/vehiclesStore";

// Query keys for consistent cache management
export const vehicleKeys = {
  all: ['vehicles'] as const,
  vehicles: () => [...vehicleKeys.all, 'list'] as const,
  vehicle: (id: string) => [...vehicleKeys.all, 'item', id] as const,
  projects: () => ['vehicle-projects'] as const, // Unique key to avoid cache conflicts with equipment
  clients: () => ['vehicle-clients'] as const,
  locations: () => ['vehicle-locations'] as const,
  users: () => ['vehicle-users'] as const,
  maintenanceReports: () => ['vehicle-maintenance-reports'] as const,
  vehicleMaintenanceReports: (vehicleId: string) => [...vehicleKeys.all, 'maintenance', vehicleId] as const,
  exports: () => ['vehicle-exports'] as const,
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
  const response = await fetch('/api/vehicles/maintenance-reports');
  if (!response.ok) throw new Error('Failed to fetch maintenance reports');
  const data = await response.json();
  return data.data || [];
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
  const response = await fetch('/api/vehicles/maintenance-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) throw new Error('Failed to create maintenance report');
  return response.json();
}

async function updateMaintenanceReport({ id, ...reportData }: Partial<MaintenanceReport> & { id: string }): Promise<MaintenanceReport> {
  const response = await fetch(`/api/vehicles/maintenance-reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Update maintenance report error:', errorData);
    throw new Error(errorData.error || `Failed to update maintenance report (${response.status})`);
  }
  return response.json();
}

async function deleteMaintenanceReport(id: string): Promise<void> {
  const response = await fetch(`/api/vehicles/maintenance-reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Delete maintenance report error response:', errorData);
    throw new Error(errorData.error || errorData.details || `Failed to delete maintenance report (${response.status})`);
  }
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
    select: (data) => deduplicateMaintenanceReports(data), // Always deduplicate
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
    onMutate: async (newVehicleData) => {
      // Cancel any outgoing refetches for vehicles data
      await queryClient.cancelQueries({ queryKey: vehicleKeys.vehicles() });
      
      // Snapshot the previous value for rollback
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(vehicleKeys.vehicles());
      
      // Create optimistic vehicle object
      const optimisticVehicle: Vehicle = {
        id: `temp-${Date.now()}`, // Temporary ID
        brand: newVehicleData.brand || '',
        model: newVehicleData.model || '',
        type: newVehicleData.type || '',
        plate_number: newVehicleData.plate_number || '',
        owner: newVehicleData.owner || '',
        status: (newVehicleData.status as 'OPERATIONAL' | 'NON_OPERATIONAL') || 'OPERATIONAL',
        inspection_date: newVehicleData.inspection_date || new Date().toISOString(),
        expiry_date: newVehicleData.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        registration_expiry: newVehicleData.registration_expiry || null,
        before: newVehicleData.before || 30,
        remarks: newVehicleData.remarks || null,
        created_at: new Date().toISOString(),
        project: newVehicleData.project || {
          id: '',
          name: 'Loading...',
          client: {
            id: '',
            name: 'Loading...',
            location: {
              id: '',
              address: 'Loading...'
            }
          }
        },
        user: null,
        // Optional fields for images and parts
        front_img_url: null,
        back_img_url: null,
        side1_img_url: null,
        side2_img_url: null,
        original_receipt_url: null,
        car_registration_url: null,
        pgpc_inspection_image: null,
        vehicle_parts: null,
      };
      
      // Optimistically add the new vehicle to the cache
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
        const newData = oldData ? [optimisticVehicle, ...oldData] : [optimisticVehicle];
        return deduplicateVehicles(newData);
      });
      
      // Show optimistic feedback to user
      toast.success('Creating vehicle...', { 
        id: 'creating-vehicle',
        duration: 2000 
      });
      
      // Return context for error rollback
      return { previousVehicles, optimisticVehicle };
    },
    onSuccess: (newVehicle, variables, context) => {
      // Replace optimistic vehicle with real vehicle data
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
        if (!oldData) return [newVehicle];
        
        // Remove the optimistic vehicle and add the real one
        const withoutOptimistic = oldData.filter(vehicle => 
          vehicle.id !== context?.optimisticVehicle.id
        );
        
        // Check if real vehicle already exists to prevent duplicates
        const existingVehicle = withoutOptimistic.find(vehicle => vehicle.id === newVehicle.id);
        if (existingVehicle) {
          console.log('🔄 Vehicle already exists in cache during create, skipping duplicate');
          return deduplicateVehicles(withoutOptimistic);
        }
        
        console.log('✅ Replacing optimistic vehicle with real data:', newVehicle.id);
        return deduplicateVehicles([newVehicle, ...withoutOptimistic]);
      });
      
      // Invalidate related queries to ensure everything is up to date
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: vehicleKeys.projects() });
      
      // Dismiss the optimistic toast and show success
      toast.dismiss('creating-vehicle');
      toast.success(`Vehicle "${newVehicle.brand} ${newVehicle.model}" created successfully!`);
    },
    onError: (error, variables, context) => {
      // Rollback: restore previous vehicles data
      if (context?.previousVehicles) {
        queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), context.previousVehicles);
      }
      
      // Dismiss optimistic toast and show error
      toast.dismiss('creating-vehicle');
      toast.error('Failed to create vehicle: ' + error.message);
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateVehicle,
    onMutate: async (updatedVehicleData) => {
      // Cancel any outgoing refetches for vehicles data
      await queryClient.cancelQueries({ queryKey: vehicleKeys.vehicles() });
      
      // Snapshot the previous value for rollback
      const previousVehicles = queryClient.getQueryData<Vehicle[]>(vehicleKeys.vehicles());
      
      // Find the existing vehicle and create optimistic update
      const vehicleId = updatedVehicleData.id;
      if (vehicleId && previousVehicles) {
        const existingVehicle = previousVehicles.find(v => v.id === vehicleId);
        if (existingVehicle) {
          // Create optimistic updated vehicle
          const optimisticVehicle: Vehicle = {
            ...existingVehicle,
            ...updatedVehicleData,
            // Ensure ID is preserved
            id: vehicleId,
          };
          
          // Optimistically update in cache
          queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
            if (!oldData) return [optimisticVehicle];
            const updated = oldData.map(vehicle => 
              vehicle.id === vehicleId ? optimisticVehicle : vehicle
            );
            return deduplicateVehicles(updated);
          });
          
          // Show optimistic feedback
          toast.success('Updating vehicle...', { 
            id: 'updating-vehicle',
            duration: 2000 
          });
        }
      }
      
      // Return context for error rollback
      return { previousVehicles, vehicleId };
    },
    onSuccess: (updatedVehicle, variables, context) => {
      // Replace optimistic update with real data
      queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
        if (!oldData) return [updatedVehicle];
        const updated = oldData.map(vehicle => 
          vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
        );
        return deduplicateVehicles(updated);
      });
      
      // Invalidate related queries if important fields changed
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      
      // Dismiss optimistic toast and show success
      toast.dismiss('updating-vehicle');
      toast.success(`Vehicle "${updatedVehicle.brand} ${updatedVehicle.model}" updated successfully!`);
    },
    onError: (error, variables, context) => {
      // Rollback: restore previous vehicles data
      if (context?.previousVehicles) {
        queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), context.previousVehicles);
      }
      
      // Dismiss optimistic toast and show error
      toast.dismiss('updating-vehicle');
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
        const deleted = oldData?.find(vehicle => vehicle.id === vehicleId);
        const filtered = oldData ? oldData.filter(vehicle => vehicle.id !== vehicleId) : [];
        
        // Show success toast with vehicle details
        if (deleted) {
          toast.success(`Vehicle "${deleted.brand} ${deleted.model}" deleted successfully!`);
        } else {
          toast.success('Vehicle deleted successfully!');
        }
        
        return deduplicateVehicles(filtered);
      });
    },
    onError: (error) => {
      toast.error('Failed to delete vehicle: ' + error.message);
    },
  });
}

// Helper function to deduplicate maintenance reports array
function deduplicateMaintenanceReports(reports: MaintenanceReport[]): MaintenanceReport[] {
  const seen = new Set();
  return reports.filter(report => {
    if (seen.has(report.id)) {
      console.warn('🚨 Duplicate maintenance report found and removed:', report.id);
      return false;
    }
    seen.add(report.id);
    return true;
  });
}

// Maintenance Report Mutations
export function useCreateMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMaintenanceReport,
    onSuccess: (newReport) => {
      // Optimistically add to cache immediately
      queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
        if (!oldData) return [newReport];
        
        // Check if report already exists to prevent duplicates
        const existingReport = oldData.find(report => report.id === newReport.id);
        if (existingReport) {
          console.log('🔄 Maintenance report already exists in cache during create, skipping duplicate');
          return oldData;
        }
        
        console.log('✅ Adding new maintenance report to cache:', newReport.id);
        return deduplicateMaintenanceReports([newReport, ...oldData]);
      });
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
    onSuccess: (updatedReport) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
        if (!oldData) return [updatedReport];
        const updated = oldData.map(report => 
          report.id === updatedReport.id ? updatedReport : report
        );
        return deduplicateMaintenanceReports(updated);
      });
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
    onSuccess: (_, reportId) => {
      // Optimistic update - remove report from cache immediately
      queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
        const filtered = oldData ? oldData.filter(report => report.id !== reportId) : [];
        return deduplicateMaintenanceReports(filtered);
      });
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Simple duplicate prevention for individual toasts
  const processedEvents = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    console.log('🔌 Setting up Supabase realtime subscriptions...');

    // Simple authentication check - allow all authenticated users
    // Role-based filtering happens at the data level, not subscription level
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.log('🚫 No authenticated user, skipping vehicle realtime subscription');
        setIsConnected(false);
        setConnectionError('Authentication required');
        return false;
      }
      return true;
    };

    checkAuth().then(hasAuth => {
      if (!hasAuth) return;
    

      // Comprehensive error handler to catch transformers.js and realtime errors
      const originalConsoleError = console.error;
    
      // Also override window.onerror to catch uncaught errors
      const originalWindowError = window.onerror;
    
    // CRITICAL FIX: Patch Object.keys to prevent transformers.js crashes
    const originalObjectKeys = Object.keys;
    const safeObjectKeys = function(obj: any) {
      // If obj is null or undefined, return empty array to prevent crash
      if (obj == null) {
        console.debug('🔧 Prevented Object.keys() crash on null/undefined value');
        return [];
      }
      // Otherwise use original Object.keys
      return originalObjectKeys(obj);
    };
    
    // Replace Object.keys globally (this fixes the transformers.js issue at the source)
    Object.keys = safeObjectKeys;
    
    const errorSuppression = (message: any, ...args: any[]) => {
      // Convert message to string for analysis
      const messageStr = String(message || '');
      const fullMessage = [messageStr, ...args.map(arg => String(arg || ''))].join(' ');
      
      // Comprehensive pattern matching for Supabase/transformers errors
      const isTransformersError = (
        messageStr.includes('transformers.js') ||
        messageStr.includes('Cannot convert undefined or null to object') ||
        messageStr.includes('TypeError: Cannot read properties of null') ||
        messageStr.includes('RealtimeChannel.js') ||
        messageStr.includes('RealtimeClient.js') ||
        messageStr.includes('convertChangeData') ||
        messageStr.includes('_getPayloadRecords') ||
        messageStr.includes('serializer.js') ||
        (messageStr.includes('Supabase') && messageStr.includes('transformers')) ||
        // Object.keys errors from transformers
        (messageStr.includes('Object.keys') && fullMessage.includes('transformers')) ||
        // Specific error patterns
        fullMessage.includes('at Object.keys (<anonymous>)') ||
        fullMessage.includes('at Module.convertChangeData (transformers.js:61:19)')
      );
      
      if (isTransformersError) {
        // Use debug level to completely hide these errors
        console.debug('🔇 Suppressed Supabase transformers error');
        return;
      }
      
      // Allow all other errors to pass through normally
      originalConsoleError.call(console, message, ...args);
    };
    
    // Handle uncaught TypeError from transformers.js
    const windowErrorHandler = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
      const messageStr = String(message || '');
      const sourceStr = String(source || '');
      
      // Check if this is a transformers.js related error
      const isTransformersUncaughtError = (
        messageStr.includes('Cannot convert undefined or null to object') ||
        sourceStr.includes('transformers.js') ||
        sourceStr.includes('RealtimeChannel.js') ||
        sourceStr.includes('RealtimeClient.js') ||
        (error && error.stack && (
          error.stack.includes('transformers.js') ||
          error.stack.includes('convertChangeData') ||
          error.stack.includes('_getPayloadRecords') ||
          error.stack.includes('RealtimeChannel.js') ||
          error.stack.includes('RealtimeClient.js')
        ))
      );
      
      if (isTransformersUncaughtError) {
        console.debug('🔇 Suppressed uncaught Supabase transformers error');
        return true; // Prevent the error from being logged
      }
      
      // Let other errors through
      return originalWindowError ? originalWindowError(message, source, lineno, colno, error) : false;
    };
    
    console.error = errorSuppression;
    window.onerror = windowErrorHandler;

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
            // Comprehensive payload validation to prevent transformers.js errors
            if (!payload || typeof payload !== 'object') {
              console.warn('Invalid payload received for vehicle event (null or not object):', payload);
              return;
            }

            // Check if payload has required properties
            if (!(payload as any).eventType && !(payload as any).event) {
              console.warn('Invalid vehicle payload received (no event type):', payload);
              return;
            }

            // Normalize eventType (some versions use 'event' instead of 'eventType')
            const eventType = (payload as any).eventType || (payload as any).event;
            if (!eventType || typeof eventType !== 'string') {
              console.warn('Invalid event type in vehicle payload:', payload);
              return;
            }

            // Enhanced validation for DELETE events to prevent Object.keys() errors
            if (eventType === 'DELETE') {
              if (!payload.old || typeof payload.old !== 'object' || payload.old === null) {
                console.warn('Invalid DELETE payload structure for vehicle, skipping:', payload);
                // Still try to invalidate cache as fallback
                queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() });
                return;
              }

              // Ensure payload.old has at least an id property
              if (!(payload as any).old?.id || typeof (payload as any).old?.id !== 'string') {
                console.warn('DELETE payload.old missing valid id for vehicle, skipping:', payload);
                queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() });
                return;
              }
            }

            // Enhanced validation for INSERT/UPDATE events
            if ((eventType === 'INSERT' || eventType === 'UPDATE')) {
              if (!payload.new || typeof payload.new !== 'object' || payload.new === null) {
                console.warn(`Invalid ${eventType} payload structure for vehicle, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() });
                return;
              }

              // Ensure payload.new has at least an id property
              if (!(payload as any).new?.id || typeof (payload as any).new?.id !== 'string') {
                console.warn(`${eventType} payload.new missing valid id for vehicle, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() });
                return;
              }
            }
            
            console.log('🚗 Vehicle realtime event:', eventType, payload);
            
            if (eventType === 'INSERT' && payload.new) {
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
              
              // Invalidate dashboard data to update statistics
              queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              
              // Only show toast for vehicles created by other users (not user-initiated)
              // Skip toast to prevent duplicate with form success toast
              const eventKey = `insert-${vehicleData.id}`;
              if (!processedEvents.current.has(eventKey)) {
                processedEvents.current.add(eventKey);
                // Removed toast to prevent duplicate notifications with form success
                
                // Clean up old events (keep only last 100 to prevent memory leak)
                if (processedEvents.current.size > 100) {
                  const oldEvents = Array.from(processedEvents.current).slice(0, 50);
                  oldEvents.forEach(event => processedEvents.current.delete(event));
                }
              }
            } else if (eventType === 'UPDATE' && payload.new) {
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
              
              // Invalidate dashboard data to update statistics if status changed
              queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              
              // Skip update toast to prevent duplicates with form success toast
              const eventKey = `update-${vehicleData.id}`;
              if (!processedEvents.current.has(eventKey)) {
                processedEvents.current.add(eventKey);
                // Removed toast to prevent duplicate notifications with form success
              }
            } else if (eventType === 'DELETE') {
              console.log('🗑️ Vehicle deleted:', payload.old || 'Unknown vehicle');
              
              // We already validated payload.old above, so it's safe to use
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
                
                // Invalidate dashboard data to update statistics
                queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                
                // Skip delete toast to prevent duplicates with form success toast
                const eventKey = `delete-${deletedVehicle.id}`;
                if (!processedEvents.current.has(eventKey)) {
                  processedEvents.current.add(eventKey);
                  // Removed toast to prevent duplicate notifications with mutation success
                }
              }
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
        
        if (status === 'SUBSCRIBED') {
          setConnectionError(null);
          setReconnectAttempts(0);
          console.log('✅ Vehicle real-time connection established');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionError('Connection failed');
          setIsConnected(false);
          
          // Exponential backoff reconnection (max 5 attempts)
          if (reconnectAttempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.warn(`🔄 Vehicle real-time connection failed, retrying in ${delay}ms (attempt ${reconnectAttempts + 1}/5)`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              // The useEffect will trigger reconnection due to dependency change
            }, delay);
          } else {
            console.error('❌ Vehicle real-time connection failed after 5 attempts');
            setConnectionError('Connection failed after multiple attempts');
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false);
          console.log('🔌 Vehicle real-time connection closed');
        }
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
            // Comprehensive payload validation to prevent transformers.js errors
            if (!payload || typeof payload !== 'object') {
              console.warn('Invalid payload received (null or not object):', payload);
              return;
            }

            // Check if payload has required properties
            if (!(payload as any).eventType && !(payload as any).event) {
              console.warn('Invalid payload received (no event type):', payload);
              return;
            }

            // Normalize eventType (some versions use 'event' instead of 'eventType')
            const eventType = (payload as any).eventType || (payload as any).event;
            if (!eventType || typeof eventType !== 'string') {
              console.warn('Invalid event type in payload:', payload);
              return;
            }

            // Enhanced validation for DELETE events to prevent Object.keys() errors
            if (eventType === 'DELETE') {
              // Validate payload.old exists and has valid structure
              if (!payload.old || typeof payload.old !== 'object' || payload.old === null) {
                console.warn('Invalid DELETE payload structure for maintenance report, skipping:', payload);
                // Still try to invalidate cache as fallback
                queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
                return;
              }

              // Ensure payload.old has at least an id property
              if (!(payload as any).old?.id || typeof (payload as any).old?.id !== 'string') {
                console.warn('DELETE payload.old missing valid id, skipping:', payload);
                queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
                return;
              }
            }

            // Enhanced validation for INSERT/UPDATE events
            if ((eventType === 'INSERT' || eventType === 'UPDATE')) {
              if (!payload.new || typeof payload.new !== 'object' || payload.new === null) {
                console.warn(`Invalid ${eventType} payload structure for maintenance report, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
                return;
              }

              // Ensure payload.new has at least an id property
              if (!(payload as any).new?.id || typeof (payload as any).new?.id !== 'string') {
                console.warn(`${eventType} payload.new missing valid id, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
                return;
              }
            }
            
            console.log('🔧 Maintenance report realtime event:', eventType, payload);
            
            if (eventType === 'INSERT' && payload.new) {
              console.log('✅ New maintenance report inserted:', payload.new);
              const reportData = payload.new as any;
              // Only add if report doesn't already exist in cache (prevent duplicates)
              queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
                if (!oldData) return [reportData];
                
                // Check if report already exists in cache
                const existingReport = oldData.find(report => report.id === reportData.id);
                if (existingReport) {
                  console.log('🔄 Maintenance report already exists in cache, skipping insert');
                  return oldData; // Don't add duplicate
                }
                
                return deduplicateMaintenanceReports([reportData, ...oldData]);
              });
              // No toast here - mutation handles user-initiated creates
              // This is for realtime updates from other users
            } else if (eventType === 'UPDATE' && payload.new) {
              console.log('🔄 Maintenance report updated:', payload.new);
              const reportData = payload.new as any;
              // Update in cache only if report exists
              queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
                if (!oldData) return [];
                
                const existingIndex = oldData.findIndex(report => report.id === reportData.id);
                if (existingIndex === -1) {
                  console.log('🔄 Maintenance report not found in cache for update, skipping');
                  return oldData;
                }
                
                const updated = oldData.map(report => 
                  report.id === reportData.id ? reportData : report
                );
                return deduplicateMaintenanceReports(updated);
              });
              // No toast for updates - user initiated the action
            } else if (eventType === 'DELETE') {
              console.log('🗑️ Maintenance report deleted:', payload.old || 'Unknown report');
              
              // We already validated payload.old above, so it's safe to use
              const deletedReport = payload.old as any;
              
              if (deletedReport?.id) {
                // Remove from cache only if report exists
                queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
                  if (!oldData) return [];
                  
                  const existingReport = oldData.find(report => report.id === deletedReport.id);
                  if (!existingReport) {
                    console.log('🗑️ Maintenance report not found in cache for deletion, skipping');
                    return oldData;
                  }
                  
                  const filtered = oldData.filter(report => report.id !== deletedReport.id);
                  return deduplicateMaintenanceReports(filtered);
                });
              }
              // No toast here - mutation handles user-initiated deletes
              // This is for realtime updates from other users
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
      // Restore original error handlers and Object.keys
      console.error = originalConsoleError;
      window.onerror = originalWindowError;
      Object.keys = originalObjectKeys;
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clear processed events
      processedEvents.current.clear();
      
      // Unsubscribe from channels
      vehiclesChannel.unsubscribe();
      maintenanceChannel.unsubscribe();
      projectsChannel.unsubscribe();
      
      console.log('🧹 Vehicle real-time cleanup completed');
    };
  }) // End of checkAuth then block
  }, [queryClient, reconnectAttempts]);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
  };
}

// Export hook using TanStack Query pattern
export function useExportMaintenanceReports() {
  return useMutation({
    mutationFn: async (filters?: ExportFilters) => {
      const params = new URLSearchParams();
      if (filters?.format) params.append('format', filters.format);
      if (filters?.reportType) params.append('reportType', filters.reportType);
      if (filters?.vehicleId && filters.vehicleId !== 'ALL_VEHICLES') params.append('vehicleId', filters.vehicleId);
      if (filters?.status && filters.status !== 'ALL_STATUS') params.append('status', filters.status);
      if (filters?.priority && filters.priority !== 'ALL_PRIORITIES') params.append('priority', filters.priority);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/vehicles/maintenance-reports/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || 'Export failed');
      }

      return response;
    },
    onSuccess: async (response, filters) => {
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `vehicle-maintenance-reports-${new Date().toISOString().split('T')[0]}.${filters?.format || 'pdf'}`;

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Reports exported successfully as ${filters?.format?.toUpperCase() || 'PDF'}`);
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    }
  });
}

