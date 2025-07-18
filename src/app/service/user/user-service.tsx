// app/service/userService.ts

import { User } from "@/types/auth"



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
  const response = await handleResponse<{data: User[]}>(res)
  return response.data
}

export async function createUser(input: {
  username: string
  password: string
  fullname: string
  phone?: string | null
  role: string
  userStatus: string
}): Promise<User> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return handleResponse<User>(res)
}

export async function updateUser(uid: string, input: Partial<User>): Promise<User> {
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
