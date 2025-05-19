"use client";

import { useEffect, useState, ChangeEvent, useRef } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { ImageIcon, Loader2 } from "lucide-react"

import { Vehicle, Status } from "@/app/service/types"
import { updateVehicle } from "@/app/service/vehicles/vehicles"

interface EditVehicleModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle
  onUpdated: () => void
}

function ImageUploadTooltip({
  label,
  file,
  previewUrl,
  existingUrl,
  onFileChange,
}: {
  label: string
  file: File | null
  previewUrl: string | null
  existingUrl?: string | null
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasImage = Boolean(previewUrl || existingUrl)
  const buttonLabel = hasImage ? "Change Image" : "Upload Image"

  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right">{label}</Label>
      <div className="col-span-3 flex items-center space-x-2">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={onFileChange}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                aria-label={`${buttonLabel} for ${label}`}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {buttonLabel}
              </Button>
            </TooltipTrigger>
            {hasImage && (
              <TooltipContent>
                <img
                  src={previewUrl || existingUrl!}
                  alt={`${label} Preview`}
                  className="max-w-[200px] max-h-[200px] object-cover rounded"
                />
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {file && (
          <span className="text-sm text-muted-foreground truncate max-w-xs">
            {file.name}
          </span>
        )}
      </div>
    </div>
  )
}

export default function EditVehicleModal({
  isOpen,
  onOpenChange,
  vehicle,
  onUpdated,
}: EditVehicleModalProps) {
  const [formData, setFormData] = useState({
    brand: vehicle.brand,
    model: vehicle.model,
    type: vehicle.type,
    plateNumber: vehicle.plateNumber,
    inspectionDate: vehicle.inspectionDate
      ? new Date(vehicle.inspectionDate).toISOString().split("T")[0]
      : "",
    before: vehicle.before.toString(),
    expiryDate: vehicle.expiryDate
      ? new Date(vehicle.expiryDate).toISOString().split("T")[0]
      : "",
    status: vehicle.status,
    remarks: vehicle.remarks || "",
    owner: vehicle.owner,
  })
  const [loading, setLoading] = useState(false)

  const [frontImg, setFrontImg] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)

  const [backImg, setBackImg] = useState<File | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)

  const [side1Img, setSide1Img] = useState<File | null>(null)
  const [side1Preview, setSide1Preview] = useState<string | null>(null)

  const [side2Img, setSide2Img] = useState<File | null>(null)
  const [side2Preview, setSide2Preview] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setFormData({
      brand: vehicle.brand,
      model: vehicle.model,
      type: vehicle.type,
      plateNumber: vehicle.plateNumber,
      inspectionDate: vehicle.inspectionDate
        ? new Date(vehicle.inspectionDate).toISOString().split("T")[0]
        : "",
      before: vehicle.before.toString(),
      expiryDate: vehicle.expiryDate
        ? new Date(vehicle.expiryDate).toISOString().split("T")[0]
        : "",
      status: vehicle.status,
      remarks: vehicle.remarks || "",
      owner: vehicle.owner,
    })

    setFrontImg(null)
    setFrontPreview(null)
    setBackImg(null)
    setBackPreview(null)
    setSide1Img(null)
    setSide1Preview(null)
    setSide2Img(null)
    setSide2Preview(null)
  }, [isOpen, vehicle])

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>, side: string) => {
    if (!e.target.files?.length) return
    const file = e.target.files[0]
    const previewUrl = URL.createObjectURL(file)

    switch (side) {
      case "front":
        setFrontImg(file)
        setFrontPreview(previewUrl)
        break
      case "back":
        setBackImg(file)
        setBackPreview(previewUrl)
        break
      case "side1":
        setSide1Img(file)
        setSide1Preview(previewUrl)
        break
      case "side2":
        setSide2Img(file)
        setSide2Preview(previewUrl)
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const data = new FormData()
    data.append("brand", formData.brand)
    data.append("model", formData.model)
    data.append("type", formData.type)
    data.append("plateNumber", formData.plateNumber)
    data.append("inspectionDate", formData.inspectionDate)
    data.append("before", formData.before)
    data.append("expiryDate", formData.expiryDate)
    data.append("status", formData.status)
    if (formData.remarks) data.append("remarks", formData.remarks)
    data.append("owner", formData.owner)
    if (frontImg) data.append("frontImg", frontImg)
    if (backImg) data.append("backImg", backImg)
    if (side1Img) data.append("side1Img", side1Img)
    if (side2Img) data.append("side2Img", side2Img)

    try {
      await updateVehicle(vehicle.uid, data)
      toast.success("Vehicle updated successfully")
      onUpdated()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to update vehicle")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 pb-4">
          {/* Brand */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="brand" className="col-span-2 text-right">
              Brand
            </Label>
            <Input
              id="brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. Toyota"
              className="col-span-4"
              required
              autoComplete="off"
            />
          </div>

          {/* Model */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="model" className="col-span-2 text-right">
              Model
            </Label>
            <Input
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="e.g. Hilux"
              className="col-span-4"
              required
              autoComplete="off"
            />
          </div>

          {/* Type */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="type" className="col-span-2 text-right">
              Type
            </Label>
            <Input
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              placeholder="e.g. Truck"
              className="col-span-4"
              required
              autoComplete="off"
            />
          </div>

          {/* Plate Number */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="plateNumber" className="col-span-2 text-right">
              Plate Number
            </Label>
            <Input
              id="plateNumber"
              name="plateNumber"
              value={formData.plateNumber}
              onChange={handleChange}
              placeholder="e.g. ABC-1234"
              className="col-span-4"
              required
              autoComplete="off"
            />
          </div>

          {/* Inspection Date */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="inspectionDate" className="col-span-2 text-right">
              Inspection Date
            </Label>
            <Input
              id="inspectionDate"
              name="inspectionDate"
              type="date"
              value={formData.inspectionDate}
              onChange={handleChange}
              className="col-span-4"
              required
            />
          </div>

          {/* Inspection Interval */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="before" className="col-span-2 text-right">
              Inspection Interval (Months)
            </Label>
            <Input
              id="before"
              name="before"
              type="number"
              min={1}
              value={formData.before}
              onChange={handleChange}
              className="col-span-4"
              required
            />
          </div>

          {/* Expiry Date */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="expiryDate" className="col-span-2 text-right">
              Expiry Date
            </Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={handleChange}
              className="col-span-4"
              required
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="status" className="col-span-2 text-right">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value as Status }))
              }
              aria-label="Status"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="owner" className="col-span-2 text-right">
              Owner
            </Label>
            <Input
              id="owner"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              placeholder="Person responsible"
              className="col-span-4"
              required
              autoComplete="off"
            />
          </div>

          {/* Remarks */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="remarks" className="col-span-2 text-right">
              Remarks
            </Label>
            <Input
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Any notes or comments"
              className="col-span-4"
            />
          </div>

          {/* Image Uploads */}
          <ImageUploadTooltip
            label="Front Image"
            file={frontImg}
            previewUrl={frontPreview}
            existingUrl={vehicle.frontImgUrl}
            onFileChange={(e) => handleFile(e, "front")}
          />
          <ImageUploadTooltip
            label="Back Image"
            file={backImg}
            previewUrl={backPreview}
            existingUrl={vehicle.backImgUrl}
            onFileChange={(e) => handleFile(e, "back")}
          />
          <ImageUploadTooltip
            label="Side 1 Image"
            file={side1Img}
            previewUrl={side1Preview}
            existingUrl={vehicle.side1ImgUrl}
            onFileChange={(e) => handleFile(e, "side1")}
          />
          <ImageUploadTooltip
            label="Side 2 Image"
            file={side2Img}
            previewUrl={side2Preview}
            existingUrl={vehicle.side2ImgUrl}
            onFileChange={(e) => handleFile(e, "side2")}
          />

          <div className="col-span-2 flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
