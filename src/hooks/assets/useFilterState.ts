"use client";

import { useState } from "react";
import type { FilterState } from "@/types/assets";

export const useFilterState = () => {
  const [filterState, setFilterState] = useState<FilterState>({
    selectedClient: "all",
    selectedLocation: "all",
    selectedProject: "all",
    selectedStatus: "all",
    searchQuery: "",
  });

  const updateFilter = (field: keyof FilterState, value: string) => {
    setFilterState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilterState({
      selectedClient: "all",
      selectedLocation: "all",
      selectedProject: "all",
      selectedStatus: "all",
      searchQuery: "",
    });
  };

  return {
    filterState,
    updateFilter,
    clearFilters,
  };
};