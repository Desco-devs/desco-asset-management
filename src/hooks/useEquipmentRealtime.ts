'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { equipmentKeys } from './useEquipmentQuery'

export function useEquipmentRealtime() {
  const queryClient = useQueryClient()
  const invalidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('equipment-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        (payload) => {
          console.log('📡 Equipment realtime update received:', payload)
          
          // Enhanced cache invalidation strategy for parts updates
          let isPartsUpdate = false
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedEquipment = payload.new as any
            
            // Check if this was a parts update by looking for equipment_parts changes
            if (payload.old && 
                JSON.stringify(payload.old.equipment_parts) !== JSON.stringify(updatedEquipment.equipment_parts)) {
              console.log('🔧 Parts update detected, performing immediate cache sync')
              isPartsUpdate = true
              
              // Transform equipment_parts to match frontend format before updating cache
              const transformEquipmentParts = (rawParts: string[]) => {
                if (!rawParts || rawParts.length === 0) {
                  return { rootFiles: [], folders: [] }
                }
                
                try {
                  const firstPart = rawParts[0]
                  
                  // Check if it's a URL (legacy format)
                  if (typeof firstPart === 'string' && firstPart.startsWith('http')) {
                    return {
                      rootFiles: rawParts.map((url, index) => ({
                        id: `legacy_${index}`,
                        name: url.split('/').pop() || `image_${index}`,
                        url: url,
                        preview: url,
                        type: 'image'
                      })),
                      folders: []
                    }
                  }
                  
                  // Try to parse as JSON (modern format)
                  return JSON.parse(firstPart)
                } catch (error) {
                  // Fallback to legacy format if JSON parsing fails
                  if (rawParts.length > 0) {
                    return {
                      rootFiles: rawParts.map((url, index) => ({
                        id: `legacy_${index}`,
                        name: url.split('/').pop() || `image_${index}`,
                        url: url,
                        preview: url,
                        type: 'image'
                      })),
                      folders: []
                    }
                  }
                  return { rootFiles: [], folders: [] }
                }
              }
              
              // Immediately update the cache with transformed data to prevent stale views
              queryClient.setQueryData<any[]>(
                equipmentKeys.list(),
                (oldData) => {
                  if (!oldData) return oldData
                  
                  return oldData.map((equipment) => {
                    if (equipment.id === updatedEquipment.id) {
                      console.log('📦 Syncing equipment parts in cache:', updatedEquipment.id)
                      const transformedParts = transformEquipmentParts(updatedEquipment.equipment_parts)
                      console.log('🔄 Transformed parts for real-time sync:', transformedParts)
                      
                      // Log the change for debugging
                      const oldPartsCount = equipment.equipment_parts?.rootFiles?.length || 0
                      const newPartsCount = transformedParts.rootFiles?.length || 0
                      console.log(`📊 Parts count change: ${oldPartsCount} → ${newPartsCount}`)
                      
                      return {
                        ...equipment,
                        equipment_parts: transformedParts,
                        updated_at: updatedEquipment.updated_at
                      }
                    }
                    return equipment
                  })
                }
              )
              
              // CRITICAL FIX: Skip cache invalidation for parts updates to prevent deleted files from reappearing
              console.log('⏭️ Skipping cache invalidation for parts update to prevent race condition')
              return
            }
          }
          
          // Only perform debounced cache invalidation for NON-parts updates
          if (!isPartsUpdate) {
            if (invalidationTimeoutRef.current) {
              clearTimeout(invalidationTimeoutRef.current)
            }
            
            invalidationTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Performing debounced cache invalidation after real-time update')
              queryClient.invalidateQueries({ queryKey: equipmentKeys.list() })
              queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
            }, 300) // 300ms debounce to prevent rapid invalidations
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
      if (invalidationTimeoutRef.current) {
        clearTimeout(invalidationTimeoutRef.current)
      }
    }
  }, [queryClient])
}