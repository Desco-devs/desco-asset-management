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
import { Loader2 } from "lucide-react"
import { useCreateLocation, useUpdateLocation, useLocations } from '@/hooks/api/use-projects'
import { toast } from 'sonner'
import type { Location } from '@/types/projects'

const locationSchema = z.object({
  address: z.string().min(1, "Address is required").max(255, "Address too long"),
})

type LocationFormData = z.infer<typeof locationSchema>

interface LocationFormProps {
  location?: Location | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function LocationForm({ location, onSuccess, onCancel }: LocationFormProps) {
  const { mutate: createLocation, isPending: isCreating } = useCreateLocation()
  const { mutate: updateLocation, isPending: isUpdating } = useUpdateLocation()
  const { data: locations } = useLocations()
  
  const isEditing = !!location
  const isPending = isCreating || isUpdating

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      address: location?.address || '',
    },
  })

  // Check for duplicate addresses (excluding current location when editing)
  const isDuplicateAddress = (address: string): boolean => {
    if (!locations) return false
    
    return locations.some(loc => 
      loc.address.toLowerCase() === address.toLowerCase() && 
      (!isEditing || loc.id !== location?.id)
    )
  }

  const onSubmit = (data: LocationFormData) => {
    // Check for duplicates
    if (isDuplicateAddress(data.address)) {
      form.setError('address', { 
        message: 'A location with this address already exists' 
      })
      return
    }

    if (isEditing && location) {
      updateLocation(
        { id: location.id, address: data.address },
        {
          onSuccess: () => {
            onSuccess?.()
          },
          onError: (error) => {
            toast.error('Failed to update location: ' + error.message)
          }
        }
      )
    } else {
      createLocation(data, {
        onSuccess: () => {
          form.reset()
          onSuccess?.()
        },
        onError: (error) => {
          toast.error('Failed to create location: ' + error.message)
        }
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter location address..."
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
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
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? (
              isEditing ? 'Updating...' : 'Creating...'
            ) : (
              isEditing ? 'Update Location' : 'Create Location'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}