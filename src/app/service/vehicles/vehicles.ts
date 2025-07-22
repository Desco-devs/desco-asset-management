import { Vehicle } from "@/types/equipment";

// Fetch vehicles by project ID
export async function getVehiclesByProject(
  projectId: string
): Promise<Vehicle[]> {
  try {
    const response = await fetch(`/api/vehicles?projectId=${projectId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch vehicles");
    }

    return await response.json();
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to fetch vehicles");
  }
}

// Fetch a single vehicle by UID
export async function getVehicleByUid(uid: string): Promise<Vehicle> {
  try {
    const response = await fetch(`/api/vehicles/${uid}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch vehicle");
    }

    return await response.json();
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to fetch vehicle");
  }
}

// Create a new vehicle
export async function createVehicle(formData: FormData): Promise<Vehicle> {
  try {
    const response = await fetch("/api/vehicles", {
      method: "POST",
      body: formData, // FormData handles multipart/form-data for image uploads
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create vehicle");
    }

    return await response.json();
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to create vehicle");
  }
}

// Update a vehicle
export async function updateVehicle(
  uid: string,
  formData: FormData
): Promise<Vehicle> {
  try {
    const response = await fetch(`/api/vehicles/${uid}`, {
      method: "PATCH",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update vehicle");
    }

    return await response.json();
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to update vehicle");
  }
}

// Delete a vehicle
export async function deleteVehicle(uid: string): Promise<void> {
  try {
    const response = await fetch(`/api/vehicles/${uid}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete vehicle");
    }
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to delete vehicle");
  }
}
