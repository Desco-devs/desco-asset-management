/**
 * Network utilities for mobile-optimized data fetching
 * Provides connection quality detection and adaptive strategies
 */

export type ConnectionType = 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
export type NetworkQuality = 'poor' | 'fair' | 'good' | 'excellent';

interface NetworkInfo {
  type: ConnectionType;
  quality: NetworkQuality;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * Get current network information using Network Information API
 */
export function getNetworkInfo(): NetworkInfo {
  // Check if Network Information API is available
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  if (!connection) {
    return {
      type: 'unknown',
      quality: 'good', // Assume good connection as fallback
      effectiveType: 'unknown',
      downlink: 10, // Assume decent speed
      rtt: 100,
      saveData: false,
    };
  }
  
  const effectiveType = connection.effectiveType || 'unknown';
  const downlink = connection.downlink || 10;
  const rtt = connection.rtt || 100;
  const saveData = connection.saveData || false;
  
  return {
    type: mapEffectiveTypeToConnectionType(effectiveType),
    quality: determineNetworkQuality(effectiveType, downlink, rtt),
    effectiveType,
    downlink,
    rtt,
    saveData,
  };
}

/**
 * Map effective connection type to our ConnectionType enum
 */
function mapEffectiveTypeToConnectionType(effectiveType: string): ConnectionType {
  switch (effectiveType.toLowerCase()) {
    case 'slow-2g':
      return 'slow-2g';
    case '2g':
      return '2g';
    case '3g':
      return '3g';
    case '4g':
      return '4g';
    default:
      return 'unknown';
  }
}

/**
 * Determine network quality based on connection metrics
 */
function determineNetworkQuality(
  effectiveType: string,
  downlink: number,
  rtt: number
): NetworkQuality {
  // Priority to effective type first
  switch (effectiveType.toLowerCase()) {
    case 'slow-2g':
      return 'poor';
    case '2g':
      return 'poor';
    case '3g':
      return 'fair';
    case '4g':
      if (downlink >= 10 && rtt <= 100) return 'excellent';
      if (downlink >= 5 && rtt <= 200) return 'good';
      return 'fair';
    default:
      // Fallback to downlink and RTT analysis
      if (downlink >= 10 && rtt <= 100) return 'excellent';
      if (downlink >= 5 && rtt <= 200) return 'good';
      if (downlink >= 1.5 && rtt <= 500) return 'fair';
      return 'poor';
  }
}

/**
 * Check if connection is considered slow
 */
export function isSlowConnection(): boolean {
  const { quality, saveData } = getNetworkInfo();
  return quality === 'poor' || saveData;
}

/**
 * Check if device is likely on mobile data
 */
export function isMobileConnection(): boolean {
  const { type } = getNetworkInfo();
  return ['slow-2g', '2g', '3g', '4g'].includes(type);
}

/**
 * Get optimal image compression settings based on network quality
 */
export function getOptimalImageSettings() {
  const { quality, saveData } = getNetworkInfo();
  
  if (saveData || quality === 'poor') {
    return {
      maxWidth: 256,
      maxHeight: 256,
      quality: 0.6,
      maxSizeKB: 50,
    };
  }
  
  if (quality === 'fair') {
    return {
      maxWidth: 384,
      maxHeight: 384,
      quality: 0.7,
      maxSizeKB: 100,
    };
  }
  
  if (quality === 'good') {
    return {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.8,
      maxSizeKB: 150,
    };
  }
  
  // Excellent quality
  return {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
    maxSizeKB: 200,
  };
}

/**
 * Get optimal cache settings based on network quality
 */
export function getOptimalCacheSettings() {
  const { quality, saveData } = getNetworkInfo();
  
  if (saveData || quality === 'poor') {
    return {
      staleTime: 1000 * 60 * 15, // 15 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    };
  }
  
  if (quality === 'fair') {
    return {
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 45, // 45 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    };
  }
  
  // Good or excellent
  return {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  };
}

// Add React import for the hook
import React from 'react';

/**
 * Hook to listen for network changes
 */
export function useNetworkStatus() {
  const [networkInfo, setNetworkInfo] = React.useState<NetworkInfo>(getNetworkInfo);
  
  React.useEffect(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (!connection) return;
    
    const updateNetworkInfo = () => {
      setNetworkInfo(getNetworkInfo());
    };
    
    connection.addEventListener('change', updateNetworkInfo);
    
    return () => {
      connection.removeEventListener('change', updateNetworkInfo);
    };
  }, []);
  
  return networkInfo;
}

/**
 * Debounce function for network-sensitive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Get adaptive retry configuration based on network quality
 */
export function getAdaptiveRetryConfig() {
  const { quality } = getNetworkInfo();
  
  switch (quality) {
    case 'poor':
      return {
        retry: 5,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 60000),
      };
    case 'fair':
      return {
        retry: 3,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      };
    case 'good':
      return {
        retry: 2,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 15000),
      };
    case 'excellent':
      return {
        retry: 1,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
      };
  }
}