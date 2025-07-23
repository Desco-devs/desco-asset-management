import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Fallback polling mechanism that guarantees dashboard updates
 * This works regardless of Supabase realtime status
 */
export function useDashboardPolling() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up intelligent polling
    let pollInterval: NodeJS.Timeout;
    let isTabVisible = true;
    
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      
      if (isTabVisible) {
        // When tab becomes visible, immediately refresh data
        console.log('📊 Tab visible - refreshing dashboard data');
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      }
    };

    const startPolling = () => {
      // Only poll when tab is visible to save resources
      pollInterval = setInterval(() => {
        if (isTabVisible) {
          console.log('🔄 Polling dashboard data (fallback)');
          queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
        }
      }, 30000); // Poll every 30 seconds when active
    };

    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start polling
    startPolling();

    // Cleanup
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);
}

/**
 * Manual refresh trigger - you can call this after creating/updating data
 */
export function useManualDashboardRefresh() {
  const queryClient = useQueryClient();
  
  return () => {
    console.log('🔄 Manual dashboard refresh triggered');
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
  };
}