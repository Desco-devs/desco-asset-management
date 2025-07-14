"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface FormActionsProps {
  isEditMode: boolean;
  loading: boolean;
  isFormValid: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function FormActions({
  isEditMode,
  loading,
  isFormValid,
  onCancel,
  onSubmit,
}: FormActionsProps) {
  return (
    <DialogFooter className="p-0">
      <div className="flex justify-end space-x-2 py-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          type="submit"
          disabled={!isFormValid || loading}
          className="bg-chart-3 hover:bg-chart-3/80 dark:text-accent-foreground"
        >
          {loading
            ? isEditMode
              ? "Updating..."
              : "Adding..."
            : isEditMode
            ? "Update Equipment"
            : "Add Equipment"}
        </Button>
      </div>
    </DialogFooter>
  );
}