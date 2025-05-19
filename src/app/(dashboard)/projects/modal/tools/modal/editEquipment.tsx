"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Equipment, Status } from "@/app/service/types";
import { updateEquipment } from "@/app/service/equipments/equipment";

interface EditEquipmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  onUpdated: () => void;
}

export default function EditEquipmentModal({
  isOpen,
  onOpenChange,
  equipment,
  onUpdated,
}: EditEquipmentModalProps) {
  if (!equipment) return null;

  const [brand, setBrand] = useState(equipment.brand);
  const [model, setModel] = useState(equipment.model);
  const [type, setType] = useState(equipment.type);
  const [expirationDate, setExpirationDate] = useState(
    equipment.expirationDate.slice(0, 10)
  );
  const [status, setStatus] = useState<Status>(equipment.status);
  const [remarks, setRemarks] = useState<string | null>(
    equipment.remarks ?? ""
  );
  const [owner, setOwner] = useState(equipment.owner);
  const [inspectionDate, setInspectionDate] = useState(
    equipment.inspectionDate?.slice(0, 10) ?? ""
  );
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBrand(equipment.brand);
    setModel(equipment.model);
    setType(equipment.type);
    setExpirationDate(equipment.expirationDate.slice(0, 10));
    setStatus(equipment.status);
    setRemarks(equipment.remarks ?? "");
    setOwner(equipment.owner);
    setInspectionDate(equipment.inspectionDate?.slice(0, 10) ?? "");
    setImage(null);
    setPreviewUrl(null);
  }, [isOpen, equipment]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
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
      });
      toast.success("Updated successfully");
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update equipment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasImage = Boolean(previewUrl || equipment.image_url);
  const buttonLabel =
    equipment.image_url || previewUrl ? "Change Image" : "Upload Image";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
          <DialogDescription>
            Update the details of the equipment here. Click save when you're
            done.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="brand" className="text-right">
              Brand
            </Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="model" className="text-right">
              Model
            </Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as Status)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="NON_OPERATIONAL">Non Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="owner" className="text-right">
              Owner
            </Label>
            <Input
              id="owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="remarks" className="text-right">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              value={remarks || ""}
              onChange={(e) => setRemarks(e.target.value)}
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
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="inspectionDate" className="text-right">
              Inspection Date
            </Label>
            <Input
              id="inspectionDate"
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Image</Label>
            <div className="col-span-3 flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
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
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      {buttonLabel}
                    </Button>
                  </TooltipTrigger>
                  {hasImage && (
                    <TooltipContent>
                      <img
                        src={previewUrl || equipment.image_url!}
                        alt="Preview"
                        className="max-w-[200px] max-h-[200px] object-cover rounded"
                      />
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {image && (
                <span className="text-sm text-muted-foreground">
                  {image.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} onClick={handleSubmit}>
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
  );
}
