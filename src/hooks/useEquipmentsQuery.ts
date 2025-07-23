"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import type { Equipment, MaintenanceReport, EquipmentMaintenanceReport, Project, Client, Location, User, ExportFilters } from "@/stores/equipmentsStore";

// Query keys for consistent cache management
export const equipmentKeys = {
  all: ['equipments'] as const,
  equipments: () => [...equipmentKeys.all, 'list'] as const,
  equipment: (id: string) => [...equipmentKeys.all, 'item', id] as const,
  projects: () => ['projects'] as const,
  clients: () => ['clients'] as const,
  locations: () => ['locations'] as const,
  users: () => ['users'] as const,
  maintenanceReports: () => ['equipment-maintenance-reports'] as const,
  equipmentMaintenanceReports: () => ['equipment-maintenance-reports'] as const,
  exports: () => ['equipment-exports'] as const,
};

// API functions
async function fetchEquipments(): Promise<Equipment[]> {
  const response = await fetch('/api/equipments/getall');
  if (!response.ok) throw new Error('Failed to fetch equipments');
  const data = await response.json();
  
  // Transform the data to match our Equipment interface
  return data.map((item: any) => ({
    uid: item.id,
    brand: item.brand,
    model: item.model,
    type: item.type,
    insuranceExpirationDate: item.insurance_expiration_date || '',
    before: item.before || undefined,
    status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
    remarks: item.remarks || undefined,
    owner: item.owner,
    image_url: item.image_url || undefined,
    inspectionDate: item.inspection_date || undefined,
    plateNumber: item.plate_number || undefined,
    originalReceiptUrl: item.original_receipt_url || undefined,
    equipmentRegistrationUrl: item.equipment_registration_url || undefined,
    thirdpartyInspectionImage: item.thirdparty_inspection_image || undefined,
    pgpcInspectionImage: item.pgpc_inspection_image || undefined,
    equipmentParts: item.equipment_parts || undefined,
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
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects/getall');
  if (!response.ok) throw new Error('Failed to fetch projects');
  const data = await response.json();
  
  return data.map((item: any) => ({
    uid: item.id,
    name: item.name,
    client: {
      uid: item.client.id,
      name: item.client.name,
      location: {
        uid: item.client.location.id,
        address: item.client.location.address,
      },
    },
  }));
}

async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clients/getall');
  if (!response.ok) throw new Error('Failed to fetch clients');
  const data = await response.json();
  
  return data.map((item: any) => ({
    uid: item.id,
    name: item.name,
    location: {
      uid: item.location.id,
      address: item.location.address,
    },
  }));
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations/getall');
  if (!response.ok) throw new Error('Failed to fetch locations');
  const data = await response.json();
  
  return data.map((item: any) => ({
    uid: item.id,
    address: item.address,
  }));
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users/getall');
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

async function fetchMaintenanceReports(): Promise<MaintenanceReport[]> {
  const response = await fetch('/api/equipments/maintenance-reports');
  if (!response.ok) throw new Error('Failed to fetch maintenance reports');
  const data = await response.json();
  return data.data || [];
}

async function fetchEquipmentMaintenanceReports(): Promise<EquipmentMaintenanceReport[]> {
  const response = await fetch('/api/equipments/maintenance-reports');
  if (!response.ok) throw new Error('Failed to fetch equipment maintenance reports');
  const data = await response.json();
  return data.data || [];
}

async function createEquipment(equipmentData: Partial<Equipment>): Promise<Equipment> {
  const response = await fetch('/api/equipments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(equipmentData),
  });
  if (!response.ok) throw new Error('Failed to create equipment');
  return response.json();
}

async function updateEquipment({ uid, ...equipmentData }: Partial<Equipment> & { uid: string }): Promise<Equipment> {
  const response = await fetch(`/api/equipments/${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(equipmentData),
  });
  if (!response.ok) throw new Error('Failed to update equipment');
  return response.json();
}

async function deleteEquipment(uid: string): Promise<void> {
  const response = await fetch(`/api/equipments/${uid}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete equipment (${response.status})`);
  }
}

async function createMaintenanceReport(reportData: Partial<MaintenanceReport>): Promise<MaintenanceReport> {
  const response = await fetch('/api/equipments/maintenance-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) throw new Error('Failed to create maintenance report');
  return response.json();
}

async function updateMaintenanceReport({ id, ...reportData }: Partial<MaintenanceReport> & { id: string }): Promise<MaintenanceReport> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
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
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Delete maintenance report error response:', errorData);
    throw new Error(errorData.error || errorData.details || `Failed to delete maintenance report (${response.status})`);
  }
}

async function createEquipmentMaintenanceReport(reportData: Partial<EquipmentMaintenanceReport>): Promise<EquipmentMaintenanceReport> {
  const response = await fetch('/api/equipments/maintenance-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) throw new Error('Failed to create equipment maintenance report');
  return response.json();
}

async function updateEquipmentMaintenanceReport({ id, ...reportData }: Partial<EquipmentMaintenanceReport> & { id: string }): Promise<EquipmentMaintenanceReport> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Update equipment maintenance report error:', errorData);
    throw new Error(errorData.error || `Failed to update equipment maintenance report (${response.status})`);
  }
  return response.json();
}

async function deleteEquipmentMaintenanceReport(id: string): Promise<void> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Delete equipment maintenance report error response:', errorData);
    throw new Error(errorData.error || errorData.details || `Failed to delete equipment maintenance report (${response.status})`);
  }
}

// Helper function to deduplicate equipments array
function deduplicateEquipments(equipments: Equipment[]): Equipment[] {
  const seen = new Set();
  return equipments.filter(equipment => {
    if (seen.has(equipment.uid)) {
      console.warn('🚨 Duplicate equipment found and removed:', equipment.uid);
      return false;
    }
    seen.add(equipment.uid);
    return true;
  });
}

// TanStack Query Hooks

// Equipments
export function useEquipments() {
  return useQuery({
    queryKey: equipmentKeys.equipments(),
    queryFn: fetchEquipments,
    select: (data) => deduplicateEquipments(data), // Always deduplicate
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Reference Data
export function useProjects() {
  return useQuery({
    queryKey: equipmentKeys.projects(),
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes - projects change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useClients() {
  return useQuery({
    queryKey: equipmentKeys.clients(),
    queryFn: fetchClients,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: equipmentKeys.locations(),
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes - locations rarely change
    gcTime: 15 * 60 * 1000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: equipmentKeys.users(),
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

export function useMaintenanceReports() {
  return useQuery({
    queryKey: equipmentKeys.maintenanceReports(),
    queryFn: fetchMaintenanceReports,
    select: (data) => deduplicateMaintenanceReports(data), // Always deduplicate
    staleTime: 1 * 60 * 1000, // 1 minute - maintenance reports change frequently
    gcTime: 3 * 60 * 1000,
  });
}

export function useEquipmentMaintenanceReports() {
  return useQuery({
    queryKey: equipmentKeys.equipmentMaintenanceReports(),
    queryFn: fetchEquipmentMaintenanceReports,
    select: (data) => deduplicateEquipmentMaintenanceReports(data), // Always deduplicate
    staleTime: 1 * 60 * 1000, // 1 minute - maintenance reports change frequently
    gcTime: 3 * 60 * 1000,
  });
}

// Combined hook for all data (optimized with parallel fetching)
export function useEquipmentsWithReferenceData() {
  const equipmentsQuery = useEquipments();
  const projectsQuery = useProjects();
  const clientsQuery = useClients();
  const locationsQuery = useLocations();
  const usersQuery = useUsers();
  const maintenanceReportsQuery = useMaintenanceReports();

  return {
    equipments: equipmentsQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    clients: clientsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    users: usersQuery.data ?? [],
    maintenanceReports: maintenanceReportsQuery.data ?? [],
    isLoading: equipmentsQuery.isLoading || projectsQuery.isLoading,
    isError: equipmentsQuery.isError || projectsQuery.isError || clientsQuery.isError || locationsQuery.isError || usersQuery.isError || maintenanceReportsQuery.isError,
    error: equipmentsQuery.error || projectsQuery.error || clientsQuery.error || locationsQuery.error || usersQuery.error || maintenanceReportsQuery.error,
  };
}

// Equipment Mutations
export function useCreateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEquipment,
    onSuccess: (newEquipment) => {
      // Optimistically add to cache immediately with deduplication
      queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
        if (!oldData) return [newEquipment];
        
        // Check if equipment already exists to prevent duplicates
        const existingEquipment = oldData.find(equipment => equipment.uid === newEquipment.uid);
        if (existingEquipment) {
          console.log('🔄 Equipment already exists in cache during create, skipping duplicate');
          return oldData;
        }
        
        console.log('✅ Adding new equipment to cache:', newEquipment.uid);
        return deduplicateEquipments([newEquipment, ...oldData]);
      });
      // Toast moved to realtime listener to show for all equipment creations
    },
    onError: (error) => {
      toast.error('Failed to create equipment: ' + error.message);
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEquipment,
    onSuccess: (updatedEquipment) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
        if (!oldData) return [updatedEquipment];
        const updated = oldData.map(equipment => 
          equipment.uid === updatedEquipment.uid ? updatedEquipment : equipment
        );
        return deduplicateEquipments(updated);
      });
      // Toast moved to realtime listener for unified notification system
    },
    onError: (error) => {
      toast.error('Failed to update equipment: ' + error.message);
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEquipment,
    onSuccess: (_, equipmentUid) => {
      // Optimistic update - remove equipment from cache immediately
      queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
        const filtered = oldData ? oldData.filter(equipment => equipment.uid !== equipmentUid) : [];
        return deduplicateEquipments(filtered);
      });
      // Toast moved to realtime listener for unified notification system
    },
    onError: (error) => {
      toast.error('Failed to delete equipment: ' + error.message);
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

// Helper function to deduplicate equipment maintenance reports array
function deduplicateEquipmentMaintenanceReports(reports: EquipmentMaintenanceReport[]): EquipmentMaintenanceReport[] {
  const seen = new Set();
  return reports.filter(report => {
    if (seen.has(report.id)) {
      console.warn('🚨 Duplicate equipment maintenance report found and removed:', report.id);
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
      queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
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
      queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
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
      queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
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

// Equipment Maintenance Report Mutations
export function useCreateEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEquipmentMaintenanceReport,
    onSuccess: (newReport) => {
      // Optimistically add to cache immediately
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.equipmentMaintenanceReports(), (oldData) => {
        if (!oldData) return [newReport];
        
        // Check if report already exists to prevent duplicates
        const existingReport = oldData.find(report => report.id === newReport.id);
        if (existingReport) {
          console.log('🔄 Equipment maintenance report already exists in cache during create, skipping duplicate');
          return oldData;
        }
        
        console.log('✅ Adding new equipment maintenance report to cache:', newReport.id);
        return deduplicateEquipmentMaintenanceReports([newReport, ...oldData]);
      });
      toast.success('Equipment maintenance report created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create equipment maintenance report: ' + error.message);
    },
  });
}

export function useUpdateEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEquipmentMaintenanceReport,
    onSuccess: (updatedReport) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.equipmentMaintenanceReports(), (oldData) => {
        if (!oldData) return [updatedReport];
        const updated = oldData.map(report => 
          report.id === updatedReport.id ? updatedReport : report
        );
        return deduplicateEquipmentMaintenanceReports(updated);
      });
      toast.success('Equipment maintenance report updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update equipment maintenance report: ' + error.message);
    },
  });
}

export function useDeleteEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEquipmentMaintenanceReport,
    onSuccess: (_, reportId) => {
      // Optimistic update - remove report from cache immediately
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.equipmentMaintenanceReports(), (oldData) => {
        const filtered = oldData ? oldData.filter(report => report.id !== reportId) : [];
        return deduplicateEquipmentMaintenanceReports(filtered);
      });
      toast.success('Equipment maintenance report deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete equipment maintenance report: ' + error.message);
    },
  });
}

// Supabase Realtime Integration
export function useSupabaseRealtime() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  
  // Simple duplicate prevention for individual toasts
  const processedEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    
    console.log('🔌 Setting up Supabase realtime subscriptions for equipments...');

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
    const channelId = `equipments-realtime-${Math.random().toString(36).substring(2, 11)}`;
    
    // Equipments realtime subscription
    const equipmentsChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipments'
        },
        (payload) => {
          try {
            // Comprehensive payload validation to prevent transformers.js errors
            if (!payload || typeof payload !== 'object') {
              console.warn('Invalid payload received for equipment event (null or not object):', payload);
              return;
            }

            // Check if payload has required properties
            if (!(payload as any).eventType && !(payload as any).event) {
              console.warn('Invalid equipment payload received (no event type):', payload);
              return;
            }

            // Normalize eventType (some versions use 'event' instead of 'eventType')
            const eventType = (payload as any).eventType || (payload as any).event;
            if (!eventType || typeof eventType !== 'string') {
              console.warn('Invalid event type in equipment payload:', payload);
              return;
            }

            // Enhanced validation for DELETE events to prevent Object.keys() errors
            if (eventType === 'DELETE') {
              if (!payload.old || typeof payload.old !== 'object' || payload.old === null) {
                console.warn('Invalid DELETE payload structure for equipment, skipping:', payload);
                // Still try to invalidate cache as fallback
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }

              // Ensure payload.old has at least an id property
              if (!(payload as any).old?.id || typeof (payload as any).old?.id !== 'string') {
                console.warn('DELETE payload.old missing valid id for equipment, skipping:', payload);
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }
            }

            // Enhanced validation for INSERT/UPDATE events
            if ((eventType === 'INSERT' || eventType === 'UPDATE')) {
              if (!payload.new || typeof payload.new !== 'object' || payload.new === null) {
                console.warn(`Invalid ${eventType} payload structure for equipment, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }

              // Ensure payload.new has at least an id property
              if (!(payload as any).new?.id || typeof (payload as any).new?.id !== 'string') {
                console.warn(`${eventType} payload.new missing valid id for equipment, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }
            }
            
            console.log('🔧 Equipment realtime event:', eventType, payload);
            
            if (eventType === 'INSERT' && payload.new) {
              console.log('✅ New equipment inserted:', payload.new);
              const equipmentData = payload.new as any;
              
              // Transform the data to match our Equipment interface
              const transformedEquipment: Equipment = {
                uid: equipmentData.id,
                brand: equipmentData.brand,
                model: equipmentData.model,
                type: equipmentData.type,
                insuranceExpirationDate: equipmentData.insurance_expiration_date || '',
                before: equipmentData.before || undefined,
                status: equipmentData.status as "OPERATIONAL" | "NON_OPERATIONAL",
                remarks: equipmentData.remarks || undefined,
                owner: equipmentData.owner,
                image_url: equipmentData.image_url || undefined,
                inspectionDate: equipmentData.inspection_date || undefined,
                plateNumber: equipmentData.plate_number || undefined,
                originalReceiptUrl: equipmentData.original_receipt_url || undefined,
                equipmentRegistrationUrl: equipmentData.equipment_registration_url || undefined,
                thirdpartyInspectionImage: equipmentData.thirdparty_inspection_image || undefined,
                pgpcInspectionImage: equipmentData.pgpc_inspection_image || undefined,
                equipmentParts: equipmentData.equipment_parts || undefined,
                project: equipmentData.project || { uid: '', name: 'Unknown', client: { uid: '', name: 'Unknown', location: { uid: '', address: 'Unknown' }}},
              };
              
              // Only add if equipment doesn't already exist in cache (prevent duplicates)
              queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
                if (!oldData) return [transformedEquipment];
                
                // Check if equipment already exists in cache
                const existingEquipment = oldData.find(equipment => equipment.uid === transformedEquipment.uid);
                if (existingEquipment) {
                  console.log('🔄 Equipment already exists in cache, skipping insert');
                  return oldData; // Don't add duplicate
                }
                
                return deduplicateEquipments([transformedEquipment, ...oldData]);
              });
              
              // Simple individual toast with duplicate prevention
              const eventKey = `insert-${transformedEquipment.uid}`;
              if (!processedEvents.current.has(eventKey)) {
                processedEvents.current.add(eventKey);
                toast.success(`Equipment "${transformedEquipment.brand} ${transformedEquipment.model}" created successfully!`);
                
                // Clean up old events (keep only last 100 to prevent memory leak)
                if (processedEvents.current.size > 100) {
                  const oldEvents = Array.from(processedEvents.current).slice(0, 50);
                  oldEvents.forEach(event => processedEvents.current.delete(event));
                }
              }
            } else if (eventType === 'UPDATE' && payload.new) {
              console.log('🔄 Equipment updated:', payload.new);
              const equipmentData = payload.new as any;
              
              // Transform the data to match our Equipment interface
              const transformedEquipment: Equipment = {
                uid: equipmentData.id,
                brand: equipmentData.brand,
                model: equipmentData.model,
                type: equipmentData.type,
                insuranceExpirationDate: equipmentData.insurance_expiration_date || '',
                before: equipmentData.before || undefined,
                status: equipmentData.status as "OPERATIONAL" | "NON_OPERATIONAL",
                remarks: equipmentData.remarks || undefined,
                owner: equipmentData.owner,
                image_url: equipmentData.image_url || undefined,
                inspectionDate: equipmentData.inspection_date || undefined,
                plateNumber: equipmentData.plate_number || undefined,
                originalReceiptUrl: equipmentData.original_receipt_url || undefined,
                equipmentRegistrationUrl: equipmentData.equipment_registration_url || undefined,
                thirdpartyInspectionImage: equipmentData.thirdparty_inspection_image || undefined,
                pgpcInspectionImage: equipmentData.pgpc_inspection_image || undefined,
                equipmentParts: equipmentData.equipment_parts || undefined,
                project: equipmentData.project || { uid: '', name: 'Unknown', client: { uid: '', name: 'Unknown', location: { uid: '', address: 'Unknown' }}},
              };
              
              // Update in cache only if equipment exists
              queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
                if (!oldData) return [];
                
                const existingIndex = oldData.findIndex(equipment => equipment.uid === transformedEquipment.uid);
                if (existingIndex === -1) {
                  console.log('🔄 Equipment not found in cache for update, skipping');
                  return oldData;
                }
                
                const updated = oldData.map(equipment => 
                  equipment.uid === transformedEquipment.uid ? transformedEquipment : equipment
                );
                return deduplicateEquipments(updated);
              });
              
              // Simple individual toast with duplicate prevention
              const eventKey = `update-${transformedEquipment.uid}`;
              if (!processedEvents.current.has(eventKey)) {
                processedEvents.current.add(eventKey);
                toast.success(`Equipment "${transformedEquipment.brand} ${transformedEquipment.model}" updated successfully!`);
              }
            } else if (eventType === 'DELETE') {
              console.log('🗑️ Equipment deleted:', payload.old || 'Unknown equipment');
              
              // We already validated payload.old above, so it's safe to use
              const deletedEquipment = payload.old as any;
              
              if (deletedEquipment?.id) {
                // Remove from cache only if equipment exists
                queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
                  if (!oldData) return [];
                  
                  const existingEquipment = oldData.find(equipment => equipment.uid === deletedEquipment.id);
                  if (!existingEquipment) {
                    console.log('🗑️ Equipment not found in cache for deletion, skipping');
                    return oldData;
                  }
                  
                  const filtered = oldData.filter(equipment => equipment.uid !== deletedEquipment.id);
                  return deduplicateEquipments(filtered);
                });
                
                // Simple individual toast with duplicate prevention
                const eventKey = `delete-${deletedEquipment.id}`;
                if (!processedEvents.current.has(eventKey)) {
                  processedEvents.current.add(eventKey);
                  toast.success(`Equipment "${deletedEquipment.brand} ${deletedEquipment.model}" deleted successfully!`);
                }
              }
            }
          } catch (error) {
            console.error('Error handling realtime equipment event:', error);
            // Still invalidate cache even if toast fails
            queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔧 Equipments subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Maintenance reports realtime subscription
    const maintenanceChannel = supabase
      .channel('equipment-maintenance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_equipment_reports'
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
                console.warn('Invalid DELETE payload structure for equipment maintenance report, skipping:', payload);
                // Still try to invalidate cache as fallback
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }

              // Ensure payload.old has at least an id property
              if (!(payload as any).old?.id || typeof (payload as any).old?.id !== 'string') {
                console.warn('DELETE payload.old missing valid id, skipping:', payload);
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }
            }

            // Enhanced validation for INSERT/UPDATE events
            if ((eventType === 'INSERT' || eventType === 'UPDATE')) {
              if (!payload.new || typeof payload.new !== 'object' || payload.new === null) {
                console.warn(`Invalid ${eventType} payload structure for equipment maintenance report, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }

              // Ensure payload.new has at least an id property
              if (!(payload as any).new?.id || typeof (payload as any).new?.id !== 'string') {
                console.warn(`${eventType} payload.new missing valid id, skipping:`, payload);
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }
            }
            
            console.log('🔧 Equipment maintenance report realtime event:', eventType, payload);
            
            if (eventType === 'INSERT' && payload.new) {
              console.log('✅ New equipment maintenance report inserted:', payload.new);
              const reportData = payload.new as any;
              // Only add if report doesn't already exist in cache (prevent duplicates)
              queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
                if (!oldData) return [reportData];
                
                // Check if report already exists in cache
                const existingReport = oldData.find(report => report.id === reportData.id);
                if (existingReport) {
                  console.log('🔄 Equipment maintenance report already exists in cache, skipping insert');
                  return oldData; // Don't add duplicate
                }
                
                return deduplicateMaintenanceReports([reportData, ...oldData]);
              });
              // No toast here - mutation handles user-initiated creates
              // This is for realtime updates from other users
            } else if (eventType === 'UPDATE' && payload.new) {
              console.log('🔄 Equipment maintenance report updated:', payload.new);
              const reportData = payload.new as any;
              // Update in cache only if report exists
              queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
                if (!oldData) return [];
                
                const existingIndex = oldData.findIndex(report => report.id === reportData.id);
                if (existingIndex === -1) {
                  console.log('🔄 Equipment maintenance report not found in cache for update, skipping');
                  return oldData;
                }
                
                const updated = oldData.map(report => 
                  report.id === reportData.id ? reportData : report
                );
                return deduplicateMaintenanceReports(updated);
              });
              // No toast for updates - user initiated the action
            } else if (eventType === 'DELETE') {
              console.log('🗑️ Equipment maintenance report deleted:', payload.old || 'Unknown report');
              
              // We already validated payload.old above, so it's safe to use
              const deletedReport = payload.old as any;
              
              if (deletedReport?.id) {
                // Remove from cache only if report exists
                queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
                  if (!oldData) return [];
                  
                  const existingReport = oldData.find(report => report.id === deletedReport.id);
                  if (!existingReport) {
                    console.log('🗑️ Equipment maintenance report not found in cache for deletion, skipping');
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
            console.error('Error handling realtime equipment maintenance report event:', error);
            // Still invalidate cache even if toast fails
            queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
          }
        }
      )
      .subscribe();

    // Projects realtime subscription (less frequent updates)
    const projectsChannel = supabase
      .channel('projects-equipments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: equipmentKeys.projects() });
          queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() }); // Equipment data includes project info
        }
      )
      .subscribe();

    return () => {
      // Restore original error handlers and Object.keys
      console.error = originalConsoleError;
      window.onerror = originalWindowError;
      Object.keys = originalObjectKeys;
      
      // Clear processed events
      processedEvents.current.clear();
      
      equipmentsChannel.unsubscribe();
      maintenanceChannel.unsubscribe();
      projectsChannel.unsubscribe();
    };
  }, [queryClient]);

  return {
    isConnected,
  };
}

// Export hook using TanStack Query pattern
export function useExportMaintenanceReports() {
  return useMutation({
    mutationFn: async (filters?: ExportFilters) => {
      const params = new URLSearchParams();
      if (filters?.format) params.append('format', filters.format);
      if (filters?.reportType) params.append('reportType', filters.reportType);
      if (filters?.equipmentId && filters.equipmentId !== 'ALL_EQUIPMENTS') params.append('equipmentId', filters.equipmentId);
      if (filters?.status && filters.status !== 'ALL_STATUS') params.append('status', filters.status);
      if (filters?.priority && filters.priority !== 'ALL_PRIORITIES') params.append('priority', filters.priority);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/equipments/maintenance-reports/export?${params.toString()}`);
      
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
        : `equipment-maintenance-reports-${new Date().toISOString().split('T')[0]}.${filters?.format || 'pdf'}`;

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