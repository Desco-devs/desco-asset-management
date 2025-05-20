"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Checkbox,
} from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const PERMISSIONS = ["VIEW", "CREATE", "UPDATE", "DELETE"] as const

interface AddUserModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: {
    username: string
    password: string
    fullname: string
    phone?: string | null
    permissions: string[]
    userStatus: string
  }) => Promise<void>
  creating: boolean
}

export default function AddUserModal({
  isOpen,
  onOpenChange,
  onCreate,
  creating,
}: AddUserModalProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [fullname, setFullname] = useState("")
  const [phone, setPhone] = useState("")
  const [permissions, setPermissions] = useState<string[]>([])
  const [userStatus, setUserStatus] = useState("ACTIVE")

  useEffect(() => {
    if (!isOpen) {
      setUsername("")
      setPassword("")
      setFullname("")
      setPhone("")
      setPermissions([])
      setUserStatus("ACTIVE")
    }
  }, [isOpen])

  async function handleSubmit() {
    if (!username.trim() || !password.trim() || !fullname.trim()) {
      alert("Username, password, and fullname are required")
      return
    }
    await onCreate({
      username: username.trim(),
      password,
      fullname: fullname.trim(),
      phone: phone.trim() || null,
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
          <DialogTitle>Add New User</DialogTitle>
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
              disabled={creating}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <input
              id="password"
              type="password"
              className="input-bordered input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={creating}
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
              disabled={creating}
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
              disabled={creating}
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
                    disabled={creating}
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
              disabled={creating}
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
