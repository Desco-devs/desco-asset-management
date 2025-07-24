import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import { useDashboardStore } from '@/stores/dashboard-store';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Environment flag to disable realtime if needed
const REALTIME_ENABLED = process.env.NEXT_PUBLIC_ENABLE_REALTIME !== 'false';

export function useDashboardRealtime() {
  const queryClient = useQueryClient();
  const processedEvents = useRef<Set<string>>(new Set());
  const addRecentActivity = useDashboardStore(state => state.addRecentActivity);
  const updateEquipmentCount = useDashboardStore(state => state.updateEquipmentCount);
  const updateVehicleCount = useDashboardStore(state => state.updateVehicleCount);
  const setLoadingRealtime = useDashboardStore(state => state.setLoadingRealtime);
  const setOverviewStats = useDashboardStore(state => state.setOverviewStats);
  const overviewStats = useDashboardStore(state => state.overviewStats);

  useEffect(() => {
    // Skip realtime setup if disabled
    if (!REALTIME_ENABLED) {
      console.log('Dashboard realtime disabled - skipping connection');
      setLoadingRealtime(false);
      return;
    }

    const supabase = createClient();
    console.log('🔌 Setting up Dashboard realtime subscriptions...');
    console.log('🔌 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🔌 Real-time enabled:', REALTIME_ENABLED);
    
    setLoadingRealtime(true);

    // Create a single channel for all dashboard tables
    const dashboardChannel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations'
        },
        (payload) => {
          console.log('🏢 Location change:', payload);
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
          console.log('👥 Client change:', payload);
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
          console.log('📁 Project change:', payload);
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
          console.log('🔧 Equipment change:', payload);
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
          console.log('🚗 Vehicle change:', payload);
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
          console.log('🔧 Equipment maintenance report change:', payload);
          handleMaintenanceReportChange(payload);
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
          console.log('🚗 Vehicle maintenance report change:', payload);
          handleMaintenanceReportChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Dashboard channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Dashboard realtime connected successfully');
          setLoadingRealtime(false);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Dashboard realtime connection failed');
          setLoadingRealtime(false);
        } else if (status === 'CLOSED') {
          console.log('🔌 Dashboard realtime connection closed');
          setLoadingRealtime(false);
        }
      });

    // Handler functions
    function handleLocationChange(payload: any) {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          if (overviewStats) {
            const updatedStats = {
              ...overviewStats,
              locations: overviewStats.locations + 1,
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `location-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'location',
            action: 'created',
            description: `New location "${newRecord.address || 'Unknown'}" added`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('Error handling location change:', error);
      }
    }

    function handleClientChange(payload: any) {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          if (overviewStats) {
            const updatedStats = {
              ...overviewStats,
              clients: overviewStats.clients + 1,
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
        console.error('Error handling client change:', error);
      }
    }

    function handleProjectChange(payload: any) {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          if (overviewStats) {
            const updatedStats = {
              ...overviewStats,
              projects: overviewStats.projects + 1,
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
        console.error('Error handling project change:', error);
      }
    }

    function handleEquipmentChange(payload: any) {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          if (newRecord.id && newRecord.status) {
            updateEquipmentCount(newRecord.id, newRecord.status);
          }
          
          if (overviewStats) {
            const updatedStats = {
              ...overviewStats,
              equipment: {
                ...overviewStats.equipment,
                total: overviewStats.equipment.total + 1,
                operational: newRecord.status === 'OPERATIONAL' 
                  ? overviewStats.equipment.operational + 1 
                  : overviewStats.equipment.operational,
                nonOperational: newRecord.status === 'NON_OPERATIONAL' 
                  ? overviewStats.equipment.nonOperational + 1 
                  : overviewStats.equipment.nonOperational,
              },
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `equipment-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'equipment',
            action: 'created',
            description: `New equipment "${newRecord.name || newRecord.brand || 'Unknown'}" added`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('Error handling equipment change:', error);
      }
    }

    function handleVehicleChange(payload: any) {
      try {
        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          if (newRecord.id && newRecord.status) {
            updateVehicleCount(newRecord.id, newRecord.status);
          }
          
          if (overviewStats) {
            const updatedStats = {
              ...overviewStats,
              vehicles: {
                ...overviewStats.vehicles,
                total: overviewStats.vehicles.total + 1,
                operational: newRecord.status === 'OPERATIONAL' 
                  ? overviewStats.vehicles.operational + 1 
                  : overviewStats.vehicles.operational,
                nonOperational: newRecord.status === 'NON_OPERATIONAL' 
                  ? overviewStats.vehicles.nonOperational + 1 
                  : overviewStats.vehicles.nonOperational,
              },
            };
            setOverviewStats(updatedStats);
          }
          
          addRecentActivity({
            id: `vehicle-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'vehicle',
            action: 'created',
            description: `New vehicle "${newRecord.plate_number || newRecord.name || 'Unknown'}" added`,
            timestamp: new Date().toISOString(),
            user: 'System',
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      } catch (error) {
        console.error('Error handling vehicle change:', error);
      }
    }

    function handleMaintenanceReportChange(payload: any) {
      try {
        // For maintenance reports, we should refresh the maintenance alerts
        // since they're derived from multiple complex queries
        console.log('🔧 Maintenance report changed, invalidating dashboard data');
        
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        
        if (payload.eventType === 'INSERT' && payload.new) {
          const newRecord = payload.new;
          
          addRecentActivity({
            id: `maintenance-${newRecord.id || Date.now()}-${Date.now()}`,
            type: 'maintenance',
            action: 'reported',
            description: `New maintenance report: ${(newRecord.issue_description || 'No description').substring(0, 50)}...`,
            timestamp: new Date().toISOString(),
            user: 'System', // In real scenario, would get user from reported_by
            status: newRecord.status || 'REPORTED',
            priority: newRecord.priority || 'MEDIUM',
          });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Check if status changed
          if (newRecord.status !== oldRecord.status) {
            const actionMap = {
              'IN_PROGRESS': 'started',
              'COMPLETED': 'completed',
              'CANCELLED': 'cancelled'
            };
            
            const action = actionMap[newRecord.status as keyof typeof actionMap] || 'updated';
            
            addRecentActivity({
              id: `maintenance-status-${newRecord.id}-${Date.now()}`,
              type: 'maintenance',
              action,
              description: `Maintenance status changed to ${newRecord.status?.toLowerCase().replace('_', ' ')}`,
              timestamp: new Date().toISOString(),
              user: 'System', // In real scenario, would get user from repaired_by for completion
              status: newRecord.status || 'REPORTED',
              priority: newRecord.priority || 'MEDIUM',
            });
          }
        }
      } catch (error) {
        console.error('Error handling maintenance report change:', error);
      }
    }

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up dashboard realtime subscription');
      try {
        supabase.removeChannel(dashboardChannel);
      } catch (error) {
        console.warn('Error removing dashboard channel:', error);
      }
      setLoadingRealtime(false);
    };
  }, [
    queryClient,
    addRecentActivity,
    updateEquipmentCount,
    updateVehicleCount,
    setLoadingRealtime,
    setOverviewStats,
    overviewStats,
  ]);
}

// Hook to sync TanStack Query data with Zustand store
export function useDashboardDataSync() {
  const setOverviewStats = useDashboardStore(state => state.setOverviewStats);
  const setEquipmentCounts = useDashboardStore(state => state.setEquipmentCounts);
  const setVehicleCounts = useDashboardStore(state => state.setVehicleCounts);
  const setRecentActivity = useDashboardStore(state => state.setRecentActivity);
  const setMaintenanceAlerts = useDashboardStore(state => state.setMaintenanceAlerts);
  
  return useCallback((data: any) => {
    if (!data) return;
    
    // Sync server data with store
    if (data.overviewStats) {
      setOverviewStats(data.overviewStats);
    }
    
    if (data.equipmentCounts) {
      setEquipmentCounts(data.equipmentCounts);
    }
    
    if (data.vehicleCounts) {
      setVehicleCounts(data.vehicleCounts);
    }
    
    if (data.recentActivity) {
      setRecentActivity(data.recentActivity);
    }
    
    // Sync maintenance alerts from API response
    if (data.maintenanceAlerts) {
      setMaintenanceAlerts(data.maintenanceAlerts);
    }
  }, [setOverviewStats, setEquipmentCounts, setVehicleCounts, setRecentActivity, setMaintenanceAlerts]);
}
