import { useCallback, useEffect, useState } from "react";

export interface UseServerPaginationProps {
  initialData: any[];
  totalCount: number;
  itemsPerPage?: number;
  apiEndpoint: string;
}

export interface UseServerPaginationReturn<T> {
  data: T[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  refreshData: () => void;
}

export function useServerPagination<T>({
  initialData,
  totalCount,
  itemsPerPage = 12,
  apiEndpoint,
}: UseServerPaginationProps): UseServerPaginationReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cache, setCache] = useState<Map<number, T[]>>(new Map([[1, initialData]]));

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const fetchPage = useCallback(async (page: number) => {
    // Check cache first
    if (cache.has(page)) {
      setData(cache.get(page)!);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiEndpoint}?page=${page}&limit=${itemsPerPage}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
        
        // Cache the result
        setCache(prev => new Map(prev).set(page, result.data));
      }
    } catch (error) {
      console.error('Error fetching page:', error);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, itemsPerPage, cache]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    
    // Always attempt to fetch (cache will handle if already exists)
    fetchPage(validPage);
  }, [totalPages, fetchPage]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [hasNextPage, currentPage, goToPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  }, [hasPreviousPage, currentPage, goToPage]);

  const refreshData = useCallback(() => {
    fetchPage(currentPage);
  }, [currentPage, fetchPage]);

  // Reset to first page when total count changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
      setData(initialData);
    }
  }, [totalPages, currentPage, initialData]);

  return {
    data,
    loading,
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    refreshData,
  };
}