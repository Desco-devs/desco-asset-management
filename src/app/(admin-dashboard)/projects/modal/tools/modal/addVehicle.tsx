"use client";

import React, { useState, ChangeEvent, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { createVehicle } from "@/app/service/vehicles/vehicles";

interface AddVehicleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

type VehicleFormData = {
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: string;
  expiryDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks: string;
  owner: string;
};

export default function AddVehicleModal({
  isOpen,
  onOpenChange,
  projectId,
  onCreated,
}: AddVehicleModalProps) {
  const [formData, setFormData] = useState<VehicleFormData>({
    brand: "",
    model: "",
    type: "",
    plateNumber: "",
    inspectionDate: "",
    before: "",
    expiryDate: "",
    status: "OPERATIONAL",
    remarks: "",
    owner: "",
  });

  // Image files and preview URLs state
  const [frontImg, setFrontImg] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);

  const [backImg, setBackImg] = useState<File | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const [side1Img, setSide1Img] = useState<File | null>(null);
  const [side1Preview, setSide1Preview] = useState<string | null>(null);

  const [side2Img, setSide2Img] = useState<File | null>(null);
  const [side2Preview, setSide2Preview] = useState<string | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const fileInputRefs = {
    front: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
    side1: useRef<HTMLInputElement>(null),
    side2: useRef<HTMLInputElement>(null),
  };

  const todayStr = new Date().toISOString().split("T")[0];

  function validate() {
    const errs: typeof errors = {};

    if (!formData.brand.trim()) errs.brand = "Brand is required";
    if (!formData.model.trim()) errs.model = "Model is required";
    if (!formData.type.trim()) errs.type = "Type is required";
    if (!formData.plateNumber.trim()) errs.plateNumber = "Plate Number is required";
    if (!formData.inspectionDate) errs.inspectionDate = "Inspection Date is required";
    else if (formData.inspectionDate < todayStr) errs.inspectionDate = "Inspection cannot be in the past";

    if (!formData.before.trim()) errs.before = "Inspection interval is required";
    else if (isNaN(Number(formData.before)) || Number(formData.before) <= 0)
      errs.before = "Inspection interval must be a positive number";

    if (!formData.expiryDate) errs.expiryDate = "Expiry Date is required";
    else if (formData.expiryDate < todayStr) errs.expiryDate = "Expiry cannot be in the past";

    if (!formData.owner.trim()) errs.owner = "Owner is required";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleImageChange = (
    e: ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
    setPreview: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const url = URL.createObjectURL(file);
      setFile(file);
      setPreview(url);
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const cleanupPreviews = () => {
    [frontPreview, backPreview, side1Preview, side2Preview].forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const data = new FormData();
    data.append("brand", formData.brand);
    data.append("model", formData.model);
    data.append("type", formData.type);
    data.append("plateNumber", formData.plateNumber);
    data.append("inspectionDate", formData.inspectionDate);
    data.append("before", formData.before);
    data.append("expiryDate", formData.expiryDate);
    data.append("status", formData.status);
    if (formData.remarks) data.append("remarks", formData.remarks);
    data.append("owner", formData.owner);
    data.append("projectId", projectId);

    if (frontImg) data.append("frontImg", frontImg);
    if (backImg) data.append("backImg", backImg);
    if (side1Img) data.append("side1Img", side1Img);
    if (side2Img) data.append("side2Img", side2Img);

    try {
      await createVehicle(data);
      // toast.success("Vehicle created successfully"); // Removed - handled by realtime listener
      onCreated();

      // Reset form and images & previews
      setFormData({
        brand: "",
        model: "",
        type: "",
        plateNumber: "",
        inspectionDate: "",
        before: "",
        expiryDate: "",
        status: "OPERATIONAL",
        remarks: "",
        owner: "",
      });
      setFrontImg(null);
      setBackImg(null);
      setSide1Img(null);
      setSide2Img(null);
      cleanupPreviews();
      setFrontPreview(null);
      setBackPreview(null);
      setSide1Preview(null);
      setSide2Preview(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Vehicle</DialogTitle>
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
              className={`col-span-4 ${errors.brand ? "border-red-500" : ""}`}
              required
              autoComplete="off"
              aria-invalid={!!errors.brand}
            />
          </div>
          {errors.brand && (
            <p className="col-span-6 text-red-500 text-xs">{errors.brand}</p>
          )}

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
              className={`col-span-4 ${errors.model ? "border-red-500" : ""}`}
              required
              autoComplete="off"
              aria-invalid={!!errors.model}
            />
          </div>
          {errors.model && (
            <p className="col-span-6 text-red-500 text-xs">{errors.model}</p>
          )}

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
              className={`col-span-4 ${errors.type ? "border-red-500" : ""}`}
              required
              autoComplete="off"
              aria-invalid={!!errors.type}
            />
          </div>
          {errors.type && (
            <p className="col-span-6 text-red-500 text-xs">{errors.type}</p>
          )}

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
              className={`col-span-4 ${errors.plateNumber ? "border-red-500" : ""}`}
              required
              autoComplete="off"
              aria-invalid={!!errors.plateNumber}
            />
          </div>
          {errors.plateNumber && (
            <p className="col-span-6 text-red-500 text-xs">{errors.plateNumber}</p>
          )}

          {/* Inspection Date */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="inspectionDate" className="col-span-2 text-right">
              Inspection Date
            </Label>
            <Input
              id="inspectionDate"
              name="inspectionDate"
              type="date"
              min={todayStr}
              value={formData.inspectionDate}
              onChange={handleChange}
              className={`col-span-4 ${errors.inspectionDate ? "border-red-500" : ""}`}
              required
              aria-invalid={!!errors.inspectionDate}
            />
          </div>
          {errors.inspectionDate && (
            <p className="col-span-6 text-red-500 text-xs">{errors.inspectionDate}</p>
          )}

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
              className={`col-span-4 ${errors.before ? "border-red-500" : ""}`}
              required
              aria-invalid={!!errors.before}
            />
          </div>
          {errors.before && (
            <p className="col-span-6 text-red-500 text-xs">{errors.before}</p>
          )}

          {/* Expiry Date */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="expiryDate" className="col-span-2 text-right">
              Expiry Date
            </Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              min={todayStr}
              value={formData.expiryDate}
              onChange={handleChange}
              className={`col-span-4 ${errors.expiryDate ? "border-red-500" : ""}`}
              required
              aria-invalid={!!errors.expiryDate}
            />
          </div>
          {errors.expiryDate && (
            <p className="col-span-6 text-red-500 text-xs">{errors.expiryDate}</p>
          )}

          {/* Status */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="status" className="col-span-2 text-right">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  status: value as "OPERATIONAL" | "NON_OPERATIONAL",
                }))
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
              className={`col-span-4 ${errors.owner ? "border-red-500" : ""}`}
              required
              autoComplete="off"
              aria-invalid={!!errors.owner}
            />
          </div>
          {errors.owner && (
            <p className="col-span-6 text-red-500 text-xs">{errors.owner}</p>
          )}

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

          {/* Front Image */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label className="col-span-2 text-right">Front Image</Label>
            <div className="col-span-4 flex items-center space-x-2">
              <input
                ref={fileInputRefs.front}
                id="frontImg"
                name="frontImg"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, setFrontImg, setFrontPreview)}
                className="hidden"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.front.current?.click()}
                    >
                      {frontImg ? "Change Front Image" : "Upload Front Image"}
                    </Button>
                  </TooltipTrigger>
                  {frontPreview && (
                    <TooltipContent>
                      <img
                        src={frontPreview}
                        alt="Front Image Preview"
                        className="max-w-[200px] max-h-[200px] object-cover rounded"
                      />
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {frontImg && (
                <span className="text-sm text-muted-foreground">{frontImg.name}</span>
              )}
            </div>
          </div>

          {/* Back Image */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label className="col-span-2 text-right">Back Image</Label>
            <div className="col-span-4 flex items-center space-x-2">
              <input
                ref={fileInputRefs.back}
                id="backImg"
                name="backImg"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, setBackImg, setBackPreview)}
                className="hidden"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.back.current?.click()}
                    >
                      {backImg ? "Change Back Image" : "Upload Back Image"}
                    </Button>
                  </TooltipTrigger>
                  {backPreview && (
                    <TooltipContent>
                      <img
                        src={backPreview}
                        alt="Back Image Preview"
                        className="max-w-[200px] max-h-[200px] object-cover rounded"
                      />
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {backImg && (
                <span className="text-sm text-muted-foreground">{backImg.name}</span>
              )}
            </div>
          </div>

          {/* Side 1 Image */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label className="col-span-2 text-right">Side 1 Image</Label>
            <div className="col-span-4 flex items-center space-x-2">
              <input
                ref={fileInputRefs.side1}
                id="side1Img"
                name="side1Img"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, setSide1Img, setSide1Preview)}
                className="hidden"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.side1.current?.click()}
                    >
                      {side1Img ? "Change Side 1 Image" : "Upload Side 1 Image"}
                    </Button>
                  </TooltipTrigger>
                  {side1Preview && (
                    <TooltipContent>
                      <img
                        src={side1Preview}
                        alt="Side 1 Image Preview"
                        className="max-w-[200px] max-h-[200px] object-cover rounded"
                      />
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {side1Img && (
                <span className="text-sm text-muted-foreground">{side1Img.name}</span>
              )}
            </div>
          </div>

          {/* Side 2 Image */}
          <div className="grid grid-cols-6 items-center gap-4">
            <Label className="col-span-2 text-right">Side 2 Image</Label>
            <div className="col-span-4 flex items-center space-x-2">
              <input
                ref={fileInputRefs.side2}
                id="side2Img"
                name="side2Img"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, setSide2Img, setSide2Preview)}
                className="hidden"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.side2.current?.click()}
                    >
                      {side2Img ? "Change Side 2 Image" : "Upload Side 2 Image"}
                    </Button>
                  </TooltipTrigger>
                  {side2Preview && (
                    <TooltipContent>
                      <img
                        src={side2Preview}
                        alt="Side 2 Image Preview"
                        className="max-w-[200px] max-h-[200px] object-cover rounded"
                      />
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {side2Img && (
                <span className="text-sm text-muted-foreground">{side2Img.name}</span>
              )}
            </div>
          </div>

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
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
