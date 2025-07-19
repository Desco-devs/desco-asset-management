"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { Equipment } from "@/app/service/types";

interface ViewDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0d 0h 0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getColorByDaysLeft(daysLeft: number, warningThreshold = 5) {
  if (daysLeft < 0) return "text-red-600";
  if (daysLeft <= warningThreshold) return "text-yellow-600";
  return "text-gray-700 dark:text-gray-300";
}

function formatFullDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ViewDetailsModal({
  isOpen,
  onOpenChange,
  equipment,
}: ViewDetailsModalProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!equipment) return null;

  const renderCountdownDate = (
    dateStr: string | null | undefined,
    labelOverdue: string,
    labelExpired: string
  ) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const diffMs = date.getTime() - now.getTime();
    const daysLeft = diffMs / (1000 * 60 * 60 * 24);
    const colorClass = getColorByDaysLeft(daysLeft, 5);

    const displayText =
      diffMs <= 0
        ? labelOverdue === "Overdue"
          ? `Overdue ${Math.abs(Math.floor(daysLeft))}d`
          : `Expired ${Math.abs(Math.floor(daysLeft))}d ago`
        : formatCountdown(diffMs);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`${colorClass} font-semibold cursor-default underline decoration-dotted`}
          >
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{formatFullDate(dateStr)}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Equipment Details
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 flex flex-col md:flex-row gap-6">
          {/* Left: Details (wider) */}
          <div className="flex-[3] space-y-4 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold border-b border-gray-300 dark:border-gray-600 pb-2 mb-4">
              Equipment Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-semibold">Brand:</span> {equipment.brand}
              </p>
              <p>
                <span className="font-semibold">Model:</span> {equipment.model}
              </p>
              <p>
                <span className="font-semibold">Type:</span> {equipment.type}
              </p>
              <p>
                <span className="font-semibold">Owner:</span> {equipment.owner}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {equipment.status}
              </p>
              <p>
                <span className="font-semibold">Expiration Date:</span>{" "}
                {renderCountdownDate(
                  equipment.insuranceExpirationDate,
                  "Expired",
                  "Expired"
                )}
              </p>
              <p>
                <span className="font-semibold">Inspection Date:</span>{" "}
                {renderCountdownDate(
                  equipment.inspectionDate,
                  "Overdue",
                  "Expired"
                )}
              </p>
              <p className="sm:col-span-2">
                <span className="font-semibold">Remarks:</span>{" "}
                {equipment.remarks || "-"}
              </p>
            </div>
          </div>

          {/* Right: Image or fallback (smaller) */}
          <div className="flex-[1] flex justify-center items-start">
            {equipment.image_url ? (
              <img
                src={equipment.image_url}
                alt={`${equipment.model} image`}
                className="rounded-lg shadow-lg max-h-[400px] object-contain border border-gray-300 dark:border-gray-700"
                loading="lazy"
              />
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 italic select-none">
                No image uploaded
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
