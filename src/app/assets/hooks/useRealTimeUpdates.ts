import { useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useAssetsCache } from './useAssetsQueries';
import { useAssetsStore } from '../stores/assetsStore';
import type { EquipmentWithRelations, VehicleWithRelations } from '@/types/assets';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useRealTimeUpdates() {
  const cache = useAssetsCache();
  const addNewItemId = useAssetsStore((state) => state.addNewItemId);
  const removeNewItemId = useAssetsStore((state) => state.removeNewItemId);
  const equipmentChannelRef = useRef<any>(null);
  const vehicleChannelRef = useRef<any>(null);

  useEffect(() => {
    // Equipment real-time subscription
    equipmentChannelRef.current = supabase
      .channel('equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                try {
                  // Fetch complete record with relations
                  const response = await fetch(`/api/equipment/${newRecord.id}`);
                  if (response.ok) {
                    const fullRecord: EquipmentWithRelations = await response.json();
                    cache.addEquipmentItem(fullRecord);
                    addNewItemId(newRecord.id);
                    
                    toast.success('New equipment added', {
                      description: `${fullRecord.model || 'Equipment'} has been added`,
                      action: {
                        label: 'View',
                        onClick: () => {
                          // Could open modal or navigate
                        },
                      },
                    });

                    // Remove highlight after 10 seconds
                    setTimeout(() => {
                      removeNewItemId(newRecord.id);
                    }, 10000);
                  }
                } catch (error) {
                  console.error('Error fetching new equipment:', error);
                  cache.invalidateEquipment();
                }
              }
              break;

            case 'UPDATE':
              if (newRecord) {
                try {
                  // Fetch updated record with relations
                  const response = await fetch(`/api/equipment/${newRecord.id}`);
                  if (response.ok) {
                    const fullRecord: EquipmentWithRelations = await response.json();
                    cache.updateEquipmentItem(newRecord.id, () => fullRecord);
                    
                    toast.info('Equipment updated', {
                      description: `${fullRecord.model || 'Equipment'} has been updated`,
                    });
                  }
                } catch (error) {
                  console.error('Error fetching updated equipment:', error);
                  cache.invalidateEquipment();
                }
              }
              break;

            case 'DELETE':
              if (oldRecord) {
                cache.removeEquipmentItem(oldRecord.id);
                removeNewItemId(oldRecord.id);
                
                toast.error('Equipment removed', {
                  description: 'An equipment item has been removed',
                });
              }
              break;
          }

          // Always invalidate metadata for count updates
          cache.invalidateMetadata();
        }
      )
      .subscribe();

    // Vehicle real-time subscription
    vehicleChannelRef.current = supabase
      .channel('vehicle-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicles',
        },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                try {
                  // Fetch complete record with relations
                  const response = await fetch(`/api/vehicles/${newRecord.id}`);
                  if (response.ok) {
                    const fullRecord: VehicleWithRelations = await response.json();
                    cache.addVehicleItem(fullRecord);
                    addNewItemId(newRecord.id);
                    
                    toast.success('New vehicle added', {
                      description: `${fullRecord.make} ${fullRecord.model || 'Vehicle'} has been added`,
                      action: {
                        label: 'View',
                        onClick: () => {
                          // Could open modal or navigate
                        },
                      },
                    });

                    // Remove highlight after 10 seconds
                    setTimeout(() => {
                      removeNewItemId(newRecord.id);
                    }, 10000);
                  }
                } catch (error) {
                  console.error('Error fetching new vehicle:', error);
                  cache.invalidateVehicles();
                }
              }
              break;

            case 'UPDATE':
              if (newRecord) {
                try {
                  // Fetch updated record with relations
                  const response = await fetch(`/api/vehicles/${newRecord.id}`);
                  if (response.ok) {
                    const fullRecord: VehicleWithRelations = await response.json();
                    cache.updateVehicleItem(newRecord.id, () => fullRecord);
                    
                    toast.info('Vehicle updated', {
                      description: `${fullRecord.make} ${fullRecord.model || 'Vehicle'} has been updated`,
                    });
                  }
                } catch (error) {
                  console.error('Error fetching updated vehicle:', error);
                  cache.invalidateVehicles();
                }
              }
              break;

            case 'DELETE':
              if (oldRecord) {
                cache.removeVehicleItem(oldRecord.id);
                removeNewItemId(oldRecord.id);
                
                toast.error('Vehicle removed', {
                  description: 'A vehicle has been removed',
                });
              }
              break;
          }

          // Always invalidate metadata for count updates
          cache.invalidateMetadata();
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      if (equipmentChannelRef.current) {
        supabase.removeChannel(equipmentChannelRef.current);
      }
      if (vehicleChannelRef.current) {
        supabase.removeChannel(vehicleChannelRef.current);
      }
    };
  }, [cache, addNewItemId, removeNewItemId]);

  // Return cleanup function for manual cleanup if needed
  return () => {
    if (equipmentChannelRef.current) {
      supabase.removeChannel(equipmentChannelRef.current);
    }
    if (vehicleChannelRef.current) {
      supabase.removeChannel(vehicleChannelRef.current);
    }
  };
}