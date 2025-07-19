import { useQuery } from '@tanstack/react-query';
import { ChatUser } from '@/types/chat-app';

const QUERY_KEYS = {
  users: ['users'],
  userProfile: (userId: string) => ['user-profile', userId],
} as const;

export const useUsers = () => {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: async (): Promise<ChatUser[]> => {
      const response = await fetch('/api/users/getall');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - user list doesn't change often
    refetchOnWindowFocus: false,
  });
};

export const useUserProfile = (userId?: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.userProfile(userId || ''),
    queryFn: async (): Promise<ChatUser> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      
      return response.json();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 15, // 15 minutes - user profile data is relatively stable
    refetchOnWindowFocus: false,
  });
};

export { QUERY_KEYS as USERS_QUERY_KEYS };