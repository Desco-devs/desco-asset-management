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

