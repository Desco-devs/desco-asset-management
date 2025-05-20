"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Checkbox
} from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { User } from "@/app/service/types"

const PERMISSIONS = ["VIEW", "CREATE", "UPDATE", "DELETE"] as const

interface EditUserModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: Partial<User> | null
  saving: boolean
  onSave: (uid: string, data: Partial<User>) => Promise<void>
}

export default function EditUserModal({
  isOpen,
  onOpenChange,
  user,
  saving,
  onSave,
}: EditUserModalProps) {
  const [username, setUsername] = useState("")
  const [fullname, setFullname] = useState("")
  const [phone, setPhone] = useState("")
  const [permissions, setPermissions] = useState<string[]>([])
  const [userStatus, setUserStatus] = useState("ACTIVE")

  useEffect(() => {
    if (user) {
      setUsername(user.username || "")
      setFullname(user.fullname || "")
      setPhone(user.phone || "")
      setPermissions(user.permissions || [])
      setUserStatus(user.userStatus || "ACTIVE")
    } else {
      setUsername("")
      setFullname("")
      setPhone("")
      setPermissions([])
      setUserStatus("ACTIVE")
    }
  }, [user])

  if (!user) return null

  const { uid } = user

  async function handleSave() {
    if (!username.trim() || !fullname.trim()) {
      alert("Username and fullname are required")
      return
    }
    if (!uid) {
      alert("User ID missing")
      return
    }
    await onSave(uid, {
      username: username.trim(),
      fullname: fullname.trim(),
      phone,
      permissions,
      userStatus,
    })
  }

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4 mt-2">
          <div>
            <Label htmlFor="username">Username</Label>
            <input
              id="username"
              type="text"
              className="input-bordered input w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={saving}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="fullname">Fullname</Label>
            <input
              id="fullname"
              type="text"
              className="input-bordered input w-full"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <input
              id="phone"
              type="text"
              className="input-bordered input w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <Label>Permissions</Label>
            <div className="flex flex-wrap gap-4 mt-1">
              {PERMISSIONS.map((perm) => (
                <div key={perm} className="flex items-center space-x-2">
                  <Checkbox
                    id={`perm-${perm}`}
                    checked={permissions.includes(perm)}
                    onCheckedChange={() => togglePermission(perm)}
                    disabled={saving}
                  />
                  <Label htmlFor={`perm-${perm}`} className="cursor-pointer">
                    {perm}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="userStatus">User Status</Label>
            <Select
              disabled={saving}
              value={userStatus}
              onValueChange={setUserStatus}
            >
              <SelectTrigger id="userStatus" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
