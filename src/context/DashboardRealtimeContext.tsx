"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useDashboardStore } from '@/stores/dashboard-store';

// Environment flag to disable realtime if needed
const REALTIME_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REALTIME !== 'false';

// Connection retry configuration
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 30000; // 30 seconds

interface DashboardRealtimeContextType {
  isConnected: boolean;
  connectionError: string | null;
  retryConnection: () => void;
}

const DashboardRealtimeContext = createContext<DashboardRealtimeContextType>({
  isConnected: false,
  connectionError: null,
  retryConnection: () => {},
});

export function DashboardRealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const isConnectedRef = useRef(false);
  const channelRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionErrorRef = useRef<string | null>(null);
  
  // Get Zustand store actions and state
  const addRecentActivity = useDashboardStore(state => state.addRecentActivity);
  const updateEquipmentCount = useDashboardStore(state => state.updateEquipmentCount);
  const updateVehicleCount = useDashboardStore(state => state.updateVehicleCount);
  const setLoadingRealtime = useDashboardStore(state => state.setLoadingRealtime);
  const setOverviewStats = useDashboardStore(state => state.setOverviewStats);

  // Clear retry timeout on cleanup
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Calculate retry delay with exponential backoff
  const getRetryDelay = useCallback((attempt: number): number => {
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
    return Math.min(delay, MAX_RETRY_DELAY);
  }, []);

  // Retry connection with exponential backoff
  const retryConnection = useCallback(() => {
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      console.error('🌐❌ Max retry attempts reached. Connection failed permanently.');
      connectionErrorRef.current = 'Connection failed after maximum retry attempts';
      setLoadingRealtime(false);
      return;
    }

    const retryDelay = getRetryDelay(retryCountRef.current);
    console.log(`🌐🔄 Retrying connection in ${retryDelay}ms (attempt ${retryCountRef.current + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    retryTimeoutRef.current = setTimeout(() => {
      retryCountRef.current++;
      setupRealtimeConnection();
    }, retryDelay);
  }, [getRetryDelay]);

  // Setup realtime connection
  const setupRealtimeConnection = useCallback(() => {
    // Skip realtime setup if disabled
    if (!REALTIME_ENABLED) {
      console.log('🔌 Dashboard realtime disabled - skipping global connection');
      setLoadingRealtime(false);
      return;
    }

    // Clear any existing timeout
    clearRetryTimeout();

    // Clean up existing channel
    if (channelRef.current) {
      try {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      } catch (error) {
        console.warn('🌐 Error removing existing channel:', error);
      }
    }

    const supabase = createClient();
    console.log('🌐 Setting up GLOBAL Dashboard realtime subscriptions...');
    console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🌐 Retry attempt:', retryCountRef.current + 1);
    
    setLoadingRealtime(true);

    // Create a unique channel name to avoid conflicts
    const channelName = `global-dashboard-realtime-${Math.random().toString(36).substring(2, 11)}`;
    const dashboardChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations'
        },
        (payload) => {
          console.log('🌐🏢 GLOBAL Location change:', payload);
          handleLocationChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        (payload) => {
          console.log('🌐👥 GLOBAL Client change:', payload);
          handleClientChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('🌐📁 GLOBAL Project change:', payload);
          handleProjectChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment'
        },
        (payload) => {
          console.log('🌐🔧 GLOBAL Equipment change:', payload);
          handleEquipmentChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles'
        },
        (payload) => {
          console.log('🌐🚗 GLOBAL Vehicle change:', payload);
          handleVehicleChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_equipment_reports'
        },
        (payload) => {
          console.log('🌐🔧📋 GLOBAL Equipment Maintenance change:', payload);
          handleEquipmentMaintenanceChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_vehicle_reports'
        },
        (payload) => {
          console.log('🌐🚗📋 GLOBAL Vehicle Maintenance change:', payload);
          handleVehicleMaintenanceChange(payload);
        }
      )
      .subscribe((status, err) => {
        console.log('🌐📡 GLOBAL Dashboard channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('🌐✅ GLOBAL Dashboard realtime connected successfully');
          isConnectedRef.current = true;
          connectionErrorRef.current = null;
          retryCountRef.current = 0; // Reset retry count on successful connection
          setLoadingRealtime(false);
        } else if (status === 'CHANNEL_ERROR') {
          const errorMessage = err?.message || 'Unknown connection error';
          console.error('🌐❌ GLOBAL Dashboard realtime connection failed:', errorMessage);
          connectionErrorRef.current = errorMessage;
          isConnectedRef.current = false;
          setLoadingRealtime(false);
          
          // Attempt to retry connection
          retryConnection();
        } else if (status === 'TIMED_OUT') {
          console.error('🌐⏰ GLOBAL Dashboard realtime connection timed out');
          connectionErrorRef.current = 'Connection timed out';
          isConnectedRef.current = false;
          setLoadingRealtime(false);
          
          // Attempt to retry connection
          retryConnection();
        } else if (status === 'CLOSED') {
          console.log('🌐🔌 GLOBAL Dashboard realtime connection closed');
          isConnectedRef.current = false;
          setLoadingRealtime(false);
          
          // Only retry if it wasn't an intentional close (component unmounting)
          if (connectionErrorRef.current !== 'intentional_close') {
            retryConnection();
          }
        }
      });

    channelRef.current = dashboardChannel;

    // Add error handler for the channel
    dashboardChannel.on('system', { event: 'error' }, (error) => {
      console.error('🌐❌ GLOBAL Dashboard channel error:', error);
      connectionErrorRef.current = error?.message || 'Channel error occurred';
      isConnectedRef.current = false;
      retryConnection();
    });

    // Handler functions - Enhanced with error handling
    function handleLocationChange(payload: any) {
      try {
        // Validate payload structure
        if (!payload || typeof payload !== 'object') {
          console.warn('🌐 Invalid location payload:', payload);
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          // Update overview stats immediately - get fresh state
          const currentStats = useDashboardStore.getState().overviewStats;
          if (currentStats) {
            const updatedStats = {
              ...currentStats,
              locations: currentStats.locations + 1,
            };
            setOverviewStats(updatedStats);
          }
          
          // Add to recent activity
          addRecentActivity({
            id: `location-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'location',
            action: 'created',
            description: `New location "${newRecord.address || 'Unknown'}" added`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        }
        
        // Invalidate dashboard cache to refresh all dashboard data
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('🌐 Error handling location change:', error);
        // Fallback: invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    }

    function handleClientChange(payload: any) {
      try {
        // Validate payload structure
        if (!payload || typeof payload !== 'object') {
          console.warn('🌐 Invalid client payload:', payload);
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          const currentStats = useDashboardStore.getState().overviewStats;
          if (currentStats) {
            const updatedStats = {
              ...currentStats,
              clients: currentStats.clients + 1,
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `client-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'client',
            action: 'created',
            description: `New client "${newRecord.name || 'Unknown'}" added`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('🌐 Error handling client change:', error);
        // Fallback: invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    }

    function handleProjectChange(payload: any) {
      try {
        // Validate payload structure
        if (!payload || typeof payload !== 'object') {
          console.warn('🌐 Invalid project payload:', payload);
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          const currentStats = useDashboardStore.getState().overviewStats;
          if (currentStats) {
            const updatedStats = {
              ...currentStats,
              projects: currentStats.projects + 1,
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `project-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'project',
            action: 'created',
            description: `New project "${newRecord.name || 'Unknown'}" created`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('🌐 Error handling project change:', error);
        // Fallback: invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    }

    function handleEquipmentChange(payload: any) {
      try {
        // Validate payload structure
        if (!payload || typeof payload !== 'object') {
          console.warn('🌐 Invalid equipment payload:', payload);
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          if (newRecord.id && newRecord.status) {
            updateEquipmentCount(newRecord.id, newRecord.status);
          }
          
          const currentStats = useDashboardStore.getState().overviewStats;
          if (currentStats) {
            const updatedStats = {
              ...currentStats,
              equipment: {
                ...currentStats.equipment,
                total: currentStats.equipment.total + 1,
                operational: newRecord.status === 'OPERATIONAL' 
                  ? currentStats.equipment.operational + 1 
                  : currentStats.equipment.operational,
                nonOperational: newRecord.status === 'NON_OPERATIONAL' 
                  ? currentStats.equipment.nonOperational + 1 
                  : currentStats.equipment.nonOperational,
              },
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `equipment-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'equipment',
            action: 'created',
            description: `New equipment "${newRecord.brand || newRecord.model || 'Unknown'}" added`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Handle status changes
          if (newRecord.status !== oldRecord.status) {
            const currentStats = useDashboardStore.getState().overviewStats;
            if (currentStats) {
              let operationalDelta = 0;
              let nonOperationalDelta = 0;
              
              if (oldRecord.status === 'OPERATIONAL' && newRecord.status === 'NON_OPERATIONAL') {
                operationalDelta = -1;
                nonOperationalDelta = 1;
              } else if (oldRecord.status === 'NON_OPERATIONAL' && newRecord.status === 'OPERATIONAL') {
                operationalDelta = 1;
                nonOperationalDelta = -1;
              }
              
              const updatedStats = {
                ...currentStats,
                equipment: {
                  ...currentStats.equipment,
                  operational: Math.max(0, currentStats.equipment.operational + operationalDelta),
                  nonOperational: Math.max(0, currentStats.equipment.nonOperational + nonOperationalDelta),
                },
              };
              setOverviewStats(updatedStats);
            }
            
            addRecentActivity({
              id: `equipment-status-${newRecord.id || Date.now()}-${Date.now()}`,
              type: 'equipment',
              action: 'updated',
              description: `Equipment "${newRecord.brand || newRecord.model || 'Unknown'}" status changed from ${oldRecord.status} to ${newRecord.status}`,
              timestamp: new Date().toISOString(),
              user: 'System',
            });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('🌐 Error handling equipment change:', error);
        // Fallback: invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    }

    function handleVehicleChange(payload: any) {
      try {
        // Validate payload structure
        if (!payload || typeof payload !== 'object') {
          console.warn('🌐 Invalid vehicle payload:', payload);
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          if (newRecord.id && newRecord.status) {
            updateVehicleCount(newRecord.id, newRecord.status);
          }
          
          const currentStats = useDashboardStore.getState().overviewStats;
          if (currentStats) {
            const updatedStats = {
              ...currentStats,
              vehicles: {
                ...currentStats.vehicles,
                total: currentStats.vehicles.total + 1,
                operational: newRecord.status === 'OPERATIONAL' 
                  ? currentStats.vehicles.operational + 1 
                  : currentStats.vehicles.operational,
                nonOperational: newRecord.status === 'NON_OPERATIONAL' 
                  ? currentStats.vehicles.nonOperational + 1 
                  : currentStats.vehicles.nonOperational,
              },
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `vehicle-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'vehicle',
            action: 'created',
            description: `New vehicle "${newRecord.plate_number || newRecord.brand || 'Unknown'}" added`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Handle status changes
          if (newRecord.status !== oldRecord.status) {
            const currentStats = useDashboardStore.getState().overviewStats;
            if (currentStats) {
              let operationalDelta = 0;
              let nonOperationalDelta = 0;
              
              if (oldRecord.status === 'OPERATIONAL' && newRecord.status === 'NON_OPERATIONAL') {
                operationalDelta = -1;
                nonOperationalDelta = 1;
              } else if (oldRecord.status === 'NON_OPERATIONAL' && newRecord.status === 'OPERATIONAL') {
                operationalDelta = 1;
                nonOperationalDelta = -1;
              }
              
              const updatedStats = {
                ...currentStats,
                vehicles: {
                  ...currentStats.vehicles,
                  operational: Math.max(0, currentStats.vehicles.operational + operationalDelta),
                  nonOperational: Math.max(0, currentStats.vehicles.nonOperational + nonOperationalDelta),
                },
              };
              setOverviewStats(updatedStats);
            }
            
            addRecentActivity({
              id: `vehicle-status-${newRecord.id || Date.now()}-${Date.now()}`,
              type: 'vehicle',
              action: 'updated',
              description: `Vehicle "${newRecord.plate_number || newRecord.brand || 'Unknown'}" status changed from ${oldRecord.status} to ${newRecord.status}`,
              timestamp: new Date().toISOString(),
              user: 'System',
            });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('🌐 Error handling vehicle change:', error);
        // Fallback: invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    }

    function handleEquipmentMaintenanceChange(payload: any) {
      try {
        // Validate payload structure
        if (!payload || typeof payload !== 'object') {
          console.warn('🌐 Invalid equipment maintenance payload:', payload);
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          const currentStats = useDashboardStore.getState().overviewStats;
          if (currentStats) {
            const updatedStats = {
              ...currentStats,
              maintenanceReports: {
                ...currentStats.maintenanceReports,
                total: currentStats.maintenanceReports.total + 1,
                pending: newRecord.status === 'PENDING' 
                  ? currentStats.maintenanceReports.pending + 1 
                  : currentStats.maintenanceReports.pending,
                inProgress: newRecord.status === 'IN_PROGRESS' 
                  ? currentStats.maintenanceReports.inProgress + 1 
                  : currentStats.maintenanceReports.inProgress,
              },
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `maintenance-equipment-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'maintenance',
            action: 'created',
            description: `New equipment maintenance report created: "${newRecord.issue_description?.substring(0, 50) || 'Maintenance required'}..."`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Handle status changes
          if (newRecord.status !== oldRecord.status) {
            const currentStats = useDashboardStore.getState().overviewStats;
            if (currentStats) {
              let pendingDelta = 0;
              let inProgressDelta = 0;
              
              // Remove from old status
              if (oldRecord.status === 'PENDING') pendingDelta -= 1;
              if (oldRecord.status === 'IN_PROGRESS') inProgressDelta -= 1;
              
              // Add to new status
              if (newRecord.status === 'PENDING') pendingDelta += 1;
              if (newRecord.status === 'IN_PROGRESS') inProgressDelta += 1;
              
              const updatedStats = {
                ...currentStats,
                maintenanceReports: {
                  ...currentStats.maintenanceReports,
                  pending: Math.max(0, currentStats.maintenanceReports.pending + pendingDelta),
                  inProgress: Math.max(0, currentStats.maintenanceReports.inProgress + inProgressDelta),
                },
              };
              setOverviewStats(updatedStats);
            }
            
            addRecentActivity({
              id: `maintenance-status-${newRecord.id || Date.now()}-${Date.now()}`,
              type: 'maintenance',
              action: 'updated',
              description: `Equipment maintenance report status changed from ${oldRecord.status} to ${newRecord.status}`,
              timestamp: new Date().toISOString(),
              user: 'System',
            });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('🌐 Error handling equipment maintenance change:', error);
        // Fallback: invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    }

    function handleVehicleMaintenanceChange(payload: any) {
      try {
        // Validate payload structure
        if (!payload || typeof payload !== 'object') {
          console.warn('🌐 Invalid vehicle maintenance payload:', payload);
          return;
        }

        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          const currentStats = useDashboardStore.getState().overviewStats;
          if (currentStats) {
            const updatedStats = {
              ...currentStats,
              maintenanceReports: {
                ...currentStats.maintenanceReports,
                total: currentStats.maintenanceReports.total + 1,
                pending: newRecord.status === 'PENDING' 
                  ? currentStats.maintenanceReports.pending + 1 
                  : currentStats.maintenanceReports.pending,
                inProgress: newRecord.status === 'IN_PROGRESS' 
                  ? currentStats.maintenanceReports.inProgress + 1 
                  : currentStats.maintenanceReports.inProgress,
              },
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `maintenance-vehicle-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'maintenance',
            action: 'created',
            description: `New vehicle maintenance report created: "${newRecord.issue_description?.substring(0, 50) || 'Maintenance required'}..."`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        } else if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Handle status changes
          if (newRecord.status !== oldRecord.status) {
            const currentStats = useDashboardStore.getState().overviewStats;
            if (currentStats) {
              let pendingDelta = 0;
              let inProgressDelta = 0;
              
              // Remove from old status
              if (oldRecord.status === 'PENDING') pendingDelta -= 1;
              if (oldRecord.status === 'IN_PROGRESS') inProgressDelta -= 1;
              
              // Add to new status
              if (newRecord.status === 'PENDING') pendingDelta += 1;
              if (newRecord.status === 'IN_PROGRESS') inProgressDelta += 1;
              
              const updatedStats = {
                ...currentStats,
                maintenanceReports: {
                  ...currentStats.maintenanceReports,
                  pending: Math.max(0, currentStats.maintenanceReports.pending + pendingDelta),
                  inProgress: Math.max(0, currentStats.maintenanceReports.inProgress + inProgressDelta),
                },
              };
              setOverviewStats(updatedStats);
            }
            
            addRecentActivity({
              id: `maintenance-vehicle-status-${newRecord.id || Date.now()}-${Date.now()}`,
              type: 'maintenance',
              action: 'updated',
              description: `Vehicle maintenance report status changed from ${oldRecord.status} to ${newRecord.status}`,
              timestamp: new Date().toISOString(),
              user: 'System',
            });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('🌐 Error handling vehicle maintenance change:', error);
        // Fallback: invalidate queries to ensure data consistency
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    }

  }, [clearRetryTimeout, retryConnection]); // Add dependencies

  // Initial setup effect
  useEffect(() => {
    setupRealtimeConnection();

    // Cleanup function - only runs when component unmounts (app closes)
    return () => {
      console.log('🌐🔌 Cleaning up GLOBAL dashboard realtime subscription');
      
      // Mark as intentional close to prevent retry
      connectionErrorRef.current = 'intentional_close';
      
      // Clear any pending retry timeout
      clearRetryTimeout();
      
      try {
        if (channelRef.current) {
          const supabase = createClient();
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch (error) {
        console.warn('🌐 Error removing global dashboard channel:', error);
      }
      
      setLoadingRealtime(false);
      isConnectedRef.current = false;
      retryCountRef.current = 0;
    };
  }, []); // Empty dependency array - only runs once on mount

  // Manual retry function for external use
  const manualRetryConnection = useCallback(() => {
    console.log('🌐🔄 Manual retry requested');
    retryCountRef.current = 0; // Reset retry count for manual retry
    connectionErrorRef.current = null;
    setupRealtimeConnection();
  }, [setupRealtimeConnection]);

  return (
    <DashboardRealtimeContext.Provider 
      value={{ 
        isConnected: isConnectedRef.current, 
        connectionError: connectionErrorRef.current,
        retryConnection: manualRetryConnection
      }}
    >
      {children}
    </DashboardRealtimeContext.Provider>
  );
}

export function useDashboardRealtimeContext() {
  return useContext(DashboardRealtimeContext);
}