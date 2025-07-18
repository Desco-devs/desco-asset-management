"use client";

import React, { useState, useRef, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Loader2, ImageIcon } from "lucide-react";
import { createEquipment } from "@/app/service/equipments/equipment";
import ImagePreviewModal from "@/app/components/custom-reusable/modal/PreviewImage";

interface AddEquipmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

type EquipmentInput = {
  brand: string;
  model: string;
  type: string;
  expirationDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks: string;
  owner: string;
  inspectionDate?: string;
  image: File | null;
  previewUrl: string | null;
};

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
};

export default function AddEquipmentModal({
  isOpen,
  onOpenChange,
  projectId,
  onCreated,
}: AddEquipmentModalProps) {
  const [input, setInput] = useState<EquipmentInput>(initialState);
  const [errors, setErrors] = useState<
    Partial<Record<keyof EquipmentInput, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayStr = new Date().toISOString().split("T")[0];

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setInput((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    const url = file ? URL.createObjectURL(file) : null;
    setInput((prev) => ({ ...prev, image: file, previewUrl: url }));
    setErrors((prev) => ({ ...prev, image: undefined }));
  };

  const resetForm = () => {
    if (input.previewUrl) URL.revokeObjectURL(input.previewUrl);
    setInput(initialState);
    setErrors({});
    setPreviewOpen(false);
  };

  function validate() {
    const errs: typeof errors = {};
    if (!input.brand.trim()) errs.brand = "Brand is required";
    if (!input.model.trim()) errs.model = "Model is required";
    if (!input.type.trim()) errs.type = "Type is required";
    if (!input.expirationDate) {
      errs.expirationDate = "Expiration date is required";
    } else if (input.expirationDate < todayStr) {
      errs.expirationDate = "Expiration cannot be in the past";
    }
    if (!input.owner.trim()) errs.owner = "Owner is required";
    if (input.inspectionDate && input.inspectionDate < todayStr) {
      errs.inspectionDate = "Inspection cannot be in the past";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
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
        inspectionDate: input.inspectionDate
          ? new Date(input.inspectionDate)
          : undefined,
        image: input.image!,
      });
      toast.success("Equipment added");
      onCreated();
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasImage = Boolean(input.previewUrl);
  const buttonLabel = hasImage ? "Change Image" : "Upload Image";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>
              Enter details for new equipment
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brand" className="text-right">
                Brand
              </Label>
              <Input
                id="brand"
                name="brand"
                value={input.brand}
                onChange={handleChange}
                placeholder="e.g. Canon"
                className={`col-span-3 ${errors.brand ? "border-red-500" : ""}`}
              />
            </div>
            {errors.brand && (
              <div className="col-span-2 text-red-500 text-xs">
                {errors.brand}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Input
                id="model"
                name="model"
                value={input.model}
                onChange={handleChange}
                placeholder="e.g. EOS R5"
                className={`col-span-3 ${errors.model ? "border-red-500" : ""}`}
              />
            </div>
            {errors.model && (
              <div className="col-span-2 text-red-500 text-xs">
                {errors.model}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Input
                id="type"
                name="type"
                value={input.type}
                onChange={handleChange}
                placeholder="e.g. Camera"
                className={`col-span-3 ${errors.type ? "border-red-500" : ""}`}
              />
            </div>
            {errors.type && (
              <div className="col-span-2 text-red-500 text-xs">
                {errors.type}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                onValueChange={(value) =>
                  setInput((prev) => ({ ...prev, status: value as any }))
                }
                value={input.status}
              >
                <SelectTrigger className="col-span-3">
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="owner" className="text-right">
                Owner
              </Label>
              <Input
                id="owner"
                name="owner"
                value={input.owner}
                onChange={handleChange}
                placeholder="Person responsible"
                className={`col-span-3 ${errors.owner ? "border-red-500" : ""}`}
              />
            </div>
            {errors.owner && (
              <div className="col-span-2 text-red-500 text-xs">
                {errors.owner}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="remarks" className="text-right">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                name="remarks"
                value={input.remarks}
                onChange={handleChange}
                placeholder="Any notes or comments"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expirationDate" className="text-right">
                Expiration Date
              </Label>
              <Input
                id="expirationDate"
                type="date"
                name="expirationDate"
                min={todayStr}
                value={input.expirationDate}
                onChange={handleChange}
                className={`col-span-3 ${
                  errors.expirationDate ? "border-red-500" : ""
                }`}
              />
            </div>
            {errors.expirationDate && (
              <div className="col-span-2 text-red-500 text-xs">
                {errors.expirationDate}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="inspectionDate" className="text-right">
                Inspection Date
              </Label>
              <Input
                id="inspectionDate"
                type="date"
                name="inspectionDate"
                min={todayStr}
                value={input.inspectionDate || ""}
                onChange={handleChange}
                className={`col-span-3 ${
                  errors.inspectionDate ? "border-red-500" : ""
                }`}
              />
            </div>
            {errors.inspectionDate && (
              <div className="col-span-2 text-red-500 text-xs">
                {errors.inspectionDate}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Image</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className={errors.image ? "border-red-500" : ""}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        {buttonLabel}
                      </Button>
                    </TooltipTrigger>
                    {hasImage && (
                      <TooltipContent>
                        <img
                          src={input.previewUrl!}
                          alt="Preview"
                          className="max-w-[200px] max-h-[200px] object-cover rounded"
                        />
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {input.image && (
                  <span className="text-sm text-muted-foreground">
                    {input.image.name}
                  </span>
                )}
              </div>
            </div>
            {errors.image && (
              <div className="col-span-2 text-red-500 text-xs">
                {errors.image}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
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
  );
}
