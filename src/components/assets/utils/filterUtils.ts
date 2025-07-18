import type { Equipment, Vehicle, FilterState } from "@/types/assets";

export const filterEquipment = (
  equipment: Equipment[],
  filterState: FilterState
) => {
  if (!Array.isArray(equipment)) return [];
  
  return equipment.filter((item) => {
    const matchesClient =
      filterState.selectedClient === "all" || 
      item.project.client.uid === filterState.selectedClient;
    
    const matchesLocation =
      filterState.selectedLocation === "all" ||
      item.project.client.location.uid === filterState.selectedLocation;
    
    const matchesProject =
      filterState.selectedProject === "all" || 
      item.project.uid === filterState.selectedProject;
    
    const matchesStatus =
      filterState.selectedStatus === "all" || 
      item.status === filterState.selectedStatus;

    const matchesSearch =
      filterState.searchQuery === "" ||
      item.brand.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      item.owner.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      item.project.name.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      item.project.client.name.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      item.project.client.location.address.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      (item.plateNumber &&
        item.plateNumber.toLowerCase().includes(filterState.searchQuery.toLowerCase())) ||
      (item.remarks &&
        item.remarks.toLowerCase().includes(filterState.searchQuery.toLowerCase()));

    return (
      matchesClient &&
      matchesLocation &&
      matchesProject &&
      matchesStatus &&
      matchesSearch
    );
  });
};

export const filterVehicles = (
  vehicles: Vehicle[],
  filterState: FilterState
) => {
  return vehicles.filter((vehicle) => {
    const matchesClient =
      filterState.selectedClient === "all" ||
      vehicle.project.client.uid === filterState.selectedClient;
    
    const matchesLocation =
      filterState.selectedLocation === "all" ||
      vehicle.project.client.location.uid === filterState.selectedLocation;
    
    const matchesProject =
      filterState.selectedProject === "all" || 
      vehicle.project.uid === filterState.selectedProject;
    
    const matchesStatus =
      filterState.selectedStatus === "all" || 
      vehicle.status === filterState.selectedStatus;

    const matchesSearch =
      filterState.searchQuery === "" ||
      vehicle.brand.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      vehicle.type.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      vehicle.plateNumber.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      vehicle.owner.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      vehicle.project.name.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      vehicle.project.client.name.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      vehicle.project.client.location.address.toLowerCase().includes(filterState.searchQuery.toLowerCase()) ||
      (vehicle.remarks &&
        vehicle.remarks.toLowerCase().includes(filterState.searchQuery.toLowerCase()));

    return (
      matchesClient &&
      matchesLocation &&
      matchesProject &&
      matchesStatus &&
      matchesSearch
    );
  });
};

export const hasActiveFilters = (filterState: FilterState): boolean => {
  return (
    filterState.selectedClient !== "all" ||
    filterState.selectedLocation !== "all" ||
    filterState.selectedProject !== "all" ||
    filterState.selectedStatus !== "all" ||
    filterState.searchQuery !== ""
  );
};

export const clearAllFilters = (): FilterState => {
  return {
    selectedClient: "all",
    selectedLocation: "all",
    selectedProject: "all",
    selectedStatus: "all",
    searchQuery: "",
  };
};