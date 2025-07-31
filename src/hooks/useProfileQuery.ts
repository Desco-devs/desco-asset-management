"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { getOptimalCacheSettings, getAdaptiveRetryConfig, isSlowConnection } from "@/lib/network-utils";
import type { 
  User, 
  ProfileUpdateData, 
  ProfileImageUploadResponse
} from "@/types/profile";

// Query Keys - Following the established pattern
export const profileKeys = {
  all: ['profile'] as const,
  current: () => [...profileKeys.all, 'current'] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
  settings: (id: string) => [...profileKeys.all, 'settings', id] as const,
};

// API Functions - Simple and direct following golden rule
async function fetchCurrentProfile(): Promise<User> {
  const response = await fetch('/api/profile');
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
}

async function updateProfile(data: ProfileUpdateData): Promise<User> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }
  
  return response.json();
}

async function uploadProfileImage(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress?.(progress);
      }
    });
    
    xhr.addEventListener('load', async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result: ProfileImageUploadResponse = JSON.parse(xhr.responseText);
          resolve(result.url);
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || 'Failed to upload image'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });
    
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout - please check your connection'));
    });
    
    xhr.open('POST', '/api/upload/profile-image');
    xhr.timeout = 60000; // 60 second timeout for mobile connections
    xhr.send(formData);
  });
}

async function deleteProfileImage(): Promise<void> {
  const response = await fetch('/api/profile/image', {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete image');
  }
}

// QUERIES - Following TanStack Query patterns with adaptive mobile optimizations
export function useCurrentProfile() {
  const cacheSettings = getOptimalCacheSettings();
  const retryConfig = getAdaptiveRetryConfig();
  
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: fetchCurrentProfile,
    ...cacheSettings,
    ...retryConfig,
    // Additional mobile-specific optimizations
    networkMode: 'offlineFirst', // Use cache when offline
    meta: {
      persist: true, // Persist this query for offline usage
    },
  });
}

export function useProfile(userId: string) {
  const cacheSettings = getOptimalCacheSettings();
  const retryConfig = getAdaptiveRetryConfig();
  
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => fetchProfileById(userId),
    enabled: !!userId,
    // Longer cache times for other users' profiles (less critical)
    staleTime: cacheSettings.staleTime * 2,
    gcTime: cacheSettings.gcTime,
    refetchOnWindowFocus: false,
    retry: Math.max(1, retryConfig.retry - 1), // Fewer retries for non-critical data
    retryDelay: retryConfig.retryDelay,
    networkMode: 'offlineFirst',
  });
}

async function fetchProfileById(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
}

// MUTATIONS - With optimistic updates following the pattern
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: updateProfile,
    onMutate: async (formData: ProfileUpdateData) => {
      // Cancel outgoing queries for current profile
      await queryClient.cancelQueries({ queryKey: profileKeys.current() });
      
      // Get previous data for rollback
      const previousProfile = queryClient.getQueryData<User>(profileKeys.current());
      
      // Optimistically update the profile in TanStack Query
      if (previousProfile) {
        const optimisticProfile: User = {
          ...previousProfile,
          ...formData,
          updated_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData(profileKeys.current(), optimisticProfile);
        
        // Also optimistically update AuthContext immediately
        setUser(optimisticProfile);
      }
      
      return { previousProfile };
    },
    onError: (error, formData, context) => {
      // Rollback both TanStack Query and AuthContext on error
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.current(), context.previousProfile);
        setUser(context.previousProfile);
      }
      toast.error(`Failed to update profile: ${error.message}`);
    },
    onSuccess: (updatedUser) => {
      // Update cache with server response (this prevents any flicker)
      queryClient.setQueryData(profileKeys.current(), updatedUser);
      
      // Update AuthContext with the actual server response - no API call needed!
      setUser(updatedUser);
      
      toast.success('Profile updated successfully!');
    },
    onSettled: () => {
      // Delay invalidation to prevent any flicker - we already have the fresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: profileKeys.current() });
      }, 500);
    },
  });
}

export function useUploadProfileImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) => 
      uploadProfileImage(file, onProgress),
    onMutate: async ({ file }: { file: File; onProgress?: (progress: number) => void }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: profileKeys.current() });
      
      // Get previous data
      const previousProfile = queryClient.getQueryData<User>(profileKeys.current());
      
      // Create preview URL for optimistic update
      const previewUrl = URL.createObjectURL(file);
      
      // Optimistically update with preview
      if (previousProfile) {
        const optimisticProfile: User = {
          ...previousProfile,
          user_profile: previewUrl,
          updated_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData(profileKeys.current(), optimisticProfile);
      }
      
      return { previousProfile, previewUrl };
    },
    onError: (error, { file }, context) => {
      // Clean up preview URL
      if (context?.previewUrl) {
        URL.revokeObjectURL(context.previewUrl);
      }
      
      // Rollback
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.current(), context.previousProfile);
      }
      
      toast.error(`Failed to upload image: ${error.message}`);
    },
    onSuccess: (imageUrl, { file }, context) => {
      // Clean up preview URL
      if (context?.previewUrl) {
        URL.revokeObjectURL(context.previewUrl);
      }
      
      // Update with actual image URL
      const currentProfile = queryClient.getQueryData<User>(profileKeys.current());
      if (currentProfile) {
        const updatedProfile: User = {
          ...currentProfile,
          user_profile: imageUrl,
          updated_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData(profileKeys.current(), updatedProfile);
      }
      
      toast.success('Profile image uploaded successfully!');
    },
    onSettled: () => {
      // Ensure consistency
      queryClient.invalidateQueries({ queryKey: profileKeys.current() });
    },
  });
}

export function useDeleteProfileImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProfileImage,
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: profileKeys.current() });
      
      // Get previous data
      const previousProfile = queryClient.getQueryData<User>(profileKeys.current());
      
      // Optimistically remove image
      if (previousProfile) {
        const optimisticProfile: User = {
          ...previousProfile,
          user_profile: null,
          updated_at: new Date().toISOString(),
        };
        
        queryClient.setQueryData(profileKeys.current(), optimisticProfile);
      }
      
      return { previousProfile };
    },
    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.current(), context.previousProfile);
      }
      
      toast.error(`Failed to delete image: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Profile image deleted successfully!');
    },
    onSettled: () => {
      // Ensure consistency
      queryClient.invalidateQueries({ queryKey: profileKeys.current() });
    },
  });
}

// Combined update with image upload for complete profile updates
export function useUpdateProfileWithImage() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      profileData, 
      imageFile 
    }: { 
      profileData: ProfileUpdateData; 
      imageFile?: File 
    }) => {
      let imageUrl = profileData.user_profile;
      
      // Upload image first if provided
      if (imageFile) {
        imageUrl = await uploadProfileImage(imageFile);
      }
      
      // Then update profile with image URL
      return await updateProfile({
        ...profileData,
        user_profile: imageUrl,
      });
    },
    onMutate: async ({ profileData, imageFile }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: profileKeys.current() });
      
      // Get previous data
      const previousProfile = queryClient.getQueryData<User>(profileKeys.current());
      
      // Create optimistic update
      if (previousProfile) {
        let optimisticImageUrl = profileData.user_profile;
        
        // Create preview URL if uploading new image
        if (imageFile) {
          optimisticImageUrl = URL.createObjectURL(imageFile);
        }
        
        const optimisticProfile: User = {
          ...previousProfile,
          ...profileData,
          user_profile: optimisticImageUrl,
          updated_at: new Date().toISOString(),
        };
        
        // Update both TanStack Query and AuthContext immediately
        queryClient.setQueryData(profileKeys.current(), optimisticProfile);
        setUser(optimisticProfile);
      }
      
      return { previousProfile, imageFile };
    },
    onError: (error, variables, context) => {
      // Clean up preview URL if it was created
      if (context?.imageFile && context.previousProfile?.user_profile) {
        const currentData = queryClient.getQueryData<User>(profileKeys.current());
        if (currentData?.user_profile?.startsWith('blob:')) {
          URL.revokeObjectURL(currentData.user_profile);
        }
      }
      
      // Rollback both TanStack Query and AuthContext
      if (context?.previousProfile) {
        queryClient.setQueryData(profileKeys.current(), context.previousProfile);
        setUser(context.previousProfile);
      }
      
      toast.error(`Failed to update profile: ${error.message}`);
    },
    onSuccess: (updatedUser, variables, context) => {
      // Clean up preview URL if it was created
      if (context?.imageFile) {
        const currentData = queryClient.getQueryData<User>(profileKeys.current());
        if (currentData?.user_profile?.startsWith('blob:')) {
          URL.revokeObjectURL(currentData.user_profile);
        }
      }
      
      // Update with server response (prevents flicker)
      queryClient.setQueryData(profileKeys.current(), updatedUser);
      
      // Update AuthContext with the actual server response - no API call needed!
      setUser(updatedUser);
      
      toast.success('Profile updated successfully!');
    },
    onSettled: () => {
      // Delay invalidation to prevent any flicker - we already have the fresh data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: profileKeys.current() });
      }, 500);
    },
  });
}