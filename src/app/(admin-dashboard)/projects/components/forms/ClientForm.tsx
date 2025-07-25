'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateClient, useUpdateClient, useClients, useLocations } from '@/hooks/api/use-projects'
import { useProjectsStore } from '@/stores/projects-store'
import { toast } from 'sonner'
import type { Client } from '@/types/projects'

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(100, "Name too long"),
  locationId: z.string().min(1, "Location is required"),
})

type ClientFormData = z.infer<typeof clientSchema>

interface ClientFormProps {
  client?: Client | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const { mutate: createClient, isPending: isCreating } = useCreateClient()
  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient()
  const { data: clients } = useClients()
  const { data: locations, isLoading: locationsLoading } = useLocations()
  const selectedLocationId = useProjectsStore(state => state.selectedLocationId)
  
  const isEditing = !!client
  const isPending = isCreating || isUpdating

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || '',
      locationId: client?.location_id || selectedLocationId || '',
    },
  })

  // Check for duplicate client names within same location
  const isDuplicateClient = (name: string, locationId: string): boolean => {
    if (!clients) return false
    
    return clients.some(c => 
      c.name.toLowerCase() === name.toLowerCase() && 
      c.location_id === locationId &&
      (!isEditing || c.id !== client?.id)
    )
  }

  const onSubmit = (data: ClientFormData) => {
    // Check for duplicates
    if (isDuplicateClient(data.name, data.locationId)) {
      form.setError('name', { 
        message: 'A client with this name already exists in this location' 
      })
      return
    }

    if (isEditing && client) {
      updateClient(
        { id: client.id, name: data.name, location_id: data.locationId },
        {
          onSuccess: () => {
            onSuccess?.()
          },
          onError: (error) => {
            toast.error('Failed to update client: ' + error.message)
          }
        }
      )
    } else {
      createClient(
        { name: data.name, location_id: data.locationId },
        {
          onSuccess: () => {
            form.reset()
            onSuccess?.()
          },
          onError: (error) => {
            toast.error('Failed to create client: ' + error.message)
          }
        }
      )
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter client name..."
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isPending}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a location..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {locationsLoading ? (
                    <SelectItem value="" disabled>
                      Loading locations...
                    </SelectItem>
                  ) : locations?.length ? (
                    locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.address}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No locations available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isPending}
          >
            {isPending ? (
              isEditing ? 'Updating...' : 'Creating...'
            ) : (
              isEditing ? 'Update Client' : 'Create Client'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}