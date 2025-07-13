import { Project } from '@/app/service/types'

const API_BASE = '/api/projects'

export async function fetchProjectsByClient(clientId: string): Promise<Project[]> {
  const res = await fetch(`${API_BASE}?clientId=${encodeURIComponent(clientId)}`)
  if (!res.ok) throw new Error(`Error fetching projects: ${res.statusText}`)
  return (await res.json()) as Project[]
}

export async function createProject(name: string, clientId: string): Promise<Project> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, clientId })
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to create project')
  }
  return (await res.json()) as Project
}

export async function deleteProject(uid: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(uid)}`, { method: 'DELETE' })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete project')
  }
}

// ── NEW ──
export async function updateProject(
  uid: string,
  updates: { name?: string; clientId?: string }
): Promise<Project> {
  const body: Record<string, string> = {}
  if (updates.name   != null) body.name     = updates.name
  if (updates.clientId != null) body.clientId = updates.clientId

  const res = await fetch(`${API_BASE}/${encodeURIComponent(uid)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update project')
  }
  return (await res.json()) as Project
}
