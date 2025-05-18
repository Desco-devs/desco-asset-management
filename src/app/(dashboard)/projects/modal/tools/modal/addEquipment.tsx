// File: app/components/AddEquipmentModal.tsx
"use client"

import React, { useState, useRef, ChangeEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { createEquipment } from "@/app/service/equipments/equipment"
import ImagePreviewModal from "@/app/components/custom-reuseable/modal/previewImage"

interface AddEquipmentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onCreated: () => void
}

type EquipmentInput = {
  brand: string
  model: string
  type: string
  expirationDate: string
  status: "OPERATIONAL" | "NON_OPERATIONAL"
  remarks: string
  owner: string
  inspectionDate?: string
  image: File | null
  previewUrl: string | null
}

const initialState: EquipmentInput = {
  brand: "",
  model: "",
  type: "",
  expirationDate: "",
  status: "OPERATIONAL",
  remarks: "",
  owner: "",
  inspectionDate: undefined,
  image: null,
  previewUrl: null,
}

export default function AddEquipmentModal({
  isOpen,
  onOpenChange,
  projectId,
  onCreated,
}: AddEquipmentModalProps) {
  const [input, setInput] = useState<EquipmentInput>(initialState)
  const [errors, setErrors] = useState<Partial<Record<keyof EquipmentInput, string>>>({})
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const todayStr = new Date().toISOString().split("T")[0]

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setInput(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    const url = file ? URL.createObjectURL(file) : null
    setInput(prev => ({ ...prev, image: file, previewUrl: url }))
    setErrors(prev => ({ ...prev, image: undefined }))
  }

  const resetForm = () => {
    if (input.previewUrl) URL.revokeObjectURL(input.previewUrl)
    setInput(initialState)
    setErrors({})
    setPreviewOpen(false)
  }

  function validate() {
    const errs: typeof errors = {}
    if (!input.brand.trim()) errs.brand = "Brand is required"
    if (!input.model.trim()) errs.model = "Model is required"
    if (!input.type.trim()) errs.type = "Type is required"
    if (!input.expirationDate) {
      errs.expirationDate = "Expiration date is required"
    } else if (input.expirationDate < todayStr) {
      errs.expirationDate = "Expiration cannot be in the past"
    }
    if (!input.owner.trim()) errs.owner = "Owner is required"
    if (input.inspectionDate && input.inspectionDate < todayStr) {
      errs.inspectionDate = "Inspection cannot be in the past"
    }
    if (!input.image) errs.image = "Image is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await createEquipment({
        brand: input.brand.trim(),
        model: input.model.trim(),
        type: input.type.trim(),
        expirationDate: input.expirationDate,
        status: input.status,
        remarks: input.remarks.trim() || null,
        owner: input.owner.trim(),
        projectId,
        inspectionDate: input.inspectionDate,
        image: input.image!,
      })
      toast.success("Equipment added")
      onCreated()
      resetForm()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const hasImage = Boolean(input.previewUrl)
  const buttonLabel = hasImage ? "Change Image" : "Add Image"

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>Enter details for new equipment</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Brand */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                name="brand"
                value={input.brand}
                onChange={handleChange}
                placeholder="e.g. Canon"
                className={errors.brand ? "border-red-500" : ""}
              />
              {errors.brand && <p className="text-red-500 text-xs">{errors.brand}</p>}
            </div>

            {/* Model */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                name="model"
                value={input.model}
                onChange={handleChange}
                placeholder="e.g. EOS R5"
                className={errors.model ? "border-red-500" : ""}
              />
              {errors.model && <p className="text-red-500 text-xs">{errors.model}</p>}
            </div>

            {/* Type */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                name="type"
                value={input.type}
                onChange={handleChange}
                placeholder="e.g. Camera"
                className={errors.type ? "border-red-500" : ""}
              />
              {errors.type && <p className="text-red-500 text-xs">{errors.type}</p>}
            </div>

            {/* Expiration Date */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="expirationDate">Expiration Date</Label>
              <Input
                id="expirationDate"
                type="date"
                name="expirationDate"
                min={todayStr}
                value={input.expirationDate}
                onChange={handleChange}
                className={errors.expirationDate ? "border-red-500" : ""}
              />
              {errors.expirationDate && (
                <p className="text-red-500 text-xs">{errors.expirationDate}</p>
              )}
            </div>

            {/* Status */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={value =>
                  setInput(prev => ({ ...prev, status: value as any }))
                }
                value={input.status}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  <SelectItem value="NON_OPERATIONAL">Non-operational</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Remarks */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                name="remarks"
                value={input.remarks}
                onChange={handleChange}
                placeholder="Any notes or comments"
                rows={3}
              />
            </div>

            {/* Owner */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                name="owner"
                value={input.owner}
                onChange={handleChange}
                placeholder="Person responsible"
                className={errors.owner ? "border-red-500" : ""}
              />
              {errors.owner && <p className="text-red-500 text-xs">{errors.owner}</p>}
            </div>

            {/* Inspection Date */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input
                id="inspectionDate"
                type="date"
                name="inspectionDate"
                min={todayStr}
                value={input.inspectionDate || ""}
                onChange={handleChange}
                className={errors.inspectionDate ? "border-red-500" : ""}
              />
              {errors.inspectionDate && (
                <p className="text-red-500 text-xs">{errors.inspectionDate}</p>
              )}
            </div>

            {/* Image */}
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="image">Image</Label>
              <input
                id="image"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className={errors.image ? "border-red-500" : ""}
                  >
                    {buttonLabel}
                  </Button>
                </TooltipTrigger>
                {hasImage && (
                  <TooltipContent side="top" className="p-0">
                    <img
                      src={input.previewUrl!}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded"
                    />
                  </TooltipContent>
                )}
              </Tooltip>
              {input.image && (
                <p className="text-sm text-gray-600">{input.image.name}</p>
              )}
              {errors.image && (
                <p className="text-red-500 text-xs">{errors.image}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {input.previewUrl && (
        <ImagePreviewModal
          src={input.previewUrl}
          isOpen={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  )
}
