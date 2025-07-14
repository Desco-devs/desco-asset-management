"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EquipmentFormData } from "@/types/equipment";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface BasicInfoFieldsProps {
  formData: EquipmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EquipmentFormData>>;
}

export function BasicInfoFields({ formData, setFormData }: BasicInfoFieldsProps) {
  const handleDateChange = (field: keyof EquipmentFormData, date: Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  const handleInputChange = (field: keyof EquipmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Equipment Details</h3>
      <div className="grid grid-cols-2 gap-4">
      {/* Brand */}
      <div className="space-y-2">
        <Label htmlFor="brand">
          Brand <span className="text-red-500">*</span>
        </Label>
        <Input
          id="brand"
          value={formData.brand}
          onChange={(e) => handleInputChange('brand', e.target.value)}
          placeholder="Enter equipment brand"
          required
        />
      </div>

      {/* Model */}
      <div className="space-y-2">
        <Label htmlFor="model">
          Model <span className="text-red-500">*</span>
        </Label>
        <Input
          id="model"
          value={formData.model}
          onChange={(e) => handleInputChange('model', e.target.value)}
          placeholder="Enter equipment model"
          required
        />
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">
          Type <span className="text-red-500">*</span>
        </Label>
        <Input
          id="type"
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value)}
          placeholder="Enter equipment type"
          required
        />
      </div>

      {/* Owner */}
      <div className="space-y-2">
        <Label htmlFor="owner">
          Owner <span className="text-red-500">*</span>
        </Label>
        <Input
          id="owner"
          value={formData.owner}
          onChange={(e) => handleInputChange('owner', e.target.value)}
          placeholder="Enter owner name"
          required
        />
      </div>

      {/* Plate Number */}
      <div className="space-y-2">
        <Label htmlFor="plateNumber">Plate Number</Label>
        <Input
          id="plateNumber"
          value={formData.plateNumber}
          onChange={(e) => handleInputChange('plateNumber', e.target.value)}
          placeholder="Enter plate number (if applicable)"
        />
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value: "OPERATIONAL" | "NON_OPERATIONAL") =>
            handleInputChange('status', value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPERATIONAL">Operational</SelectItem>
            <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Before (Hours/Mileage) */}
      <div className="space-y-2">
        <Label htmlFor="before">Before (Hours/Mileage)</Label>
        <Input
          id="before"
          type="number"
          value={formData.before}
          onChange={(e) => handleInputChange('before', e.target.value)}
          placeholder="Enter current hours or mileage"
        />
      </div>

      {/* Insurance Expiration Date */}
      <div className="space-y-2">
        <Label>Insurance Expiration Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.insuranceExpirationDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.insuranceExpirationDate ? (
                format(formData.insuranceExpirationDate, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.insuranceExpirationDate}
              onSelect={(date) => handleDateChange('insuranceExpirationDate', date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Inspection Date */}
      <div className="space-y-2">
        <Label>Inspection Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.inspectionDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.inspectionDate ? (
                format(formData.inspectionDate, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.inspectionDate}
              onSelect={(date) => handleDateChange('inspectionDate', date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Remarks - Full width */}
      <div className="col-span-2 space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea
          id="remarks"
          value={formData.remarks}
          onChange={(e) => handleInputChange('remarks', e.target.value)}
          placeholder="Enter any additional remarks"
          rows={3}
        />
      </div>
    </div>
    </div>
  );
}