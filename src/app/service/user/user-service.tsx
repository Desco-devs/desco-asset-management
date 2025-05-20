// app/service/userService.ts

import { User } from "../types"



const API_BASE = '/api/users'

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    const error = data?.error || 'Unknown error'
    throw new Error(error)
  }
  return data
}

export async function getUsers(): Promise<User[]> {
  const res = await fetch(API_BASE, { method: 'GET' })
  return handleResponse<User[]>(res)
}

export async function createUser(input: User): Promise<User> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return handleResponse<User>(res)
}

export async function updateUser(uid: string, input: User): Promise<User> {
  const res = await fetch(`${API_BASE}/${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return handleResponse<User>(res)
}

export async function deleteUser(uid: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/${uid}`, { method: 'DELETE' })
  return handleResponse<{ message: string }>(res)
}
