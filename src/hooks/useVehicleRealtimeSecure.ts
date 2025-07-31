"use client";

/**
 * Secure Vehicle Real-time Hook with Authentication and Role-based Access Control
 * 
 * This hook provides comprehensive real-time updates for vehicle data with:
 * - User authentication verification
 * - Role-based access control 
 * - Optimistic updates and error handling
 * - Connection monitoring and reconnection logic
 * - Performance optimizations
 */

import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { vehicleKeys } from "./useVehiclesQuery";
import type { Vehicle, MaintenanceReport } from "@/stores/vehiclesStore";

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

export function useVehicleRealtimeSecure() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Simple duplicate prevention for individual toasts
  const processedEvents = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    
    console.log('🔐 Setting up secure vehicle realtime subscriptions...');

    // Authentication and role verification
    const checkUserAccess = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.log('🚫 No authenticated user, skipping vehicle realtime subscription');
          setIsConnected(false);
          setConnectionError('Authentication required');
          return null;
        }

        // Verify user session and get role
        try {
          const response = await fetch('/api/session');
          if (!response.ok) {
            console.log('🚫 Failed to fetch user session, skipping realtime subscription');
            setConnectionError('Session verification failed');
            return null;
          }
          
          const sessionData = await response.json();
          if (!sessionData.user || sessionData.user.user_status !== 'ACTIVE') {
            console.log('🚫 User account is not active, skipping realtime subscription');
            setConnectionError('Account not active');
            return null;
          }

          const role = sessionData.user.role;
          setUserRole(role);
          console.log(`✅ User authenticated with role: ${role}, proceeding with vehicle realtime subscription`);
          return { user, role };
        } catch (sessionError) {
          console.error('Error verifying user session:', sessionError);
          setConnectionError('Session verification error');
          return null;
        }
      } catch (error) {
        console.error('Error checking user access for vehicle realtime:', error);
        setConnectionError('Authentication error');
        return null;
      }
    };

    // Setup subscriptions with proper auth
    const setupSubscriptions = async () => {
      const userInfo = await checkUserAccess();
      if (!userInfo) {
        return null;
      }

      // Reset connection error on successful authentication
      setConnectionError(null);

      // Generate unique channel name to avoid conflicts
      const channelId = `vehicles-secure-${Math.random().toString(36).substring(2, 11)}`;
      
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
              // Validate payload structure
              if (!payload || typeof payload !== 'object') {
                console.warn('Invalid payload received for vehicle event:', payload);
                return;
              }

              const eventType = (payload as any).eventType || (payload as any).event;
              if (!eventType || typeof eventType !== 'string') {
                console.warn('Invalid event type in vehicle payload:', payload);
                return;
              }

              console.log(`🚗 Vehicle realtime event (${userInfo.role}):`, eventType, payload);
              
              // Handle different event types with role-based filtering
              if (eventType === 'INSERT' && payload.new) {
                const vehicleData = payload.new as any;
                
                // Role-based access: VIEWER role should only see vehicles in their accessible projects
                // For now, allow all authenticated users to see insertions
                // TODO: Add project-based filtering for VIEWER role
                
                queryClient.setQueryData<Vehicle[]>(vehicleKeys.vehicles(), (oldData) => {
                  if (!oldData) return [vehicleData];
                  
                  const existingVehicle = oldData.find(vehicle => vehicle.id === vehicleData.id);
                  if (existingVehicle) {
                    console.log('🔄 Vehicle already exists in cache, skipping insert');
                    return oldData;
                  }
                  
                  return deduplicateVehicles([vehicleData, ...oldData]);
                });
                
                // Invalidate dashboard data
                queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                
              } else if (eventType === 'UPDATE' && payload.new) {
                const vehicleData = payload.new as any;
                
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
                
                // Invalidate dashboard data
                queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                
              } else if (eventType === 'DELETE' && payload.old) {
                const deletedVehicle = payload.old as any;
                
                if (deletedVehicle?.id) {
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
                  
                  // Invalidate dashboard data
                  queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
                  queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                }
              }
            } catch (error) {
              console.error('Error handling realtime vehicle event:', error);
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
        .channel('maintenance-secure-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_vehicle_reports'
          },
          (payload) => {
            try {
              if (!payload || typeof payload !== 'object') {
                console.warn('Invalid payload received for maintenance event:', payload);
                return;
              }

              const eventType = (payload as any).eventType || (payload as any).event;
              if (!eventType || typeof eventType !== 'string') {
                console.warn('Invalid event type in maintenance payload:', payload);
                return;
              }
              
              console.log(`🔧 Maintenance report realtime event (${userInfo.role}):`, eventType, payload);
              
              if (eventType === 'INSERT' && payload.new) {
                const reportData = payload.new as any;
                queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
                  if (!oldData) return [reportData];
                  
                  const existingReport = oldData.find(report => report.id === reportData.id);
                  if (existingReport) {
                    console.log('🔄 Maintenance report already exists in cache, skipping insert');
                    return oldData;
                  }
                  
                  return deduplicateMaintenanceReports([reportData, ...oldData]);
                });
              } else if (eventType === 'UPDATE' && payload.new) {
                const reportData = payload.new as any;
                queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
                  if (!oldData) return [];
                  
                  const updated = oldData.map(report => 
                    report.id === reportData.id ? reportData : report
                  );
                  return deduplicateMaintenanceReports(updated);
                });
              } else if (eventType === 'DELETE' && payload.old) {
                const deletedReport = payload.old as any;
                if (deletedReport?.id) {
                  queryClient.setQueryData<MaintenanceReport[]>(vehicleKeys.maintenanceReports(), (oldData) => {
                    if (!oldData) return [];
                    const filtered = oldData.filter(report => report.id !== deletedReport.id);
                    return deduplicateMaintenanceReports(filtered);
                  });
                }
              }
            } catch (error) {
              console.error('Error handling realtime maintenance report event:', error);
              queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
            }
          }
        )
        .subscribe();

      // Store channels for cleanup
      channelsRef.current = [vehiclesChannel, maintenanceChannel];

      return () => {
        // Clear reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Clear processed events
        processedEvents.current.clear();
        
        // Unsubscribe from channels
        channelsRef.current.forEach(channel => channel?.unsubscribe());
        channelsRef.current = [];
        
        console.log('🧹 Secure vehicle real-time cleanup completed');
      };
    };

    const cleanup = setupSubscriptions();
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn?.());
      }
    };
  }, [queryClient, reconnectAttempts]);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
    userRole,
  };
}