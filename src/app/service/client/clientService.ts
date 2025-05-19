// app/service/client/clientService.ts
import { Client } from "../types"

const BASE = '/api/client'

export async function fetchClients(): Promise<Client[]> {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error('Failed to fetch clients')
  return res.json()
}

export async function createClient(
  name: string,
  locationId: string
): Promise<Client> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, locationId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create client')
  }
  return res.json()
}

export async function updateClient(
  uid: string,
  name: string,
  locationId: string
): Promise<Client> {
  const res = await fetch(`${BASE}/${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, locationId }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update client')
  }
  return res.json()
}

export async function deleteClient(uid: string): Promise<void> {
  const res = await fetch(`${BASE}/${uid}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete client')
  }
}
