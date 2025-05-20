"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"  // <-- import ShadCN Input
import { toast } from "sonner"

interface AddClientModalProps {
  locationId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onClientAdded: (client: { uid: string; name: string }) => void
  creating: boolean
  createClient: (name: string, locationId: string) => Promise<{ uid: string; name: string }>
}

export function AddClientModal({
  locationId,
  isOpen,
  onOpenChange,
  onClientAdded,
  creating,
  createClient,
}: AddClientModalProps) {
  const [newName, setNewName] = React.useState("")

  async function handleCreate() {
    if (!newName.trim() || !locationId) {
      toast.error("Client name and location are required.")
      return
    }

    try {
      const client = await createClient(newName.trim(), locationId)
      onClientAdded(client)
      setNewName("")
      toast.success("Client added successfully.")
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to add client.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter client name"
            disabled={creating}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleCreate()
              }
              if (e.key === "Escape") {
                onOpenChange(false)
                setNewName("")
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Add Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
