"use client";

import { useState, useEffect } from "react";
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
import { User, Lock, Phone, Shield, Settings } from "lucide-react";

const ROLES = ["VIEWER", "ADMIN", "SUPERADMIN"] as const;

interface AddUserModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    username: string;
    password: string;
    fullname: string;
    phone?: string | null;
    role: string;
    userStatus: string;
  }) => Promise<void>;
  creating: boolean;
}

export default function AddUserModal({
  isOpen,
  onOpenChange,
  onCreate,
  creating,
}: AddUserModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("VIEWER");
  const [userStatus, setUserStatus] = useState("ACTIVE");

  useEffect(() => {
    if (!isOpen) {
      setUsername("");
      setPassword("");
      setFullname("");
      setPhone("");
      setRole("VIEWER");
      setUserStatus("ACTIVE");
    }
  }, [isOpen]);

  async function handleSubmit() {
    if (!username.trim() || !password.trim() || !fullname.trim()) {
      alert("Username, password, and fullname are required");
      return;
    }
    await onCreate({
      username: username.trim(),
      password,
      fullname: fullname.trim(),
      phone: phone.trim() || null,
      role,
      userStatus,
    });
  }

  function handleRoleChange(newRole: string) {
    setRole(newRole);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New User
          </DialogTitle>
        </DialogHeader>

        <div className="h-full space-y-6 overflow-y-auto scroll-none">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                    disabled={creating}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={creating}
                  />
                </div>
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
                disabled={creating}
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
                  disabled={creating}
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
              disabled={creating}
              value={role}
              onValueChange={handleRoleChange}
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
              disabled={creating}
              value={userStatus}
              onValueChange={setUserStatus}
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
            disabled={creating}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={creating}
            className="flex-1 sm:flex-none"
          >
            {creating ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
