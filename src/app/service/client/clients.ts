// Update your client-side API functions to include proper sorting
// This would go in your @/app/service/client/clients.ts file

import type { location } from "@prisma/client";

// Update the fetchLocations function to ensure proper ordering
export async function fetchLocations(): Promise<location[]> {
  try {
    const response = await fetch("/api/locations", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Disable cache to always get fresh data
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Ensure the data is sorted by creation date DESC (newest first)
    return data.sort(
      (a: location, b: location) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error("Error fetching locations:", error);
    throw error;
  }
}

// Add location function with better error handling
export async function addLocation(address: string): Promise<Location> {
  try {
    const response = await fetch("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error adding location:", error);
    throw error;
  }
}

// Update location function remains the same
export async function updateLocation(
  id: string,
  address: string
): Promise<Location> {
  try {
    const response = await fetch("/api/locations", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, address }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating location:", error);
    throw error;
  }
}

// Delete location function remains the same
export async function deleteLocation(id: string): Promise<void> {
  try {
    const response = await fetch("/api/locations", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Error deleting location:", error);
    throw error;
  }
}
