'use client'

import React, { useState, useEffect } from 'react'
import type { Location } from '@/app/service/client/clients'
import {
  fetchLocations,
  addLocation,
  updateLocation,
  deleteLocation,
} from '@/app/service/client/clients'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import AddClient from './modal/addClient'

import { toast } from 'sonner'
import AlertModal from '@/app/components/custom-reuseable/modal/alertModal'


export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAddress, setEditAddress] = useState('')

  // For alert modal
  const [alertOpen, setAlertOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    async function loadLocations() {
      try {
        const data = await fetchLocations()
        setLocations(data)
      } catch (e) {
        console.error(e)
        toast.error('Failed to load locations')
      }
    }
    loadLocations()
  }, [])

  async function handleAddLocation(address: string) {
    try {
      const newLocation = await addLocation(address)
      setLocations((prev) => [...prev, newLocation])
      toast.success('Location added successfully')
    } catch (e) {
      console.error(e)
      toast.error('Failed to add location')
    }
  }

  async function handleUpdateLocation(id: string) {
    try {
      const updated = await updateLocation(id, editAddress)
      setLocations((prev) =>
        prev.map((loc) => (loc.uid === id ? updated : loc))
      )
      setEditingId(null)
      setEditAddress('')
      toast.success('Location updated successfully')
    } catch (e) {
      console.error(e)
      toast.error('Failed to update location')
    }
  }

  // Open alert modal for delete confirmation
  function openDeleteModal(id: string) {
    setDeleteId(id)
    setAlertOpen(true)
  }

  // Confirm delete handler
  async function confirmDelete() {
    if (!deleteId) return
    try {
      await deleteLocation(deleteId)
      setLocations((prev) => prev.filter((loc) => loc.uid !== deleteId))
      toast.success('Location deleted successfully')
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete location')
    } finally {
      setAlertOpen(false)
      setDeleteId(null)
    }
  }

  return (
    <div>
      <AddClient onAdd={handleAddLocation} />

      <div className="overflow-x-auto mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>UID</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No locations found.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((loc) => (
                <TableRow key={loc.uid}>
                  <TableCell>{loc.uid}</TableCell>

                  <TableCell>
                    {editingId === loc.uid ? (
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      />
                    ) : (
                      loc.address
                    )}
                  </TableCell>

                  <TableCell>{new Date(loc.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{new Date(loc.updatedAt).toLocaleString()}</TableCell>

                  <TableCell className="space-x-2">
                    {editingId === loc.uid ? (
                      <>
                        <button
                          onClick={() => handleUpdateLocation(loc.uid)}
                          className="text-green-600 hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setEditAddress('')
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(loc.uid)
                            setEditAddress(loc.address)
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(loc.uid)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertModal
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete Location"
        description="Are you sure you want to delete this location?"
        onConfirm={confirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}
