export interface Location {
  uid: string
  address: string
  createdAt: string
  updatedAt: string
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch('/api/locations')
  if (!res.ok) throw new Error('Failed to fetch locations')
  return res.json()
}

export async function addLocation(address: string): Promise<Location> {
  if (!address.trim()) {
    throw new Error('Address is required')
  }

  const res = await fetch('/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to add location')
  }

  return res.json()
}

export async function updateLocation(id: string, address: string): Promise<Location> {
  if (!id.trim()) {
    throw new Error('ID is required')
  }
  if (!address.trim()) {
    throw new Error('Address is required')
  }

  const res = await fetch('/api/locations', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, address }),
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to update location')
  }

  return res.json()
}

export async function deleteLocation(id: string): Promise<{ message: string }> {
  if (!id.trim()) {
    throw new Error('ID is required')
  }

  const res = await fetch('/api/locations', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.error || 'Failed to delete location')
  }

  return res.json()
}
