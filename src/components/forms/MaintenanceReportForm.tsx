'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MaintenanceReport
} from '@/types/equipment'
import { Loader2 } from 'lucide-react'

interface MaintenanceReportFormProps {
  equipmentId?: string
  locationId?: string
  report?: MaintenanceReport
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading?: boolean
  mode: 'create' | 'edit' | 'view'
}

export function MaintenanceReportForm({ 
  equipmentId, 
  locationId,
  report, 
  onSubmit, 
  onCancel, 
  loading = false, 
  mode 
}: MaintenanceReportFormProps) {
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: isEdit || isView ? {
      issue_description: report?.issue_description || '',
      remarks: report?.remarks || '',
      inspection_details: report?.inspection_details || '',
      action_taken: report?.action_taken || '',
      parts_replaced: report?.parts_replaced?.join(', ') || '',
      priority: report?.priority || 'MEDIUM',
      status: report?.status || 'PENDING',
      downtime_hours: report?.downtime_hours || '',
    } : {
      equipment_id: equipmentId || '',
      location_id: locationId || '',
      issue_description: '',
      remarks: '',
      inspection_details: '',
      action_taken: '',
      parts_replaced: '',
      priority: 'MEDIUM',
      status: 'PENDING',
      downtime_hours: '',
    }
  })

  const selectedPriority = watch('priority')
  const selectedStatus = watch('status')

  const handleFormSubmit = async (data: any) => {
    try {
      const formData = {
        ...data,
        parts_replaced: data.parts_replaced ? data.parts_replaced.split(',').map((part: string) => part.trim()) : [],
        attachment_urls: [], // TODO: Add file upload functionality
      }
      
      await onSubmit(formData)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  if (isView) {
    return (
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Issue Description</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.issue_description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.priority || '—'}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.status || '—'}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Inspection Details</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.inspection_details || '—'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Action Taken</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.action_taken || '—'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Parts Replaced</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.parts_replaced?.join(', ') || '—'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Downtime Hours</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.downtime_hours || '—'}</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Remarks</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full">{report?.remarks || '—'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Issue Description */}
      <div className="space-y-2">
        <Label htmlFor="issue_description">Issue Description *</Label>
        <Textarea
          id="issue_description"
          {...register('issue_description', { required: 'Issue description is required' })}
          placeholder="Describe the maintenance issue or request"
          disabled={loading}
          rows={3}
        />
        {errors.issue_description && (
          <p className="text-sm text-destructive">{errors.issue_description.message}</p>
        )}
      </div>

      {/* Priority and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={selectedPriority || 'MEDIUM'}
            onValueChange={(value) => setValue('priority', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={selectedStatus || 'PENDING'}
            onValueChange={(value) => setValue('status', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inspection Details */}
      <div className="space-y-2">
        <Label htmlFor="inspection_details">Inspection Details</Label>
        <Textarea
          id="inspection_details"
          {...register('inspection_details')}
          placeholder="Details from inspection"
          disabled={loading}
          rows={2}
        />
      </div>

      {/* Action Taken */}
      <div className="space-y-2">
        <Label htmlFor="action_taken">Action Taken</Label>
        <Textarea
          id="action_taken"
          {...register('action_taken')}
          placeholder="What action was taken to resolve the issue"
          disabled={loading}
          rows={2}
        />
      </div>

      {/* Parts Replaced */}
      <div className="space-y-2">
        <Label htmlFor="parts_replaced">Parts Replaced</Label>
        <Input
          id="parts_replaced"
          {...register('parts_replaced')}
          placeholder="Enter parts separated by commas"
          disabled={loading}
        />
      </div>

      {/* Downtime Hours */}
      <div className="space-y-2">
        <Label htmlFor="downtime_hours">Downtime Hours</Label>
        <Input
          id="downtime_hours"
          {...register('downtime_hours')}
          placeholder="Hours of downtime"
          disabled={loading}
        />
      </div>

      {/* Remarks */}
      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea
          id="remarks"
          {...register('remarks')}
          placeholder="Additional remarks or notes"
          disabled={loading}
          rows={2}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={loading} 
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
          className="flex-1"
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {loading 
            ? (isEdit ? 'Updating...' : 'Creating...') 
            : (isEdit ? 'Update Report' : 'Create Report')
          }
        </Button>
      </div>
    </form>
  )
}