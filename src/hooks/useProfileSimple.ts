"use client";

import { useState, useEffect } from 'react';
import { User } from '@/types/auth';

interface UseProfileResult {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Simple hook to fetch current user profile
 * Replaces the complex useProfileQuery with basic functionality
 */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const userData = await response.json();
      setProfile(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      console.error('Profile fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  };
}