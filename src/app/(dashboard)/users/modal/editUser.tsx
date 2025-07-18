"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Edit, Phone, Shield, Settings } from "lucide-react";
import { User as UserType } from "@/types/auth";

const ROLES = ["VIEWER", "ADMIN", "SUPERADMIN"] as const;

interface EditUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: Partial<UserType> | null;
  saving: boolean;
  onSave: (id: string, data: Partial<UserType>) => Promise<void>;
}

export default function EditUserModal({
  isOpen,
  onOpenChange,
  user,
  saving,
  onSave,
}: EditUserModalProps) {
  const [username, setUsername] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"VIEWER" | "ADMIN" | "SUPERADMIN">("VIEWER");
  const [userStatus, setUserStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setFullname(user.full_name || "");
      setPhone(user.phone || "");
      setRole(user.role || "VIEWER");
      setUserStatus(user.user_status || "ACTIVE");
    } else {
      setUsername("");
      setFullname("");
      setPhone("");
      setRole("VIEWER");
      setUserStatus("ACTIVE");
    }
  }, [user]);

  if (!user) return null;

  const { id } = user;

  async function handleSave() {
    if (!username.trim() || !fullname.trim()) {
      alert("Username and fullname are required");
      return;
    }
    if (!id) {
      alert("User ID missing");
      return;
    }
    await onSave(id, {
      username: username.trim(),
      full_name: fullname.trim(),
      phone,
      role,
      user_status: userStatus,
    });
  }

  function handleRoleChange(newRole: "VIEWER" | "ADMIN" | "SUPERADMIN") {
    setRole(newRole);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto scroll-none">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullname" className="text-sm font-medium">
                Full Name *
              </Label>
              <Input
                id="fullname"
                type="text"
                placeholder="Enter full name"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  className="pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Role Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role
            </Label>
            <Select
              disabled={saving}
              value={role}
              onValueChange={(value) => handleRoleChange(value as "VIEWER" | "ADMIN" | "SUPERADMIN")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VIEWER">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Viewer
                  </div>
                </SelectItem>
                <SelectItem value="ADMIN">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    Admin
                  </div>
                </SelectItem>
                <SelectItem value="SUPERADMIN">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Super Admin
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Section */}
          <div className="space-y-2">
            <Label
              htmlFor="userStatus"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Status
            </Label>
            <Select
              disabled={saving}
              value={userStatus}
              onValueChange={(value) => setUserStatus(value as "ACTIVE" | "INACTIVE")}
            >
              <SelectTrigger id="userStatus">
                <SelectValue placeholder="Select user status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="INACTIVE">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    Inactive
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
