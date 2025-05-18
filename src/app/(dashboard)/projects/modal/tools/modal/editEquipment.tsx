// app/components/modal/editEquipment.tsx
"use client"

import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
} from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Loader2 } from "lucide-react"
import { Equipment, Status } from "@/app/service/types"
import { updateEquipment } from "@/app/service/equipments/equipment"

interface EditEquipmentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  equipment?: Equipment | null
  onUpdated: () => void
}

export default function EditEquipmentModal({
  isOpen,
  onOpenChange,
  equipment,
  onUpdated,
}: EditEquipmentModalProps) {
  if (!equipment) return null

  const [brand, setBrand] = useState(equipment.brand)
  const [model, setModel] = useState(equipment.model)
  const [type, setType] = useState(equipment.type)
  const [expirationDate, setExpirationDate] = useState(
    equipment.expirationDate.slice(0, 10)
  )
  const [status, setStatus] = useState<Status>(equipment.status)
  const [remarks, setRemarks] = useState<string | null>(
    equipment.remarks ?? ""
  )
  const [owner, setOwner] = useState(equipment.owner)
  const [inspectionDate, setInspectionDate] = useState(
    equipment.inspectionDate?.slice(0, 10) ?? ""
  )
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setBrand(equipment.brand)
    setModel(equipment.model)
    setType(equipment.type)
    setExpirationDate(equipment.expirationDate.slice(0, 10))
    setStatus(equipment.status)
    setRemarks(equipment.remarks ?? "")
    setOwner(equipment.owner)
    setInspectionDate(
      equipment.inspectionDate?.slice(0, 10) ?? ""
    )
    setImage(null)
    setPreviewUrl(null)
  }, [isOpen, equipment])

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0]
      setImage(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await updateEquipment(equipment.uid, {
        brand,
        model,
        type,
        expirationDate,
        status,
        remarks: remarks || null,
        owner,
        inspectionDate: inspectionDate || undefined,
        image: image || undefined,
      })
      toast.success("Updated successfully")
      onOpenChange(false)
      onUpdated()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to update equipment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasImage = Boolean(previewUrl || equipment.image_url)
  const buttonLabel = equipment.image_url || previewUrl ? "Change Image" : "Upload Image"

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
          <DialogDescription>Update equipment details</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Brand</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={model} onChange={e => setModel(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={type} onChange={e => setType(e.target.value)} />
          </div>
          <div>
            <Label>Expiration Date</Label>
            <Input
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={value => setStatus(value as Status)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="NON_OPERATIONAL">Non Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Owner</Label>
            <Input value={owner} onChange={e => setOwner(e.target.value)} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea
              value={remarks || ""}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>
          <div>
            <Label>Inspection Date</Label>
            <Input
              type="date"
              value={inspectionDate}
              onChange={e => setInspectionDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {buttonLabel}
                </Button>
              </TooltipTrigger>
              {hasImage && (
                <TooltipContent side="top" className="p-0">
                  <img
                    src={previewUrl || equipment.image_url!}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded"
                  />
                </TooltipContent>
              )}
            </Tooltip>
            {image && (
              <p className="mt-1 text-sm text-gray-600">
                Selected: {image.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}