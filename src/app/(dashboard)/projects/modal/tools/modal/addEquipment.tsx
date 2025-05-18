// File: app/components/AddEquipmentModal.tsx
"use client"

import React, { useState, ChangeEvent } from "react"
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
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setInput(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    const url = file ? URL.createObjectURL(file) : null
    setInput(prev => ({ ...prev, image: file, previewUrl: url }))
  }

  const resetForm = () => {
    if (input.previewUrl) URL.revokeObjectURL(input.previewUrl)
    setInput(initialState)
    setPreviewOpen(false)
  }

  const handleSubmit = async () => {
    if (!input.image) {
      toast.error("Please select an image")
      return
    }
    setLoading(true)
    try {
      await createEquipment({
        brand: input.brand,
        model: input.model,
        type: input.type,
        expirationDate: input.expirationDate,
        status: input.status,
        remarks: input.remarks || null,
        owner: input.owner,
        projectId,
        inspectionDate: input.inspectionDate,
        image: input.image,
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>
              Enter details for new equipment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                name="brand"
                value={input.brand}
                onChange={handleChange}
                placeholder="e.g. Canon"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                name="model"
                value={input.model}
                onChange={handleChange}
                placeholder="e.g. EOS R5"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                name="type"
                value={input.type}
                onChange={handleChange}
                placeholder="e.g. Camera"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="expirationDate">Expiration Date</Label>
              <Input
                id="expirationDate"
                type="date"
                name="expirationDate"
                value={input.expirationDate}
                onChange={handleChange}
              />
            </div>

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
                  <SelectItem value="NON_OPERATIONAL">
                    Non-operational
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                name="owner"
                value={input.owner}
                onChange={handleChange}
                placeholder="Person responsible"
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input
                id="inspectionDate"
                type="date"
                name="inspectionDate"
                value={input.inspectionDate || ""}
                onChange={handleChange}
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="image">Image</Label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block"
              />
            </div>

            {input.previewUrl && (
              <img
                src={input.previewUrl}
                alt="Thumbnail"
                className="w-20 h-20 object-cover rounded cursor-pointer"
                onMouseEnter={() => setPreviewOpen(true)}
                onClick={() => setPreviewOpen(true)}
              />
            )}
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
