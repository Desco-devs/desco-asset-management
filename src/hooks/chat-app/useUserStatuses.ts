import { useQuery } from '@tanstack/react-query';

interface UserStatus {
  id: string;
  is_online: boolean;
  last_seen: Date | null;
}

export const useUserStatuses = (userIds: string[]) => {
  return useQuery({
    queryKey: ['user-statuses', userIds.sort()],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      
      const response = await fetch(`/api/users/status?userIds=${userIds.join(',')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user statuses');
      }
      
      const data = await response.json();
      return data.users as UserStatus[];
    },
    enabled: userIds.length > 0,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
};

export const USER_STATUSES_QUERY_KEYS = {
  statuses: (userIds: string[]) => ['user-statuses', userIds.sort()],
};