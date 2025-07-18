"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { Vehicle } from "@/app/service/types"

interface ViewDetailsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Vehicle | null
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0d 0h 0m 0s"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / (3600 * 24))
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}d ${hours}h ${minutes}m ${seconds}s`
}

function getColorByDaysLeft(daysLeft: number, warningThreshold = 5) {
  if (daysLeft < 0) return "text-red-600"
  if (daysLeft <= warningThreshold) return "text-yellow-600"
  return "text-gray-700 dark:text-gray-300"
}

// Only date, no time
function formatFullDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export default function ViewDetailsModal({ isOpen, onOpenChange, vehicle }: ViewDetailsModalProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [isOpen])

  if (!vehicle) return null

  const renderCountdownDate = (
    dateStr: string | null | undefined,
    labelOverdue: string,
    labelExpired: string
  ) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    const diffMs = date.getTime() - now.getTime()
    const daysLeft = diffMs / (1000 * 60 * 60 * 24)
    const colorClass = getColorByDaysLeft(daysLeft, 5)

    const displayText =
      diffMs <= 0
        ? labelOverdue === "Overdue"
          ? `Overdue ${Math.abs(Math.floor(daysLeft))}d`
          : `Expired ${Math.abs(Math.floor(daysLeft))}d ago`
        : formatCountdown(diffMs)

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${colorClass} font-semibold cursor-default underline decoration-dotted`}>
            {displayText}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{formatFullDate(dateStr)}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Vehicle Details
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 flex flex-col md:flex-row gap-6">
          {/* Left: Details (wider) */}
          <div className="flex-[3] space-y-4 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold border-b border-gray-300 dark:border-gray-600 pb-2 mb-4">
              Vehicle Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-gray-700 dark:text-gray-300">
              <p><span className="font-semibold">Brand:</span> {vehicle.brand}</p>
              <p><span className="font-semibold">Model:</span> {vehicle.model}</p>
              <p><span className="font-semibold">Type:</span> {vehicle.type}</p>
              <p><span className="font-semibold">Plate Number:</span> {vehicle.plateNumber}</p>
              <p><span className="font-semibold">Owner:</span> {vehicle.owner}</p>
              <p><span className="font-semibold">Status:</span> {vehicle.status}</p>
              <p>
                <span className="font-semibold">Inspection Date:</span>{" "}
                {renderCountdownDate(vehicle.inspectionDate, "Overdue", "Expired")}
              </p>
              <p>
                <span className="font-semibold">Expiry Date:</span>{" "}
                {renderCountdownDate(vehicle.expiryDate, "Expired", "Expired")}
              </p>
              <p><span className="font-semibold">Inspection Interval:</span> {vehicle.before} months</p>
              <p className="sm:col-span-2"><span className="font-semibold">Remarks:</span> {vehicle.remarks || "-"}</p>
            </div>
          </div>

          {/* Right: Images (smaller) */}
          <div className="flex-[1] flex flex-col gap-4">
            <h3 className="text-xl font-semibold border-b border-gray-300 dark:border-gray-600 pb-2 mb-4">
              Vehicle Images
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Front", url: vehicle.frontImgUrl },
                { label: "Back", url: vehicle.backImgUrl },
                { label: "Side 1", url: vehicle.side1ImgUrl },
                { label: "Side 2", url: vehicle.side2ImgUrl },
              ].map(({ label, url }) => (
                <div key={label} className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
                  {url ? (
                    <img
                      src={url}
                      alt={`${vehicle.model} ${label.toLowerCase()} image`}
                      className="rounded-lg shadow-lg max-h-[200px] object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <p className="italic text-gray-500 dark:text-gray-400 select-none">
                      No image uploaded
                    </p>
                  )}
                </div>
              ))}
            </div>
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
  )
}
